import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const theme = {
    current: {
        colors: {
            background: "background",
            authForeground: "foreground",
            authMuted: "muted",
            error: "error",
            authBorder: "border",
            primary: "primary",
        },
    },
};
const condition = (operationId, conditionType, conditionConfiguration) => ({
    operationId,
    operationName: operationId,
    conditionType,
    conditionConfiguration,
});
const result = (operationId, valueToSend) => ({
    operationId,
    operationName: operationId,
    valueToSend,
});
const saved = (overrides = {}) => ({
    id: "automation-1",
    homeId: "home-1",
    name: "Old name",
    icon: "legacy-icon-key",
    conditionConnector: "And",
    isEnabled: true,
    conditions: [
        condition("door", "BooleanCondition", { isOn: false }),
        condition("temp", "NumberCondition", { minValue: 0 }),
    ],
    results: [result("lamp", false), result("heater", 0)],
    ...overrides,
});

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((done, fail) => {
        resolve = done;
        reject = fail;
    });
    return { promise, resolve, reject };
}

async function settle(component, turns = 12) {
    for (let index = 0; index < turns; index++) {
        await Promise.resolve();
        component.render();
        component.flushEffects();
    }
}

function mountDetails({
    params = { automationId: "automation-1" },
    home = { current: { id: "home-1", isOwner: true, canManage: false } },
    get = async () => ({ isSuccess: true, response: { json: async () => saved() } }),
    put = async () => ({ isSuccess: true }),
    patch = async () => ({ isSuccess: true }),
    remove = async () => ({ isSuccess: true }),
    refresh = async () => true,
    canGoBack = true,
    back = () => {},
    replace = () => {},
} = {}) {
    const requests = { get: [], put: [], patch: [], delete: [] };
    const refreshCalls = [];
    const navigation = [];
    const sessions = [];
    const provider = {
        session: undefined,
        beginSession(homeId, automation) {
            const token = `details-${sessions.length + 1}`;
            sessions.push([homeId, automation, token]);
            this.session = {
                token,
                homeId,
                automationId: automation.id,
                conditions: automation.conditions ?? [],
                results: automation.results ?? [],
            };
            return token;
        },
        clearSession(token) {
            if (this.session?.token === token) this.session = undefined;
        },
        isCurrentSession(token) {
            return this.session?.token === token && this.session.homeId === home.current?.id;
        },
        value() {
            return {
                session: provider.session,
                beginSession: provider.beginSession.bind(provider),
                clearSession: provider.clearSession.bind(provider),
                isCurrentSession: provider.isCurrentSession.bind(provider),
            };
        },
        sessions,
    };
    let focusEffect;
    let cleanup;
    let routeParams = params;
    const router = {
        canGoBack: () => canGoBack,
        back: () => {
            navigation.push(["back"]);
            return back();
        },
        replace: (destination) => {
            navigation.push(["replace", destination]);
            return replace(destination);
        },
    };
    const list = {
        refresh: (homeId) => {
            refreshCalls.push(homeId);
            return refresh(homeId);
        },
    };
    const route = mountNativeComponent("src/app/(app)/automation/details.tsx", {
        modules: {
            "expo-router": {
                useLocalSearchParams: () => routeParams,
                useFocusEffect: (callback) => (focusEffect = callback),
                useRouter: () => router,
            },
            "react-native": {
                StyleSheet: { create: (styles) => styles },
                View: "View",
                ScrollView: "ScrollView",
                Modal: "Modal",
                Text: "Text",
            },
            "@rn-primitives/portal": { PortalHost: "PortalHost" },
            "lucide-react-native": { CircleAlert: "CircleAlert", Info: "Info", Trash2: "Trash2" },
            "@/contexts/HttpClientProvider": {
                useHttpClient: () => ({
                    get: (path) => {
                        requests.get.push(path);
                        return get(path);
                    },
                    put: (path, body) => {
                        requests.put.push([path, { ...body }]);
                        return put(path, body);
                    },
                    patch: (path, body) => {
                        requests.patch.push([path, { ...body }]);
                        return patch(path, body);
                    },
                    delete: (path) => {
                        requests.delete.push(path);
                        return remove(path);
                    },
                }),
            },
            "@/contexts/custom/AutomationListProvider": { useAutomationList: () => list },
            "@/contexts/custom/AutomationProvider": { useAutomation: provider.value },
            "@/contexts/domain/HomeProvider": { useHomes: () => home },
            "@/contexts/ToastProvider": {
                useToast: () => ({ success() {}, error() {}, info() {} }),
            },
            "@/contexts/ThemeProvider": { useTheme: () => theme },
            "@/components/common/Button": "Button",
            "@/components/common/ContentSection": "ContentSection",
            "@/components/common/ConfirmDialog": "ConfirmDialog",
            "@/components/common/FAB": "FAB",
            "@/components/common/Icon": "Icon",
            "@/components/common/Loading": "Loading",
            "@/components/common/SectionHeaderAction": "SectionHeaderAction",
            "@/components/automations/AutomationForm": "AutomationForm",
            "@/components/ui/alert": { Alert: "Alert", AlertDescription: "AlertDescription" },
            "@/components/ui/alert-dialog": {
                AlertDialog: "AlertDialog",
                AlertDialogAction: "AlertDialogAction",
                AlertDialogCancel: "AlertDialogCancel",
                AlertDialogContent: "AlertDialogContent",
                AlertDialogDescription: "AlertDialogDescription",
                AlertDialogFooter: "AlertDialogFooter",
                AlertDialogHeader: "AlertDialogHeader",
                AlertDialogTitle: "AlertDialogTitle",
                AlertDialogTrigger: "AlertDialogTrigger",
            },
        },
    });
    cleanup = focusEffect?.();
    const form = () => route.elements().find((node) => node.type === "AutomationForm");
    const elements = () => [
        ...route.elements(),
        ...(form()?.props.footer ? route.elements(form().props.footer) : []),
    ];
    const buttons = (name) =>
        elements().filter((node) => node.type === "Button" && node.props.name === name);
    const button = (name) =>
        route
            .elements(form()?.props.footer)
            .find((node) => node.type === "Button" && node.props.name === name) ?? buttons(name)[0];
    const dialog = () => elements().find((node) => node.type === "AlertDialog");
    const nativeModal = () => elements().find((node) => node.type === "Modal");
    const dialogContent = () => elements().find((node) => node.type === "AlertDialogContent");
    const portalHost = () => elements().find((node) => node.type === "PortalHost");
    const confirmButton = () => {
        const wrapper = elements().find((node) => node.type === "AlertDialogAction");
        return route
            .elements(wrapper)
            .find((node) => node.type === "Button" && node.props.name === "Delete automation");
    };
    return {
        ...route,
        home,
        provider,
        requests,
        refreshCalls,
        navigation,
        router,
        form,
        elements,
        button,
        buttons,
        dialog,
        nativeModal,
        dialogContent,
        portalHost,
        confirmButton,
        focus() {
            cleanup = focusEffect?.();
        },
        blur() {
            cleanup?.();
            cleanup = undefined;
        },
        retarget(next) {
            routeParams = next;
            route.render();
            route.flushEffects();
        },
        async load() {
            route.flushEffects();
            await settle(route);
        },
    };
}

