import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const accessibilityFocus = [];
const afterInteractions = [];
const keyboardDismissals = [];
const theme = {
    current: {
        colors: {
            authForeground: "#1B1610",
            authMuted: "#615A50",
            authBorder: "#8C857A",
            authFieldBackground: "#F9F7F1",
            authFocus: "#009286",
            authPrimary: "#F7B817",
            authOnPrimary: "#321A03",
            authBackground: "#F9F7F1",
            deviceTileSubtle: "#F0ECE3",
        },
    },
};

function mountSelect({
    disabled = false,
    choices,
    platform = "android",
    deferAnimations = false,
    onClosed,
    variant,
    busy,
    dismissDisabled,
    keyboardAware,
    leading,
} = {}) {
    const animations = [];
    const options = choices ?? [
        { label: "Required", selected: true, onPress: () => {} },
        { label: "Optional", selected: false, onPress: () => {} },
    ];
    const form = mountNativeComponent("src/components/common/BottomSheetSelect.tsx", {
        props: {
            title: "Transport security",
            value: "Required",
            options,
            disabled,
            onClosed,
            variant,
            busy,
            dismissDisabled,
            keyboardAware,
            leading,
        },
        modules: {
            "react-native": {
                Modal: "Modal",
                ActivityIndicator: "ActivityIndicator",
                Pressable: "Pressable",
                ScrollView: "ScrollView",
                StyleSheet: { create: (styles) => styles },
                Text: "NativeText",
                View: "View",
                AccessibilityInfo: {
                    setAccessibilityFocus: (node) => accessibilityFocus.push(node),
                },
                InteractionManager: {
                    runAfterInteractions: (callback) => afterInteractions.push(callback),
                },
                Keyboard: { dismiss: () => keyboardDismissals.push(true) },
                Platform: { OS: platform },
                findNodeHandle: (node) => node,
                useWindowDimensions: () => ({ width: 390, height: 844 }),
            },
            "react-native-safe-area-context": {
                useSafeAreaInsets: () => ({ top: 24, bottom: 24 }),
            },
            "react-native-keyboard-controller": {
                KeyboardAwareScrollView: "KeyboardAwareScrollView",
            },
            "react-native-reanimated": {
                __esModule: true,
                default: { View: "Animated.View" },
                Easing: { out: (value) => value, in: (value) => value },
                ReduceMotion: { System: "system" },
                useSharedValue: (value) => ({ value }),
                useAnimatedStyle: (callback) => callback(),
                withTiming: (value, config, callback) => {
                    if (deferAnimations) animations.push({ config, callback });
                    else callback(true);
                    return value;
                },
                runOnJS: (callback) => callback,
                cancelAnimation: () => {},
            },
            "lucide-react-native": {
                Check: "Check",
                ChevronDown: "ChevronDown",
                X: "X",
                Circle: "Circle",
                CircleDot: "CircleDot",
            },
            "@/contexts/ThemeProvider": { useTheme: () => theme },
        },
    });
    return { ...form, animations };
}

function elements(form, root) {
    return form.elements(root);
}

function trigger(form) {
    return elements(form).find(
        (node) => node.props?.accessibilityLabel === "Transport security, Required",
    );
}

function modal(form) {
    return elements(form).find((node) => node.type === "Modal");
}

function radios(form) {
    return elements(form, modal(form)).filter((node) => node.props?.accessibilityRole === "radio");
}

function open(form) {
    trigger(form).props.onPress();
    form.render();
    return modal(form);
}

function scrim(form) {
    return elements(form, modal(form)).find(
        (node) => node.type === "Pressable" && !node.props?.accessibilityLabel,
    );
}

test("tile selector keeps a 48 dp target, wrapping value and single-choice sheet", () => {
    const form = mountSelect({ variant: "tile" });
    const control = trigger(form);
    const style = Object.assign({}, ...control.props.style({ pressed: false }));
    assert.equal(style.minHeight, 48);
    assert.equal(style.minWidth, 48);
    assert.equal(style.borderWidth, 0);
    const value = elements(form, control).find((node) => node.type === "NativeText");
    assert.equal(value.props.numberOfLines, undefined);
    assert.ok(elements(form, control).some((node) => node.type === "ChevronDown"));
    open(form);
    assert.equal(radios(form).filter((node) => node.props.accessibilityState.checked).length, 1);
    assert.equal(elements(form).filter((node) => node.type === "CircleDot").length, 1);
    assert.equal(elements(form).filter((node) => node.type === "Circle").length, 1);
});

