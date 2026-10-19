import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const settle = () => new Promise(setImmediate);
const home = {
    id: "home-1",
    name: "My home",
    icon: "leaf-outline",
    isOwner: true,
    location: { latitude: 0, longitude: 15 },
    rooms: [],
};

function mountForm(props = {}) {
    let focus;
    const form = mountNativeComponent("src/components/home/HomeForm.tsx", {
        props: { onSubmit: async () => {}, ...props },
        modules: {
            "@/hooks/useIconCatalog": {
                useIconCatalog: () => ({
                    keys: ["home-outline", "leaf-outline", "sunny-outline"],
                    loading: false,
                    error: "",
                    retry() {},
                }),
            },
            "../common/IconSelector": "IconSelector",
            "../common/LocalizationSelector": "LocalizationSelector",
            "expo-router": { useFocusEffect: (callback) => (focus = callback) },
        },
    });
    form.flushEffects();
    const blur = focus?.();
    const input = () => form.elements().find((node) => node.type === "Input");
    const button = () => form.elements().find((node) => node.type === "Button");
    return {
        ...form,
        input,
        button,
        blur,
        refocus: () => focus?.(),
        enter: (name) => {
            input().props.setValue(name);
            form.render();
        },
        submit: () => button().props.onPress(),
    };
}

test("empty and whitespace home names show a field error and never submit", async () => {
    let submissions = 0;
    const form = mountForm({ onSubmit: async () => submissions++ });
    for (const name of ["", "   ", "ab", "x".repeat(65)]) {
        form.enter(name);
        await form.submit();
        form.render();
        assert.ok(form.input().props.error, "Invalid names need visible supporting text");
    }
    assert.equal(submissions, 0);
    assert.ok(form.focused.length, "Focus the invalid name for recovery");
});

test("changing the icon or location preserves an invalid home name error", async () => {
    const form = mountForm();
    await form.submit();
    form.render();
    const error = form.input().props.error;
    assert.ok(error);
    form.elements()
        .find((node) => node.type === "IconSelector")
        .props.onIconSelected("leaf-outline");
    form.render();
    assert.equal(form.input().props.error, error);
    form.elements()
        .find((node) => node.type === "LocalizationSelector")
        .props.onSelectLocation(0, 15);
    form.render();
    assert.equal(form.input().props.error, error);
    form.enter("Cabin");
    assert.equal(form.input().props.error, "");
});

test("a save completed after blur updates the saved baseline on return", async () => {
    let finish;
    const form = mountForm({
        edit: true,
        initName: "My home",
        onSubmit: () => new Promise((resolve) => (finish = resolve)),
    });
    form.enter("Cabin");
    const pending = form.submit();
    form.blur();
    finish();
    await pending;
    form.refocus();
    form.render();
    assert.equal(form.button().props.disabled, true, "A successful save must not remain dirty");
    form.enter("Another draft");
    assert.equal(form.button().props.disabled, false);
    form.enter("Cabin");
    assert.equal(form.button().props.disabled, true, "Compare edits with the last successful save");
});

test("home submission locks synchronously and normalizes the name at its boundary", async () => {
    const requests = [];
    let finish;
    const form = mountForm({
        onSubmit: async (values) => {
            requests.push({ ...values });
            await new Promise((resolve) => (finish = resolve));
        },
    });
    form.enter("  Cabin  ");
    const pending = form.submit();
    const duplicate = form.submit();
    assert.equal(requests.length, 1, "A second tap before rendering must not create another home");
    assert.equal(requests[0].name, "Cabin");
    form.render();
    assert.equal(form.input().props.editable, false);
    assert.equal(form.button().props.loading, true);
    finish();
    await Promise.all([pending, duplicate]);
});

test("failed home saves preserve the draft, expose inline recovery and release the submit lock", async () => {
    let attempts = 0;
    const form = mountForm({
        onSubmit: async () => {
            if (++attempts === 1) throw new Error("Connection unavailable");
        },
    });
    form.enter("Cabin");
    await assert.doesNotReject(form.submit());
    form.render();
    assert.equal(form.input().props.value, "Cabin");
    assert.equal(form.input().props.error, "", "An action failure does not invalidate the name");
    const elements = form.elements();
    const error = elements.findIndex((node) => node.type === "Alert");
    assert.ok(error >= 0 && error < elements.indexOf(form.button()));
    assert.match(form.text(), /Connection unavailable/);
    assert.equal(form.button().props.loading, false);
    await form.submit();
    assert.equal(attempts, 2);
});

test("home creation waits for an explicitly requested location to finish", async () => {
    let submissions = 0;
    const form = mountForm({ onSubmit: async () => submissions++ });
    form.enter("Cabin");
    const location = form.elements().find((node) => node.type === "LocalizationSelector");
    location.props.onLoadingChange?.(true);
    await form.submit();
    assert.equal(submissions, 0);
    location.props.onLoadingChange?.(false);
    await form.submit();
    assert.equal(submissions, 1);
});

test("editing sends only changed fields and uses the last save as its baseline", async () => {
    const requests = [];
    const form = mountForm({
        edit: true,
        initName: "My home",
        initIcon: "leaf-outline",
        initLatitude: 0,
        initLongitude: 15,
        onSubmit: async (values) => {
            requests.push({ ...values });
        },
    });
    const icon = () => form.elements().find((node) => node.type === "IconSelector");
    const location = () => form.elements().find((node) => node.type === "LocalizationSelector");
    assert.equal(icon().props.defaultIcon, "leaf-outline");
    assert.equal(location().props.initLocation.latitude, 0);
    assert.equal(location().props.initLocation.longitude, 15);
    form.enter("  Cabin  ");
    await form.submit();
    assert.deepEqual(requests, [{ name: "Cabin" }]);
    form.render();
    await form.submit();
    assert.equal(requests.length, 1, "A saved draft must not remain dirty");
    icon().props.onIconSelected("sunny-outline");
    location().props.onSelectLocation(20, 0);
    form.render();
    await form.submit();
    assert.deepEqual(requests[1], { icon: "sunny-outline", latitude: 20, longitude: 0 });
    form.render();
    assert.equal(icon().props.defaultIcon, "sunny-outline");
    assert.equal(location().props.initLocation.latitude, 20);
    assert.equal(location().props.initLocation.longitude, 0);
    assert.equal(form.button().props.disabled, true);
    form.enter("Another cabin");
    await form.submit();
    assert.deepEqual(requests[2], { name: "Another cabin" });
});