test("details rejects missing or blank IDs and normalizes array IDs to first value", async () => {
    for (const params of [{}, { automationId: "  " }, { automationId: [] }]) {
        const invalid = mountDetails({ params });
        await invalid.load();
        assert.equal(invalid.requests.get.length, 0);
        assert.equal(invalid.form(), undefined);
    }

    const array = mountDetails({ params: { automationId: ["automation-1", "other"] } });
    await array.load();
    assert.deepEqual(array.requests.get, ["v1/automations/automation-1"]);
    assert.ok(array.form());
});

test("details does not open an editor for failed, malformed, or mismatched reads and can retry", async () => {
    let attempt = 0;
    const route = mountDetails({
        get: async () => {
            attempt++;
            if (attempt === 1) return { isSuccess: false, statusCode: 503 };
            return { isSuccess: true, response: { json: async () => saved({ name: undefined }) } };
        },
    });
    await route.load();
    assert.equal(route.form(), undefined);
    assert.ok(route.button("Retry"));
    await route.button("Retry").props.onPress();
    await settle(route);
    assert.equal(route.form(), undefined, "malformed payload never becomes empty editor");

    const mismatch = mountDetails({
        get: async () => ({
            isSuccess: true,
            response: { json: async () => saved({ homeId: "other-home" }) },
        }),
    });
    await mismatch.load();
    assert.equal(mismatch.form(), undefined);
});