test("tile selector exposes expansion and shows focus without changing its target", () => {
    const form = mountSelect({ variant: "tile" });
    const baseline = Object.assign({}, ...trigger(form).props.style({ pressed: false }));
    const icon = () =>
        elements(form, trigger(form)).find(
            (node) =>
                node.type === "View" &&
                Array.isArray(node.props.style) &&
                Object.assign({}, ...node.props.style).backgroundColor ===
                    theme.current.colors.deviceTileSubtle,
        );
    assert.equal(trigger(form).props.accessibilityState.expanded, false);
    trigger(form).props.onFocus();
    form.render();
    assert.equal(
        Object.assign({}, ...icon().props.style).borderColor,
        theme.current.colors.authFocus,
    );
    assert.deepEqual(Object.assign({}, ...trigger(form).props.style({ pressed: false })), {
        ...baseline,
        borderColor: theme.current.colors.authFocus,
    });
    open(form);
    assert.equal(trigger(form).props.accessibilityState.expanded, true);
    modal(form).props.onRequestClose();
    trigger(form).props.onBlur();
    form.render();
    assert.equal(trigger(form).props.accessibilityState.expanded, false);
    assert.equal(Object.assign({}, ...icon().props.style).borderColor, "transparent");
});

test("busy tile selector swaps its fixed icon slot without changing value or trigger geometry", () => {
    const idle = mountSelect({ variant: "tile" });
    const pending = mountSelect({ variant: "tile", busy: true, disabled: true });
    const idleStyle = Object.assign({}, ...trigger(idle).props.style({ pressed: false }));
    const pendingStyle = Object.assign({}, ...trigger(pending).props.style({ pressed: false }));
    assert.equal(JSON.stringify(idleStyle), JSON.stringify(pendingStyle));
    assert.equal(trigger(pending).props.accessibilityState.busy, true);
    assert.ok(
        elements(pending, trigger(pending)).some((node) => node.type === "ActivityIndicator"),
    );
    assert.equal(
        elements(idle, trigger(idle)).find((node) => node.type === "NativeText").props.children[0],
        elements(pending, trigger(pending)).find((node) => node.type === "NativeText").props
            .children[0],
    );
});

test("opens after dismissing keyboard and marks current option visually and semantically", () => {
    const selected = [];
    const form = mountSelect({
        choices: [
            { label: "Required", selected: true, onPress: () => selected.push("Required") },
            { label: "Optional", selected: false, onPress: () => selected.push("Optional") },
        ],
    });

    const dismissals = keyboardDismissals.length;
    const sheet = open(form);
    assert.equal(keyboardDismissals.length, dismissals + 1);
    assert.equal(sheet.props.visible, true);

    const [current, optional] = radios(form);
    assert.equal(current.props.accessibilityState.selected, true);
    assert.equal(current.props.accessibilityState.checked, true);
    assert.ok(elements(form, current).some((node) => node.type === "Check"));
    assert.equal(optional.props.accessibilityState.selected, false);
    assert.equal(optional.props.accessibilityState.checked, false);

    current.props.ref.current = { id: "current-option" };
    sheet.props.onShow();
    assert.equal(accessibilityFocus.at(-1).id, "current-option");

    current.props.onPress();
    form.render();
    assert.equal(modal(form).props.visible, false);
    assert.deepEqual(selected, [], "choosing current value leaves caller state unchanged");
});

test("Close, scrim, and hardware Back cancel without choosing an option", async (t) => {
    for (const [name, cancel] of [
        [
            "Close",
            (sheet, form) =>
                elements(form, sheet)
                    .find((node) => node.props?.accessibilityLabel === "Close selector")
                    .props.onPress(),
        ],
        ["scrim", (sheet, form) => scrim(form).props.onPress()],
        ["hardware Back", (sheet) => sheet.props.onRequestClose()],
    ]) {
        await t.test(name, () => {
            let choices = 0;
            const form = mountSelect({
                deferAnimations: true,
                choices: [
                    { label: "Required", selected: true, onPress: () => choices++ },
                    { label: "Optional", selected: false, onPress: () => choices++ },
                ],
            });
            const sheet = open(form);

            cancel(sheet, form);
            form.render();

            assert.equal(modal(form).props.visible, true, "exit must finish before hiding modal");
            form.animations.pop().callback(true);
            form.render();
            assert.equal(modal(form).props.visible, false);
            assert.equal(choices, 0);
        });
    }
});

