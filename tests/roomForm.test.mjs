import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const settle = () => new Promise(setImmediate);
const home = { id: "home-1", name: "My home", isOwner: true, rooms: [] };
const room = { id: "room-1", name: "Kitchen" };

function mountForm(props = {}) {
    let focus;
    const form = mountNativeComponent("src/components/room/RoomForm.tsx", {
        props: { homeName: "My home", onSubmit: async () => {}, ...props },
        modules: {
            "expo-router": { useFocusEffect: (callback) => (focus = callback) },
        },
    });
    form.flushEffects();
    const blur = focus?.();
    const input = () => form.elements().find((node) => node.type === "Input");
    const button = () => {
        const action = form.elements().find((node) => node.type === "Button");
        assert.ok(action, "The room form must own its reachable submit action");
        return action;
    };
    return {
        ...form,
        input,
        button,
        blur,
        refocus: () => focus?.(),
        enter: (value) => {
            input().props.setValue(value);
            form.render();
        },
        submit: () => button().props.onPress(),
    };
}

test("invalid room names stay beside Name and never reach the server", async () => {
    let submissions = 0;
    const form = mountForm({ onSubmit: async () => submissions++ });
    assert.equal(form.input().props.error, "", "Do not show errors before the first attempt");
    for (const value of ["", "   ", "ab", "x".repeat(65)]) {
        form.enter(value);
        await form.submit();
        form.render();
        assert.ok(form.input().props.error);
    }
    assert.equal(submissions, 0);
    assert.ok(form.focused.includes("Name"));
});

test("button and keyboard share a synchronous room submit lock and normalized payload", async () => {
    const requests = [];
    let finish;
    const form = mountForm({
        onSubmit: async (values) => {
            requests.push({ name: values.name });
            await new Promise((resolve) => (finish = resolve));
        },
    });
    form.enter("  Kitchen  ");
    const pending = form.submit();
    const duplicate = form.input().props.onSubmitEditing();
    assert.deepEqual(requests, [{ name: "Kitchen" }]);
    form.render();
    assert.equal(form.input().props.editable, false);
    assert.equal(form.button().props.loading, true);
    finish();
    await Promise.all([pending, duplicate]);
});

test("a failed room save preserves the name and offers inline retry above the action", async () => {
    let attempts = 0;
    const form = mountForm({
        onSubmit: async () => {
            if (++attempts === 1) throw new Error("Connection unavailable");
        },
    });
    form.enter("Kitchen");
    await assert.doesNotReject(form.submit());
    form.render();
    assert.equal(form.input().props.value, "Kitchen");
    assert.equal(form.input().props.error, "");
    assert.equal(form.button().props.loading, false);
    assert.match(form.text(), /Connection unavailable/);
    const alertIndex = form.elements().findIndex((node) => node.type === "Alert");
    assert.ok(alertIndex >= 0 && alertIndex < form.elements().indexOf(form.button()));
    await form.submit();
    assert.equal(attempts, 2);
    form.enter("Office");
    assert.doesNotMatch(form.text(), /Connection unavailable/);
});

test("a room save completed while blurred clears pending state and updates the saved baseline", async () => {
    let finish;
    const form = mountForm({
        edit: true,
        initName: "Kitchen",
        onSubmit: () => new Promise((resolve) => (finish = resolve)),
    });
    assert.equal(form.button().props.disabled, true);
    form.enter("Office");
    const pending = form.submit();
    form.blur();
    finish();
    await pending;
    form.refocus();
    form.render();
    assert.equal(form.button().props.loading, false);
    assert.equal(form.button().props.disabled, true);
    form.enter("Kitchen");
    assert.equal(form.button().props.disabled, false);
    form.enter("Office");
    assert.equal(form.button().props.disabled, true);
});

test("disabled and unfocused room forms reject keyboard and stale button submissions", async () => {
    let submissions = 0;
    const form = mountForm({ disabled: true, onSubmit: async () => submissions++ });
    form.enter("Kitchen");
    await form.submit();
    assert.equal(submissions, 0);
    const focused = mountForm({ onSubmit: async () => submissions++ });
    focused.enter("Kitchen");
    focused.blur();
    await focused.input().props.onSubmitEditing();
    assert.equal(submissions, 0);
});

