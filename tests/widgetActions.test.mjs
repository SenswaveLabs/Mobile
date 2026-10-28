import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

// These tests cover the widget command hook and handlers only. View QA runs on Android.
function mountAction({
    widgetId = "widget-a",
    disabled = false,
    results = [],
    onFailure,
    onSuccess,
} = {}) {
    const requests = [];
    let focusEffect;
    let blur;
    const httpClient = {
        post: (path, body) => {
            requests.push([path, body]);
            return results.shift() ?? Promise.resolve({ isSuccess: true });
        },
    };
    const component = mountNativeComponent("src/hooks/useWidgetAction.ts", {
        props: { widgetId, disabled, onFailure, onSuccess },
        exportName: "useWidgetAction",
        modules: {
            "expo-router": { useFocusEffect: (callback) => (focusEffect = callback) },
            "@/contexts/HttpClientProvider": { useHttpClient: () => httpClient },
        },
    });
    return {
        component,
        requests,
        action: () => component.output(),
        focus: () => {
            blur = focusEffect?.();
        },
        blur: () => blur?.(),
    };
}

test("widget action preserves the exact command values and endpoint", async () => {
    for (const value of ["", true, "eco.mode", "#12aBcD", 42.5]) {
        const mounted = mountAction();
        mounted.focus();

        assert.equal(await mounted.action().send(value), true);
        assert.deepEqual(JSON.parse(JSON.stringify(mounted.requests)), [
            [`v1/devices/widgets/widget-a/action`, { value }],
        ]);
    }
});

test("widget action synchronously blocks duplicates and disabled controls", async () => {
    let resolve;
    const mounted = mountAction({
        results: [new Promise((done) => (resolve = done))],
    });
    mounted.focus();
    const first = mounted.action().send(1);
    assert.equal(await mounted.action().send(2), false);
    assert.equal(mounted.requests.length, 1);
    resolve({ isSuccess: true });
    assert.equal(await first, true);

    const disabled = mountAction({ disabled: true });
    disabled.focus();
    assert.equal(await disabled.action().send(true), false);
    assert.deepEqual(disabled.requests, []);
});

test("failed and thrown widget commands keep one inline retry path and release the lock", async () => {
    const mounted = mountAction({
        results: [
            Promise.resolve({ isSuccess: false }),
            Promise.reject(new Error("offline")),
            Promise.resolve({ isSuccess: true }),
        ],
    });
    mounted.focus();

    assert.equal(await mounted.action().send(false), false);
    mounted.component.render();
    assert.equal(mounted.action().error, "Couldn't control this widget. Try again.");
    assert.equal(mounted.action().pending, false);

    assert.equal(await mounted.action().send("on"), false);
    mounted.component.render();
    assert.equal(mounted.action().error, "Couldn't control this widget. Try again.");
    assert.equal(await mounted.action().send("on"), true);
    assert.equal(mounted.requests.length, 3);
});

test("blur and widget identity changes suppress stale command results", async () => {
    let resolve;
    const mounted = mountAction({
        results: [new Promise((done) => (resolve = done)), Promise.resolve({ isSuccess: true })],
    });
    mounted.focus();
    const stale = mounted.action().send(1);
    mounted.blur();
    resolve({ isSuccess: false });
    assert.equal(await stale, false);
    mounted.component.render();
    assert.equal(mounted.action().error, "");

    mounted.component.render({ widgetId: "widget-b", disabled: false });
    mounted.component.flushEffects();
    mounted.focus();
    assert.equal(await mounted.action().send(2), true);
    assert.equal(mounted.requests[1][0], "v1/devices/widgets/widget-b/action");
});

test("changing widgets releases only the old action lock", async () => {
    let resolveOld;
    let resolveCurrent;
    const mounted = mountAction({
        results: [
            new Promise((done) => (resolveOld = done)),
            new Promise((done) => (resolveCurrent = done)),
        ],
    });
    mounted.focus();
    const oldAction = mounted.action().send(true);
    mounted.component.render({ widgetId: "widget-b", disabled: false });
    mounted.component.flushEffects();
    const currentAction = mounted.action().send(false);
    assert.equal(mounted.action().pending, true);

    resolveOld({ isSuccess: false });
    assert.equal(await oldAction, false);
    assert.equal(mounted.action().pending, true);
    resolveCurrent({ isSuccess: true });
    assert.equal(await currentAction, true);
    mounted.component.render();
    assert.equal(mounted.action().pending, false);
    assert.equal(mounted.requests.length, 2);
});