test("choosing another option runs once while the sheet finishes closing", () => {
    let choices = 0;
    const form = mountSelect({
        deferAnimations: true,
        choices: [
            { label: "Required", selected: true, onPress: () => choices++ },
            { label: "Optional", selected: false, onPress: () => choices++ },
        ],
    });

    open(form);
    assert.equal(modal(form).props.animationType, "none", "native slide would also move the scrim");
    modal(form).props.onShow();
    form.animations.pop().callback(true);
    radios(form)[1].props.onPress();
    radios(form)[1].props.onPress();
    modal(form).props.onRequestClose();
    form.render();

    assert.equal(choices, 1);
    assert.equal(modal(form).props.visible, true);
    assert.equal(form.animations.length, 1, "repeated dismissal must not restart the exit");
    const exit = form.animations.pop();
    assert.equal(exit.config.reduceMotion, "system");
    exit.callback(true);
    form.render();
    assert.equal(modal(form).props.visible, false);
});

test("disabled selector blocks opening and option callbacks but keeps cancellation available", () => {
    let choices = 0;
    const options = [
        { label: "Required", selected: true, onPress: () => choices++ },
        { label: "Optional", selected: false, onPress: () => choices++ },
    ];
    const form = mountSelect({ disabled: true, choices: options });
    const dismissals = keyboardDismissals.length;

    trigger(form).props.onPress();
    form.render();
    assert.equal(modal(form).props.visible, false);
    assert.equal(keyboardDismissals.length, dismissals);

    const props = { title: "Transport security", value: "Required", options, disabled: false };
    form.render(props);
    trigger(form).props.onPress();
    form.render();
    assert.equal(modal(form).props.visible, true);
    form.render({ ...props, disabled: true });
    radios(form)[1].props.onPress();
    form.render();
    assert.equal(choices, 0);
    assert.equal(modal(form).props.visible, true);

    elements(form, modal(form))
        .find((node) => node.props?.accessibilityLabel === "Close selector")
        .props.onPress();
    form.render();
    assert.equal(modal(form).props.visible, false);
});

test("restores accessibility focus to trigger after Android modal closes", () => {
    const scheduled = afterInteractions.length;
    const form = mountSelect();
    open(form);
    form.flushEffects();
    trigger(form).props.ref.current = { id: "trigger" };
    modal(form).props.onRequestClose();
    form.render();
    form.flushEffects();

    assert.equal(afterInteractions.length, scheduled + 1);
    afterInteractions.at(-1)();
    assert.equal(accessibilityFocus.at(-1).id, "trigger");
});

test("onClosed waits until the modal exit animation has finished", () => {
    let closed = false;
    const form = mountSelect({
        deferAnimations: true,
        onClosed: () => (closed = true),
    });
    const sheet = open(form);
    sheet.props.onRequestClose();
    assert.equal(closed, false);
    form.animations.pop().callback(true);
    form.render();
    assert.equal(modal(form).props.visible, false);
    assert.equal(closed, true);
});

test("focuses the header without a selected option and restores trigger after iOS dismissal", () => {
    const form = mountSelect({ choices: [], platform: "ios" });
    const sheet = open(form);
    const heading = elements(form, sheet).find(
        (node) => node.type === "NativeText" && node.props?.accessibilityRole === "header",
    );
    heading.props.ref.current = { id: "sheet-heading" };
    sheet.props.onShow();
    assert.equal(accessibilityFocus.at(-1).id, "sheet-heading");

    trigger(form).props.ref.current = { id: "trigger" };
    sheet.props.onDismiss();
    assert.equal(accessibilityFocus.at(-1).id, "trigger");
});

test("a guarded sheet blocks Back, scrim and Close until its pending action settles", () => {
    let locked = true;
    const form = mountSelect({ dismissDisabled: () => locked, keyboardAware: true });
    open(form);
    assert.ok(elements(form).some((node) => node.type === "KeyboardAwareScrollView"));
    modal(form).props.onRequestClose();
    scrim(form).props.onPress();
    elements(form)
        .find((node) => node.props?.accessibilityLabel === "Close selector")
        .props.onPress();
    form.render();
    assert.equal(modal(form).props.visible, true);
    locked = false;
    modal(form).props.onRequestClose();
    form.render();
    assert.equal(modal(form).props.visible, false);
});

test("compact color tiles retain the accessible value without clipping its text", () => {
    const form = mountSelect({ variant: "tile", leading: { type: "Swatch", props: {} } });
    trigger(form).props.onLayout({ nativeEvent: { layout: { width: 50 } } });
    form.render();
    assert.equal(trigger(form).props.accessibilityLabel, "Transport security, Required");
    assert.equal(
        elements(form, trigger(form)).some((node) => node.type === "NativeText"),
        false,
    );
    trigger(form).props.onLayout({ nativeEvent: { layout: { width: 150 } } });
    form.render();
    assert.equal(
        elements(form, trigger(form)).some((node) => node.type === "NativeText"),
        true,
    );
});
