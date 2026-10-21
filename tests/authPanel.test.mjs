import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers/promises";
import { URL } from "node:url";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

function mountAuth(screen = "login", overrides = {}) {
    const form = mountNativeComponent("src/components/auth/AuthPanel.tsx", {
        props: {
            screen,
            rememberMe: true,
            isDevelopment: true,
            serverUrl: "http://10.0.2.2:8080",
            onLogin: async () => ({}),
            onRegister: async () => ({}),
            onForgotPassword: async () => ({}),
            onServerChange: async () => ({}),
            onResendConfirmation: async () => ({}),
            onRememberMeChange: async () => {},
            onGoogleLogin: async () => ({}),
            onNavigate: async () => {},
            ...overrides,
        },
        modules: {
            "@/components/ui/checkbox": { Checkbox: "Checkbox" },
            "@/components/ui/text": { Text: "Text" },
            "@/assets/icon.png": 1,
            "lucide-react-native": {
                ArrowLeft: "ArrowLeft",
                CircleAlert: "CircleAlert",
                Info: "Info",
                Mail: "Mail",
            },
        },
    });
    const inputs = () =>
        form.elements().filter((node) => ["Input", "PasswordInput"].includes(node.type));
    const button = (name) =>
        form.elements().find((node) => node.type === "Button" && node.props.name === name);
    return { ...form, inputs, button };
}

test("an auth route keeps its own screen when another route becomes active", () => {
    let pathname = "/login";
    const form = mountNativeComponent("src/components/auth/AuthFlow.tsx", {
        exportName: "AuthFlow",
        props: { screen: "login" },
        modules: {
            "expo-router": {
                usePathname: () => pathname,
                useRouter: () => ({}),
            },
            "@/contexts/SessionProvider": { useSession: () => ({ rememberMe: false }) },
            "@/contexts/ConfigurationProvider": {
                useConfiguration: () => ({
                    isDevelopment: () => true,
                    getBaseUrl: () => new URL("http://10.0.2.2:8080"),
                }),
            },
            "@/hooks/useGoogleSignIn": { useGoogleSignIn: () => ({}) },
            "./AuthPanel": "AuthPanel",
        },
    });

    pathname = "/register";
    form.render();
    assert.equal(form.elements()[0].props.screen, "login");
});

test("native login validates fields, focuses the first error and supports keyboard submission", async () => {
    let calls = 0;
    const form = mountAuth("login", {
        onLogin: async (email, password) => {
            assert.equal(email, "user@example.com");
            assert.equal(password, "secret");
            calls++;
            return {};
        },
    });
    await form.button("Sign in").props.onPress();
    form.render();
    assert.equal(calls, 0);
    assert.ok(form.inputs().every((input) => input.props.error));
    assert.deepEqual(form.focused, ["Email"]);
    form.inputs()[0].props.setValue(" user@example.com ");
    form.inputs()[1].props.setValue("secret");
    form.render();
    await form.inputs()[1].props.onSubmitEditing();
    assert.equal(calls, 1);
});

test("native login locks repeated submissions and keeps confirmation recovery after failure", async () => {
    let calls = 0;
    let finish;
    const form = mountAuth("login", {
        onLogin: () => {
            calls++;
            return new Promise((resolve) => {
                finish = resolve;
            });
        },
    });
    form.inputs()[0].props.setValue("user@example.com");
    form.inputs()[1].props.setValue("secret");
    form.render();
    const submit = form.button("Sign in").props.onPress;
    const pending = submit();
    await submit();
    assert.equal(calls, 1);
    form.render();
    assert.ok(form.inputs().every((input) => input.props.editable === false));
    finish({ error: "Confirm your email first.", needsEmailConfirmation: true });
    await pending;
    form.render();
    assert.match(form.text(), /Confirm your email first/);
    assert.ok(form.button("Resend confirmation email"));
    assert.equal(form.button("Sign in").props.loading, false);
});

for (const [control, handler] of [
    ["Checkbox", "onCheckedChange"],
    ["Label", "onPress"],
]) {
    test(`Remember me ${control} keeps login controls enabled while saving`, async () => {
        let calls = 0;
        let finish;
        const form = mountAuth("login", {
            onRememberMeChange: () => {
                calls++;
                return new Promise((resolve) => {
                    finish = resolve;
                });
            },
        });
        const toggle = () =>
            form
                .elements()
                .find((node) => node.type === control)
                .props[handler]();

        toggle();
        form.render();
        assert.ok(form.inputs().every((input) => input.props.editable === true));
        assert.equal(form.button("Sign in").props.disabled, false);
        assert.equal(form.button("Continue with Google").props.disabled, false);
        toggle();
        assert.equal(calls, 1);

        finish();
        await setImmediate();
        toggle();
        assert.equal(calls, 2);
        finish();
        await setImmediate();
    });
}

