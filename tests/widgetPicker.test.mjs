import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

// Adapter assertions only; picker layout and touch QA are verified on Android.
function mountTile(props, { requests = [], navigation = [] } = {}) {
    const route = mountNativeComponent("src/components/device/widgets/WidgetListTile.tsx", {
        props: { id: "widget-a", name: "Ceiling light", type: "Switch", enabled: false, ...props },
        modules: {
            "expo-router": {
                useRouter: () => ({ push: (value) => navigation.push(value) }),
            },
            "react-native": {
                Pressable: "Pressable",
                View: "View",
                Text: "NativeText",
                ActivityIndicator: "ActivityIndicator",
            },
            "@/contexts/ThemeProvider": {
                useTheme: () => ({
                    current: {
                        colors: {
                            authForeground: "#111",
                            success: "#0a0",
                            error: "#a00",
                            primary: "#cc9900",
                            authBackground: "#fff",
                        },
                    },
                }),
            },
            "@/contexts/ToastProvider": {
                useToast: () => ({ info: () => {}, httpError: () => {} }),
            },
            "@/contexts/HttpClientProvider": {
                useHttpClient: () => ({
                    put: async (path, body) => {
                        requests.push([path, body]);
                        return { isSuccess: true };
                    },
                }),
            },
            "@/components/common/Text": "Text",
            "@/components/common/ListRow": "ListRow",
            "@/components/common/ImageButton": "ImageButton",
            "@/components/common/Icon": "Icon",
            "@/styles/shadowStyles": { shadowStyles: { default: {} } },
        },
    });
    return {
        route,
        requests,
        navigation,
        row: () => route.elements().find((node) => node.type === "ListRow"),
    };
}

function mountWidgetList({
    deviceId = "device-a",
    providerDeviceId = "device-b",
    canManage = true,
    results,
} = {}) {
    const requests = [];
    const navigation = [];
    const queuedResults = results ?? [
        {
            isSuccess: true,
            response: {
                json: async () => ({
                    items: [
                        {
                            operation: { id: "operation-a", name: "Living room", type: "Boolean" },
                            widgets: [
                                {
                                    id: "widget-a",
                                    name: "Ceiling light",
                                    type: "Switch",
                                    enabled: true,
                                },
                            ],
                        },
                    ],
                }),
            },
        },
    ];
    let focusEffect;
    const component = mountNativeComponent("src/components/device/widgets/WidgetList.tsx", {
        props: {
            deviceId,
            overrideOnClick: async () => {},
            selectedWidgetId: "widget-a",
        },
        modules: {
            "expo-router": {
                useRouter: () => ({ push: (value) => navigation.push(value) }),
                useFocusEffect: (callback) => (focusEffect = callback),
            },
            "react-native": {
                StyleSheet: { create: (styles) => styles },
                View: "View",
                Pressable: "Pressable",
                RefreshControl: "RefreshControl",
                SectionList: "SectionList",
            },
            "lucide-react-native": { CircleAlert: "CircleAlert" },
            "@/components/common/Button": "Button",
            "@/components/common/Icon": "Icon",
            "@/components/common/Loading": "Loading",
            "@/components/common/Text": "Text",
            "@/components/device/operation/OperationTile": "OperationTile",
            "@/components/device/widgets/WidgetListTile": "WidgetListTile",
            "@/components/ui/alert": { Alert: "Alert", AlertDescription: "AlertDescription" },
            "@/contexts/custom/DeviceProvider": {
                useDevice: () => ({ deviceId: providerDeviceId }),
            },
            "@/contexts/domain/HomeProvider": {
                useHomes: () => ({ current: { isOwner: canManage, canManage: false } }),
            },
            "@/contexts/HttpClientProvider": {
                useHttpClient: () => ({
                    get: async (path) => {
                        requests.push(path);
                        return (
                            queuedResults.shift() ?? {
                                isSuccess: true,
                                response: {
                                    json: async () => ({
                                        items: [
                                            {
                                                operation: {
                                                    id: "operation-a",
                                                    name: "Living room",
                                                    type: "Boolean",
                                                },
                                                widgets: [
                                                    {
                                                        id: "widget-a",
                                                        name: "Ceiling light",
                                                        type: "Switch",
                                                        enabled: true,
                                                    },
                                                ],
                                            },
                                        ],
                                    }),
                                },
                            }
                        );
                    },
                }),
            },
        },
    });
    return {
        component,
        requests,
        navigation,
        load: async () => {
            focusEffect?.();
            for (let index = 0; index < 20; index++) await Promise.resolve();
            component.render();
        },
        sectionList: () => component.elements().find((node) => node.type === "SectionList"),
    };
}

