import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

// These assertions cover component adapter/handler logic only. Native view QA runs on Android.
const configuration = {
    rows: 1,
    columns: 1,
    calculatedWidgets: [
        { id: "widget-a", name: "Ceiling light", type: "Display", configuration: {} },
    ],
    positionedWidgets: [{ widgetId: "widget-a", row: 0, column: 0, rowSpan: 1, columnSpan: 1 }],
};

function mountGrid({
    canManage = true,
    deleteResult = { isSuccess: true },
    gridConfiguration = configuration,
    windowWidth = 448,
    header,
} = {}) {
    const requests = [];
    const pushes = [];
    const refreshes = [];
    const device = {
        deviceId: "device-a",
        currentDashboardId: "dashboard-a",
        currentDashboard: { type: "grid", configuration: gridConfiguration },
        loading: false,
        refresh: async (useLoading) => refreshes.push(useLoading),
    };
    const grid = mountNativeComponent(
        "src/components/device/dashboards/Grid/GridDashboardView.tsx",
        {
            props: { deviceId: "device-a", dashboardId: "dashboard-a", canManage, header },
            modules: {
                "expo-router": {
                    useFocusEffect: () => {},
                    useRouter: () => ({ push: (value) => pushes.push(value) }),
                },
                "react-native": {
                    BackHandler: { addEventListener: () => ({ remove: () => {} }) },
                    useWindowDimensions: () => ({ width: windowWidth }),
                    StyleSheet: {
                        absoluteFillObject: {
                            position: "absolute",
                            top: 0,
                            right: 0,
                            bottom: 0,
                            left: 0,
                        },
                        create: (styles) => styles,
                    },
                    View: "View",
                    Pressable: "Pressable",
                    RefreshControl: "RefreshControl",
                    ScrollView: "ScrollView",
                    Modal: "Modal",
                },
                "lucide-react-native": {
                    CircleAlert: "CircleAlert",
                    Minus: "Minus",
                    Plus: "Plus",
                },
                "@/components/common/Button": "Button",
                "@/components/common/Icon": "Icon",
                "@/components/common/Loading": "Loading",
                "@/components/common/SectionHeaderAction": "SectionHeaderAction",
                "@/components/common/Text": "Text",
                "@/components/device/widgets/WidgetView": "WidgetView",
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
                "@/components/ui/alert": {
                    Alert: "Alert",
                    AlertDescription: "AlertDescription",
                },
                "@/contexts/custom/DeviceProvider": { useDevice: () => device },
                "@/contexts/HttpClientProvider": {
                    useHttpClient: () => ({
                        delete: async (path) => {
                            requests.push(path);
                            return deleteResult;
                        },
                    }),
                },
                "@/contexts/ThemeProvider": {
                    useTheme: () => ({
                        current: {
                            colors: {
                                background: "#ffffff",
                                authFieldBackground: "#ffffff",
                                authBorder: "#777777",
                                authForeground: "#111111",
                                authPrimary: "#cc9900",
                                complementary: "#443300",
                            },
                        },
                    }),
                },
                "@rn-primitives/portal": { PortalHost: "PortalHost" },
            },
        },
    );
    grid.flushEffects();
    grid.render();
    return {
        grid,
        requests,
        pushes,
        refreshes,
        device,
        widget: () => grid.elements().find((node) => node.type === "WidgetView"),
        button: (name) =>
            grid.elements().find((node) => node.type === "Button" && node.props.name === name),
        dialog: () => grid.elements().find((node) => node.type === "AlertDialog"),
    };
}

async function settle() {
    for (let index = 0; index < 20; index++) await Promise.resolve();
}

test("manager gets the dashboard-scoped unlink callback; Display gets none", () => {
    const manager = mountGrid({ canManage: true });
    const display = mountGrid({ canManage: false });

    assert.equal(typeof manager.widget().props.onRemove, "function");
    assert.equal(display.widget().props.onRemove, undefined);
    assert.equal(manager.button("Place widget"), undefined);
    assert.equal(display.button("Place widget"), undefined);
});

test("empty dashboard shows the whole grid immediately and a cell opens the picker directly", () => {
    const mounted = mountGrid({
        gridConfiguration: { ...configuration, rows: 2, columns: 3, positionedWidgets: [] },
        header: "Device header",
    });
    const cells = mounted.grid
        .elements()
        .filter((node) => node.props.accessibilityLabel?.endsWith(", empty"));
    assert.equal(cells.length, 6);
    assert.equal(mounted.button("Place widget"), undefined);
    assert.equal(mounted.button("Choose widget"), undefined);
    assert.equal(
        mounted.grid.elements().some((node) => node.props.children?.includes("Height")),
        false,
    );
    cells[4].props.onPress();
    assert.deepEqual(JSON.parse(JSON.stringify(mounted.pushes)), [
        {
            pathname: "device/dashboard/placeWidget",
            params: {
                deviceId: "device-a",
                dashboardId: "dashboard-a",
                row: "1",
                column: "1",
                rowSpan: "1",
                columnSpan: "1",
            },
        },
    ]);
    assert.deepEqual(mounted.requests, []);
    const scroll = mounted.grid
        .elements()
        .find((node) => node.type === "ScrollView" && node.props.refreshControl);
    assert.ok(
        mounted.grid
            .elements(scroll)
            .some((node) => node.props.children?.includes("Device header")),
    );
});