function mountRoute(file, { get, post, patch, remove, refreshRooms, current = home } = {}) {
    let focus;
    let roomId = "room-1";
    const navigation = [];
    const requests = [];
    const homes = { current, loading: false, refreshRooms: refreshRooms || (async () => true) };
    const route = mountNativeComponent(file, {
        modules: {
            "@/components/room/RoomForm": "RoomForm",
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
            "@/contexts/domain/HomeProvider": { useHomes: () => homes },
            "@/contexts/HttpClientProvider": {
                useHttpClient: () => ({
                    get: async (path) =>
                        get ? get(path) : { isSuccess: true, response: { json: async () => room } },
                    ...Object.fromEntries(
                        [
                            ["post", post],
                            ["patch", patch],
                            ["delete", remove],
                        ].map(([method, run]) => [
                            method,
                            async (path, body) => {
                                requests.push({ method, path, body });
                                return run
                                    ? run()
                                    : { isSuccess: true, statusCode: 204, response: null };
                            },
                        ]),
                    ),
                }),
            },
            "expo-router": {
                useFocusEffect: (callback) => (focus = callback),
                useLocalSearchParams: () => ({ id: [roomId] }),
                useRouter: () => ({
                    canGoBack: () => true,
                    back: () => navigation.push("back"),
                    replace: (path) => navigation.push(path),
                }),
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
        setRoomId: (next) => {
            roomId = next;
            route.render();
            route.flushEffects();
        },
        form: () => route.elements().find((node) => node.type === "RoomForm"),
        action: (type) => {
            const parent = route.elements().find((node) => node.type === type);
            assert.ok(parent, `Missing ${type} recovery or confirmation`);
            return route.elements(parent).find((node) => node.type === "Button");
        },
    };
}

test("room detail loading failures offer retry instead of an endless spinner", async () => {
    let loads = 0;
    const route = mountRoute("src/app/(app)/home/room/details.tsx", {
        get: async () =>
            ++loads === 1
                ? { isSuccess: false, statusCode: 503, response: null }
                : { isSuccess: true, response: { json: async () => room } },
    });
    route.flushEffects();
    await settle();
    route.render();
    const retry = route
        .elements()
        .find((node) => node.type === "Button" && /retry/i.test(node.props.name));
    assert.ok(retry, "Failed room reads need a visible retry action");
    retry.props.onPress();
    route.render();
    route.flushEffects();
    await settle();
    route.render();
    assert.equal(route.form().props.initName, "Kitchen");
});

test("accepted room creation is never repeated when list refresh fails or completion is blurred", async () => {
    let finish;
    const route = mountRoute("src/app/(app)/home/room/add.tsx", {
        post: () => new Promise((resolve) => (finish = resolve)),
        refreshRooms: async () => {
            throw new Error("Refresh unavailable");
        },
    });
    const submit = route.form().props.onSubmit;
    const pending = submit({ name: "Office" });
    route.blur();
    finish({ isSuccess: true, statusCode: 201, response: null });
    await assert.doesNotReject(pending);
    route.refocus();
    await submit({ name: "Office" });
    assert.equal(route.requests.length, 1);
    assert.equal(route.requests[0].path, "v1/homes/home-1/rooms");
    assert.deepEqual(route.navigation, ["back"]);
});

test("room deletion cancels without a request and failures retain inline recovery", async () => {
    let finish;
    const route = mountRoute("src/app/(app)/home/room/details.tsx", {
        remove: () => new Promise((resolve) => (finish = resolve)),
    });
    route.flushEffects();
    await settle();
    route.render();
    const trigger = () => route.action("AlertDialogTrigger");
    trigger().props.onPress();
    route.render();
    route.action("AlertDialogCancel").props.onPress();
    assert.equal(route.requests.length, 0);
    trigger().props.onPress();
    route.render();
    const confirm = route.action("AlertDialogAction");
    const pending = confirm.props.onPress();
    confirm.props.onPress();
    assert.equal(route.requests.length, 1, "Repeated confirmation must not repeat DELETE");
    finish({ isSuccess: false, statusCode: 503, response: null });
    await pending;
    await settle();
    route.render();
    assert.ok(route.elements().some((node) => node.type === "Alert"));
    assert.equal(route.form().props.disabled, false);
    assert.equal(route.form().props.initName, "Kitchen");
    assert.deepEqual(route.navigation, []);
});

test("a completed save for the previous room cannot close a different room editor", async () => {
    let finish;
    const route = mountRoute("src/app/(app)/home/room/details.tsx", {
        get: async (path) => ({
            isSuccess: true,
            response: {
                json: async () =>
                    path.endsWith("room-2") ? { id: "room-2", name: "Office" } : room,
            },
        }),
        patch: () => new Promise((resolve) => (finish = resolve)),
    });
    route.flushEffects();
    await settle();
    route.render();
    const pending = route.form().props.onSubmit({ name: "Kitchen updated" });
    route.setRoomId("room-2");
    await settle();
    route.render();
    finish({ isSuccess: true, statusCode: 204, response: null });
    await pending;
    route.render();
    assert.deepEqual(route.navigation, []);
    assert.equal(route.form().props.initName, "Office");
    assert.equal(route.form().props.disabled, false);
});

test("a stale Save handler rejects while deletion is pending so its draft cannot be marked saved", async () => {
    let finish;
    const route = mountRoute("src/app/(app)/home/room/details.tsx", {
        remove: () => new Promise((resolve) => (finish = resolve)),
    });
    route.flushEffects();
    await settle();
    route.render();
    const save = route.form().props.onSubmit;
    const pending = route.action("AlertDialogAction").props.onPress();
    await assert.rejects(save({ name: "Office" }));
    assert.equal(route.requests.length, 1);
    assert.equal(route.requests[0].method, "delete");
    finish({ isSuccess: false, statusCode: 503, response: null });
    await pending;
});
