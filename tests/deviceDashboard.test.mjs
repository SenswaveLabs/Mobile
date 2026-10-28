import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const theme = {
    current: {
        colors: {
            background: "#f9f7f1",
            authForeground: "#29251f",
            authMuted: "#665f55",
            error: "#b42318",
        },
    },
};

const dashboard = (id, name = id) => ({
    id,
    name,
    icon: "grid-outline",
    type: "grid",
    configuration: { marker: id, rows: 2, columns: 2 },
});

const success = (value) => ({
    isSuccess: true,
    response: { json: async () => value },
});

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

async function settle(component, turns = 16) {
    for (let index = 0; index < turns; index++) {
        await Promise.resolve();
        component.render();
        component.flushEffects();
    }
}

function mountDeviceProvider(get) {
    const requests = [];
    const provider = mountNativeComponent("src/contexts/custom/DeviceProvider.tsx", {
        exportName: "DeviceProvider",
        props: { children: "device-child" },
        modules: {
            "../HttpClientProvider": {
                useHttpClient: () => ({
                    get: (path) => {
                        requests.push(path);
                        return get(path);
                    },
                }),
            },
            "../ToastProvider": { useToast: () => ({ httpError() {}, error() {} }) },
        },
    });
    const value = () => provider.output().props.value;
    return { provider, value, requests };
}

function mountDeviceRoute({
    params = { deviceId: "device-a" },
    device,
    devices = [{ id: "device-a", name: "Desk lamp", presence: { value: true } }],
    home = { id: "home-a", isOwner: true, canManage: false },
    push = () => {},
} = {}) {
    const navigation = [];
    const routeParams = params;
    const route = mountNativeComponent("src/app/(app)/device/device.tsx", {
        modules: {
            "expo-router": {
                useLocalSearchParams: () => routeParams,
                useRouter: () => ({
                    push: (destination) => {
                        navigation.push(JSON.parse(JSON.stringify(destination)));
                        push(destination);
                    },
                    replace: (destination) => navigation.push(["replace", destination]),
                }),
            },
            "react-native": {
                View: "View",
                ScrollView: "ScrollView",
                RefreshControl: "RefreshControl",
                StyleSheet: { create: (styles) => styles },
            },
            "@/contexts/custom/DeviceProvider": { useDevice: () => device },
            "@/contexts/custom/DeviceListProvider": {
                useDeviceList: () => ({ devices }),
            },
            "@/contexts/domain/HomeProvider": {
                useHomes: () => ({ loading: false, current: home }),
            },
            "@/contexts/ThemeProvider": { useTheme: () => theme },
            "@/components/common/Text": "Text",
            "@/components/common/Button": "Button",
            "@/components/common/FAB": "FAB",
            "@/components/common/Loading": "Loading",
            "@/components/common/SectionHeaderAction": "SectionHeaderAction",
            "@/components/common/BottomSheetSelect": "BottomSheetSelect",
            "@/components/common/EnhancedHorizontalSelector": "EnhancedHorizontalSelector",
            "@/components/ui/alert": { Alert: "Alert", AlertDescription: "AlertDescription" },
            "@/components/device/dashboards/DashboardView": "DashboardView",
        },
    });
    return {
        ...route,
        navigation,
        actions: () => route.elements().filter((node) => node.type === "SectionHeaderAction"),
        selector: () => route.elements().find((node) => node.type === "BottomSheetSelect"),
    };
}

test("device provider clears mismatched selection and ignores late dashboard reads", async () => {
    const dashboardA = deferred();
    const dashboardB = deferred();
    const mounted = mountDeviceProvider((path) => {
        if (path.endsWith("display?deviceId=device-a"))
            return Promise.resolve(
                success({ items: [dashboard("dashboard-a"), dashboard("dashboard-b")] }),
            );
        if (path.endsWith("/dashboard-a/display")) return dashboardA.promise;
        if (path.endsWith("/dashboard-b/display")) return dashboardB.promise;
        throw new Error(`Unexpected request: ${path}`);
    });
    mounted.value().setDeviceId("device-a");
    mounted.provider.render();
    mounted.provider.flushEffects();
    await settle(mounted.provider);

    assert.equal(mounted.value().currentDashboardId, "dashboard-a");
    assert.equal(mounted.requests.at(-1), "v1/devices/dashboards/dashboard-a/display");
    mounted.value().setCurrentDashboardId("dashboard-b");
    mounted.provider.render();
    assert.equal(mounted.value().currentDashboardId, "dashboard-b");
    assert.equal(mounted.value().currentDashboard, undefined);
    assert.equal(mounted.requests.at(-1), "v1/devices/dashboards/dashboard-b/display");

    dashboardB.resolve(success(dashboard("dashboard-b")));
    await settle(mounted.provider);
    dashboardA.resolve(success(dashboard("dashboard-a")));
    await settle(mounted.provider);
    assert.equal(mounted.value().currentDashboard.configuration.marker, "dashboard-b");
    assert.equal(mounted.value().currentDashboardId, "dashboard-b");
});