test("late details read cannot bind to a different selected home", async () => {
    const response = deferred();
    const home = { current: { id: "home-1", isOwner: true, canManage: false } };
    const route = mountDetails({ home, get: () => response.promise });
    route.flushEffects();
    assert.deepEqual(route.requests.get, ["v1/automations/automation-1"]);
    home.current = { id: "home-2", isOwner: true, canManage: false };
    route.render();
    response.resolve({ isSuccess: true, response: { json: async () => saved() } });
    await settle(route);
    assert.equal(route.form(), undefined);
    assert.equal(route.provider.sessions.length, 0);
});

test("invalidated details reads leave home-change and blank-ID recovery visible", async () => {
    const homeResponse = deferred();
    const home = { current: { id: "home-1", isOwner: true, canManage: false } };
    const homeRoute = mountDetails({ home, get: () => homeResponse.promise });
    homeRoute.flushEffects();
    home.current = { id: "home-2", isOwner: true, canManage: false };
    homeRoute.render();
    homeResponse.resolve({ isSuccess: true, response: { json: async () => saved() } });
    await settle(homeRoute);
    assert.ok(homeRoute.button("Return to automations"));
    assert.equal(
        homeRoute.elements().some((node) => node.type === "Loading"),
        false,
    );

    const blankResponse = deferred();
    const blankRoute = mountDetails({ get: () => blankResponse.promise });
    blankRoute.flushEffects();
    blankRoute.retarget({ automationId: "  " });
    blankResponse.resolve({ isSuccess: true, response: { json: async () => saved() } });
    await settle(blankRoute);
    assert.ok(blankRoute.button("Return to automations"));
    assert.equal(
        blankRoute.elements().some((node) => node.type === "Loading"),
        false,
    );
});

test("older details read keeps newer valid automation loading until its read settles", async () => {
    const first = deferred();
    const second = deferred();
    const route = mountDetails({
        get: (path) => (path.endsWith("automation-1") ? first.promise : second.promise),
    });
    route.flushEffects();
    route.retarget({ automationId: "automation-2" });
    assert.equal(
        route.elements().some((node) => node.type === "Loading"),
        true,
    );

    first.resolve({ isSuccess: true, response: { json: async () => saved() } });
    await settle(route);
    assert.equal(
        route.elements().some((node) => node.type === "Loading"),
        true,
    );
    assert.equal(route.form(), undefined);

    second.resolve({
        isSuccess: true,
        response: { json: async () => saved({ id: "automation-2", name: "Automation B" }) },
    });
    await settle(route);
    assert.equal(route.form().props.initialValues.name, "Automation B");
});

test("blurred details read cannot replace a newer same-home automation session", async () => {
    const response = deferred();
    const route = mountDetails({ get: () => response.promise });
    route.flushEffects();
    assert.deepEqual(route.requests.get, ["v1/automations/automation-1"]);
    route.blur();
    const newerSession = {
        token: "new-create-visit",
        homeId: "home-1",
        conditions: [],
        results: [],
    };
    route.provider.session = newerSession;
    response.resolve({ isSuccess: true, response: { json: async () => saved() } });
    await settle(route);

    assert.equal(route.provider.session, newerSession);
    assert.equal(route.provider.sessions.length, 0, "stale read never starts a saved session");
});

