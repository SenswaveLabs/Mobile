import assert from "node:assert/strict";
import test from "node:test";
import { makeFocusLifecycle, mountNativeComponent } from "./nativeComponentHarness.mjs";

// These assertions cover route permission and handler adapters only. Native screens are verified on Android.
function mountOperationAdd({ canManage, deviceId = ["device-a", "ignored"] }) {
    const posts = [];
    const navigation = [];
    const route = mountNativeComponent("src/app/(app)/device/operation/add.tsx", {
        modules: {
            "expo-router": {
                useLocalSearchParams: () => ({ deviceId }),
                useFocusEffect: (callback) => callback(),
                useRouter: () => ({
                    canGoBack: () => true,
                    back: () => navigation.push("back"),
                    replace: (value) => navigation.push(value),
                }),
            },
            "react-native": { StyleSheet: { create: (styles) => styles }, View: "View" },
            "react-native-keyboard-controller": { KeyboardStickyView: "KeyboardStickyView" },
            "lucide-react-native": { CircleAlert: "CircleAlert" },
            "@/components/common/Button": "Button",
            "@/components/common/Loading": "Loading",
            "@/components/device/operation/OperationForm": "OperationForm",
            "@/components/ui/alert": { Alert: "Alert", AlertDescription: "AlertDescription" },
            "@/contexts/custom/DeviceProvider": { useDevice: () => ({ deviceId: "device-b" }) },
            "@/contexts/domain/HomeProvider": {
                useHomes: () => ({
                    loading: false,
                    current: { isOwner: canManage, canManage: false },
                }),
            },
            "@/contexts/HttpClientProvider": {
                useHttpClient: () => ({
                    post: async (...args) => {
                        posts.push(args);
                        return { isSuccess: true };
                    },
                }),
            },
            "@/contexts/ToastProvider": {
                useToast: () => ({ success: () => {}, error: () => {}, httpError: () => {} }),
            },
        },
    });
    return { route, posts, navigation };
}

function mountWidgetAdd({ canManage }) {
    return mountNativeComponent("src/app/(app)/device/widget/add.tsx", {
        modules: {
            "expo-router": {
                useLocalSearchParams: () => ({ operationId: "operation-a" }),
                useRouter: () => ({ canGoBack: () => true, back: () => {}, replace: () => {} }),
            },
            "react-native": { StyleSheet: { create: (styles) => styles }, View: "View" },
            "react-native-keyboard-controller": { KeyboardStickyView: "KeyboardStickyView" },
            "lucide-react-native": { CircleAlert: "CircleAlert" },
            "@/components/common/Button": "Button",
            "@/components/common/Loading": "Loading",
            "@/components/device/widgets/WidgetForm": "WidgetForm",
            "@/components/device/widgets/AddWidgetForm": "AddWidgetForm",
            "@/components/ui/alert": { Alert: "Alert", AlertDescription: "AlertDescription" },
            "@/contexts/custom/DeviceProvider": { useDevice: () => ({ deviceId: "device-a" }) },
            "@/contexts/custom/WidgetDetailsProvider": {
                WidgetDetailsProvider: "WidgetDetailsProvider",
                useWidgetDetails: () => ({ loading: true, initializeForAdd: () => {} }),
            },
            "@/contexts/domain/HomeProvider": {
                useHomes: () => ({
                    loading: false,
                    current: { isOwner: canManage, canManage: false },
                }),
            },
            "@/contexts/HttpClientProvider": { useHttpClient: () => ({}) },
            "@/contexts/ToastProvider": { useToast: () => ({}) },
        },
    });
}