function mountRoute(
    file,
    { current = home, post, patch, remove, get, initialize, setCurrent, refreshRooms } = {},
) {
    const navigation = [];
    const requests = [];
    let focus;
    const router = {
        canGoBack: () => true,
        back: () => navigation.push("back"),
        replace: (path) => navigation.push(path),
        push: (path) => navigation.push(path),
    };
    const route = mountNativeComponent(file, {
        modules: {
            "@/components/home/HomeForm": "HomeForm",
            "@/components/homeSharing/HomeSharingList": "HomeSharingList",
            "@/components/common/ContentSection": "ContentSection",
            "@/components/common/ListRow": "ListRow",
            "@/components/common/Button": "Button",
            "@/components/common/ConfirmDialog": "ConfirmDialog",
            "@rn-primitives/portal": { PortalHost: "PortalHost" },
            "@/components/ui/alert-dialog": Object.fromEntries(
                [
                    "AlertDialog",
                    "AlertDialogAction",
                    "AlertDialogCancel",
                    "AlertDialogContent",
                    "AlertDialogDescription",
                    "AlertDialogFooter",
                    "AlertDialogHeader",
                    "AlertDialogTitle",
                    "AlertDialogTrigger",
                ].map((name) => [name, name]),
            ),
            "@/components/common/Expander": "Expander",
            "@/components/common/FAB": "FAB",
            "@/components/common/ButtonWithTextAndImage": "ButtonWithTextAndImage",
            "@/components/dataSource/tile/DataSourceTile": "DataSourceTile",
            "@/contexts/domain/HomeProvider": {
                useHomes: () => ({
                    current,
                    loading: false,
                    refreshRooms: refreshRooms || (async () => true),
                    initializeCurrentHome: initialize || (async () => true),
                    setCurrent: setCurrent || (async () => true),
                    refreshCurrent: async () => {},
                }),
            },
            "@/contexts/HttpClientProvider": {
                useHttpClient: () => ({
                    post: async (path, body) => {
                        requests.push({ path, body });
                        return post ? post() : { isSuccess: true, statusCode: 201, response: null };
                    },
                    patch: async (path, body) => {
                        requests.push({ path, body });
                        return patch
                            ? patch()
                            : { isSuccess: true, statusCode: 204, response: null };
                    },
                    delete: async (path) => {
                        requests.push({ path });
                        return remove
                            ? remove()
                            : { isSuccess: true, statusCode: 204, response: null };
                    },
                    get: async () =>
                        get ? get() : { isSuccess: false, statusCode: 500, response: null },
                }),
            },
            "@/contexts/ToastProvider": {
                useToast: () => ({ success: () => {}, error: () => {}, httpError: () => {} }),
            },
            "expo-router": {
                useFocusEffect: (callback) => (focus = callback),
                useLocalSearchParams: () => ({ firstHome: "first" }),
                useRouter: () => router,
            },
        },
    });
    const blur = focus?.();
    return {
        ...route,
        navigation,
        requests,
        blur,
        refocus: () => focus?.(),
        setHome: (next) => {
            current = next;
        },
        form: () => route.elements().find((node) => node.type === "HomeForm"),
        removalDialog: () => route.elements().find((node) => node.type === "AlertDialog"),
        confirmRemoval: () => {
            const dialog = route.elements().find((node) => node.type === "AlertDialog");
            assert.ok(dialog.props.open, "Deletion requires an open confirmation");
            const action = route.elements().find((node) => node.type === "AlertDialogAction");
            return route
                .elements(action)
                .find((node) => node.type === "Button")
                .props.onPress();
        },
        press: (label) => {
            const button = route.elements().find((node) => label.test(node.props?.name));
            if (button) return button.props.onPress();
            return route
                .elements()
                .find((node) => node.type === "FAB")
                ?.props.actions.find((action) => label.test(action.label))
                ?.onPress();
        },
    };
}

test("creating the first home recovers to the picker when activation fails without resending", async () => {
    const route = mountRoute("src/app/(app)/home/add.tsx", {
        current: undefined,
        initialize: async () => false,
    });
    await route.form().props.onSubmit({ name: "Cabin", icon: "home-outline" });
    assert.deepEqual(
        route.requests.map(({ path }) => path),
        ["v1/homes"],
    );
    assert.deepEqual(route.navigation, ["/home/list"]);
});

test("a create failure reaches inline form recovery without navigation", async () => {
    const route = mountRoute("src/app/(app)/home/add.tsx", {
        post: async () => ({ isSuccess: false, statusCode: 500, response: null }),
    });
    await assert.rejects(route.form().props.onSubmit({ name: "Cabin" }));
    assert.deepEqual(route.navigation, []);
});

test("leaving creation ignores late activation and navigation", async () => {
    let finish;
    let activated = 0;
    const route = mountRoute("src/app/(app)/home/add.tsx", {
        post: () => new Promise((resolve) => (finish = resolve)),
        initialize: async () => ++activated,
    });
    const pending = route.form().props.onSubmit({ name: "Cabin" });
    route.blur?.();
    finish({ isSuccess: true, statusCode: 201, response: null });
    await pending;
    assert.equal(activated, 0);
    assert.deepEqual(route.navigation, []);
});