test("roles control details editing and owner-only children/delete while preserving stored history", async () => {
    for (const [role, readOnly, canAddChildren, hasDelete] of [
        ["Display", true, false, false],
        ["Manage", false, false, false],
        ["Owner", false, true, true],
    ]) {
        const home = {
            current: {
                id: "home-1",
                isOwner: role === "Owner",
                canManage: role === "Manage",
            },
        };
        const route = mountDetails({ home });
        await route.load();
        assert.equal(route.form().props.readOnly, readOnly);
        assert.equal(route.form().props.canAddChildren, canAddChildren);
        assert.equal(route.form().props.initialValues.icon, "legacy-icon-key");
        assert.equal(Boolean(route.form().props.footer), hasDelete);
        assert.deepEqual(route.provider.session.conditions[0].conditionConfiguration, {
            isOn: false,
        });
        assert.deepEqual(route.provider.session.conditions[1].conditionConfiguration, {
            minValue: 0,
        });
        assert.equal(route.provider.session.results[0].valueToSend, false);
        assert.equal(route.provider.session.results[1].valueToSend, 0);
    }
});

test("refocusing unchanged details keeps loaded session and does not reread", async () => {
    const route = mountDetails();
    await route.load();
    const token = route.form().props.sessionToken;
    route.blur();
    route.focus();
    route.render();
    assert.deepEqual(route.requests.get, ["v1/automations/automation-1"]);
    assert.equal(route.provider.session.token, token);
});

test("metadata-only save patches only dirty metadata and never rewrites historical children", async () => {
    const route = mountDetails({
        refresh: async () => {
            throw new Error("offline");
        },
    });
    await route.load();
    const form = route.form();
    const values = {
        name: "New name",
        icon: "legacy-icon-key",
        conditionConnector: "And",
        isEnabled: true,
    };
    await form.props.onSubmit(values);
    assert.deepEqual(route.requests.put, []);
    assert.deepEqual(route.requests.patch, [["v1/automations/automation-1", { name: "New name" }]]);
    assert.deepEqual(values, {
        name: "New name",
        icon: "legacy-icon-key",
        conditionConnector: "And",
        isEnabled: true,
    });
    assert.deepEqual(route.provider.session.conditions[1].conditionConfiguration, { minValue: 0 });
    assert.equal(route.provider.session.results[0].valueToSend, false);
    assert.equal(route.provider.session.results[1].valueToSend, 0);
    assert.deepEqual(route.refreshCalls, ["home-1"]);
    await form.props.onSubmit(values);
    assert.equal(route.requests.patch.length, 1, "refresh failure does not repeat accepted write");
});

test("state saves precede metadata and retry only metadata after a partial acceptance", async () => {
    let patchAttempt = 0;
    const route = mountDetails({
        put: async () => ({ isSuccess: true }),
        patch: async () => ({ isSuccess: ++patchAttempt > 1 }),
    });
    await route.load();
    const submit = route.form().props.onSubmit;
    const values = {
        name: "New name",
        icon: "legacy-icon-key",
        conditionConnector: "And",
        isEnabled: false,
    };
    await submit(values);
    assert.deepEqual(route.requests.put, [
        ["v1/automations/automation-1/state", { isEnabled: false }],
    ]);
    assert.deepEqual(route.requests.patch, [["v1/automations/automation-1", { name: "New name" }]]);

    await route.form().props.onSubmit(values);
    assert.equal(route.requests.put.length, 1);
    assert.equal(route.requests.patch.length, 2);
    assert.deepEqual(route.requests.patch[1][1], { name: "New name" });
});

test("accepted state advances its original baseline but role loss stops the metadata PATCH", async () => {
    const response = deferred();
    const home = { current: { id: "home-1", isOwner: true, canManage: false } };
    const route = mountDetails({ home, put: () => response.promise });
    await route.load();
    const saving = route.form().props.onSubmit({
        name: "New name",
        icon: "legacy-icon-key",
        conditionConnector: "And",
        isEnabled: false,
    });
    assert.equal(route.requests.put.length, 1);
    home.current = { id: "home-1", isOwner: false, canManage: false };
    route.render();
    response.resolve({ isSuccess: true });
    await saving;
    route.render();

    assert.equal(route.requests.patch.length, 0, "permission is rechecked before PATCH");
    assert.equal(
        route.form().props.initialValues.isEnabled,
        false,
        "accepted state stays saved on this visit",
    );
    assert.equal(
        route.form().props.initialValues.name,
        "Old name",
        "unaccepted metadata remains unsaved",
    );
});