test("device provider clears old-device data and ignores its late collection response", async () => {
    const listA = deferred();
    const detailB = deferred();
    const mounted = mountDeviceProvider((path) => {
        if (path.endsWith("display?deviceId=device-a")) return listA.promise;
        if (path.endsWith("display?deviceId=device-b"))
            return Promise.resolve(success({ items: [dashboard("dashboard-b")] }));
        if (path.endsWith("/dashboard-b/display")) return detailB.promise;
        if (path.endsWith("/dashboard-a/display"))
            return Promise.resolve(success(dashboard("dashboard-a")));
        throw new Error(`Unexpected request: ${path}`);
    });
    mounted.value().setDeviceId("device-a");
    mounted.provider.render();
    mounted.provider.flushEffects();
    assert.deepEqual(mounted.requests, ["v1/devices/dashboards/display?deviceId=device-a"]);

    mounted.value().setDeviceId("device-b");
    mounted.provider.render();
    assert.equal(mounted.value().deviceId, "device-b");
    assert.equal(mounted.value().dashboards.length, 0);
    assert.equal(mounted.value().currentDashboard, undefined);
    assert.equal(mounted.value().currentDashboardId, "");
    assert.equal(mounted.value().loading, true);
    mounted.provider.flushEffects();
    await settle(mounted.provider);
    detailB.resolve(success(dashboard("dashboard-b")));
    await settle(mounted.provider);
    listA.resolve(success({ items: [dashboard("dashboard-a")] }));
    await settle(mounted.provider);

    assert.deepEqual(
        mounted.value().dashboards.map((item) => item.id),
        ["dashboard-b"],
    );
    assert.equal(mounted.value().currentDashboard.configuration.marker, "dashboard-b");
    assert.equal(mounted.value().loadError, null);
});

test("device provider preserves valid selection and recovers empty or failed dashboard reads", async () => {
    const listResults = [
        success({ items: [dashboard("dashboard-a"), dashboard("dashboard-b")] }),
        success({ items: [dashboard("dashboard-a"), dashboard("dashboard-b")] }),
        success({ items: [] }),
        { isSuccess: false, statusCode: 503, response: null },
        success({ items: "malformed" }),
    ];
    const mounted = mountDeviceProvider((path) => {
        if (path.includes("/display?deviceId=")) return Promise.resolve(listResults.shift());
        const id = path.split("/").at(-2);
        return Promise.resolve(success(dashboard(id)));
    });
    mounted.value().setDeviceId("device-a");
    mounted.provider.render();
    mounted.provider.flushEffects();
    await settle(mounted.provider);
    mounted.value().setCurrentDashboardId("dashboard-b");
    mounted.provider.render();
    await settle(mounted.provider);
    await mounted.value().refresh(false);
    await settle(mounted.provider);
    assert.equal(mounted.value().currentDashboardId, "dashboard-b");

    await mounted.value().refresh(false);
    await settle(mounted.provider);
    assert.deepEqual(mounted.value().dashboards, []);
    assert.equal(mounted.value().currentDashboardId, "");
    assert.equal(mounted.value().currentDashboard, undefined);

    await mounted.value().refresh(false);
    await settle(mounted.provider);
    assert.equal(mounted.value().loading, false);
    assert.equal(mounted.value().loadError, "Couldn't load dashboards. Try again.");

    await mounted.value().refresh(false);
    await settle(mounted.provider);
    assert.equal(mounted.value().loading, false);
    assert.equal(mounted.value().loadError, "Couldn't load dashboards. Try again.");
});