test("returning after an accepted create recovers without a second POST", async () => {
    let finish;
    const route = mountRoute("src/app/(app)/home/add.tsx", {
        post: () => new Promise((resolve) => (finish = resolve)),
    });
    const pending = route.form().props.onSubmit({ name: "Cabin" });
    route.blur();
    finish({ isSuccess: true, statusCode: 201, response: null });
    await pending;
    assert.deepEqual(route.navigation, [], "An inactive screen must not navigate");
    route.refocus();
    route.render();
    assert.deepEqual(route.navigation, ["/home/list"]);
    const duplicate = route.form().props.onSubmit({ name: "Cabin" });
    assert.equal(route.requests.length, 1, "A completed creation must not be sent again");
    await duplicate;
});

test("saving home details keeps the form mounted through failure", async () => {
    let finish;
    const route = mountRoute("src/app/(app)/home/details.tsx", {
        patch: () => new Promise((resolve) => (finish = resolve)),
    });
    const pending = route.form().props.onSubmit({ name: "Cabin" });
    route.render();
    assert.ok(route.form(), "Pending save must preserve the mounted draft and scroll context");
    finish({ isSuccess: false, statusCode: 500, response: null });
    await assert.rejects(pending);
    route.render();
    assert.ok(route.form());
    assert.deepEqual(
        route.requests.map(({ path }) => path),
        ["v1/homes/home-1"],
    );
});

