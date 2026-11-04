import assert from "node:assert/strict";
import test from "node:test";
import { makeFocusLifecycle, mountNativeComponent } from "./nativeComponentHarness.mjs";

function deferred() {
    let resolve;
    const promise = new Promise((done) => (resolve = done));
    return { promise, resolve };
}

const operation = (id = "operation-a") => ({
    id,
    name: "Living room light",
    topic: "home/light",
    type: "Boolean",
    configuration: { isJson: false },
});

const operationListItem = (id = "operation-a") => ({
    id,
    name: "Living room light",
    type: "Boolean",
});

const success = (body) => ({ isSuccess: true, response: { json: async () => body } });

const home = (id = "home-a") => ({
    id,
    name: "Current home",
    isOwner: true,
    canManage: false,
    rooms: [],
});

const device = (id = "device-a", value = false) => ({
    id,
    name: "Device",
    icon: "opaque-device-key",
    roomId: "room-a",
    tile: { type: "Default", value },
    display: {},
    createdAtUtc: "",
    updatedAtUtc: "",
});

const responseBody = (body) => ({
    isSuccess: true,
    statusCode: 200,
    response: { json: async () => body },
});

function mountDeviceListProvider(get, currentHome = home()) {
    const homes = { current: currentHome };
    const requests = [];
    const component = mountNativeComponent("src/contexts/custom/DeviceListProvider.tsx", {
        exportName: "DeviceListProvider",
        modules: {
            "../domain/HomeProvider": { useHomes: () => homes },
            "../HttpClientProvider": {
                useHttpClient: () => ({
                    get: (path) => {
                        requests.push(path);
                        return get(path);
                    },
                }),
            },
        },
    });
    component.flushEffects();
    return {
        component,
        homes,
        requests,
        value: () => component.elements()[0].props.value,
    };
}

async function settleProvider(component) {
    for (let attempt = 0; attempt < 8; attempt++) {
        await new Promise((resolve) => setImmediate(resolve));
        component.render();
        component.flushEffects();
    }
}

