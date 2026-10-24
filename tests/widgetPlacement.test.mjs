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
            "@/components/device/dashboards/Grid/WidgetPlacementCanvas": "WidgetPlacementCanvas",
            "@/components/common/SectionHeaderAction": "SectionHeaderAction",
            "@/components/common/Icon": "Icon",
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
        canvas: () => route.elements().find((node) => node.type === "WidgetPlacementCanvas"),
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
    mounted.focus();
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
    assert.equal(mounted.canvas().props.widget.id, "widget-a");
    assert.deepEqual(mounted.requests.put, []);
    assert.equal(mounted.button("Add widget").props.disabled, false);

    mounted.button("Add widget").props.onPress();
    mounted.button("Add widget").props.onPress();
    await settle();

    assert.deepEqual(JSON.parse(JSON.stringify(mounted.requests.put)), [
        [
            "v1/devices/dashboards/dashboard-a/widgets",
            { widgetId: "widget-a", row: 0, column: 1, rowSpan: 2, columnSpan: 1 },
        ],
    ]);
    assert.deepEqual(mounted.refreshes, [false]);
    assert.deepEqual(JSON.parse(JSON.stringify(mounted.pushes)), ["back"]);
    mounted.route.render();
    assert.equal(mounted.button("Add widget").props.disabled, true);
});

test("rejected placement keeps the selected widget and offers inline retry", async () => {
    const mounted = mountPlace({ putResults: [{ isSuccess: false }, { isSuccess: true }] });
    await loadReadyRoute(mounted);
    await mounted.widgetList().props.overrideOnClick("widget-a");
    mounted.route.render();
    mounted.button("Add widget").props.onPress();
    await settle();
    mounted.route.render();

    assert.match(mounted.route.text(), /Couldn't place this widget\. Try again\./);
    assert.equal(mounted.canvas().props.widget.id, "widget-a");
    assert.equal(mounted.button("Add widget").props.disabled, false);
    mounted.button("Add widget").props.onPress();
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
    mounted.button("Add widget").props.onPress();
    await settle();
    mounted.route.render();

    assert.match(mounted.route.text(), /Widget placed\. Return to the dashboard to continue\./);
    assert.equal(mounted.button("Return to dashboard").props.name, "Return to dashboard");
    assert.equal(mounted.requests.put.length, 1);
    assert.equal(mounted.button("Add widget").props.disabled, true);
});

test("the editor saves the latest drag rectangle even through a retained submit callback", async () => {
    const mounted = mountPlace();
    await loadReadyRoute(mounted);
    await mounted.widgetList().props.overrideOnClick("widget-a", {
        id: "widget-a",
        name: "Ceiling light",
        type: "Switch",
        enabled: true,
    });
    mounted.route.render();
    const submit = mounted.button("Add widget").props.onPress;
    mounted.canvas().props.onChange({ row: 1, column: 0, rowSpan: 1, columnSpan: 2 });
    mounted.route.render();
    submit();
    await settle();
    assert.deepEqual(JSON.parse(JSON.stringify(mounted.requests.put[0])), [
        "v1/devices/dashboards/dashboard-a/widgets",
        { widgetId: "widget-a", row: 1, column: 0, rowSpan: 1, columnSpan: 2 },
    ]);
});

test("already placed widgets are excluded and cannot be selected through a retained picker callback", async () => {
    const mounted = mountPlace({
        getResults: [
            success({
                configuration: {
                    ...gridConfiguration,
                    positionedWidgets: [
                        { widgetId: "existing", row: 1, column: 0, rowSpan: 1, columnSpan: 1 },
                    ],
                },
            }),
        ],
    });
    await loadReadyRoute(mounted);
    assert.deepEqual(Array.from(mounted.widgetList().props.excludedWidgetIds), ["existing"]);
    await mounted.widgetList().props.overrideOnClick("existing");
    mounted.route.render();
    assert.equal(mounted.canvas(), undefined);
    assert.deepEqual(mounted.requests.put, []);
});

test("leaving the editor blocks a retained save callback", async () => {
    const mounted = mountPlace();
    await loadReadyRoute(mounted);
    await mounted.widgetList().props.overrideOnClick("widget-a");
    mounted.route.render();
    const submit = mounted.button("Add widget").props.onPress;
    const blur = mounted.focus();
    blur();
    submit();
    await settle();
    assert.deepEqual(mounted.requests.put, []);
});

test("canvas move and resize responders update grid geometry and block changes while pending", () => {
    const changes = [];
    const props = {
        grid: gridConfiguration,
        widget: { id: "new", name: "Light", type: "Switch" },
        placement: { row: 0, column: 0, rowSpan: 1, columnSpan: 1 },
        onChange: (value) => changes.push(value),
    };
    const canvas = mountNativeComponent(
        "src/components/device/dashboards/Grid/WidgetPlacementCanvas.tsx",
        {
            props,
            modules: {
                "react-native": {
                    PanResponder: { create: (handlers) => ({ panHandlers: handlers }) },
                    StyleSheet: { create: (styles) => styles },
                    View: "View",
                    Pressable: "Pressable",
                    ScrollView: "ScrollView",
                    useWindowDimensions: () => ({ width: 320 }),
                },
                "lucide-react-native": { Move: "Move", MoveDiagonal2: "MoveDiagonal2" },
                "@/components/ui/text": { Text: "Text" },
                "@/contexts/ThemeProvider": { useTheme: () => ({ current: { colors: {} } }) },
            },
        },
    );
    const target = (label) =>
        canvas.elements().find((node) => node.props.accessibilityLabel === label);
    const move = target("Move Light");
    move.props.onPanResponderGrant();
    move.props.onPanResponderMove(null, { dx: 148, dy: 0 });
    assert.deepEqual(JSON.parse(JSON.stringify(changes.at(-1))), {
        row: 0,
        column: 1,
        rowSpan: 1,
        columnSpan: 1,
    });
    canvas.render({ ...props, placement: changes.at(-1) });
    const resize = target("Resize Light");
    resize.props.onPanResponderGrant();
    resize.props.onPanResponderMove(null, { dx: 0, dy: 104 });
    assert.equal(changes.at(-1).rowSpan, 2);
    canvas.render({ ...props, placement: changes.at(-1) });
    const scrolls = [];
    const viewport = canvas.elements().find((node) => node.type === "ScrollView" && node.props.ref);
    viewport.props.ref.current = { scrollTo: (value) => scrolls.push(value) };
    resize.props.onPanResponderRelease();
    viewport.props.onLayout({ nativeEvent: { layout: { height: 150 } } });
    assert.equal(scrolls.at(-1).y, 50);
    const count = changes.length;
    canvas.render({ ...props, placement: changes.at(-1), disabled: true });
    resize.props.onPanResponderMove(null, { dx: -148, dy: -104 });
    assert.equal(changes.length, count);
});
