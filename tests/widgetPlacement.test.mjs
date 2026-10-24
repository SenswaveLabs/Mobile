import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

// These assertions cover route adapter/handler logic only. View and gesture QA runs on Android.
const gridConfiguration = {
    rows: 2,
    columns: 2,
    calculatedWidgets: [],
    positionedWidgets: [],
};

function success(body) {
    return { isSuccess: true, response: { json: async () => body } };
}

function mountPlace({
    params = {
        deviceId: "device-a",
        dashboardId: "dashboard-a",
        row: "0",
        column: "1",
        rowSpan: "1",
        columnSpan: "1",
    },
    home = { loading: false, current: { isOwner: true, canManage: false } },
    getResults = [success({ configuration: gridConfiguration })],
    putResults = [{ isSuccess: true }],
    provider = {},
    routerOverrides = {},
} = {}) {
    const requests = { get: [], put: [] };
    const pushes = [];
    const refreshes = [];
    let focusEffect;
    const device = {
        deviceId: "device-b",
        currentDashboardId: "dashboard-b",
        currentDashboard: undefined,
        refresh: async (useLoading) => refreshes.push(useLoading),
        ...provider,
    };
    const router = {
        canGoBack: () => true,
        back: () => pushes.push("back"),
        replace: (value) => pushes.push(value),
        push: (value) => pushes.push(value),
        ...routerOverrides,
    };
    const httpClient = {
        get: async (path) => {
            requests.get.push(path);
            return getResults.shift() ?? success({ configuration: gridConfiguration });
        },
        put: async (path, body) => {
            requests.put.push([path, body]);
            return putResults.shift() ?? { isSuccess: true };
        },
    };
    const route = mountNativeComponent("src/app/(app)/device/dashboard/placeWidget.tsx", {
        modules: {
            "expo-router": {
                useLocalSearchParams: () => params,
                useRouter: () => router,
                useFocusEffect: (callback) => (focusEffect = callback),
            },
            "react-native": {
                StyleSheet: { create: (styles) => styles },
                View: "View",
            },
            "lucide-react-native": { CircleAlert: "CircleAlert" },
            "@/components/common/Button": "Button",
            "@/components/common/Loading": "Loading",
            "@/components/common/Text": "Text",
            "@/components/device/widgets/WidgetList": "WidgetList",
            "@/components/ui/alert": { Alert: "Alert", AlertDescription: "AlertDescription" },
            "@/contexts/custom/DeviceProvider": { useDevice: () => device },
            "@/contexts/domain/HomeProvider": { useHomes: () => home },
            "@/contexts/HttpClientProvider": { useHttpClient: () => httpClient },
            "@/contexts/ThemeProvider": {
                useTheme: () => ({ current: { colors: { background: "#ffffff" } } }),
            },
        },
    });
    return {
        route,
        requests,
        pushes,
        refreshes,
        device,
        router,
        focus: () => focusEffect?.(),
        widgetList: () => route.elements().find((node) => node.type === "WidgetList"),
        button: (name) =>
            route.elements().find((node) => node.type === "Button" && node.props.name === name),
    };
}

async function settle() {
    for (let index = 0; index < 30; index++) await Promise.resolve();
}

async function loadReadyRoute(mounted) {
    mounted.route.flushEffects();
    await settle();
    mounted.route.render();
}

test("placement uses explicit dashboard and device despite a mismatched provider selection", async () => {
    const mounted = mountPlace();
    await loadReadyRoute(mounted);

    assert.deepEqual(mounted.requests.get, ["v1/devices/dashboards/dashboard-a/display"]);
    assert.equal(mounted.widgetList().props.deviceId, "device-a");
    assert.equal(mounted.widgetList().props.selectedWidgetId, undefined);
    assert.deepEqual(mounted.requests.put, []);
});

test("provider supplies the device ID only when it already has the routed dashboard selected", async () => {
    const matching = mountPlace({
        params: {
            dashboardId: "dashboard-a",
            row: "0",
            column: "1",
            rowSpan: "1",
            columnSpan: "1",
        },
        provider: { deviceId: "device-b", currentDashboardId: "dashboard-a" },
    });
    await loadReadyRoute(matching);
    assert.equal(matching.widgetList().props.deviceId, "device-b");

    const mismatched = mountPlace({
        params: {
            dashboardId: "dashboard-a",
            row: "0",
            column: "1",
            rowSpan: "1",
            columnSpan: "1",
        },
        provider: { deviceId: "device-b", currentDashboardId: "dashboard-b" },
    });
    await loadReadyRoute(mismatched);
    assert.deepEqual(mismatched.requests.get, []);
    assert.equal(mismatched.widgetList(), undefined);
    assert.match(mismatched.route.text(), /Placement unavailable/);
});