test("failed state PUT stops metadata PATCH", async () => {
    const route = mountDetails({ put: async () => ({ isSuccess: false, statusCode: 503 }) });
    await route.load();
    await route.form().props.onSubmit({
        name: "New name",
        icon: "legacy-icon-key",
        conditionConnector: "And",
        isEnabled: false,
    });
    assert.equal(route.requests.put.length, 1);
    assert.equal(route.requests.patch.length, 0);
});

test("late state PUT cannot publish its baseline into a retargeted details editor", async () => {
    const response = deferred();
    const route = mountDetails({
        get: async (path) => ({
            isSuccess: true,
            response: {
                json: async () =>
                    path.endsWith("automation-2")
                        ? saved({ id: "automation-2", name: "Automation B" })
                        : saved(),
            },
        }),
        put: () => response.promise,
    });
    await route.load();
    const saving = route.form().props.onSubmit({
        name: "Automation A draft",
        icon: "legacy-icon-key",
        conditionConnector: "And",
        isEnabled: false,
    });

    route.retarget({ automationId: "automation-2" });
    await route.load();
    assert.deepEqual(route.requests.get, [
        "v1/automations/automation-1",
        "v1/automations/automation-2",
    ]);
    assert.equal(route.provider.sessions.length, 2, JSON.stringify(route.provider.sessions));
    assert.ok(route.form(), route.text());
    assert.equal(route.form().props.initialValues.name, "Automation B");
    response.resolve({ isSuccess: true });
    await saving;
    route.render();

    assert.equal(route.form().props.initialValues.name, "Automation B");
    assert.equal(route.form().props.initialValues.isEnabled, true);
    assert.equal(route.provider.session.automationId, "automation-2");
    assert.equal(route.requests.patch.length, 0, "retargeted save does not continue into PATCH");
    await route.form().props.onSubmit({
        name: "Automation B renamed",
        icon: "legacy-icon-key",
        conditionConnector: "And",
        isEnabled: true,
    });
    assert.deepEqual(route.requests.patch, [
        ["v1/automations/automation-2", { name: "Automation B renamed" }],
    ]);
});

test("late metadata PATCH cannot overwrite a retargeted details editor", async () => {
    const response = deferred();
    const route = mountDetails({
        get: async (path) => ({
            isSuccess: true,
            response: {
                json: async () =>
                    path.endsWith("automation-2")
                        ? saved({ id: "automation-2", name: "Automation B" })
                        : saved(),
            },
        }),
        patch: () => response.promise,
    });
    await route.load();
    const saving = route.form().props.onSubmit({
        name: "Automation A accepted name",
        icon: "legacy-icon-key",
        conditionConnector: "And",
        isEnabled: true,
    });
    assert.deepEqual(route.requests.patch, [
        ["v1/automations/automation-1", { name: "Automation A accepted name" }],
    ]);

    route.retarget({ automationId: "automation-2" });
    await route.load();
    assert.deepEqual(route.requests.get, [
        "v1/automations/automation-1",
        "v1/automations/automation-2",
    ]);
    assert.ok(route.form(), route.text());
    response.resolve({ isSuccess: true });
    await saving;
    route.render();

    assert.equal(route.form().props.initialValues.name, "Automation B");
    assert.equal(route.provider.session.automationId, "automation-2");
    await route.form().props.onSubmit({
        name: "Automation B renamed",
        icon: "legacy-icon-key",
        conditionConnector: "And",
        isEnabled: true,
    });
    assert.deepEqual(route.requests.patch[1], [
        "v1/automations/automation-2",
        { name: "Automation B renamed" },
    ]);
});

