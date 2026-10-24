import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const operation = {
    id: "operation-a",
    name: "Brightness",
    type: "Number",
    configuration: { min: 0, max: 100 },
};
const widget = {
    id: "widget-a",
    deviceId: "device-a",
    operationId: "operation-a",
    name: "Brightness",
    type: "Slider",
    enabled: true,
    configuration: { step: 1 },
};
const response = (value) => ({ isSuccess: true, response: { json: async () => value } });

function mountProvider(get) {
    const provider = mountNativeComponent("src/contexts/custom/WidgetDetailsProvider.tsx", {
        exportName: "WidgetDetailsProvider",
        props: { children: null },
        modules: { "../HttpClientProvider": { useHttpClient: () => ({ get }) } },
    });
    const context = () => {
        provider.render();
        return provider.elements().find((node) => node.type === "ContextProvider").props.value;
    };
    provider.flushEffects();
    return { provider, context };
}

test("widget initialization exposes retryable failure and accepts a later valid operation", async () => {
    let fail = true;
    const { context } = mountProvider(async () => {
        if (fail) throw new Error("offline");
        return response(operation);
    });
    await context().initializeForAdd("operation-a");
    assert.equal(context().loading, false);
    assert.match(context().loadError, /load/);
    assert.equal(context().operation, undefined);
    fail = false;
    await context().initializeForAdd("operation-a");
    assert.equal(context().operation.id, "operation-a");
    assert.equal(context().loadError, "");
});

test("widget reads reject mismatched identity and missing configuration", async () => {
    for (const value of [
        { ...widget, id: "wrong" },
        { ...widget, configuration: null },
    ]) {
        const { context } = mountProvider(async () => response(value));
        await context().initializeForDisplay("widget-a");
        assert.equal(context().widget, undefined);
        assert.match(context().loadError, /load/);
    }
});

test("a late widget read cannot replace the latest operation", async () => {
    let release;
    const first = new Promise((resolve) => {
        release = resolve;
    });
    const { context } = mountProvider(async (path) =>
        path.endsWith("operation-a") ? first : response({ ...operation, id: "operation-b" }),
    );
    const oldRead = context().initializeForAdd("operation-a");
    await context().initializeForAdd("operation-b");
    release(response(operation));
    await oldRead;
    assert.equal(context().operation.id, "operation-b");
    assert.equal(context().widget.operationId, "operation-b");
});

test("base widget validation trims names, rejects incompatible types and clears old validators", async () => {
    const { context } = mountProvider(async () => response(operation));
    await context().initializeForAdd("operation-a");
    context().setWidget({ ...context().widget, name: "   ", type: "Button" });
    assert.equal(context().validateDto(true), false);
    assert.match(context().errors.nameError, /required/);
    context().setWidget({ ...context().widget, name: "  Brightness  ", type: "Switch" });
    assert.equal(context().validateDto(true), false);
    context().setWidget({ ...context().widget, type: "Button" });
    context().setAdditionalValidation(() => false);
    assert.equal(context().validateDto(), false);
    context().setAdditionalValidation(null);
    assert.equal(context().validateDto(), true);
    assert.equal(context().toAddDto().name, "Brightness");
});

const dialogHosts = Object.fromEntries(
    [
        "AlertDialog",
        "AlertDialogAction",
        "AlertDialogCancel",
        "AlertDialogContent",
        "AlertDialogDescription",
        "AlertDialogFooter",
        "AlertDialogHeader",
        "AlertDialogTitle",
        "AlertDialogTrigger",
    ].map((name) => [name, name]),
);

function mountDetails({
    result = { isSuccess: true },
    failNavigation = false,
    routeDeviceId = "device-a",
} = {}) {
    const deletes = [];
    const navigation = [];
    let canManage = true;
    let focus;
    const component = mountNativeComponent("src/components/device/widgets/WidgetDetails.tsx", {
        props: { widgetId: "widget-a", deviceId: routeDeviceId },
        modules: {
            "expo-router": {
                useFocusEffect: (callback) => {
                    focus = callback;
                },
                useRouter: () => ({
                    canGoBack: () => true,
                    back: () => {
                        if (failNavigation) throw new Error("navigation");
                        navigation.push("back");
                    },
                }),
            },
            "@rn-primitives/portal": { PortalHost: "PortalHost" },
            "@/components/ui/alert-dialog": dialogHosts,
            "@/components/common/ContentSection": "ContentSection",
            "./WidgetForm": "WidgetForm",
            "@/contexts/custom/WidgetDetailsProvider": {
                useWidgetDetails: () => ({
                    loading: false,
                    loadError: "",
                    widget,
                    operation,
                    initializeForDisplay: async () => {},
                }),
            },
            "@/contexts/domain/HomeProvider": {
                useHomes: () => ({ loading: false, current: { isOwner: canManage } }),
            },
            "@/contexts/custom/DeviceProvider": { useDevice: () => ({ deviceId: "device-b" }) },
            "@/contexts/HttpClientProvider": {
                useHttpClient: () => ({
                    delete: async (path) => {
                        deletes.push(path);
                        return await result;
                    },
                }),
            },
        },
    });
    component.flushEffects();
    focus();
    const buttons = () =>
        component
            .elements()
            .filter((node) => node.type === "Button" && node.props.name === "Delete widget");
    const modal = () => component.elements().find((node) => node.type === "Modal");
    return {
        component,
        deletes,
        navigation,
        buttons,
        modal,
        revoke: () => {
            canManage = false;
            component.render();
        },
    };
}

test("widget deletion cancellation and Android Back send no request", () => {
    const details = mountDetails();
    details.buttons().at(-1).props.onPress();
    details.component.render();
    assert.equal(details.modal().props.visible, true);
    details.modal().props.onRequestClose();
    details.component.render();
    assert.equal(details.modal().props.visible, false);
    assert.deepEqual(details.deletes, []);
    assert.equal(
        details.component.elements().find((node) => node.type === "WidgetForm").props.edit,
        true,
    );
});

test("widget definition deletion locks duplicates and recovers accepted navigation without repeating DELETE", async () => {
    const details = mountDetails({ failNavigation: true });
    const confirm = details.buttons()[0].props.onPress;
    await confirm();
    await confirm();
    details.component.render();
    assert.deepEqual(details.deletes, ["v1/devices/widgets/widget-a"]);
    assert.match(details.component.text(), /Widget deleted/);
    assert.ok(
        details.component
            .elements()
            .some((node) => node.type === "Button" && node.props.name === "Return to widgets"),
    );
});

test("failed widget deletion stays inline and retained confirmation checks current permission", async () => {
    const details = mountDetails({ result: { isSuccess: false } });
    const confirm = details.buttons()[0].props.onPress;
    await confirm();
    details.component.render();
    assert.match(details.component.text(), /Couldn't delete/);
    assert.deepEqual(details.navigation, []);
    details.revoke();
    await confirm();
    assert.equal(details.deletes.length, 1);
    const wrongDevice = mountDetails({ routeDeviceId: "device-other" });
    assert.equal(wrongDevice.buttons().length, 0);
    assert.match(wrongDevice.component.text(), /selected device/);
});