test("widget selection only selects, then Place sends exact captured geometry once", async () => {
    const mounted = mountPlace({
        params: {
            deviceId: ["device-a", "ignored"],
            dashboardId: ["dashboard-a", "ignored"],
            row: ["0", "9"],
            column: ["1", "0"],
            rowSpan: ["2", "1"],
            columnSpan: ["1", "1"],
        },
        provider: { deviceId: "device-a", currentDashboardId: "dashboard-b" },
    });
    await loadReadyRoute(mounted);
    mounted.focus();

    await mounted.widgetList().props.overrideOnClick("widget-a");
    mounted.route.render();
    assert.equal(mounted.widgetList().props.selectedWidgetId, "widget-a");
    assert.deepEqual(mounted.requests.put, []);
    assert.equal(mounted.button("Place widget").props.disabled, false);

    mounted.button("Add operation").props.onPress();
    assert.deepEqual(JSON.parse(JSON.stringify(mounted.pushes)), [
        { pathname: "device/operation/add", params: { deviceId: "device-a" } },
    ]);

    mounted.button("Place widget").props.onPress();
    mounted.button("Place widget").props.onPress();
    await settle();

    assert.deepEqual(JSON.parse(JSON.stringify(mounted.requests.put)), [
        [
            "v1/devices/dashboards/dashboard-a/widgets",
            { widgetId: "widget-a", row: 0, column: 1, rowSpan: 2, columnSpan: 1 },
        ],
    ]);
    assert.deepEqual(mounted.refreshes, [false]);
    assert.deepEqual(JSON.parse(JSON.stringify(mounted.pushes)), [
        { pathname: "device/operation/add", params: { deviceId: "device-a" } },
        "back",
    ]);
    mounted.route.render();
    assert.equal(mounted.button("Place widget").props.disabled, true);
});

test("rejected placement keeps the selected widget and offers inline retry", async () => {
    const mounted = mountPlace({ putResults: [{ isSuccess: false }, { isSuccess: true }] });
    await loadReadyRoute(mounted);
    await mounted.widgetList().props.overrideOnClick("widget-a");
    mounted.route.render();
    mounted.button("Place widget").props.onPress();
    await settle();
    mounted.route.render();

    assert.match(mounted.route.text(), /Couldn't place this widget\. Try again\./);
    assert.equal(mounted.widgetList().props.selectedWidgetId, "widget-a");
    assert.equal(mounted.button("Place widget").props.disabled, false);
    mounted.button("Place widget").props.onPress();
    await settle();
    assert.equal(mounted.requests.put.length, 2);
});

test("invalid route geometry makes no dashboard read or placement request", async () => {
    const mounted = mountPlace({
        params: {
            deviceId: "device-a",
            dashboardId: "dashboard-a",
            row: "1e2",
            column: "0",
            rowSpan: "1",
            columnSpan: "1",
        },
    });
    await loadReadyRoute(mounted);

    assert.deepEqual(mounted.requests.get, []);
    assert.deepEqual(mounted.requests.put, []);
    assert.equal(mounted.widgetList(), undefined);
    assert.match(mounted.route.text(), /Placement unavailable/);
});

test("occupied area shows explicit return instead of loading the picker", async () => {
    const mounted = mountPlace({
        getResults: [
            success({
                configuration: {
                    ...gridConfiguration,
                    positionedWidgets: [
                        { widgetId: "other", row: 0, column: 1, rowSpan: 1, columnSpan: 1 },
                    ],
                },
            }),
        ],
    });
    await loadReadyRoute(mounted);

    assert.equal(mounted.widgetList(), undefined);
    assert.match(mounted.route.text(), /This area is no longer available/);
    assert.equal(mounted.requests.put.length, 0);
    assert.deepEqual(mounted.pushes, []);
});

test("Display cannot read or use the placement route", async () => {
    const mounted = mountPlace({
        home: { loading: false, current: { isOwner: false, canManage: false } },
    });
    await loadReadyRoute(mounted);

    assert.deepEqual(mounted.requests.get, []);
    assert.equal(mounted.widgetList(), undefined);
    assert.match(mounted.route.text(), /don't have permission/);
});

test("dashboard read failure retries without reading a different dashboard", async () => {
    const mounted = mountPlace({
        getResults: [
            { isSuccess: false, statusCode: 503 },
            success({ configuration: gridConfiguration }),
        ],
    });
    await loadReadyRoute(mounted);
    assert.match(mounted.route.text(), /Couldn't load this dashboard/);

    mounted.button("Retry").props.onPress();
    mounted.route.render();
    mounted.route.flushEffects();
    await settle();
    mounted.route.render();

    assert.deepEqual(mounted.requests.get, [
        "v1/devices/dashboards/dashboard-a/display",
        "v1/devices/dashboards/dashboard-a/display",
    ]);
    assert.equal(mounted.widgetList().props.deviceId, "device-a");
});

test("accepted placement with failed navigation offers navigation-only recovery", async () => {
    const mounted = mountPlace({
        routerOverrides: {
            canGoBack: () => false,
            replace: () => {
                throw new Error("navigation unavailable");
            },
        },
    });
    await loadReadyRoute(mounted);
    mounted.focus();
    await mounted.widgetList().props.overrideOnClick("widget-a");
    mounted.route.render();
    mounted.button("Place widget").props.onPress();
    await settle();
    mounted.route.render();

    assert.match(mounted.route.text(), /Widget placed\. Return to the dashboard to continue\./);
    assert.equal(mounted.button("Return to dashboard").props.name, "Return to dashboard");
    assert.equal(mounted.requests.put.length, 1);
    assert.equal(mounted.button("Place widget").props.disabled, true);
});