test("operation creation uses captured device ID and is denied to Display", async () => {
    const manager = mountOperationAdd({ canManage: true });
    const form = manager.route.elements().find((node) => node.type === "OperationForm");
    assert.equal(form.props.deviceId, "device-a");
    await form.props.onSubmit({ name: "Living room" });
    assert.deepEqual(JSON.parse(JSON.stringify(manager.posts)), [
        ["v1/devices/operations", { name: "Living room", deviceId: "device-a" }],
    ]);
    assert.deepEqual(manager.navigation, ["back"]);

    const display = mountOperationAdd({ canManage: false });
    assert.equal(
        display.route.elements().some((node) => node.type === "OperationForm"),
        false,
    );
    assert.match(display.route.text(), /don't have permission/);
});

test("widget creation route does not mount its provider for Display", () => {
    const manager = mountWidgetAdd({ canManage: true });
    const display = mountWidgetAdd({ canManage: false });

    assert.equal(
        manager.elements().some((node) => node.type === "WidgetDetailsProvider"),
        true,
    );
    assert.equal(
        display.elements().some((node) => node.type === "WidgetDetailsProvider"),
        false,
    );
    assert.match(display.text(), /don't have permission/);
});

test("widget details and standalone management list deny Display before mounting their reads", () => {
    for (const routeName of ["details", "list"]) {
        const route = mountNativeComponent(`src/app/(app)/device/widget/${routeName}.tsx`, {
            modules: {
                "expo-router": {
                    useLocalSearchParams: () => ({ widgetId: "widget-a", deviceId: "device-a" }),
                    useRouter: () => ({ canGoBack: () => true, back: () => {} }),
                },
                "@/components/device/widgets/WidgetDetails": "WidgetDetails",
                "@/components/device/widgets/WidgetList": "WidgetList",
                "@/contexts/custom/WidgetDetailsProvider": {
                    WidgetDetailsProvider: "WidgetDetailsProvider",
                },
                "@/contexts/custom/DeviceProvider": { useDevice: () => ({ deviceId: "device-a" }) },
                "@/contexts/domain/HomeProvider": {
                    useHomes: () => ({
                        loading: false,
                        current: { isOwner: false, canManage: false },
                    }),
                },
            },
        });
        assert.match(route.text(), /don't have permission/);
        assert.equal(
            route
                .elements()
                .some((node) => ["WidgetDetailsProvider", "WidgetList"].includes(node.type)),
            false,
        );
    }
});

test("Display can view operation details without seeing deletion controls", async () => {
    let focusLifecycle;
    const reads = [];
    const route = mountNativeComponent("src/app/(app)/device/operation/details.tsx", {
        modules: (React) => {
            focusLifecycle = makeFocusLifecycle(React);
            return {
                "expo-router": {
                    useFocusEffect: (callback) => focusLifecycle.useFocusEffect(callback),
                    useLocalSearchParams: () => ({
                        operationId: "operation-a",
                        deviceId: "device-a",
                    }),
                    useRouter: () => ({ canGoBack: () => true, back() {}, replace() {} }),
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
                "@/components/common/Loading": "Loading",
                "@/components/common/Text": "Text",
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
                    useDeviceList: () => ({
                        devices: [{ id: "device-a" }],
                        loading: false,
                        error: null,
                        refresh: async () => true,
                        refreshDevice: async () => true,
                    }),
                },
                "@/contexts/domain/HomeProvider": {
                    useHomes: () => ({
                        loading: false,
                        current: { id: "home-a", isOwner: false, canManage: false },
                    }),
                },
                "@/contexts/HttpClientProvider": {
                    useHttpClient: () => ({
                        get: async (path) => {
                            reads.push(path);
                            return {
                                isSuccess: true,
                                response: {
                                    json: async () => ({
                                        id: "operation-a",
                                        name: "Living room",
                                        topic: "home/light",
                                        type: "Boolean",
                                        configuration: {},
                                    }),
                                },
                            };
                        },
                        delete: async () => assert.fail("Display cannot delete operations"),
                    }),
                },
            };
        },
    });
    route.flushEffects();
    focusLifecycle.focus();
    await new Promise((resolve) => setImmediate(resolve));
    route.render();

    assert.ok(route.elements().some((node) => node.type === "OperationForm"));
    assert.equal(
        route
            .elements()
            .some(
                (node) => node.type === "ContentSection" && node.props.title === "Delete operation",
            ),
        false,
    );
    assert.deepEqual(reads, ["v1/devices/operations/operation-a"]);
});