test("auth navigation keeps controls enabled while blocking duplicate navigation", async () => {
    let calls = 0;
    let finish;
    const form = mountAuth("login", {
        onNavigate: () => {
            calls++;
            return new Promise((resolve) => {
                finish = resolve;
            });
        },
    });
    const navigate = form
        .elements()
        .find((node) => node.props.accessibilityLabel === "Forgot password?").props.onPress;

    navigate();
    form.render();
    assert.ok(form.inputs().every((input) => input.props.editable === true));
    assert.equal(form.button("Sign in").props.disabled, false);
    assert.equal(form.button("Continue with Google").props.disabled, false);
    navigate();
    assert.equal(calls, 1);
    finish();
    await setImmediate();
});

test("native registration requires consent and replaces the form with email verification", async () => {
    let calls = 0;
    const form = mountAuth("register", {
        onRegister: async (email, password, confirmation, consent) => {
            assert.deepEqual(
                [email, password, confirmation, consent],
                ["user@example.com", "Strong123!", "Strong123!", true],
            );
            calls++;
            return {};
        },
    });
    form.inputs().forEach((input, index) =>
        input.props.setValue(index === 0 ? "user@example.com" : "Strong123!"),
    );
    form.render();
    await form.button("Create account").props.onPress();
    form.render();
    assert.equal(calls, 0);
    assert.match(form.text(), /agree/i);
    form.elements()
        .find((node) => node.type === "Checkbox")
        .props.onCheckedChange(true);
    form.render();
    await form.button("Create account").props.onPress();
    form.render();
    assert.equal(calls, 1);
    assert.match(form.text(), /Verify your email/);
    assert.equal(form.inputs().length, 0);
    assert.equal(form.text().includes("Strong123!"), false);
});

test("native server settings reject invalid addresses and restore the default with null", async () => {
    const values = [];
    const form = mountAuth("server", {
        onServerChange: async (url) => {
            values.push(url);
            return {};
        },
    });
    form.inputs()[0].props.setValue("javascript:alert(1)");
    form.render();
    await form.button("Save server").props.onPress();
    form.render();
    assert.equal(values.length, 0);
    assert.ok(form.inputs()[0].props.error);
    await form.button("Use default server").props.onPress();
    form.render();
    assert.deepEqual(values, [null]);
    const production = mountAuth("server", { isDevelopment: false });
    assert.equal(production.inputs().length, 0);
    assert.equal(production.button("Save server"), undefined);
});

test("native forgot password preserves input and releases the lock after rejection", async () => {
    const form = mountAuth("forgotPassword", {
        onForgotPassword: async () => {
            throw new Error("offline");
        },
    });
    form.inputs()[0].props.setValue("user@example.com");
    form.render();
    await form.inputs()[0].props.onSubmitEditing();
    form.render();
    assert.match(form.text(), /Something went wrong/);
    assert.equal(form.inputs()[0].props.value, "user@example.com");
    assert.equal(form.button("Send reset code").props.loading, false);
});

test("Google Sign-In failures appear inline above the auth actions", async () => {
    const form = mountAuth("login", {
        onGoogleLogin: async () => ({ error: "Play Services not available or outdated" }),
    });
    await form.button("Continue with Google").props.onPress();
    await setImmediate();
    form.render();
    assert.match(form.text(), /Play Services not available/);
    assert.equal(form.button("Continue with Google").props.loading, false);
});

test("rejected credentials report an action error without marking either field invalid", async () => {
    const form = mountAuth("login", {
        onLogin: async () => ({ error: "Invalid email or password." }),
    });
    form.inputs()[0].props.setValue("user@example.com");
    form.inputs()[1].props.setValue("secret");
    form.render();
    await form.button("Sign in").props.onPress();
    form.render();
    assert.ok(form.inputs().every((input) => !input.props.error));
    const actions = form
        .elements()
        .find(
            (node) => node.type === "View" && node.props.children.includes(form.button("Sign in")),
        );
    assert.match(JSON.stringify(actions.props.children[0]), /Invalid email or password/);
    assert.equal(form.button("Sign in").props.loading, false);
    form.inputs()[1].props.setValue("updated password");
    form.render();
    assert.equal(form.text().includes("Invalid email or password"), false);
});