test("retained details save callback cannot write after route blur", async () => {
    const route = mountDetails();
    await route.load();
    const submit = route.form().props.onSubmit;
    route.blur();
    await submit({
        name: "New name",
        icon: "legacy-icon-key",
        conditionConnector: "And",
        isEnabled: true,
    });
    assert.deepEqual(route.requests.put, []);
    assert.deepEqual(route.requests.patch, []);
});

test("owner delete uses its named native modal; Cancel and Android Back issue no request; accepted delete returns once", async () => {
    let deleteCount = 0;
    let replaceCount = 0;
    const route = mountDetails({
        canGoBack: false,
        remove: async () => {
            deleteCount++;
            return { isSuccess: true };
        },
        replace: () => {
            if (++replaceCount === 1) throw new Error("router unavailable");
        },
    });
    route.focus();
    await route.load();

    route.button("Delete automation").props.onPress();
    route.render();
    assert.equal(route.dialog().props.open, true);
    const modal = route.nativeModal();
    assert.ok(modal, "confirmation renders a native modal");
    assert.equal(modal.props.visible, true);
    assert.equal(route.portalHost().props.name, route.dialogContent().props.portalHost);
    const cancel = route.elements().find((node) => node.type === "AlertDialogCancel");
    route
        .elements(cancel)
        .find((node) => node.type === "Button")
        .props.onPress();
    route.render();
    assert.equal(deleteCount, 0);
    assert.equal(route.nativeModal().props.visible, false);

    route.button("Delete automation").props.onPress();
    route.render();
    route.nativeModal().props.onRequestClose();
    route.render();
    assert.equal(deleteCount, 0, "Android Back only dismisses confirmation");
    assert.equal(route.nativeModal().props.visible, false);

    route.button("Delete automation").props.onPress();
    route.render();
    const confirm = route.confirmButton();
    assert.ok(confirm);
    await confirm.props.onPress();
    route.render();
    assert.equal(deleteCount, 1);
    assert.equal(route.refreshCalls.length, 1);
    assert.equal(route.form().props.accepted, true);
    const retry = route.form().props.onSubmit;
    await retry({
        name: "Old name",
        icon: "legacy-icon-key",
        conditionConnector: "And",
        isEnabled: true,
    });
    assert.equal(deleteCount, 1);
    assert.deepEqual(route.navigation, [
        ["replace", "/automation/list"],
        ["replace", "/automation/list"],
    ]);
});

test("stale automation A confirmation cannot delete automation B after route retarget", async () => {
    const route = mountDetails({
        get: async (path) => ({
            isSuccess: true,
            response: {
                json: async () =>
                    path.endsWith("automation-2")
                        ? saved({ id: "automation-2", name: "Automation B" })
                        : saved(),
            },
        }),
    });
    await route.load();
    route.button("Delete automation").props.onPress();
    route.render();
    const staleConfirm = route.confirmButton();
    assert.ok(staleConfirm);

    route.retarget({ automationId: "automation-2" });
    await route.load();
    assert.equal(route.nativeModal().props.visible, false, "new visit dismisses A's dialog");
    await staleConfirm.props.onPress();

    assert.deepEqual(route.requests.delete, [], "A's retained confirmation cannot delete B");
    assert.equal(route.form().props.initialValues.name, "Automation B");
    assert.equal(route.form().props.accepted, false);
});

test("selected-home change dismisses open owner delete confirmation and blocks its action", async () => {
    const home = { current: { id: "home-1", isOwner: true, canManage: false } };
    const route = mountDetails({ home });
    await route.load();
    route.button("Delete automation").props.onPress();
    route.render();
    const staleConfirm = route.confirmButton();
    assert.equal(route.nativeModal().props.visible, true);

    home.current = { id: "home-2", isOwner: true, canManage: false };
    route.render();
    assert.equal(route.nativeModal(), undefined, "invalid home removes the modal host");
    await staleConfirm.props.onPress();

    assert.deepEqual(route.requests.delete, []);
});