function mountDetails(overrides = {}) {
    const state = {
        params: { operationId: "operation-a", deviceId: "device-a" },
        home: { loading: false, current: { id: "home-a", isOwner: true, canManage: false } },
        devices: [{ id: "device-a" }],
        devicesLoading: false,
        devicesError: null,
        operations: [operationListItem()],
        operation: operation(),
        getDeviceList: undefined,
        getOperation: async () => success(state.operation),
        delete: async () => ({ isSuccess: true }),
        refreshDevices: async () => true,
        refreshDevice: async () => true,
        router: {
            canGoBack: () => true,
            back() {},
            replace() {},
        },
        ...overrides,
    };
    const requests = { get: [], delete: [], refresh: [], refreshDevice: [] };
    const deviceList = {
        get devices() {
            return state.devices;
        },
        get loading() {
            return state.devicesLoading;
        },
        get error() {
            return state.devicesError;
        },
        refresh: (...args) => {
            requests.refresh.push(args);
            return state.refreshDevices(...args);
        },
        refreshDevice: (deviceId) => {
            requests.refreshDevice.push(deviceId);
            return state.refreshDevice(deviceId);
        },
    };
    let focusLifecycle;
    const route = mountNativeComponent("src/app/(app)/device/operation/details.tsx", {
        modules: (React) => {
            focusLifecycle = makeFocusLifecycle(React);
            return {
                "expo-router": {
                    useFocusEffect: (callback) => focusLifecycle.useFocusEffect(callback),
                    useLocalSearchParams: () => state.params,
                    useRouter: () => state.router,
                },
                "react-native": {
                    StyleSheet: { create: (styles) => styles },
                    View: "View",
                    ScrollView: "ScrollView",
                    Modal: "Modal",
                },
                "@rn-primitives/portal": { PortalHost: "PortalHost" },
                "@/components/common/Button": "Button",
                "@/components/common/ContentSection": "ContentSection",
                "@/components/common/ConfirmDialog": "ConfirmDialog",
                "@/components/common/FAB": "FAB",
                "@/components/common/Loading": "Loading",
                "@/components/device/operation/OperationForm": "OperationForm",
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
                },
                "@/contexts/custom/DeviceListProvider": {
                    useDeviceList: () => state.getDeviceList?.() ?? deviceList,
                },
                "@/contexts/domain/HomeProvider": { useHomes: () => state.home },
                "@/contexts/HttpClientProvider": {
                    useHttpClient: () => ({
                        get: async (path) => {
                            requests.get.push(path);
                            if (path.startsWith("v1/devices/operations/display?"))
                                return success({ items: state.operations });
                            return state.getOperation(path);
                        },
                        delete: async (path) => {
                            requests.delete.push(path);
                            return state.delete(path);
                        },
                    }),
                },
            };
        },
    });
    route.flushEffects();
    focusLifecycle.focus();

    return {
        route,
        state,
        requests,
        focus: () => focusLifecycle.focus(),
        blur: () => focusLifecycle.blur(),
        form: () => route.elements().find((node) => node.type === "OperationForm"),
        button: (name, from) => {
            const section =
                name === "Delete operation" && from === undefined
                    ? route
                          .elements()
                          .find(
                              (node) =>
                                  node.type === "ContentSection" &&
                                  node.props.title === "Delete operation",
                          )
                    : undefined;
            if (name === "Delete operation" && from === undefined && !section) return undefined;
            return route
                .elements(from ?? section ?? route.output())
                .find((node) => node.type === "Button" && node.props.name === name);
        },
        deleteSection: () =>
            route
                .elements()
                .find(
                    (node) =>
                        node.type === "ContentSection" && node.props.title === "Delete operation",
                ),
        dialog: () => route.elements().find((node) => node.type === "AlertDialog"),
        confirmDelete: () => {
            const action = route.elements().find((node) => node.type === "AlertDialogAction");
            return action && route.elements(action).find((node) => node.type === "Button");
        },
        async settle() {
            for (let attempt = 0; attempt < 3; attempt++) {
                await new Promise((resolve) => setImmediate(resolve));
                route.render();
                route.flushEffects();
            }
        },
        async ready() {
            await this.settle();
        },
        async retry(name = "Retry") {
            const retry = this.button(name);
            assert.ok(retry, `${name} should be available`);
            retry.props.onPress();
            await this.settle();
        },
    };
}

test("failed operation read never mounts a blank form and Retry reads again", async () => {
    let reads = 0;
    const mounted = mountDetails({
        getOperation: async () => {
            if (++reads === 1) return { isSuccess: false, statusCode: 503 };
            return success(operation());
        },
    });
    await mounted.ready();

    assert.equal(mounted.form(), undefined);
    assert.match(mounted.route.text(), /Failed to load operation details/);
    await mounted.retry();
    assert.equal(reads, 2);
    assert.equal(mounted.form().props.initName, "Living room light");
});

test("malformed and mismatched operation reads stay out of the form", async () => {
    const malformed = mountDetails({
        getOperation: async () => success({ id: "operation-a", name: 17 }),
    });
    await malformed.ready();
    assert.equal(malformed.form(), undefined);
    assert.ok(malformed.button("Retry"));

    const mismatched = mountDetails({
        getOperation: async () => success(operation("other-operation")),
    });
    await mismatched.ready();
    assert.equal(mismatched.form(), undefined);
    assert.match(mismatched.route.text(), /Failed to load operation details/);

    const rejectedJson = mountDetails({
        getOperation: async () => ({
            isSuccess: true,
            response: { json: async () => Promise.reject(new Error("invalid JSON")) },
        }),
    });
    await rejectedJson.ready();
    assert.equal(rejectedJson.form(), undefined);
    assert.ok(rejectedJson.button("Retry"));
});

test("malformed nested configuration stays local, retries, and never mounts the form", async () => {
    const malformed = {
        ...operation(),
        type: "Text",
        configuration: { isJson: true, jsonNames: { value: "status" } },
    };
    const repairedConfiguration = { isJson: false, saveOnUserAction: false };
    const repaired = {
        ...operation(),
        type: "Text",
        configuration: repairedConfiguration,
    };
    let reads = 0;
    const mounted = mountDetails({
        getOperation: async () => success(++reads === 1 ? malformed : repaired),
    });
    await mounted.ready();

    assert.equal(mounted.form(), undefined);
    assert.match(mounted.route.text(), /Failed to load operation details/);
    assert.ok(mounted.button("Retry"));
    await mounted.retry();
    assert.equal(reads, 2);
    assert.strictEqual(mounted.form().props.initConfiguration, repairedConfiguration);
});