const widget = (type, configuration = {}) => ({
    id: "widget-a",
    name: "Test widget",
    type,
    configuration,
    updatedAtUtc: "",
    createdAtUtc: "",
});

const positionedWidget = { widgetId: "widget-a", row: 0, column: 0, rowSpan: 1, columnSpan: 1 };

const commonModules = {
    "@/contexts/ThemeProvider": {
        useTheme: () => ({ current: { colors: {} } }),
    },
    "@/styles/shadowStyles": { shadowStyles: { default: {} } },
    "@/components/common/Text": "Text",
    "@/components/common/Icon": "Icon",
    "@/components/common/Loading": "Loading",
    "@/components/common/Switch": { Switch: "Switch" },
};

const findElement = (component, predicate) => component.elements().find(predicate);
const settleHandler = async () => {
    for (let index = 0; index < 8; index++) await Promise.resolve();
};
const pressableWithLabel = (component, label) =>
    findElement(
        component,
        (element) => element.type === "Pressable" && element.props.accessibilityLabel === label,
    );

test("malformed Radio options render the existing unavailable widget fallback", () => {
    const radio = mountNativeComponent("src/components/device/widgets/widgets/RadioWidget.tsx", {
        props: {
            widget: widget("Radio", { options: { name: "invalid" } }),
            positionedWidget,
            disabled: false,
            pending: false,
            onAction: async () => true,
        },
        modules: {
            ...commonModules,
            "react-native-gesture-handler": { ScrollView: "GestureScrollView" },
            "./InvalidWidget": "InvalidWidget",
        },
    });
    assert.ok(radio.elements().some((element) => element.type === "InvalidWidget"));
});

test("five-column controls keep a full 48 dp inner target at 320 dp", () => {
    const width = (320 - 32 - 4 * 8) / 5;
    for (const type of ["Slider", "Switch", "Radio"]) {
        const component = mountNativeComponent(
            `src/components/device/widgets/widgets/${type}Widget.tsx`,
            {
                props: {
                    widget: widget(type, {
                        range: { min: 0, max: 100 },
                        step: 1,
                        options: [{ optionName: "eco", displayName: "Eco", icon: "leaf" }],
                        runtime: { value: 0 },
                    }),
                    positionedWidget,
                    disabled: false,
                    pending: false,
                    onAction: async () => true,
                },
                modules: {
                    ...commonModules,
                    "@/components/common/Slider": "Slider",
                    "react-native-gesture-handler": { ScrollView: "GestureScrollView" },
                },
            },
        );
        const frame = () =>
            findElement(component, (element) => typeof element.props.onLayout === "function");
        frame().props.onLayout({ nativeEvent: { layout: { width, height: 96 } } });
        component.render();
        const style = Object.assign({}, ...frame().props.style.filter(Boolean));
        const innerWidth =
            width -
            2 * (style.paddingHorizontal ?? style.padding ?? 0) -
            2 * (style.borderWidth ?? 0);
        assert.ok(innerWidth >= 48, `${type} keeps its complete control inside the tile`);
        if (type === "Radio") {
            const option = findElement(
                component,
                (element) => element.type?.name === "RadioDisplayOption",
            );
            assert.ok(option.props.itemWidth >= 48 && option.props.itemWidth <= innerWidth);
        }
    }
});

test("button and switch handlers preserve their command value types", async () => {
    const buttonActions = [];
    const button = mountNativeComponent("src/components/device/widgets/widgets/ButtonWidget.tsx", {
        props: {
            widget: widget("Button"),
            disabled: false,
            pending: false,
            onAction: async (value) => (buttonActions.push(value), true),
        },
        modules: commonModules,
    });
    pressableWithLabel(button, "Test widget").props.onPress();
    assert.deepEqual(buttonActions, [""]);

    const switchActions = [];
    const switchWidget = mountNativeComponent(
        "src/components/device/widgets/widgets/SwitchWidget.tsx",
        {
            props: {
                widget: widget("Switch", { runtime: { value: false } }),
                disabled: false,
                pending: false,
                onAction: async (value) => (switchActions.push(value), true),
            },
            modules: commonModules,
        },
    );
    pressableWithLabel(switchWidget, "Test widget").props.onPress();
    await settleHandler();
    assert.deepEqual(switchActions, [true]);
    switchWidget.render();
    assert.equal(
        pressableWithLabel(switchWidget, "Test widget").props.accessibilityState.checked,
        true,
    );
});

