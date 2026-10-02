import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

// Native hosts cannot mount in Node. Keep the form, validation and event handlers real;
// this small hook adapter only records state and refs between explicit renders.
function mountForm(submitClicked) {
    const slots = [];
    const focused = [];
    let cursor = 0;
    const react = {
        createElement: (type, props, ...children) => {
            if (["Input", "PasswordInput"].includes(type) && props.inputRef) {
                props.inputRef.current = { focus: () => focused.push(props.title) };
            }
            return { type, props: { ...props, children } };
        },
        useState: (initial) => {
            const index = cursor++;
            if (!(index in slots)) slots[index] = initial;
            return [
                slots[index],
                (value) => {
                    slots[index] = typeof value === "function" ? value(slots[index]) : value;
                },
            ];
        },
        useRef: (initial) => {
            const index = cursor++;
            return (slots[index] ??= { current: initial });
        },
        useEffect: () => {},
    };
    function load(path) {
        const source = readFileSync(path, "utf8");
        const code = ts.transpileModule(source, {
            compilerOptions: {
                module: ts.ModuleKind.CommonJS,
                jsx: ts.JsxEmit.React,
                esModuleInterop: true,
            },
        }).outputText;
        const module = { exports: {} };
        const localRequire = (name) => {
            if (name === "react") return react;
            if (name === "react-native")
                return {
                    View: "View",
                    StyleSheet: { create: (value) => value },
                    AccessibilityInfo: { announceForAccessibility: () => {} },
                };
            if (name.includes("ThemeProvider"))
                return { useTheme: () => ({ current: { colors: {} } }) };
            if (name.includes("ToastProvider")) return { useToast: () => ({ error: () => {} }) };
            if (name.includes("defaultStyles")) return { keyboardOffset: 10 };
            if (name === "react-native-keyboard-controller")
                return { KeyboardAwareScrollView: "ScrollView" };
            if (name.startsWith("../common/")) return name.split("/").at(-1);
            if (name.startsWith("@/utils/")) return load(resolve("src", name.slice(2) + ".ts"));
            return require(name);
        };
        runInNewContext(code, { module, exports: module.exports, require: localRequire });
        return module.exports;
    }
    const Form = load(resolve("src/components/auth/ResetPasswordForm.tsx")).default;
    let tree;
    function render() {
        cursor = 0;
        tree = Form({ submitClicked });
    }
    function elements(node = tree) {
        return node && typeof node === "object"
            ? [node, ...(node.props?.children ?? []).flatMap(elements)]
            : [];
    }
    const inputs = () =>
        elements().filter((node) => ["Input", "PasswordInput"].includes(node.type));
    const button = () => elements().find((node) => node.type === "Button");
    render();
    return {
        render,
        inputs,
        button,
        focused,
        text: () => JSON.stringify(tree),
        fill: () => {
            inputs().forEach((node, index) =>
                node.props.setValue(index === 0 ? "email-code" : "Strong123!"),
            );
            render();
        },
    };
}

test("reset submit shows each required error and never sends an empty form", async () => {
    let calls = 0;
    const form = mountForm(async () => {
        calls++;
        return { isSuccess: true, errorMessage: null };
    });
    await form.button().props.onPress();
    form.render();
    assert.equal(calls, 0);
    assert.ok(
        form.inputs().every((input) => input.props.error),
        "Every missing field needs a visible error",
    );
    assert.deepEqual(form.focused, ["Reset code"]);
});

test("editing a reset field clears its stale error without hiding other field errors", async () => {
    for (const field of [0, 1, 2]) {
        const form = mountForm(async () => ({ isSuccess: true, errorMessage: null }));
        await form.button().props.onPress();
        form.render();
        form.inputs()[field].props.setValue(field === 0 ? "email-code" : "Strong123!");
        form.render();
        assert.equal(form.inputs()[field].props.error, "");
        assert.ok(form.inputs().every((input, index) => index === field || input.props.error));
    }
});

test("reset locks synchronous repeats, preserves backend failure, and unlocks for retry", async () => {
    let calls = 0;
    let finish;
    const form = mountForm((password, code) => {
        assert.equal(password, "Strong123!");
        assert.equal(code, "email-code");
        calls++;
        return new Promise((resolve) => {
            finish = resolve;
        });
    });
    form.fill();
    const submit = form.button().props.onPress;
    const pending = submit();
    const repeat = submit();
    assert.equal(calls, 1, "Same render must not dispatch twice");
    form.render();
    assert.equal(form.button().props.loading, true);
    assert.ok(form.inputs().every((input) => input.props.editable === false));
    finish({ isSuccess: false, errorMessage: "Reset code expired." });
    await Promise.all([pending, repeat]);
    form.render();
    assert.match(form.text(), /Reset code expired\./);
    assert.equal(form.button().props.loading, false);
    const retry = form.button().props.onPress();
    assert.equal(calls, 2);
    finish({ isSuccess: true, errorMessage: null });
    await retry;
});

test("reset recovers loading and exposes persistent error when callback rejects", async () => {
    const form = mountForm(async () => {
        throw new Error("offline");
    });
    form.fill();
    await form.button().props.onPress();
    form.render();
    assert.equal(form.button().props.loading, false);
    assert.match(form.text(), /try again/i);
    assert.ok(form.inputs().every((input) => input.props.editable !== false));
});