test("device route normalizes identity, keeps display controls and hides configuration actions", () => {
    const selected = [];
    const pushed = [];
    const device = {
        loading: false,
        loadError: null,
        deviceId: "device-a",
        dashboards: [
            { id: "dashboard-a", name: "Main" },
            { id: "dashboard-b", name: "Second" },
        ],
        currentDashboardId: "dashboard-b",
        currentDashboard: { type: "grid", configuration: {} },
        setCurrentDashboardId: (id) => selected.push(id),
        setDeviceId: () => {},
        refresh: async () => {},
    };
    const manager = mountDeviceRoute({
        params: { deviceId: ["device-a", "ignored"] },
        device,
        home: { id: "home-a", isOwner: false, canManage: true },
        push: (route) => pushed.push(route),
    });
    manager.flushEffects();
    assert.ok(manager.selector(), "Dashboard selection uses the native choice sheet");
    assert.equal(manager.selector().props.value, "Second");
    assert.equal(manager.selector().props.title, "Dashboard");
    manager.selector().props.options[0].onPress();
    assert.deepEqual(selected, ["dashboard-a"]);
    const labels = manager.actions().map((action) => action.props.label);
    assert.ok(labels.includes("Add"));
    manager
        .actions()
        .find((action) => action.props.label === "Add")
        .props.onPress();
    manager
        .elements()
        .find(
            (node) =>
                node.type === "SectionHeaderAction" &&
                node.props.accessibilityLabel === "Dashboard details",
        )
        .props.onPress();
    assert.deepEqual(
        JSON.parse(JSON.stringify(pushed.map(({ pathname, params }) => [pathname, params]))),
        [
            ["device/dashboard/add", { deviceId: "device-a" }],
            ["device/dashboard/details", { deviceId: "device-a", dashboardId: "dashboard-b" }],
        ],
    );
    const view = manager.elements().find((node) => node.type === "DashboardView");
    assert.equal(view.props.deviceId, "device-a");
    assert.equal(view.props.dashboardId, "dashboard-b");
    assert.equal(view.props.canManage, true);

    const display = mountDeviceRoute({
        device,
        home: { id: "home-a", isOwner: false, canManage: false },
        devices: [{ id: "device-a", name: "Desk lamp", presence: undefined }],
    });
    assert.deepEqual(display.actions(), []);
    const displayView = display.elements().find((node) => node.type === "DashboardView");
    assert.equal(displayView.props.canManage, false);
    assert.equal(display.text().includes("Device offline"), false);
});

test("dashboard add route denies non-managers before mounting the form", () => {
    const navigation = [];
    const route = mountNativeComponent("src/app/(app)/device/dashboard/add.tsx", {
        modules: {
            "expo-router": {
                useLocalSearchParams: () => ({ deviceId: ["device-a", "ignored"] }),
                useRouter: () => ({ replace: (value) => navigation.push(value) }),
            },
            "react-native": { StyleSheet: { create: (styles) => styles }, View: "View" },
            "@/contexts/domain/HomeProvider": {
                useHomes: () => ({ loading: false, current: { isOwner: false, canManage: false } }),
            },
            "@/contexts/ThemeProvider": { useTheme: () => theme },
            "@/components/common/Button": "Button",
            "@/components/ui/alert": { Alert: "Alert", AlertDescription: "AlertDescription" },
            "@/components/ui/text": { Text: "Text" },
            "@/components/device/dashboards/AddDashboardForm": "AddDashboardForm",
        },
    });
    assert.equal(
        route.elements().some((node) => node.type === "AddDashboardForm"),
        false,
    );
    assert.ok(route.text().includes("You don't have permission to manage this device."));
    route
        .elements()
        .find((node) => node.type === "Button")
        .props.onPress();
    assert.deepEqual(JSON.parse(JSON.stringify(navigation)), [
        { pathname: "/device/device", params: { deviceId: "device-a" } },
    ]);
});

test("device details route denies Display before its device read", () => {
    const requests = [];
    const route = mountNativeComponent("src/app/(app)/device/details.tsx", {
        modules: {
            "expo-router": {
                useLocalSearchParams: () => ({ deviceId: "device-a" }),
                useFocusEffect: () => {},
                useRouter: () => ({ replace() {}, back() {} }),
            },
            "react-native": {
                View: "View",
                StyleSheet: { create: (styles) => styles },
            },
            "@/contexts/domain/HomeProvider": {
                useHomes: () => ({ loading: false, current: { isOwner: false, canManage: false } }),
            },
            "@/contexts/custom/DeviceListProvider": {
                useDeviceList: () => ({ refresh: async () => {} }),
            },
            "@/contexts/HttpClientProvider": {
                useHttpClient: () => ({
                    get: (path) => {
                        requests.push(path);
                        return Promise.resolve({ isSuccess: false });
                    },
                    patch: async () => ({ isSuccess: true }),
                    delete: async () => ({ isSuccess: true }),
                }),
            },
            "@/contexts/ToastProvider": { useToast: () => ({}) },
            "@/components/common/ConfirmDialog": "ConfirmDialog",
            "@/components/common/ContentSection": "ContentSection",
            "@/components/common/ListRow": "ListRow",
            "@/components/common/Loading": "Loading",
            "@/components/common/Button": "Button",
            "@/components/device/DeviceForm": "DeviceForm",
            "@/components/ui/alert": { Alert: "Alert", AlertDescription: "AlertDescription" },
        },
    });
    route.flushEffects();
    assert.deepEqual(requests, []);
    assert.equal(
        route.elements().some((node) => node.type === "DeviceForm"),
        false,
    );
    assert.ok(route.text().includes("You don't have permission to manage this device."));
});