test("slider and radio handlers send the configured primitive values", async () => {
    const sliderActions = [];
    const sliderProps = {
        widget: widget("Slider", {
            range: { min: 0, max: 100 },
            step: 5,
            runtime: { value: 20 },
        }),
        disabled: false,
        pending: false,
        onAction: async (value) => (sliderActions.push(value), true),
    };
    const slider = mountNativeComponent("src/components/device/widgets/widgets/SliderWidget.tsx", {
        props: sliderProps,
        modules: {
            ...commonModules,
            "@/components/common/Slider": "Slider",
        },
    });
    findElement(slider, (element) => element.type === "Slider").props.onValueSlided(35);
    await settleHandler();
    assert.deepEqual(sliderActions, [35]);
    slider.render();
    assert.ok(pressableWithLabel(slider, "Test widget, 35"));
    assert.equal(
        findElement(slider, (element) => element.type === "Slider").props.initialValue,
        35,
        "the accepted value must remain the Slider's source when pending clears",
    );
    assert.equal(findElement(slider, (element) => element.type === "Slider").props.value, 35);
    slider.render({ ...sliderProps, pending: true });
    assert.equal(
        findElement(slider, (element) => element.type === "Slider").props.initialValue,
        35,
        "pending must not reset the native track behind its accepted readout",
    );
    assert.equal(findElement(slider, (element) => element.type === "Slider").props.value, 35);
    slider.render(sliderProps);
    assert.equal(
        findElement(slider, (element) => element.type === "Slider").props.initialValue,
        35,
    );
    findElement(slider, (element) => element.type === "Slider").props.onValueSlided(20);
    await settleHandler();
    slider.render();
    assert.deepEqual(sliderActions, [35, 20]);
    assert.equal(
        findElement(slider, (element) => element.type === "Slider").props.initialValue,
        20,
    );
    assert.equal(findElement(slider, (element) => element.type === "Slider").props.value, 20);

    const radioActions = [];
    const option = { optionName: "eco.mode", displayName: "Eco", icon: "leaf" };
    const radio = mountNativeComponent("src/components/device/widgets/widgets/RadioWidget.tsx", {
        props: {
            widget: widget("Radio", { options: [option], runtime: { value: "normal" } }),
            positionedWidget,
            disabled: false,
            pending: false,
            onAction: async (value) => (radioActions.push(value), true),
        },
        modules: {
            ...commonModules,
            "react-native-gesture-handler": { ScrollView: "GestureScrollView" },
        },
    });
    const container = findElement(
        radio,
        (element) => element.type === "View" && element.props.onLayout,
    );
    container.props.onLayout({ nativeEvent: { layout: { width: 160, height: 96 } } });
    radio.render();
    const optionView = findElement(radio, (element) => element.type?.name === "RadioDisplayOption");
    optionView.props.onPress(option);
    await settleHandler();
    assert.deepEqual(radioActions, ["eco.mode"]);
    radio.render();
    assert.equal(
        findElement(radio, (element) => element.type?.name === "RadioDisplayOption").props
            .isSelected,
        true,
    );
});

test("Color confirms the exact hex value and retains dashboard unlink", async () => {
    const actions = [];
    let removed = 0;
    const color = mountNativeComponent("src/components/device/widgets/widgets/ColorWidget.tsx", {
        props: {
            widget: widget("Color", { runtime: { value: "#000000" } }),
            disabled: false,
            pending: false,
            onAction: async (value) => (actions.push(value), true),
            operations: () => removed++,
        },
        modules: { ...commonModules, "@/components/common/ColorPickerField": "ColorPickerField" },
    });
    const editor = () => findElement(color, (element) => element.type === "ColorPickerField");
    assert.equal(editor().props.variant, "tile");
    assert.equal(editor().props.value, "#000000");
    assert.deepEqual(actions, []);
    assert.equal(await editor().props.onConfirm("#Ab12Ef"), true);
    color.render();
    assert.equal(editor().props.value, "#Ab12Ef");
    assert.deepEqual(actions, ["#Ab12Ef"]);
    editor().props.triggerProps.onAccessibilityAction({ nativeEvent: { actionName: "longpress" } });
    assert.equal(removed, 1);
});

