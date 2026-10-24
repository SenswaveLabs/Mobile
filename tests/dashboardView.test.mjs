import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

// This checks the route adapter's child identity only; native recovery rendering is verified on Android.
test("a transient dashboard load error keeps the grid in its mounted child slot", () => {
    const device = {
        deviceId: "device-a",
        currentDashboardId: "dashboard-a",
        currentDashboard: { type: "grid", configuration: {} },
        loading: false,
        loadError: null,
        refresh: async () => {},
    };
    const view = mountNativeComponent("src/components/device/dashboards/DashboardView.tsx", {
        props: { deviceId: "device-a", dashboardId: "dashboard-a", canManage: true },
        modules: {
            "react-native": { View: "View", StyleSheet: { create: (styles) => styles } },
            "lucide-react-native": { CircleAlert: "CircleAlert" },
            "@/components/common/Button": "Button",
            "@/components/common/Loading": "Loading",
            "@/components/common/Text": "Text",
            "@/components/ui/alert": {
                Alert: "Alert",
                AlertDescription: "AlertDescription",
            },
            "@/contexts/custom/DeviceProvider": { useDevice: () => device },
            "@/contexts/ThemeProvider": {
                useTheme: () => ({ current: { colors: { authForeground: "#111111" } } }),
            },
            "./Grid/GridDashboardView": "GridDashboardView",
        },
    });

    const gridAtStableSlot = (element) => {
        assert.equal(element.type, "View");
        assert.equal(Array.isArray(element.props.children), true);
        return element.props.children[0];
    };

    const beforeError = gridAtStableSlot(view.output());
    assert.equal(beforeError.type, "GridDashboardView");

    device.loadError = "Couldn't load dashboards. Try again.";
    view.render();

    const afterError = gridAtStableSlot(view.output());
    assert.equal(afterError.type, beforeError.type);
    assert.equal(afterError.props.dashboardId, "dashboard-a");
});
