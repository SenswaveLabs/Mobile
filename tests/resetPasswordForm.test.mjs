import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const require = createRequire(import.meta.url);
const navigationRequire = createRequire(require.resolve("@react-navigation/native/package.json"));
const coreRequire = createRequire(navigationRequire.resolve("@react-navigation/core/package.json"));
const { StackRouter } = coreRequire("@react-navigation/routers");

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

test("successful reset leaves no old auth screens after the next login", async () => {
    const options = {
        routeNames: ["(auth)", "(app)", "resetPassword", "consents"],
        routeParamList: {},
        routeGetIdList: {},
    };
    const router = StackRouter({ initialRouteName: "(auth)" });
    let state = router.getInitialState(options);
    const dispatch = (type, name, params) => {
        state = router.getStateForAction(
            state,
            { type, target: state.key, payload: { name, params } },
            options,
        );
    };
    dispatch("PUSH", "resetPassword");
    const form = mountNativeComponent("src/app/resetPassword.tsx", {
        modules: {
            "expo-router": {
                useLocalSearchParams: () => ({ email: "user@example.com" }),
                useRouter: () => ({
                    replace: (href) => dispatch("REPLACE", "(auth)", { screen: href.slice(1) }),
                    dismissTo: (href) => dispatch("POP_TO", "(auth)", { screen: href.slice(1) }),
                }),
            },
            "@/contexts/SessionProvider": {
                useSession: () => ({
                    resetPassword: async () => ({ isSuccess: true, errorMessage: null }),
                }),
            },
            "@/components/auth/ResetPasswordForm": "ResetPasswordForm",
            "@expo/vector-icons": { Ionicons: "Ionicons" },
        },
    });

    await form
        .elements()
        .find((node) => node.type === "ResetPasswordForm")
        .props.submitClicked("Strong123!", "email-code");
    assert.equal(state.routes[state.index].params.screen, "start");
    dispatch("REPLACE", "consents");
    dispatch("REPLACE", "(app)");
    assert.deepEqual(
        state.routes.map(({ name }) => name),
        ["(app)"],
    );
});