test("a rejected slider action restores a newer reported value received while pending", async () => {
    const actions = [];
    let resolveCommand;
    let commandResponse = Promise.resolve(true);
    const props = {
        widget: widget("Slider", {
            range: { min: 0, max: 100 },
            step: 5,
            runtime: { value: 20 },
        }),
        disabled: false,
        pending: false,
        onAction: (value) => (actions.push(value), commandResponse),
    };
    const slider = mountNativeComponent("src/components/device/widgets/widgets/SliderWidget.tsx", {
        props,
        modules: {
            ...commonModules,
            "@/components/common/Slider": "Slider",
        },
    });
    slider.flushEffects();

    commandResponse = new Promise((resolve) => (resolveCommand = resolve));
    const submit = findElement(slider, (element) => element.type === "Slider").props.onValueSlided;
    const pendingAction = submit(35);
    const reportedProps = {
        ...props,
        widget: widget("Slider", {
            range: { min: 0, max: 100 },
            step: 5,
            runtime: { value: 50 },
        }),
        pending: true,
    };
    slider.render(reportedProps);
    slider.flushEffects();
    slider.render(reportedProps);
    resolveCommand(false);
    await pendingAction;
    slider.render(reportedProps);

    assert.deepEqual(actions, [35]);
    const control = findElement(slider, (element) => element.type === "Slider");
    assert.equal(control.props.initialValue, 50);
    assert.equal(control.props.value, 50);
    assert.ok(pressableWithLabel(slider, "Test widget, 50"));
});

test("Display is read-only and InvalidWidget exposes only manager unlink", () => {
    const display = mountNativeComponent(
        "src/components/device/widgets/widgets/DisplayWidgets.tsx",
        {
            props: {
                widget: widget("Display", { runtime: { value: "21", unit: "°C" } }),
                disabled: false,
            },
            modules: commonModules,
        },
    );
    const displayControl = findElement(display, (element) => element.type === "Pressable");
    assert.equal(displayControl.props.accessibilityRole, "text");
    assert.equal(displayControl.props.onPress, undefined);
    assert.equal(displayControl.props.accessibilityActions, undefined);

    let removals = 0;
    const invalid = mountNativeComponent(
        "src/components/device/widgets/widgets/InvalidWidget.tsx",
        {
            props: {
                widget: widget("Invalid"),
                disabled: false,
                operations: () => removals++,
            },
            modules: commonModules,
        },
    );
    const invalidControl = findElement(invalid, (element) => element.type === "Pressable");
    assert.equal(
        invalidControl.props.accessibilityActions[0].label,
        "Remove widget from dashboard",
    );
    invalidControl.props.onAccessibilityAction({ nativeEvent: { actionName: "longpress" } });
    assert.equal(removals, 1);
});

test("Display keeps zero and missing readings visible with the configured unit", () => {
    for (const [value, expected] of [
        [0, "0 °C"],
        [null, "—"],
        [undefined, "—"],
    ]) {
        const display = mountNativeComponent(
            "src/components/device/widgets/widgets/DisplayWidgets.tsx",
            {
                props: {
                    widget: widget("Display", { runtime: { value }, unit: "°C" }),
                    disabled: false,
                },
                modules: commonModules,
            },
        );
        const control = findElement(display, (element) => element.type === "Pressable");
        assert.equal(control.props.accessibilityLabel, `Test widget: ${expected}`);
        assert.ok(
            display
                .elements()
                .some(
                    (element) =>
                        element.type === "Text" &&
                        element.props.children.flat(Infinity).join("").includes(expected),
                ),
            `${expected} must be visible, not only announced`,
        );
    }
});

test("rejected Color confirmation keeps the reported color and forwards inline feedback", async () => {
    const actions = [];
    const props = {
        widget: widget("Color", { runtime: { value: "#000000" } }),
        disabled: false,
        pending: false,
        error: "Couldn't control this widget. Try again.",
        onAction: async (value) => (actions.push(value), false),
    };
    const color = mountNativeComponent("src/components/device/widgets/widgets/ColorWidget.tsx", {
        props,
        modules: { ...commonModules, "@/components/common/ColorPickerField": "ColorPickerField" },
    });
    const editor = () => findElement(color, (element) => element.type === "ColorPickerField");
    assert.equal(await editor().props.onConfirm("#aBcDeF"), false);
    color.render();
    assert.equal(editor().props.value, "#000000");
    assert.match(editor().props.error, /Try again/);
    assert.deepEqual(actions, ["#aBcDeF"]);
});