test("late delete for A cannot accept or unlock B while B saves", async () => {
    const deleteResponse = deferred();
    const patchResponse = deferred();
    const route = mountDetails({
        get: async (path) => ({
            isSuccess: true,
            response: {
                json: async () =>
                    path.endsWith("automation-2")
                        ? saved({ id: "automation-2", name: "Automation B" })
                        : saved(),
            },
        }),
        remove: () => deleteResponse.promise,
        patch: (path) => (path.endsWith("automation-2") ? patchResponse.promise : undefined),
    });
    await route.load();
    route.button("Delete automation").props.onPress();
    route.render();
    const deletingA = route.confirmButton().props.onPress();

    route.retarget({ automationId: "automation-2" });
    await route.load();
    const saveB = route.form().props.onSubmit({
        name: "Automation B renamed",
        icon: "legacy-icon-key",
        conditionConnector: "And",
        isEnabled: true,
    });
    route.render();
    assert.deepEqual(route.requests.patch, [
        ["v1/automations/automation-2", { name: "Automation B renamed" }],
    ]);
    assert.equal(route.form().props.pending, true);

    deleteResponse.resolve({ isSuccess: true });
    await deletingA;
    route.render();
    assert.equal(route.form().props.accepted, false);
    assert.ok(route.form().props.footer, "B keeps its owner delete action");
    assert.equal(route.form().props.pending, true, "A completion cannot clear B's pending save");
    assert.deepEqual(route.navigation, []);
    await route.form().props.onSubmit({
        name: "Duplicate while B pending",
        icon: "legacy-icon-key",
        conditionConnector: "And",
        isEnabled: true,
    });
    assert.equal(route.requests.patch.length, 1, "B stays locked until its save settles");

    patchResponse.resolve({ isSuccess: true });
    await saveB;
    await route.form().props.onSubmit({
        name: "Automation B saved again",
        icon: "legacy-icon-key",
        conditionConnector: "And",
        isEnabled: true,
    });
    assert.equal(route.requests.patch.length, 2, "B accepts a later save after its own request");
    assert.deepEqual(route.navigation, []);
});

test("accepted A delete return failure does not lock B or suppress B save", async () => {
    const route = mountDetails({
        get: async (path) => ({
            isSuccess: true,
            response: {
                json: async () =>
                    path.endsWith("automation-2")
                        ? saved({ id: "automation-2", name: "Automation B" })
                        : saved(),
            },
        }),
        back: () => {
            throw new Error("Back failed");
        },
    });
    await route.load();
    route.button("Delete automation").props.onPress();
    route.render();
    await route.confirmButton().props.onPress();
    route.render();
    assert.equal(route.form().props.accepted, true);

    route.retarget({ automationId: "automation-2" });
    await route.load();
    assert.equal(route.form().props.accepted, false);
    assert.ok(route.form().props.footer, "B retains its owner controls");
    await route.form().props.onSubmit({
        name: "Automation B renamed",
        icon: "legacy-icon-key",
        conditionConnector: "And",
        isEnabled: true,
    });
    assert.deepEqual(route.requests.patch, [
        ["v1/automations/automation-2", { name: "Automation B renamed" }],
    ]);
    assert.deepEqual(route.requests.delete, ["v1/automations/automation-1"]);
});

test("owner callback cannot delete after live role loss", async () => {
    const home = { current: { id: "home-1", isOwner: true, canManage: false } };
    const route = mountDetails({ home });
    await route.load();
    const confirm = route.form().props.footer;
    const trigger = route.button("Delete automation");
    assert.ok(confirm && trigger);
    trigger.props.onPress();
    route.render();
    const staleConfirm = route.confirmButton();
    assert.equal(route.nativeModal().props.visible, true);

    home.current = { id: "home-1", isOwner: false, canManage: true };
    route.render();
    route.flushEffects();
    route.render();
    assert.equal(route.nativeModal().props.visible, false);
    staleConfirm.props.onPress();
    await settle(route);
    assert.equal(route.requests.delete.length, 0);
    assert.equal(route.form().props.canAddChildren, false);
});