test("malformed consumed configuration shapes are rejected before mounting", async () => {
    const malformed = [
        ["isJson", "Text", { isJson: "true" }],
        ["saveOnUserAction", "Text", { saveOnUserAction: {} }],
        ["jsonNames object", "Text", { isJson: true, jsonNames: { value: "status" } }],
        ["jsonNames entry", "Text", { isJson: true, jsonNames: ["status", 0] }],
        ["numeric minimum", "Number", { min: "0" }],
        ["numeric maximum", "Integer", { max: null }],
        ["decimal separator", "Number", { decimalSeparator: { value: "," } }],
        ["Boolean true value", "Boolean", { trueValue: [] }],
        ["Boolean false value", "Boolean", { falseValue: null }],
        ["null Options entry", "Options", { options: [null] }],
        ["Options name", "Options", { options: [{ name: {}, value: false }] }],
        ["Options scalar value", "Options", { options: [{ name: "On", value: {} }] }],
    ];

    for (const [label, type, configuration] of malformed) {
        const mounted = mountDetails({
            operation: { ...operation(), type, configuration },
        });
        await mounted.ready();

        assert.equal(mounted.form(), undefined, label);
        assert.ok(mounted.button("Retry"), `${label} should offer a local read retry`);
    }
});

test("valid typed configurations and omitted defaults pass through unchanged", async () => {
    const fixtures = [
        ["Boolean", { isJson: false, saveOnUserAction: false, trueValue: false, falseValue: "0" }],
        ["Number", { isJson: false, min: 0, max: 10, decimalSeparator: "," }],
        [
            "Options",
            {
                isJson: false,
                options: [
                    { name: "False", value: false },
                    { name: "Number zero", value: 0 },
                    { name: "Text zero", value: "0" },
                ],
            },
        ],
        ["Text", { isJson: true, jsonNames: ["state", "value"] }],
        ["Text", {}],
    ];

    for (const [type, configuration] of fixtures) {
        const mounted = mountDetails({
            operation: { ...operation(), type, configuration },
        });
        await mounted.ready();

        assert.strictEqual(mounted.form().props.initConfiguration, configuration);
    }
});

test("operation detail normalizes routed IDs and keeps an old operation-only link read-only", async () => {
    const linked = mountDetails({
        params: { operationId: ["operation-a", "ignored"], deviceId: ["device-a", "ignored"] },
    });
    await linked.ready();
    assert.ok(linked.form());
    assert.ok(linked.requests.get.includes("v1/devices/operations/operation-a"));
    assert.ok(
        linked.requests.get.includes(
            "v1/devices/operations/display?deviceId=device-a&size=2147483647",
        ),
    );

    const oldLink = mountDetails({ params: { operationId: "operation-a" } });
    await oldLink.ready();
    assert.ok(oldLink.form(), "An operationId-only link can view server-authorized details");
    assert.equal(
        oldLink.requests.get.some((path) => path.includes("operations/display?")),
        false,
    );
    assert.equal(oldLink.deleteSection(), undefined);

    const missing = mountDetails({ params: { operationId: ["", "operation-a"] } });
    await missing.ready();
    assert.equal(missing.form(), undefined);
    assert.deepEqual(missing.requests.get, []);
});

test("current-home membership and management role gate operation deletion", async () => {
    for (const role of [
        { isOwner: true, canManage: false },
        { isOwner: false, canManage: true },
    ]) {
        const manager = mountDetails({
            home: { loading: false, current: { id: "home-a", ...role } },
        });
        await manager.ready();
        assert.ok(manager.form());
        assert.ok(manager.button("Delete operation"));
    }

    const display = mountDetails({
        home: { loading: false, current: { id: "home-a", isOwner: false, canManage: false } },
    });
    await display.ready();
    assert.ok(display.form(), "Display can read the operation");
    assert.equal(display.button("Delete operation"), undefined);

    const anotherHomeDevice = mountDetails({ devices: [{ id: "device-b" }] });
    await anotherHomeDevice.ready();
    assert.ok(anotherHomeDevice.form());
    assert.equal(anotherHomeDevice.button("Delete operation"), undefined);
    assert.equal(anotherHomeDevice.requests.delete.length, 0);

    const absentOperation = mountDetails({ operations: [] });
    await absentOperation.ready();
    assert.ok(absentOperation.form());
    assert.equal(absentOperation.button("Delete operation"), undefined);
});