test("Radio keeps vertical options reachable and ignores the selected option", async () => {
    const actions = [];
    const option = { optionName: "eco.mode", displayName: "Eco", icon: "leaf" };
    const radio = mountNativeComponent("src/components/device/widgets/widgets/RadioWidget.tsx", {
        props: {
            widget: widget("Radio", { options: [option], runtime: { value: "eco.mode" } }),
            positionedWidget: { ...positionedWidget, rowSpan: 3 },
            disabled: false,
            pending: false,
            onAction: async (value) => (actions.push(value), true),
        },
        modules: {
            ...commonModules,
            "react-native-gesture-handler": { ScrollView: "GestureScrollView" },
        },
    });
    findElement(
        radio,
        (element) => element.type === "View" && element.props.onLayout,
    ).props.onLayout({ nativeEvent: { layout: { width: 66, height: 96 } } });
    radio.render();
    const scroller = findElement(radio, (element) => element.type === "GestureScrollView");
    assert.equal(scroller.props.horizontal, false);
    assert.equal(scroller.props.contentContainerStyle.flexDirection, "column");

    const optionView = findElement(radio, (element) => element.type?.name === "RadioDisplayOption");
    optionView.props.onPress(option);
    await settleHandler();
    assert.deepEqual(actions, []);
    const control = radio
        .elements(optionView.type(optionView.props))
        .find((element) => element.type === "Pressable");
    const style = Object.assign({}, ...control.props.style);
    assert.equal(control.props.accessibilityRole, "radio");
    assert.ok(style.minWidth >= 48);
    assert.ok(style.minHeight >= 48);
});

test("a pending Button keeps its action name visible", () => {
    const button = mountNativeComponent("src/components/device/widgets/widgets/ButtonWidget.tsx", {
        props: {
            widget: widget("Button"),
            disabled: false,
            pending: true,
            onAction: async () => true,
        },
        modules: commonModules,
    });
    const control = pressableWithLabel(button, "Test widget");
    assert.equal(control.props.disabled, true);
    assert.equal(control.props.accessibilityState.busy, true);
    assert.ok(
        button
            .elements()
            .some(
                (element) =>
                    element.type === "Text" && element.props.children.includes("Test widget"),
            ),
    );
});

test("WidgetView publishes non-color failures without changing widget bounds", async () => {
    const failures = [];
    let focusEffect;
    const view = mountNativeComponent("src/components/device/widgets/WidgetView.tsx", {
        props: {
            calculatedWidget: widget("Button"),
            positionedWidget,
            itemWidth: 96,
            itemHeight: 96,
            gap: 8,
            disabled: false,
            onFailure: (failure) => failures.push(failure),
        },
        modules: {
            "expo-router": { useFocusEffect: (callback) => (focusEffect = callback) },
            "@/contexts/HttpClientProvider": {
                useHttpClient: () => ({ post: async () => ({ isSuccess: false }) }),
            },
            "@/components/ui/alert": { Alert: "Alert", AlertDescription: "AlertDescription" },
            "lucide-react-native": { CircleAlert: "CircleAlert" },
            "./widgets/ButtonWidget": "ButtonWidget",
            "./widgets/DisplayWidgets": "DisplayWidget",
            "./widgets/InvalidWidget": "InvalidWidget",
            "./widgets/SwitchWidget": "SwitchWidget",
            "./widgets/SliderWidget": "SliderWidget",
            "./widgets/ColorWidget": "ColorWidget",
            "./widgets/RadioWidget": "RadioWidget",
        },
    });
    focusEffect?.();
    view.flushEffects();
    const bounds = JSON.stringify(view.output().props.style);
    const renderer = findElement(view, (element) => element.type?.name === "RenderInternalWidget");
    assert.equal(await renderer.type(renderer.props).props.onAction(""), false);
    view.render();
    assert.equal(failures.length, 1);
    assert.equal(JSON.stringify(view.output().props.style), bounds);
    assert.equal(
        view.elements().some((element) => element.type === "Alert"),
        false,
    );
});

