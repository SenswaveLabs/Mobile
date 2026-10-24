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
} = {}) {
    const requests = [];
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
            props: { deviceId: "device-a", dashboardId: "dashboard-a", canManage },
            modules: {
                "expo-router": {
                    useFocusEffect: () => {},
                    useRouter: () => ({ push: () => {} }),
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

test("place grid measures the viewport and groups empty cells into rows", () => {
    const mounted = mountGrid({
        gridConfiguration: { ...configuration, rows: 2, columns: 3, positionedWidgets: [] },
    });
    mounted.button("Place widget").props.onPress();
    mounted.grid.render();

    const styleObject = (style) => Object.assign({}, ...(Array.isArray(style) ? style : [style]));
    const section = mounted.grid
        .elements()
        .find((element) => element.type === "View" && typeof element.props.onLayout === "function");
    assert.ok(section, "grid section measures available viewport width");
    section.props.onLayout({ nativeEvent: { layout: { width: 300 } } });
    mounted.grid.render();

    const rows = mounted.grid
        .elements()
        .filter(
            (element) =>
                element.type === "View" &&
                styleObject(element.props.style).flexDirection === "row" &&
                styleObject(element.props.style).height === 96,
        );
    assert.equal(rows.length, 2);
    for (const row of rows) {
        const style = styleObject(row.props.style);
        assert.equal(style.width, 300);
        assert.equal(style.height, 96);
        assert.equal(
            mounted.grid
                .elements(row)
                .filter(
                    (child) =>
                        child.type === "View" &&
                        styleObject(child.props.style).position === "relative",
                ).length,
            3,
        );
    }

    const cellSlot = mounted.grid
        .elements()
        .find(
            (element) =>
                element.type === "View" &&
                styleObject(element.props.style).position === "relative" &&
                styleObject(element.props.style).width === (300 - 16) / 3,
        );
    assert.ok(cellSlot);
    assert.equal(styleObject(cellSlot.props.style).height, 96);
    const cell = mounted.grid
        .elements(cellSlot)
        .find((element) => element.props.accessibilityLabel === "Row 1, column 1, empty");
    assert.deepEqual(styleObject(cell.props.style), {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        borderWidth: 1,
        borderStyle: "dashed",
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#ffffff",
        borderColor: "#777777",
    });
});

test("narrow dashboard cells and the placement preview share first-render geometry", () => {
    const mounted = mountGrid({
        gridConfiguration: { ...configuration, rows: 1, columns: 4, positionedWidgets: [] },
        windowWidth: 320,
    });
    mounted.button("Place widget").props.onPress();
    mounted.grid.render();

    const styleObject = (style) => Object.assign({}, ...(Array.isArray(style) ? style : [style]));
    const cellSlot = mounted.grid
        .elements()
        .find(
            (element) =>
                element.type === "View" &&
                styleObject(element.props.style).position === "relative" &&
                styleObject(element.props.style).flexShrink === 0 &&
                styleObject(element.props.style).height === 96,
        );
    assert.ok(cellSlot);
    assert.equal(styleObject(cellSlot.props.style).width, 66);

    mounted.grid
        .elements(cellSlot)
        .find((element) => element.props.accessibilityLabel)
        ?.props.onPress();
    mounted.grid.render();
    const preview = mounted.grid.elements().find((element) => {
        const style = styleObject(element.props.style);
        return style.position === "absolute" && style.opacity === 0.2;
    });
    assert.equal(styleObject(preview.props.style).width, 66);
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