test("management in another home cannot delete this operation", async () => {
    const mounted = mountDetails({
        home: { loading: false, current: { id: "home-a", isOwner: false, canManage: true } },
        devices: [{ id: "device-b" }],
    });
    await mounted.ready();

    assert.ok(mounted.form());
    assert.equal(mounted.button("Delete operation"), undefined);
    assert.equal(mounted.requests.delete.length, 0);
});

test("unavailable current-home membership offers local read recovery, not Delete", async () => {
    let refreshes = 0;
    const loading = mountDetails({ devicesLoading: true });
    await loading.ready();
    assert.ok(loading.form());
    assert.equal(loading.button("Delete operation"), undefined);

    const failed = mountDetails({
        devicesError: "Couldn't load devices.",
        refreshDevices: async () => (refreshes++, true),
    });
    await failed.ready();
    assert.ok(failed.form());
    assert.equal(failed.button("Delete operation"), undefined);
    const retry = failed.button("Retry");
    assert.ok(retry);
    retry.props.onPress();
    assert.equal(refreshes, 1);
});

test("Cancel, Android Back, and stale role callbacks cannot delete an operation", async () => {
    const mounted = mountDetails();
    await mounted.ready();
    const trigger = mounted.button("Delete operation");
    assert.ok(trigger, "Current-home managers can open the deletion confirmation");
    trigger.props.onPress();
    mounted.route.render();
    assert.equal(mounted.dialog().props.open, true);
    assert.match(
        mounted.route.text(),
        /Remove this operation from its widgets and device tiles first/,
    );
    const retainedConfirm = mounted.confirmDelete();
    const modal = mounted.route.elements().find((node) => node.type === "Modal");
    modal.props.onRequestClose();
    mounted.route.render();
    assert.equal(mounted.dialog().props.open, false);
    retainedConfirm.props.onPress();
    assert.deepEqual(mounted.requests.delete, []);

    const secondTrigger = mounted.button("Delete operation");
    assert.ok(secondTrigger);
    secondTrigger.props.onPress();
    mounted.route.render();
    const staleConfirm = mounted.confirmDelete();
    mounted.state.home.current = { id: "home-a", isOwner: false, canManage: false };
    mounted.route.render();
    mounted.route.flushEffects();
    staleConfirm.props.onPress();
    assert.deepEqual(mounted.requests.delete, []);
});

test("retained confirmations cannot delete after focus or context changes", async () => {
    const invalidate = [
        (mounted) => mounted.blur(),
        (mounted) => {
            mounted.state.params = { operationId: "operation-b", deviceId: "device-a" };
            mounted.route.render();
            mounted.route.flushEffects();
        },
        (mounted) => {
            mounted.state.home.current = { id: "home-b", isOwner: true, canManage: false };
            mounted.route.render();
            mounted.route.flushEffects();
        },
        (mounted) => {
            mounted.state.devices = [];
            mounted.route.render();
            mounted.route.flushEffects();
        },
    ];
    for (const change of invalidate) {
        const mounted = mountDetails();
        await mounted.ready();
        const trigger = mounted.button("Delete operation");
        assert.ok(trigger);
        trigger.props.onPress();
        mounted.route.render();
        const retainedConfirm = mounted.confirmDelete();
        change(mounted);
        retainedConfirm.props.onPress();
        assert.deepEqual(mounted.requests.delete, []);
    }
});

