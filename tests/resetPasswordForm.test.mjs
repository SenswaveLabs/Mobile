import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

function mountForm(submitClicked) {
    const form = mountNativeComponent("src/components/auth/ResetPasswordForm.tsx", {
        props: { submitClicked },
    });
    const inputs = () =>
        form.elements().filter((node) => ["Input", "PasswordInput"].includes(node.type));
    return {
        ...form,
        inputs,
        button: () => form.elements().find((node) => node.type === "Button"),
        fill: () => {
            inputs().forEach((node, index) =>
                node.props.setValue(index === 0 ? "email-code" : "Strong123!"),
            );
            form.render();
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