test("WidgetView keeps Color command errors in its editor only", async () => {
    const failures = [];
    let focusEffect;
    const view = mountNativeComponent("src/components/device/widgets/WidgetView.tsx", {
        props: {
            calculatedWidget: widget("Color"),
            positionedWidget,
            itemWidth: 96,
            itemHeight: 96,
            gap: 8,
            onFailure: (failure) => failures.push(failure),
        },
        modules: {
            "expo-router": { useFocusEffect: (callback) => (focusEffect = callback) },
            "@/contexts/HttpClientProvider": {
                useHttpClient: () => ({ post: async () => ({ isSuccess: false }) }),
            },
            "./widgets/ButtonWidget": "ButtonWidget",
            "./widgets/DisplayWidgets": "DisplayWidget",
            "./widgets/InvalidWidget": "InvalidWidget",
            "./widgets/SwitchWidget": "SwitchWidget",
            "./widgets/SliderWidget": "SliderWidget",
            "./widgets/ColorWidget": "ColorWidget",
            "./widgets/RadioWidget": "RadioWidget",
        },
    });
    focusEffect?.();
    view.flushEffects();
    const renderer = findElement(view, (element) => element.type?.name === "RenderInternalWidget");
    await renderer.type(renderer.props).props.onAction("#123456");
    view.render();
    assert.deepEqual(failures, []);
    assert.match(
        findElement(view, (element) => element.type?.name === "RenderInternalWidget").props.error,
        /Try again/,
    );
    assert.equal(
        view.elements().some((element) => element.type === "Alert"),
        false,
    );
});

test("failed actions publish an exact retry that cannot repeat or outlive a newer command", async () => {
    const failures = [];
    let successes = 0;
    let resolve;
    const mounted = mountAction({
        onFailure: (failure) => failures.push(failure),
        onSuccess: () => successes++,
        results: [Promise.resolve({ isSuccess: false }), new Promise((done) => (resolve = done))],
    });
    mounted.focus();
    assert.equal(await mounted.action().send("#aBc123"), false);
    assert.equal(failures.length, 1);
    assert.match(failures[0].message, /Try again/);
    const first = failures[0].retry();
    assert.equal(await failures[0].retry(), false);
    assert.deepEqual(JSON.parse(JSON.stringify(mounted.requests[1])), [
        "v1/devices/widgets/widget-a/action",
        { value: "#aBc123" },
    ]);
    resolve({ isSuccess: true });
    assert.equal(await first, true);
    assert.equal(successes, 1);
    assert.equal(await failures[0].retry(), false);
    assert.equal(mounted.requests.length, 2);
});

test("retry is invalid after blur, identity change or a disabled interval", async () => {
    for (const invalidate of [
        (mounted) => mounted.blur(),
        (mounted) => {
            mounted.component.render({ widgetId: "widget-b", disabled: false });
            mounted.component.flushEffects();
        },
        (mounted) => {
            mounted.component.render({ widgetId: "widget-a", disabled: true });
            mounted.component.flushEffects();
            mounted.component.render({ widgetId: "widget-a", disabled: false });
            mounted.component.flushEffects();
        },
    ]) {
        const failures = [];
        const mounted = mountAction({
            onFailure: (failure) => failures.push(failure),
            results: [Promise.resolve({ isSuccess: false })],
        });
        mounted.focus();
        await mounted.action().send(false);
        invalidate(mounted);
        assert.equal(await failures[0].retry(), false);
        assert.equal(mounted.requests.length, 1);
    }
});

test("a command finishing after access is disabled publishes no failure or success", async () => {
    for (const isSuccess of [false, true]) {
        let resolve;
        const failures = [],
            successes = [];
        const mounted = mountAction({
            onFailure: (failure) => failures.push(failure),
            onSuccess: () => successes.push(true),
            results: [new Promise((done) => (resolve = done))],
        });
        mounted.focus();
        const send = mounted.action().send(0);
        mounted.component.render({
            widgetId: "widget-a",
            disabled: true,
            onFailure: (failure) => failures.push(failure),
            onSuccess: () => successes.push(true),
        });
        resolve({ isSuccess });
        assert.equal(await send, false);
        assert.deepEqual(failures, []);
        assert.deepEqual(successes, []);
    }
});

test("a rejected retry publishes a fresh retry and invalidates its previous closure", async () => {
    const failures = [];
    const mounted = mountAction({
        onFailure: (failure) => failures.push(failure),
        results: [
            Promise.resolve({ isSuccess: false }),
            Promise.resolve({ isSuccess: false }),
            Promise.resolve({ isSuccess: true }),
        ],
    });
    mounted.focus();
    await mounted.action().send(false);
    assert.equal(await failures[0].retry(), false);
    assert.equal(failures.length, 2);
    assert.equal(await failures[0].retry(), false);
    assert.equal(await failures[1].retry(), true);
    assert.deepEqual(JSON.parse(JSON.stringify(mounted.requests.map(([, body]) => body.value))), [
        false,
        false,
        false,
    ]);
});