test("failed data-source loading stays local and offers retry", async () => {
    const route = mountRoute("src/app/(app)/home/details.tsx", {
        current: { ...home, dataSource: { id: "source-1", name: "MQTT", state: "Working" } },
    });
    route.flushEffects();
    await settle();
    route.render();
    assert.ok(route.form());
    assert.ok(route.elements().some((node) => /retry/i.test(node.props?.name)));
    assert.match(route.text(), /couldn't load|failed to load/i);
});

test("owner and member details expose only their applicable destructive action", () => {
    const owner = mountRoute("src/app/(app)/home/details.tsx");
    const member = mountRoute("src/app/(app)/home/details.tsx", {
        current: { ...home, isOwner: false },
    });
    assert.ok(owner.elements().some((node) => node.type === "HomeSharingList"));
    assert.ok(!member.elements().some((node) => node.type === "HomeSharingList"));
    assert.ok(owner.elements().some((node) => /delete home/i.test(node.props?.name)));
    assert.ok(member.elements().some((node) => /leave home/i.test(node.props?.name)));
    assert.ok(!member.elements().some((node) => /delete home/i.test(node.props?.name)));
    assert.equal(owner.form().props.readOnly, false);
    assert.equal(member.form().props.readOnly, true);
});

test("home details puts rooms before owner settings and gates room management by permission", () => {
    const manager = mountRoute("src/app/(app)/home/details.tsx", {
        current: {
            ...home,
            isOwner: true,
            canManage: true,
            rooms: [{ id: "room-1", name: "Kitchen" }],
        },
    });
    const section = manager
        .elements()
        .find((node) => node.type === "ContentSection" && node.props.title === "Rooms");
    assert.ok(section);
    const addAction = section.props.headerAction;
    assert.equal(addAction.type.name, "SectionHeaderAction");
    assert.equal(addAction.props.accessibilityLabel, "Add room");
    assert.equal(addAction.props.label, "Add");
    assert.ok(
        manager
            .elements()
            .some((node) => node.type === "ListRow" && node.props.title === "Kitchen"),
    );
    const kitchen = manager
        .elements()
        .find((node) => node.type === "ListRow" && node.props.title === "Kitchen");
    const roomActions = manager
        .elements(kitchen.props.trailing)
        .filter((node) => node.type === "Pressable");
    assert.deepEqual(
        roomActions.map((node) => node.props.accessibilityLabel),
        ["Edit Kitchen", "Remove Kitchen"],
    );
    roomActions[0].props.onPress();
    assert.deepEqual(JSON.parse(JSON.stringify(manager.navigation)), [
        { pathname: "home/room/details", params: { id: "room-1" } },
    ]);
    const roomIndex = manager.elements().indexOf(section);
    const dataSourceIndex = manager
        .elements()
        .findIndex((node) => node.type === "ContentSection" && node.props.title === "Data source");
    assert.ok(roomIndex < dataSourceIndex, "Rooms precede owner-only settings");

    const display = mountRoute("src/app/(app)/home/details.tsx", {
        current: {
            ...home,
            isOwner: false,
            canManage: false,
            rooms: [{ id: "room-1", name: "Kitchen" }],
        },
    });
    assert.ok(
        display
            .elements()
            .some((node) => node.type === "ListRow" && node.props.title === "Kitchen"),
    );
    assert.equal(
        display
            .elements()
            .find((node) => node.type === "ContentSection" && node.props.title === "Rooms").props
            .headerAction,
        undefined,
    );
    assert.ok(
        !display
            .elements()
            .some((node) => node.type === "ContentSection" && node.props.title === "Data source"),
    );
});

test("rooms add action stays in section header when empty and respects parent busy state", async () => {
    const route = mountRoute("src/app/(app)/home/details.tsx", { current: { ...home, rooms: [] } });
    const section = () =>
        route
            .elements()
            .find((node) => node.type === "ContentSection" && node.props.title === "Rooms");
    const action = section().props.headerAction;
    assert.equal(action.type.name, "SectionHeaderAction");
    action.props.onPress();
    assert.deepEqual(JSON.parse(JSON.stringify(route.navigation)), [{ pathname: "home/room/add" }]);

    let finish;
    const busy = mountRoute("src/app/(app)/home/details.tsx", {
        patch: () => new Promise((resolve) => (finish = resolve)),
        current: { ...home, rooms: [{ id: "room-1", name: "Kitchen" }] },
    });
    const saving = busy.form().props.onSubmit({ name: "Cabin" });
    busy.render();
    const busySection = busy
        .elements()
        .find((node) => node.type === "ContentSection" && node.props.title === "Rooms");
    assert.equal(busySection.props.headerAction.props.disabled, true);
    const row = busy
        .elements()
        .find((node) => node.type === "ListRow" && node.props.title === "Kitchen");
    assert.equal(row.props.disabled, true);
    busy.elements(row.props.trailing)
        .find((node) => node.type === "Pressable")
        .props.onPress();
    assert.deepEqual(busy.navigation, []);
    finish({ isSuccess: true, statusCode: 204, response: null });
    await saving;
});

test("room removal requires confirmation, names unassigned devices, and cancel sends no request", () => {
    const route = mountRoute("src/app/(app)/home/details.tsx", {
        current: { ...home, rooms: [{ id: "room-1", name: "Kitchen" }] },
    });
    const remove = () =>
        route.elements().find((node) => node.props?.accessibilityLabel === "Remove Kitchen");
    remove().props.onPress();
    route.render();
    assert.match(route.text(), /Delete “Kitchen”\?/);
    assert.match(route.text(), /devices will become unassigned/i);
    const cancel = route.elements().find((node) => node.type === "AlertDialogCancel");
    route
        .elements(cancel)
        .find((node) => node.type === "Button")
        .props.onPress();
    assert.deepEqual(route.requests, []);
});

test("rooms and populated Sharing use same compact section header action", async () => {
    const sharing = mountSharings({
        get: async () => ({
            isSuccess: true,
            statusCode: 200,
            response: {
                json: async () => ({
                    items: [
                        {
                            sharingId: "sharing-1",
                            friendEmail: "friend@example.com",
                            sharingType: "Manage",
                        },
                    ],
                }),
            },
        }),
    });
    await settle();
    sharing.render();
    const invite = sharing
        .elements()
        .find((node) => node.props?.accessibilityLabel === "Invite someone");
    assert.equal(invite.type.name, "SectionHeaderAction");
});

test("room deletion locks duplicates, preserves failures, and refresh recovery never repeats delete", async () => {
    let deleteAttempts = 0;
    let refreshAttempts = 0;
    let finish;
    const route = mountRoute("src/app/(app)/home/details.tsx", {
        current: { ...home, rooms: [{ id: "room-1", name: "Kitchen" }] },
        remove: () => {
            deleteAttempts++;
            if (deleteAttempts === 1) return { isSuccess: false, statusCode: 500, response: null };
            return new Promise((resolve) => (finish = resolve));
        },
        refreshRooms: async () => ++refreshAttempts > 2,
    });
    const requestDelete = () => {
        route
            .elements()
            .find((node) => node.props?.accessibilityLabel === "Remove Kitchen")
            .props.onPress();
        route.render();
        return route.confirmRemoval();
    };
    requestDelete();
    await settle();
    route.render();
    assert.match(route.text(), /Couldn't remove room/);
    assert.equal(deleteAttempts, 1);

    const pending = requestDelete();
    const duplicate = route.confirmRemoval();
    assert.equal(deleteAttempts, 2, "Synchronous guard blocks a second DELETE");
    route.render();
    const row = route
        .elements()
        .find((node) => node.type === "ListRow" && node.props.title === "Kitchen");
    assert.equal(
        route
            .elements(row.props.trailing)
            .find((node) => node.props?.accessibilityLabel === "Remove Kitchen").props.disabled,
        true,
    );
    finish({ isSuccess: true, statusCode: 204, response: null });
    await Promise.all([pending, duplicate]);
    await settle();
    route.render();
    assert.match(route.text(), /was deleted, but rooms couldn't refresh/i);
    const retry = route
        .elements()
        .find((node) => node.type === "Button" && node.props.name === "Retry room refresh");
    await retry.props.onPress();
    assert.equal(deleteAttempts, 2, "Recovery retries only the room refresh");
    assert.equal(refreshAttempts, 3);
});

test("room delete and refresh locks clear after finishing while details are blurred", async () => {
    let finishDelete;
    const route = mountRoute("src/app/(app)/home/details.tsx", {
        current: { ...home, rooms: [{ id: "room-1", name: "Kitchen" }] },
        remove: () => new Promise((resolve) => (finishDelete = resolve)),
        refreshRooms: async () => false,
    });
    route
        .elements()
        .find((node) => node.props?.accessibilityLabel === "Remove Kitchen")
        .props.onPress();
    route.render();
    const deletion = route.confirmRemoval();
    route.blur();
    finishDelete({ isSuccess: true, statusCode: 204, response: null });
    await deletion;
    await settle();
    route.refocus();
    route.render();
    const section = route
        .elements()
        .find((node) => node.type === "ContentSection" && node.props.title === "Rooms");
    assert.equal(
        section.props.headerAction.props.disabled,
        false,
        "Blurred completion must release room busy state",
    );
});

test("room refresh retry releases its lock when it finishes while details are blurred", async () => {
    let refreshAttempts = 0;
    let finishRetry;
    const route = mountRoute("src/app/(app)/home/details.tsx", {
        current: { ...home, rooms: [{ id: "room-1", name: "Kitchen" }] },
        refreshRooms: () => {
            refreshAttempts++;
            if (refreshAttempts === 1) return Promise.resolve(true);
            if (refreshAttempts === 2) return Promise.resolve(false);
            return new Promise((resolve) => (finishRetry = resolve));
        },
    });
    route
        .elements()
        .find((node) => node.props?.accessibilityLabel === "Remove Kitchen")
        .props.onPress();
    route.render();
    route.confirmRemoval();
    await settle();
    route.render();
    const retry = route.elements().find((node) => node.props?.name === "Retry room refresh");
    retry.props.onPress();
    route.blur();
    finishRetry(true);
    await settle();
    route.refocus();
    await settle();
    route.render();
    const section = route
        .elements()
        .find((node) => node.type === "ContentSection" && node.props.title === "Rooms");
    assert.equal(
        section.props.headerAction.props.disabled,
        false,
        "Blurred retry completion must release room busy state",
    );
});

test("accepted room refresh recovery blocks other deletes until refresh succeeds", async () => {
    let deleteAttempts = 0;
    let refreshAttempts = 0;
    const route = mountRoute("src/app/(app)/home/details.tsx", {
        current: {
            ...home,
            rooms: [
                { id: "room-1", name: "Kitchen" },
                { id: "room-2", name: "Office" },
            ],
        },
        remove: async () => {
            deleteAttempts++;
            return { isSuccess: true, statusCode: 204, response: null };
        },
        refreshRooms: async () => {
            refreshAttempts++;
            return refreshAttempts === 1 || refreshAttempts >= 3;
        },
    });
    const openRemoval = (name) => {
        route
            .elements()
            .find((node) => node.props?.accessibilityLabel === `Remove ${name}`)
            .props.onPress();
        route.render();
        assert.equal(
            route.removalDialog().props.open,
            true,
            `Expected ${name} confirmation to open`,
        );
    };
    const remove = (name) => {
        openRemoval(name);
        return route.confirmRemoval();
    };
    remove("Kitchen");
    await settle();
    route.render();
    assert.ok(route.elements().some((node) => node.props?.name === "Retry room refresh"));
    const removeOffice = route
        .elements()
        .find((node) => node.props?.accessibilityLabel === "Remove Office");
    assert.equal(
        removeOffice.props.disabled,
        true,
        "Other deletes stay disabled during accepted recovery",
    );
    assert.equal(removeOffice.props.accessibilityState.disabled, true);
    removeOffice.props.onPress();
    route.render();
    assert.equal(
        route.removalDialog().props.open,
        false,
        "Handler guard must reject a disabled room delete",
    );
    assert.equal(deleteAttempts, 1, "No later DELETE may hide unresolved accepted recovery");
    assert.ok(
        route.elements().some((node) => node.props?.name === "Retry room refresh"),
        "The first accepted delete recovery remains visible",
    );
    assert.match(route.text(), /Kitchen.*deleted, but rooms couldn't refresh/i);
    const retry = route.elements().find((node) => node.props?.name === "Retry room refresh");
    await retry.props.onPress();
    await settle();
    route.render();
    assert.equal(refreshAttempts, 3);
    assert.ok(
        !route.elements().some((node) => node.props?.name === "Retry room refresh"),
        "Successful refresh clears accepted recovery",
    );
    remove("Office");
    await settle();
    assert.equal(deleteAttempts, 2, "Office may be deleted after successful refresh recovery");
    assert.equal(refreshAttempts, 4);
});

test("room removal tracks its initiating focus target and suppresses home trigger while open", () => {
    const route = mountRoute("src/app/(app)/home/details.tsx", {
        current: { ...home, rooms: [{ id: "room-1", name: "Kitchen" }] },
    });
    const remove = route
        .elements()
        .find((node) => node.props?.accessibilityLabel === "Remove Kitchen");
    assert.equal(
        typeof remove.props.ref,
        "function",
        "Room action ref identifies the initiating button for focus restoration",
    );
    remove.props.onPress();
    route.render();
    const homeTrigger = route.elements().find((node) => node.type === "AlertDialogTrigger");
    assert.equal(
        homeTrigger,
        undefined,
        "The Delete home trigger must not steal room dialog focus",
    );
});

test("room load failure stays local, offers retry and retains cached rows", async () => {
    const route = mountRoute("src/app/(app)/home/details.tsx", {
        current: { ...home, rooms: [{ id: "room-1", name: "Kitchen" }] },
        refreshRooms: async () => false,
    });
    await settle();
    route.render();
    assert.ok(route.elements().some((node) => node.type === "Alert"));
    assert.ok(
        route.elements().some((node) => node.type === "ListRow" && node.props.title === "Kitchen"),
    );
    assert.ok(route.elements().some((node) => /retry loading rooms/i.test(node.props?.name)));
});

test("cancelling home removal closes AlertDialog without sending a request", () => {
    const route = mountRoute("src/app/(app)/home/details.tsx");
    route.press(/delete home/i);
    route.render();
    assert.ok(route.removalDialog().props.open);
    assert.equal(route.requests.length, 0, "Opening the dialog must not delete the home");
    const cancel = route.elements().find((node) => node.type === "AlertDialogCancel");
    route
        .elements(cancel)
        .find((node) => node.type === "Button")
        .props.onPress();
    route.render();
    assert.equal(route.removalDialog().props.open, false);
    assert.equal(route.requests.length, 0);
    route.press(/delete home/i);
    route.render();
    const modal = route.elements().find((node) => node.type === "Modal");
    assert.equal(modal.props.visible, true);
    modal.props.onRequestClose();
    route.render();
    assert.equal(route.removalDialog().props.open, false);
    assert.equal(route.requests.length, 0, "Hardware Back must cancel without deleting");
});

test("destructive failures stay on screen and repeated confirmations issue one request", async () => {
    let finish;
    const route = mountRoute("src/app/(app)/home/details.tsx", {
        remove: () => new Promise((resolve) => (finish = resolve)),
    });
    route.press(/delete home/i);
    route.render();
    assert.ok(route.removalDialog().props.open, "Deletion requires explicit confirmation");
    route.confirmRemoval();
    route.confirmRemoval();
    assert.equal(route.requests.length, 1);
    finish({ isSuccess: false, statusCode: 500, response: null });
    await settle();
    route.render();
    assert.ok(route.form());
    assert.ok(route.elements().some((node) => node.type === "Alert"));
    assert.deepEqual(route.navigation, []);
});

test("a completed save remains successful when refreshing the home fails", async () => {
    const route = mountRoute("src/app/(app)/home/details.tsx", {
        setCurrent: async () => false,
    });
    const message = await route.form().props.onSubmit({ name: "Cabin" });
    assert.match(message, /saved/i);
    assert.match(message, /refresh/i);
    assert.equal(route.requests.length, 1);
});

test("completed home submissions unlock a retained screen after refocus", async () => {
    let finish;
    const form = mountForm({
        onSubmit: () => new Promise((resolve) => (finish = resolve)),
    });
    form.enter("Cabin");
    const pending = form.submit();
    form.blur();
    finish();
    await pending;
    form.refocus();
    form.render();
    assert.equal(form.input().props.editable, true);
    assert.equal(form.button().props.loading, false);
    assert.equal(form.input().props.value, "Cabin");

    const route = mountRoute("src/app/(app)/home/details.tsx", {
        patch: () => new Promise((resolve) => (finish = resolve)),
    });
    const save = route.form().props.onSubmit({ name: "Cabin" });
    route.blur();
    finish({ isSuccess: true, statusCode: 204, response: null });
    await save;
    route.refocus();
    route.render();
    assert.equal(route.form().props.disabled, false);
});

test("refocusing details without a current home recovers to selection", () => {
    const route = mountRoute("src/app/(app)/home/details.tsx");
    route.blur();
    route.setHome(undefined);
    route.render();
    route.flushEffects();
    assert.deepEqual(route.navigation, []);
    route.refocus();
    route.render();
    route.flushEffects();
    assert.deepEqual(route.navigation, ["/home/list"]);
});

test("persisted deletion and leaving recover to selection after failed activation", async () => {
    for (const isOwner of [true, false]) {
        const route = mountRoute("src/app/(app)/home/details.tsx", {
            current: { ...home, isOwner },
            initialize: async () => false,
        });
        route.press(isOwner ? /delete home/i : /leave home/i);
        route.render();
        route.confirmRemoval();
        await settle();
        assert.deepEqual(route.navigation, ["/home/list"]);
        assert.equal(route.requests.length, 1);
    }
});

test("a deletion completed after Back still invalidates its home without navigating", async () => {
    let finish;
    const invalidated = [];
    const route = mountRoute("src/app/(app)/home/details.tsx", {
        remove: () => new Promise((resolve) => (finish = resolve)),
        initialize: async (options) => {
            invalidated.push(options.removedHomeId);
            return false;
        },
    });
    route.press(/delete home/i);
    route.render();
    route.confirmRemoval();
    route.blur();
    finish({ isSuccess: true, statusCode: 204, response: null });
    await settle();
    assert.deepEqual(invalidated, ["home-1"]);
    assert.deepEqual(route.navigation, []);
});

test("unlinking is locked and remains successful when refreshing the binding fails", async () => {
    let finish;
    const route = mountRoute("src/app/(app)/home/details.tsx", {
        current: { ...home, dataSource: { id: "source-1", name: "MQTT", state: "Working" } },
        remove: () => new Promise((resolve) => (finish = resolve)),
        setCurrent: async () => false,
    });
    route.press(/unlink data source/i);
    route.render();
    assert.equal(route.removalDialog().props.open, true);
    assert.equal(route.requests.length, 0, "Unlinking requires explicit confirmation");
    const confirm = route.elements().find((node) => node.type === "AlertDialogAction");
    const confirmButton = route.elements(confirm).find((node) => node.type === "Button");
    confirmButton.props.onPress();
    confirmButton.props.onPress();
    assert.equal(route.requests.length, 1);
    assert.equal(route.requests[0].path, "/v1/homes/home-1/datasource");
    finish({ isSuccess: true, statusCode: 204, response: null });
    await settle();
    route.render();
    assert.ok(route.form());
    assert.ok(route.elements().some((node) => /assign data source/i.test(node.props?.name)));
    assert.match(route.text(), /unlinked.*refresh/i);
});

test("initialization discards a removed home but preserves a different current selection", async () => {
    let fail = true;
    let finish;
    const provider = mountNativeComponent("src/contexts/domain/HomeProvider.tsx", {
        exportName: "HomeProvider",
        modules: {
            "../HttpClientProvider": {
                useHttpClient: () => ({
                    get: async (path) => {
                        if (path === "v1/homes/current")
                            return fail
                                ? { isSuccess: false, statusCode: 500, response: null }
                                : new Promise((resolve) => (finish = resolve));
                        const id = path.split("/").at(-1);
                        return {
                            isSuccess: true,
                            statusCode: 200,
                            response: { json: async () => ({ ...home, id }) },
                        };
                    },
                }),
            },
            "../ToastProvider": {
                useToast: () => ({ info: () => {}, httpError: () => {}, error: () => {} }),
            },
            "@/utils/location": { getCurrentLocation: async () => null },
        },
    });
    const context = () => provider.elements()[0].props.value;
    await context().setCurrent("home-1");
    provider.render();
    assert.equal(context().current.id, "home-1");
    assert.equal(
        await context().initializeCurrentHome({ silent: true, removedHomeId: "home-1" }),
        false,
    );
    provider.render();
    assert.equal(context().current, undefined);

    await context().setCurrent("home-2");
    provider.render();
    await context().initializeCurrentHome({ silent: true, removedHomeId: "home-1" });
    provider.render();
    assert.equal(context().current.id, "home-2");

    fail = false;
    const pending = context().initializeCurrentHome({ silent: true, removedHomeId: "home-2" });
    await settle();
    await context().setCurrent("home-3");
    provider.render();
    finish({
        isSuccess: true,
        statusCode: 200,
        response: { json: async () => ({ id: "home-4" }) },
    });
    assert.equal(await pending, true);
    provider.render();
    assert.equal(context().current.id, "home-3");
});

test("room refresh preserves cache and ignores stale same-home and former-home responses", async () => {
    const roomRequests = [];
    let failRooms = false;
    const provider = mountNativeComponent("src/contexts/domain/HomeProvider.tsx", {
        exportName: "HomeProvider",
        modules: {
            "../HttpClientProvider": {
                useHttpClient: () => ({
                    get: async (path) => {
                        if (path === "v1/homes/current")
                            return { isSuccess: false, statusCode: 404 };
                        if (path.endsWith("/rooms/display")) {
                            if (failRooms) return { isSuccess: false, statusCode: 500 };
                            return new Promise((resolve) => roomRequests.push(resolve));
                        }
                        const id = path.split("/")[2];
                        return {
                            isSuccess: true,
                            response: { json: async () => ({ id, rooms: [] }) },
                        };
                    },
                }),
            },
            "../ToastProvider": { useToast: () => ({ info() {}, httpError() {}, error() {} }) },
            "@/utils/location": { getCurrentLocation: async () => null },
        },
    });
    const context = () => provider.elements()[0].props.value;
    await context().setCurrent("home-1");
    provider.render();
    const initialRefresh = context().refreshRooms();
    roomRequests[0]({
        isSuccess: true,
        response: { json: async () => ({ items: [{ id: "room-1", name: "Kitchen" }] }) },
    });
    await initialRefresh;
    await new Promise(setImmediate);
    provider.render();
    assert.equal(context().current.rooms[0].id, "room-1");

    const olderSameHome = context().refreshRooms({ silent: true });
    await new Promise(setImmediate);
    const newerSameHome = context().refreshRooms({ silent: true });
    await new Promise(setImmediate);
    roomRequests[2]({
        isSuccess: true,
        response: { json: async () => ({ items: [{ id: "new-room", name: "Office" }] }) },
    });
    await newerSameHome;
    roomRequests[1]({
        isSuccess: true,
        response: { json: async () => ({ items: [{ id: "stale-room", name: "Old" }] }) },
    });
    await olderSameHome;
    provider.render();
    assert.equal(context().current.rooms[0].id, "new-room");

    failRooms = true;
    assert.equal(await context().refreshRooms({ silent: true }), false);
    provider.render();
    assert.equal(context().current.rooms[0].id, "new-room", "Failure must retain cached rooms");

    failRooms = false;
    const stale = context().refreshRooms({ silent: true });
    await new Promise(setImmediate);
    await context().setCurrent("home-2");
    provider.render();
    roomRequests[3]({
        isSuccess: true,
        response: { json: async () => ({ items: [{ id: "old-room", name: "Old" }] }) },
    });
    await stale;
    provider.render();
    assert.equal(context().current.id, "home-2");
    assert.deepEqual(context().current.rooms, []);
});

function mountSharings({ get, remove, row = false, current = home, disabled = false } = {}) {
    const requests = [];
    const navigation = [];
    let focus;
    let removed = 0;
    const component = mountNativeComponent(
        row
            ? "src/components/homeSharing/HomeSharingListItem.tsx"
            : "src/components/homeSharing/HomeSharingList.tsx",
        {
            props: {
                disabled,
                id: "sharing-1",
                email: "friend@example.com",
                type: "Manage",
                onRemove: () => removed++,
            },
            modules: {
                "@/contexts/domain/HomeProvider": { useHomes: () => ({ current }) },
                "@/contexts/HttpClientProvider": {
                    useHttpClient: () => ({
                        get: async (path) => {
                            requests.push(path);
                            return get
                                ? get()
                                : { isSuccess: false, statusCode: 404, response: null };
                        },
                        delete: async (path) => {
                            requests.push(path);
                            return remove
                                ? remove()
                                : { isSuccess: false, statusCode: 500, response: null };
                        },
                    }),
                },
                "@/contexts/ToastProvider": {
                    useToast: () => ({ httpError: () => {}, error: () => {}, success: () => {} }),
                },
                "@rn-primitives/portal": { PortalHost: "PortalHost" },
                "@/components/ui/alert-dialog": Object.fromEntries(
                    [
                        "AlertDialog",
                        "AlertDialogAction",
                        "AlertDialogCancel",
                        "AlertDialogContent",
                        "AlertDialogDescription",
                        "AlertDialogFooter",
                        "AlertDialogHeader",
                        "AlertDialogTitle",
                        "AlertDialogTrigger",
                    ].map((name) => [name, name]),
                ),
                "expo-router": {
                    useFocusEffect: (callback) => (focus = callback),
                    useRouter: () => ({ push: (route) => navigation.push(route) }),
                },
            },
        },
    );
    component.flushEffects();
    const blur = focus?.();
    return { ...component, requests, navigation, blur, removed: () => removed };
}

test("sharing failures keep recovery visible and 404 renders an empty sharing state", async () => {
    const failed = mountSharings({
        get: async () => ({ isSuccess: false, statusCode: 500, response: null }),
    });
    await settle();
    failed.render();
    assert.ok(failed.elements().some((node) => node.type === "Alert"));
    assert.ok(failed.elements().some((node) => /retry/i.test(node.props?.name)));
    const empty = mountSharings();
    await settle();
    empty.render();
    assert.doesNotMatch(empty.text(), /no one|not shared|no.*access/i);
    assert.ok(empty.elements().some((node) => node.props?.accessibilityLabel === "Invite someone"));
});

test("empty sharing state omits redundant copy and puts outlined Invite in its 72 dp action slot", async () => {
    const get = async () => ({
        isSuccess: true,
        statusCode: 200,
        response: { json: async () => ({ items: [] }) },
    });
    const invite = (list) =>
        list.elements().find((node) => node.props?.accessibilityLabel === "Invite someone");

    const owner = mountSharings({ get });
    await settle();
    owner.render();
    const ownerInvite = invite(owner);
    assert.match(owner.text(), /Sharing/);
    assert.doesNotMatch(owner.text(), /no one|not shared|no.*access/i);
    assert.equal(ownerInvite.type, "Button");
    assert.equal(ownerInvite.props.name, "Invite");
    assert.equal(ownerInvite.props.type, "brand-outline");
    assert.ok(
        owner.elements().some((node) => node.type === "View" && node.props.style.minHeight === 72),
        "The full-width Invite action stays in its 72 dp action slot",
    );
    assert.equal(ownerInvite.props.disabled, false);
    assert.ok(
        !owner
            .elements()
            .some(
                (node) =>
                    node.type === "Pressable" &&
                    node.props?.accessibilityLabel === "Invite someone",
            ),
        "The empty-state Invite action sits below the message, not beside the heading",
    );
    ownerInvite.props.onPress();
    assert.deepEqual(JSON.parse(JSON.stringify(owner.navigation)), [
        { pathname: "home/share", params: { id: "home-1" } },
    ]);

    const busy = mountSharings({ get, disabled: true });
    await settle();
    busy.render();
    assert.equal(invite(busy).props.disabled, true);
    invite(busy).props.onPress();
    assert.deepEqual(busy.navigation, []);

    const member = mountSharings({ get, current: { ...home, isOwner: false } });
    await settle();
    member.render();
    assert.deepEqual(member.requests, [], "Members must not load owner-only sharing data");
    assert.equal(invite(member).props.disabled, true);
    invite(member).props.onPress();
    assert.deepEqual(member.navigation, []);
});

test("removing access locks synchronously, preserves failures and refreshes only after success", async () => {
    let finish;
    let succeeds = false;
    const row = mountSharings({
        row: true,
        remove: () =>
            succeeds
                ? { isSuccess: true, statusCode: 204, response: null }
                : new Promise((resolve) => (finish = resolve)),
    });
    const remove = () =>
        row
            .elements()
            .find(
                (node) => node.props?.accessibilityLabel === "Remove access for friend@example.com",
            );
    const confirm = () => row.elements().find((node) => node.props?.name === "Remove");
    remove().props.onPress();
    row.render();
    confirm().props.onPress();
    row.render();
    assert.deepEqual(JSON.parse(JSON.stringify(remove().props.accessibilityState)), {
        disabled: true,
        busy: true,
    });
    confirm().props.onPress();
    assert.deepEqual(row.requests, ["/v1/homes/sharings/sharing-1"]);
    finish({ isSuccess: false, statusCode: 500, response: null });
    await settle();
    row.render();
    assert.equal(row.removed(), 0);
    assert.ok(row.elements().some((node) => node.type === "Alert"));
    succeeds = true;
    remove().props.onPress();
    row.render();
    confirm().props.onPress();
    await settle();
    assert.equal(row.removed(), 1);
});

test("Cancel and Android Back close access removal without changing membership", () => {
    const row = mountSharings({ row: true });
    const open = () => {
        row.elements()
            .find(
                (node) => node.props?.accessibilityLabel === "Remove access for friend@example.com",
            )
            .props.onPress();
        row.render();
        assert.equal(row.elements().find((node) => node.type === "AlertDialog").props.open, true);
    };
    const assertCancelled = () => {
        row.render();
        assert.equal(row.elements().find((node) => node.type === "AlertDialog").props.open, false);
        assert.deepEqual(row.requests, []);
        assert.equal(row.removed(), 0);
    };
    open();
    row.elements()
        .find((node) => node.props?.name === "Cancel")
        .props.onPress();
    assertCancelled();
    open();
    row.elements()
        .find((node) => node.type === "Modal")
        .props.onRequestClose();
    assertCancelled();
});

function mountLocation({ permission = "granted", latitude = 0, longitude = 15 } = {}) {
    const selected = [];
    const geocoded = [];
    const props = {
        initLocation: { latitude, longitude },
        onSelectLocation: (...coordinates) => selected.push(coordinates),
    };
    const location = mountNativeComponent("src/components/common/LocalizationSelector.tsx", {
        props,
        modules: {
            "./ImageButton": "ImageButton",
            "./Button": "Button",
            "@/components/home/LocationMapPicker": "LocationMapPicker",
            "expo-router": { useFocusEffect: () => {} },
            "react-native": {
                View: "View",
                StyleSheet: { create: (value) => value },
                Animated: { Value: function () {}, timing: () => ({ start: () => {} }) },
                Keyboard: { dismiss: () => {} },
            },
            "expo-location": {
                requestForegroundPermissionsAsync: async () => ({ status: permission }),
                getCurrentPositionAsync: async () => ({ coords: { latitude: 0, longitude: 0 } }),
                reverseGeocodeAsync: async (coordinates) => {
                    geocoded.push({ ...coordinates });
                    return [];
                },
            },
        },
    });
    return { ...location, props, selected, geocoded };
}

test("location recognizes zero coordinates and follows restored form coordinates", async () => {
    const location = mountLocation();
    location.flushEffects();
    await settle();
    assert.deepEqual(location.geocoded, [{ latitude: 0, longitude: 15 }]);
    location.props.initLocation = { latitude: 10, longitude: 0 };
    location.render();
    location.flushEffects();
    await settle();
    assert.deepEqual(location.geocoded.at(-1), { latitude: 10, longitude: 0 });
});

test("denied location permission exposes local recovery without changing the home", async () => {
    const location = mountLocation({ permission: "denied" });
    const button = location
        .elements()
        .find(
            (node) =>
                node.type === "ImageButton" ||
                /current location|update location/i.test(node.props?.name),
        );
    await button.props.onPress();
    location.render();
    assert.deepEqual(location.selected, []);
    assert.ok(location.elements().some((node) => node.type === "Alert"));
    assert.match(location.text(), /permission|allow.*location/i);
});

test("location displays a selected place instead of raw coordinates", () => {
    const location = mountLocation();
    assert.match(location.text(), /Selected location/);
    assert.doesNotMatch(location.text(), /0\.0000, 15\.0000/);
});

test("map confirmation updates the location draft and cancellation preserves it", () => {
    const location = mountLocation();
    const open = () => {
        const button = location.elements().find((node) => /choose.*map/i.test(node.props?.name));
        assert.ok(button, "Home location needs an explicit map picker");
        button.props.onPress();
        location.render();
        return location.elements().find((node) => node.type === "LocationMapPicker");
    };
    open().props.onCancel();
    location.render();
    assert.deepEqual(location.selected, []);
    open().props.onConfirm(0, -1.25);
    location.render();
    assert.deepEqual(location.selected, [[0, -1.25]]);
    assert.ok(!location.elements().some((node) => node.type === "LocationMapPicker"));
});