test("occupied cells are never offered, and Display keeps a read-only grid", () => {
    const mounted = mountGrid({ gridConfiguration: { ...configuration, rows: 2 } });
    const cell = mounted.grid
        .elements()
        .find((node) => node.props.accessibilityLabel === "Row 2, column 1, empty");
    assert.ok(cell);
    assert.equal(
        mounted.grid
            .elements()
            .some((node) => node.props.accessibilityLabel === "Row 1, column 1, empty"),
        false,
    );
    mounted.grid.render({ deviceId: "device-a", dashboardId: "dashboard-a", canManage: false });
    cell.props.onPress();
    assert.deepEqual(mounted.pushes, []);
    const viewerCell = mounted.grid
        .elements()
        .find((node) => node.props.accessibilityLabel === "Row 2, column 1, empty");
    assert.equal(viewerCell.props.disabled, true);
    assert.equal(viewerCell.props.accessibilityRole, "text");
});

test("grid uses measured width and every cell retains a 48 dp target at 320 dp", () => {
    const mounted = mountGrid({
        gridConfiguration: { ...configuration, rows: 2, columns: 5, positionedWidgets: [] },
        windowWidth: 320,
    });
    const styleObject = (style) => Object.assign({}, ...(Array.isArray(style) ? style : [style]));
    const cellSlot = () =>
        mounted.grid
            .elements()
            .find((node) => node.props.accessibilityLabel === "Row 1, column 1, empty");
    assert.equal(styleObject(cellSlot().props.style).width, 51.2);
    const section = mounted.grid
        .elements()
        .find((node) => node.type === "View" && typeof node.props.onLayout === "function");
    section.props.onLayout({ nativeEvent: { layout: { width: 300 } } });
    mounted.grid.render();
    assert.equal(styleObject(cellSlot().props.style).width, 53.6);
});

test("malformed grid keeps the device header and retry in one scroll", () => {
    const mounted = mountGrid({
        gridConfiguration: { ...configuration, rows: 0 },
        header: "Device header",
    });
    const scrolls = mounted.grid.elements().filter((node) => node.type === "ScrollView");
    assert.equal(scrolls.length, 1);
    assert.ok(scrolls[0].props.children.includes("Device header"));
    assert.ok(mounted.button("Retry"));
    assert.equal(mounted.widget(), undefined);
});

test("canceling the grid-owned unlink confirmation sends no request", () => {
    const mounted = mountGrid();
    mounted.widget().props.onRemove();
    mounted.grid.render();
    assert.equal(mounted.dialog().props.open, true);

    mounted.button("Cancel").props.onPress();
    mounted.grid.render();
    assert.equal(mounted.dialog().props.open, false);
    assert.deepEqual(mounted.requests, []);
});

test("accepted unlink captures the dashboard, removes one local placement, then refreshes", async () => {
    const mounted = mountGrid();
    mounted.widget().props.onRemove();
    mounted.grid.render();
    const confirm = mounted.button("Remove widget").props.onPress;
    confirm();
    confirm();
    await settle();
    mounted.grid.render();

    assert.deepEqual(mounted.requests, ["v1/devices/dashboards/dashboard-a/widgets/widget-a"]);
    assert.deepEqual(mounted.refreshes, [false]);
    assert.equal(mounted.widget(), undefined);
});

test("failed unlink keeps the widget and offers a retry", async () => {
    const mounted = mountGrid({ deleteResult: { isSuccess: false } });
    mounted.widget().props.onRemove();
    mounted.grid.render();
    mounted.button("Remove widget").props.onPress();
    await settle();
    mounted.grid.render();

    assert.equal(mounted.widget() !== undefined, true);
    assert.match(mounted.grid.text(), /Couldn't remove this widget\. Try again\./);
    assert.equal(typeof mounted.button("Retry").props.onPress, "function");
    assert.deepEqual(mounted.refreshes, []);
});

test("a stale dashboard confirmation cannot delete the previously selected layout", () => {
    const mounted = mountGrid();
    mounted.widget().props.onRemove();
    mounted.grid.render();
    mounted.device.currentDashboardId = "dashboard-b";
    mounted.grid.render({ deviceId: "device-a", dashboardId: "dashboard-b", canManage: true });

    assert.equal(mounted.dialog().props.open, false);
    assert.deepEqual(mounted.requests, []);
});