test("failed and conflicting operation deletion keeps local recovery", async () => {
    let deletes = 0;
    const mounted = mountDetails({
        delete: async () => {
            if (++deletes === 1) throw new Error("offline");
            return deletes === 2 ? { isSuccess: false, statusCode: 409 } : { isSuccess: true };
        },
    });
    await mounted.ready();
    const trigger = mounted.button("Delete operation");
    assert.ok(trigger);
    trigger.props.onPress();
    mounted.route.render();
    const pending = mounted.confirmDelete().props.onPress();
    mounted.confirmDelete().props.onPress();
    await pending;
    mounted.route.render();
    assert.equal(deletes, 1);
    assert.match(mounted.route.text(), /Couldn't delete this operation\. Try again/);
    const retry = mounted.button("Retry");
    retry.props.onPress();
    await mounted.settle();
    assert.equal(deletes, 2);
    assert.match(
        mounted.route.text(),
        /Remove this operation from widgets and device tiles before deleting it/,
    );
    assert.ok(mounted.form(), "A conflict retains the loaded configuration");
    mounted.button("Retry").props.onPress();
    await mounted.settle();
    assert.equal(deletes, 3);
});

test("accepted operation deletion retries return only and forwards the bound device", async () => {
    let backs = 0;
    let deletes = 0;
    const mounted = mountDetails({
        delete: async () => (deletes++, { isSuccess: true }),
        refreshDevice: async (deviceId) => {
            mounted.requests.refreshDevice.push(`refreshed:${deviceId}`);
            return true;
        },
        router: {
            canGoBack: () => true,
            back: () => {
                if (++backs === 1) throw new Error("navigation unavailable");
            },
            replace() {},
        },
    });
    await mounted.ready();
    const trigger = mounted.button("Delete operation");
    assert.ok(trigger);
    trigger.props.onPress();
    mounted.route.render();
    await mounted.confirmDelete().props.onPress();
    mounted.route.render();
    assert.equal(deletes, 1);
    assert.equal(mounted.requests.refreshDevice.filter((id) => id === "device-a").length, 1);
    assert.match(mounted.route.text(), /Operation deleted/);
    mounted.button("Return to operations").props.onPress();
    assert.equal(deletes, 1);
    assert.equal(backs, 2);

    let destination;
    const noHistory = mountDetails({
        router: { canGoBack: () => false, back() {}, replace: (value) => (destination = value) },
    });
    await noHistory.ready();
    const noHistoryTrigger = noHistory.button("Delete operation");
    assert.ok(noHistoryTrigger);
    noHistoryTrigger.props.onPress();
    noHistory.route.render();
    await noHistory.confirmDelete().props.onPress();
    assert.deepEqual(JSON.parse(JSON.stringify(destination)), {
        pathname: "/device/widget/list",
        params: { deviceId: "device-a" },
    });
});

test("accepted delete retries a malformed DeviceList refresh without repeating DELETE", async () => {
    const homeValue = home();
    const deviceGets = [];
    const deviceProvider = mountDeviceListProvider(async (path) => {
        if (path.startsWith("v1/devices/display?")) return responseBody({ items: [device()] });
        if (path === "v1/devices/device-a/display") {
            deviceGets.push(path);
            return deviceGets.length === 1
                ? { isSuccess: false, statusCode: 503, response: null }
                : deviceGets.length === 2
                  ? responseBody({ id: "device-a" })
                  : responseBody(device("device-a", true));
        }
        assert.fail(`Unexpected DeviceList request: ${path}`);
    }, homeValue);
    await settleProvider(deviceProvider.component);
    assert.deepEqual(
        deviceProvider.value().devices.map((item) => item.id),
        ["device-a"],
    );

    let backs = 0;
    let deletes = 0;
    const mounted = mountDetails({
        home: { loading: false, current: homeValue },
        getDeviceList: () => deviceProvider.value(),
        delete: async () => (deletes++, { isSuccess: true }),
        router: {
            canGoBack: () => true,
            back: () => backs++,
            replace() {},
        },
    });
    await mounted.ready();
    mounted.button("Delete operation").props.onPress();
    await mounted.settle();
    await mounted.confirmDelete().props.onPress();
    await mounted.settle();

    assert.equal(deletes, 1);
    assert.equal(deviceGets.length, 1);
    assert.equal(backs, 0);
    assert.match(
        mounted.route.text(),
        /Operation deleted\. Couldn't refresh this device\. Try again\./,
    );
    assert.ok(mounted.button("Retry"));
    assert.equal(mounted.button("Delete operation"), undefined);

    const malformedRetry = mounted.button("Retry");
    malformedRetry.props.onPress();
    await mounted.settle();
    assert.equal(deviceGets.length, 2);
    assert.equal(backs, 0);
    assert.equal(deletes, 1);
    assert.match(
        mounted.route.text(),
        /Operation deleted\. Couldn't refresh this device\. Try again\./,
    );
    assert.equal(deviceProvider.value().devices[0].tile.value, false);

    const retry = mounted.button("Retry");
    retry.props.onPress();
    retry.props.onPress();
    await mounted.settle();
    assert.equal(deviceGets.length, 3);
    assert.equal(deletes, 1);

    assert.equal(deviceGets.length, 3);
    assert.equal(deletes, 1);
    assert.equal(backs, 1);
    deviceProvider.component.render();
    assert.equal(deviceProvider.value().devices[0].tile.value, true);
});

test("accepted deletion resumes after refocus before DELETE acceptance", async () => {
    const request = deferred();
    const mounted = mountDetails({ delete: () => request.promise });
    await mounted.ready();
    const trigger = mounted.button("Delete operation");
    assert.ok(trigger);
    trigger.props.onPress();
    mounted.route.render();
    const deleting = mounted.confirmDelete().props.onPress();
    mounted.blur();
    mounted.focus();
    request.resolve({ isSuccess: true });
    await deleting;
    await mounted.settle();

    assert.equal(mounted.requests.delete.length, 1);
    assert.equal(mounted.requests.refreshDevice.filter((id) => id === "device-a").length, 1);
});

test("accepted deletion survives catalog removal and refocus before refresh settles", async () => {
    const refresh = deferred();
    let backs = 0;
    const mounted = mountDetails({
        refreshDevice: () => refresh.promise,
        router: { canGoBack: () => true, back: () => backs++, replace() {} },
    });
    await mounted.ready();
    const trigger = mounted.button("Delete operation");
    assert.ok(trigger);
    trigger.props.onPress();
    mounted.route.render();
    const deleting = mounted.confirmDelete().props.onPress();
    await new Promise((resolve) => setImmediate(resolve));
    mounted.state.operations = [];
    mounted.route.render();
    assert.ok(
        mounted.form(),
        "Accepted details remain available if the catalog removes the operation",
    );
    assert.equal(mounted.button("Delete operation"), undefined);
    mounted.blur();
    mounted.focus();
    refresh.resolve(true);
    await deleting;
    await mounted.settle();

    assert.equal(mounted.requests.delete.length, 1);
    assert.equal(mounted.requests.refreshDevice.filter((id) => id === "device-a").length, 1);
    assert.equal(backs, 1);
});

test("legacy operation list replaces to widgets and forwards only a valid device ID", () => {
    const state = { params: { deviceId: ["device-a", "ignored"] } };
    const replacements = [];
    const route = mountNativeComponent("src/app/(app)/device/operation/list.tsx", {
        modules: {
            "expo-router": {
                useLocalSearchParams: () => state.params,
                useRouter: () => ({ replace: (destination) => replacements.push(destination) }),
            },
            "react-native": { View: "View" },
            "@/components/common/FAB": "FAB",
            "@/components/common/Loading": "Loading",
            "@/components/device/operation/OperationList": "OperationList",
        },
    });
    route.flushEffects();
    assert.deepEqual(JSON.parse(JSON.stringify(replacements)), [
        { pathname: "/device/widget/list", params: { deviceId: "device-a" } },
    ]);

    const fallback = mountNativeComponent("src/app/(app)/device/operation/list.tsx", {
        modules: {
            "expo-router": {
                useLocalSearchParams: () => ({ deviceId: ["", "device-a"] }),
                useRouter: () => ({ replace: (destination) => replacements.push(destination) }),
            },
            "react-native": { View: "View" },
            "@/components/common/FAB": "FAB",
            "@/components/common/Loading": "Loading",
            "@/components/device/operation/OperationList": "OperationList",
        },
    });
    fallback.flushEffects();
    assert.deepEqual(JSON.parse(JSON.stringify(replacements[1])), {
        pathname: "/device/widget/list",
    });
});
