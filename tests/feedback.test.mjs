import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const contrast = (first, second) => {
    const luminance = (hex) => {
        const rgb = hex.match(/[a-f0-9]{2}/gi).map((channel) => {
            const value = parseInt(channel, 16) / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    };
    const values = [luminance(first), luminance(second)].sort((a, b) => a - b);
    return (values[1] + 0.05) / (values[0] + 0.05);
};

const composite = (foreground, background, opacity) => {
    const rgb = (hex) => hex.match(/[a-f0-9]{2}/gi).map((channel) => parseInt(channel, 16));
    const backdrop = rgb(background);
    return (
        "#" +
        rgb(foreground)
            .map((channel, index) =>
                Math.round(channel * opacity + backdrop[index] * (1 - opacity))
                    .toString(16)
                    .padStart(2, "0"),
            )
            .join("")
    );
};

function mountCommonButton(name, type, current) {
    return mountNativeComponent("src/components/common/Button.tsx", {
        props: { name, type, loading: false, onPress: () => {} },
        modules: {
            "@/contexts/ThemeProvider": { useTheme: () => ({ current }) },
            "@/styles/shadowStyles": { shadowStyles: { default: {} } },
            "@/components/ui/button": { Button: "ReusableButton" },
            "@/components/ui/text": { Text: "NativeWindText" },
        },
    });
}

for (const mode of ["light", "dark"]) {
    test(`shared Button labels use scalable native text in ${mode} mode`, async () => {
        const provider = mountNativeComponent("src/contexts/ThemeProvider.tsx", {
            exportName: "ThemeProvider",
            modules: {
                "react-native": { useColorScheme: () => "light" },
                "expo-secure-store": { setItemAsync: async () => {} },
            },
        });
        await provider.elements()[0].props.value[mode === "dark" ? "darkTheme" : "lightTheme"]();
        provider.render();
        const current = provider.elements()[0].props.value.current;
        const button = mountCommonButton("Delete account", "brand-destructive", current);
        const target = button.elements().find((node) => node.type === "ReusableButton");
        const label = button.elements(target).find((node) => node.type === "Text");

        assert.ok(label, "The shared Button should render its label as native Text");
        assert.equal(label.props.children[0], "Delete account");
        assert.equal(label.props.allowFontScaling, true);
        assert.equal(label.props.maxFontSizeMultiplier, undefined);
        assert.equal(target.props.accessibilityLabel, "Delete account");
        assert.equal(target.props.accessibilityState.disabled, false);
        assert.equal(target.props.accessibilityState.busy, false);
        const buttonStyle = Object.assign({}, ...[].concat(target.props.style).flat());
        assert.equal(buttonStyle.minHeight, 48);
    });

    test(`dialog actions meet text contrast requirements in ${mode} mode`, async () => {
        const provider = mountNativeComponent("src/contexts/ThemeProvider.tsx", {
            exportName: "ThemeProvider",
            modules: {
                "react-native": { useColorScheme: () => "light" },
                "expo-secure-store": { setItemAsync: async () => {} },
            },
        });
        await provider.elements()[0].props.value[mode === "dark" ? "darkTheme" : "lightTheme"]();
        provider.render();
        const current = provider.elements()[0].props.value.current;
        const themeModule = { useTheme: () => ({ current }) };
        const modules = {
            "@/contexts/ThemeProvider": themeModule,
            "@/components/common/Text": (props) =>
                mountNativeComponent("src/components/common/Text.tsx", {
                    props,
                    modules: { "@/contexts/ThemeProvider": themeModule },
                }).elements()[0],
        };
        for (const action of [
            { label: "Delete", variant: "filled", destructive: true },
            { label: "Leave", variant: "filled", destructive: false },
            { label: "Cancel", variant: "text", destructive: false },
        ]) {
            const dialog = mountNativeComponent("src/components/common/Dialog.tsx", {
                props: {
                    visible: true,
                    title: "Confirm",
                    onDismiss: () => {},
                    actions: [{ ...action, onPress: () => {} }],
                },
                modules,
            });
            const node = dialog.elements().find((element) => element.props?.action);
            const button = node.type(node.props);
            const child = button.props.children[0];
            const label = typeof child.type === "function" ? child.type(child.props) : child;
            const textStyle = Object.assign({}, ...[label.props.style].flat());
            for (const pressed of [false, true]) {
                const buttonStyle = Object.assign({}, ...button.props.style({ pressed }));
                const opacity = buttonStyle.opacity ?? 1;
                const ratio = contrast(
                    composite(textStyle.color, current.colors.background, opacity),
                    composite(
                        buttonStyle.backgroundColor || current.colors.background,
                        current.colors.background,
                        opacity,
                    ),
                );
                assert.ok(
                    ratio >= 4.5,
                    `${action.label} pressed=${pressed}: ${ratio.toFixed(2)}:1 is below 4.5:1`,
                );
            }
        }
        const accountDialog = mountNativeComponent("src/components/user/RemoveAccountDialog.tsx", {
            props: { visible: true, onConfirm: () => {}, onCancel: () => {} },
            modules: {
                "@/contexts/ThemeProvider": themeModule,
                "@/components/common/Dialog": { __esModule: true, default: "Dialog" },
                "@/components/common/Icon": { __esModule: true, default: "Icon" },
                "@/components/ui/alert-dialog": {
                    AlertDialogAction: "AlertDialogAction",
                    AlertDialogCancel: "AlertDialogCancel",
                    AlertDialogContent: "AlertDialogContent",
                    AlertDialogDescription: "AlertDialogDescription",
                    AlertDialogFooter: "AlertDialogFooter",
                    AlertDialogHeader: "AlertDialogHeader",
                    AlertDialogTitle: "AlertDialogTitle",
                },
                "@rn-primitives/portal": { PortalHost: "PortalHost" },
            },
        });
        for (const [labelText, type, color] of [
            ["Cancel", "brand-outline", current.colors.authForeground],
            ["Delete account", "brand-destructive", current.colors.error],
        ]) {
            const button = accountDialog
                .elements()
                .find((node) => node.type === "Button" && node.props.name === labelText);
            assert.ok(button, `${labelText} should use the shared Button`);
            assert.equal(button.props.type, type);
            assert.equal(button.props.loading, false);
            const rendered = mountCommonButton(labelText, type, current);
            const target = rendered.elements().find((node) => node.type === "ReusableButton");
            const label = rendered.elements(target).find((node) => node.type === "Text");
            assert.ok(label, `${labelText} should render as native scalable text`);
            const textStyle = Object.assign({}, ...[].concat(label.props.style).flat());
            assert.equal(textStyle.color, color);
            const buttonStyle = Object.assign({}, ...[].concat(target.props.style).flat());
            assert.equal(buttonStyle.backgroundColor, current.colors.authBackground);
            assert.ok(buttonStyle.minHeight >= 48);
            for (const pressed of [false, true]) {
                const opacity = pressed
                    ? target.props.className.includes("active:opacity-90")
                        ? 0.9
                        : target.props.className.includes("active:opacity-80")
                          ? 0.8
                          : 1
                    : 1;
                const ratio = contrast(
                    composite(textStyle.color, current.colors.background, opacity),
                    composite(buttonStyle.backgroundColor, current.colors.background, opacity),
                );
                assert.ok(
                    ratio >= 4.5,
                    `${labelText} pressed=${pressed}: ${ratio.toFixed(2)}:1 is below 4.5:1`,
                );
            }
        }
    });
    test(`data-source badges map connection states and retain readable text in ${mode} mode`, async () => {
        const provider = mountNativeComponent("src/contexts/ThemeProvider.tsx", {
            exportName: "ThemeProvider",
            modules: {
                "react-native": { useColorScheme: () => "light" },
                "expo-secure-store": { setItemAsync: async () => {} },
            },
        });
        await provider.elements()[0].props.value[mode === "dark" ? "darkTheme" : "lightTheme"]();
        provider.render();
        const current = provider.elements()[0].props.value.current;
        const props = { connectionStatus: "NotStarted" };
        const badge = mountNativeComponent("src/components/dataSource/state/DataSourceState.tsx", {
            props,
            modules: { "@/contexts/ThemeProvider": { useTheme: () => ({ current }) } },
        });
        for (const [state, expected] of [
            ["NotStarted", "Disconnected"],
            ["Stopped", "Disconnected"],
            ["Working", "Connected"],
            ["Restarting", "Restarting"],
            ["Connected", "Connected"],
            ["Connecting", "Connecting"],
            ["Error", "Error"],
            [undefined, "Disconnected"],
            ["Unrecognized", "Disconnected"],
        ]) {
            props.connectionStatus = state;
            badge.render();
            const container = badge.elements()[0];
            const label = badge.elements().find((element) => element.type === "Text");
            assert.equal(label.props.children[0], expected);
            assert.equal(container.props.accessibilityLabel, `Data source status: ${expected}`);
            const containerStyle = Object.assign({}, ...container.props.style);
            const labelStyle = Object.assign({}, ...label.props.style);
            const ratio = contrast(labelStyle.color, containerStyle.backgroundColor);
            assert.ok(ratio >= 4.5, `${state}: ${ratio.toFixed(2)}:1 is below 4.5:1`);
        }
    });
}

function mountFeedback(initialPath = "/profile") {
    let pathname = initialPath;
    const shown = [];
    const hidden = [];
    let dismissed = 0;
    const provider = mountNativeComponent("src/contexts/ToastProvider.tsx", {
        exportName: "ToastProvider",
        modules: {
            "expo-router": { usePathname: () => pathname },
            "react-native": { Keyboard: { dismiss: () => dismissed++ } },
            "react-native-root-toast": {
                positions: { BOTTOM: -20 },
                show: (message) => {
                    const instance = { message };
                    shown.push(instance);
                    return instance;
                },
                hide: (instance) => hidden.push(instance),
            },
        },
    });
    provider.flushEffects();
    return {
        ...provider,
        shown,
        hidden,
        dismissed: () => dismissed,
        feedback: () => provider.elements()[0].props.value,
        navigate: (next) => {
            pathname = next;
            provider.render();
            provider.flushEffects();
        },
    };
}

test("Profile can silence a delayed identity retry without changing the default getter toast", async () => {
    const feedback = mountFeedback("/user/profile");
    const pendingRequests = [];
    const provider = mountNativeComponent("src/contexts/domain/UserProvider.tsx", {
        exportName: "UserProvider",
        props: { children: "Profile route" },
        modules: {
            "../HttpClientProvider": {
                useHttpClient: () => ({
                    get: () => new Promise((resolve) => pendingRequests.push(resolve)),
                    patch: async () => ({ isSuccess: false, statusCode: 500 }),
                    delete: async () => ({ isSuccess: false, statusCode: 500 }),
                }),
            },
            "../ToastProvider": { useToast: () => feedback.feedback() },
            "../ThemeProvider": {
                useTheme: () => ({
                    resetTheme: async () => {},
                    lightTheme: async () => {},
                    darkTheme: async () => {},
                }),
            },
            "../SessionProvider": {
                useSession: () => ({ session: { authenticated: false }, logout: () => {} }),
            },
        },
    });
    provider.flushEffects();
    const user = provider.elements().find((node) => node.type === "ContextProvider").props.value;
    const failedResponse = () => ({
        isSuccess: false,
        statusCode: 500,
        response: {
            url: "/v1/users",
            text: async () => JSON.stringify({ statusCode: 500, errors: [] }),
        },
    });

    const retry = user.getUserData({ silent: true });
    feedback.navigate("/");
    pendingRequests[0](failedResponse());
    const retryResult = await retry;
    await new Promise((resolve) => setImmediate(resolve));

    assert.deepEqual(feedback.shown, []);
    assert.equal(feedback.dismissed(), 0);
    assert.equal(retryResult.errorMessage, "Failed to load account details.");

    const defaultRead = user.getUserData();
    pendingRequests[1](failedResponse());
    const defaultResult = await defaultRead;
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(defaultResult.errorMessage, "Failed to load account details.");
    assert.deepEqual(
        feedback.shown.map(({ message }) => message),
        ["An unexpected error occurred."],
    );
    assert.equal(feedback.dismissed(), 1);
});

test("redesigned forms and home selection suppress legacy overlays without dismissing the keyboard", async () => {
    const provider = mountFeedback();
    const lateCallback = provider.feedback();
    for (const route of [
        "/start",
        "/login",
        "/register",
        "/forgotPassword",
        "/server",
        "/resetPassword",
        "/home/list",
        "/home/join",
        "/home/add",
        "/home/details",
        "/home/room/add",
        "/home/room/details",
        "/device/add",
        "/device/device",
        "/device/dashboard/add",
        "/device/dashboard/details",
        "/device/dashboard/placeWidget",
        "/device/operation/add",
        "/dataSource/add",
        "/dataSource/brokers/startBrokerClient",
        "/dataSource/brokers/addSubscription",
        "/user/profile",
    ]) {
        provider.navigate(route);
        lateCallback.error("Legacy error");
        lateCallback.info("Legacy information");
        lateCallback.success("Legacy success");
        await lateCallback.httpError({
            statusCode: 500,
            response: { text: () => assert.fail("Inline flows own the response body") },
        });
    }
    assert.deepEqual(provider.shown, []);
    assert.equal(provider.dismissed(), 0);
});

test("entering an inline flow hides the existing toast and other screens retain feedback", () => {
    const provider = mountFeedback();
    provider.feedback().error("Profile error");
    provider.feedback().info("Profile information");
    assert.equal(provider.shown.length, 2);
    assert.equal(provider.dismissed(), 2);
    provider.navigate("/device/add");
    assert.deepEqual(provider.hidden, provider.shown, "No earlier overlapping toast can remain");
    provider.navigate("/profile");
    provider.feedback().success("Saved");
    assert.equal(provider.shown.at(-1).message, "Saved");
    provider.navigate("/device/operation/details");
    provider.feedback().error("Dashboard details error");
    assert.equal(provider.shown.at(-1).message, "Dashboard details error");
});

test("an HTTP error arriving after navigation cannot bring back the old overlay", async () => {
    const provider = mountFeedback();
    let finish;
    const pending = provider.feedback().httpError({
        statusCode: 400,
        response: {
            text: () =>
                new Promise((resolve) => {
                    finish = resolve;
                }),
        },
    });
    provider.navigate("/login");
    finish('{"errors":[]}');
    await pending;
    assert.deepEqual(provider.shown, []);
    assert.equal(provider.dismissed(), 0);
});