test("picker widget row selects without power mutation and exposes selected state", async () => {
    const selected = [];
    const tile = mountTile({
        variant: "list",
        selected: true,
        overrideOnClick: async (id) => selected.push(id),
    });
    const row = tile.row();

    assert.equal(row.props.selected, true);
    assert.equal(row.props.accessibilityLabel, "Ceiling light, selected");
    assert.equal(row.props.trailing.type, "Icon");
    assert.equal(row.props.trailing.props.icon, "checkmark-outline");
    await row.props.onPress();
    assert.deepEqual(selected, ["widget-a"]);
    assert.deepEqual(tile.requests, []);
});

test("standalone widget list keeps its existing power control", () => {
    const tile = mountTile({ variant: "list" });
    const row = tile.row();

    assert.equal(row.props.trailing.type, "Pressable");
    assert.equal(row.props.trailing.props.accessibilityRole, "switch");
    assert.equal(row.props.trailing.props.accessibilityLabel, "Ceiling light power");
});

test("picker reads the captured device and disables operation navigation", async () => {
    const list = mountWidgetList();
    await list.load();

    assert.deepEqual(list.requests, ["v1/devices/widgets/display?deviceId=device-a"]);
    const section = list.sectionList().props.sections[0];
    const header = list.sectionList().props.renderSectionHeader({ section });
    const operation = list.component.elements(header).find((node) => node.type === "OperationTile");
    const addWidget = list.component.elements(header).find((node) => node.type === "Pressable");
    const row = list.sectionList().props.renderItem({ item: section.data[0], index: 0, section });

    assert.equal(operation.props.disablePress, true);
    assert.equal(row.props.deviceId, undefined);
    assert.equal(row.props.selected, true);
    assert.equal(typeof row.props.overrideOnClick, "function");
    addWidget.props.onPress();
    assert.deepEqual(JSON.parse(JSON.stringify(list.navigation)), [
        {
            pathname: "device/widget/add",
            params: { operationId: "operation-a", deviceId: "device-a" },
        },
    ]);
});

test("Display gets no widget-definition add action", async () => {
    const list = mountWidgetList({ canManage: false });
    await list.load();
    const section = list.sectionList().props.sections[0];
    const header = list.sectionList().props.renderSectionHeader({ section });
    const addWidget = list.component.elements(header).find((node) => node.type === "Pressable");

    assert.equal(addWidget, undefined);
    assert.deepEqual(list.navigation, []);
});

test("picker distinguishes a failed widget read from an empty device", async () => {
    const failed = mountWidgetList({
        results: [{ isSuccess: false, statusCode: 503 }],
    });
    await failed.load();
    assert.match(failed.component.text(), /Couldn't load widgets\. Try again\./);
    assert.equal(failed.sectionList(), undefined);

    const empty = mountWidgetList({
        results: [
            {
                isSuccess: true,
                response: { json: async () => ({ items: [] }) },
            },
        ],
    });
    await empty.load();
    assert.match(empty.component.text(), /No widgets available\./);
    assert.equal(empty.component.text().includes("Couldn't load widgets"), false);
});

test("picker retries a failed read locally", async () => {
    const list = mountWidgetList({
        results: [
            { isSuccess: false, statusCode: 503 },
            {
                isSuccess: true,
                response: {
                    json: async () => ({
                        items: [
                            {
                                operation: {
                                    id: "operation-a",
                                    name: "Living room",
                                    type: "Boolean",
                                },
                                widgets: [
                                    {
                                        id: "widget-a",
                                        name: "Ceiling light",
                                        type: "Switch",
                                        enabled: true,
                                    },
                                ],
                            },
                        ],
                    }),
                },
            },
        ],
    });
    await list.load();
    const retry = list.component
        .elements()
        .find((node) => node.type === "Button" && node.props.name === "Retry");
    retry.props.onPress();
    for (let index = 0; index < 20; index++) await Promise.resolve();
    list.component.render();

    assert.equal(list.requests.length, 2);
    assert.equal(list.sectionList().props.sections.length, 1);
});
