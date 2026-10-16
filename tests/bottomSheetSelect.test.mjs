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
        },
    },
};

function mountSelect({ disabled = false, choices, platform = "android" } = {}) {
    const options = choices ?? [
        { label: "Required", selected: true, onPress: () => {} },
        { label: "Optional", selected: false, onPress: () => {} },
    ];
    return mountNativeComponent("src/components/common/BottomSheetSelect.tsx", {
        props: {
            title: "Transport security",
            value: "Required",
            options,
            disabled,
        },
        modules: {
            "react-native": {
                Modal: "Modal",
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
                useSafeAreaInsets: () => ({ bottom: 24 }),
            },
            "lucide-react-native": {
                Check: "Check",
                ChevronDown: "ChevronDown",
                X: "X",
            },
            "@/contexts/ThemeProvider": { useTheme: () => theme },
        },
    });
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
                choices: [
                    { label: "Required", selected: true, onPress: () => choices++ },
                    { label: "Optional", selected: false, onPress: () => choices++ },
                ],
            });
            const sheet = open(form);

            cancel(sheet, form);
            form.render();

            assert.equal(modal(form).props.visible, false);
            assert.equal(choices, 0);
        });
    }
});

test("choosing another option invokes its callback once and closes", () => {
    let choices = 0;
    const form = mountSelect({
        choices: [
            { label: "Required", selected: true, onPress: () => choices++ },
            { label: "Optional", selected: false, onPress: () => choices++ },
        ],
    });

    open(form);
    radios(form)[1].props.onPress();
    form.render();

    assert.equal(choices, 1);
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
