import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
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
        const accountDialog = mountNativeComponent("src/components/user/RemoveAccountDialog.tsx", {
            props: { visible: true, onConfirm: () => {}, onCancel: () => {} },
            modules: {
                "@/contexts/ThemeProvider": themeModule,
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

const dialogParts = Object.fromEntries(
    [
        "AlertDialog",
        "AlertDialogAction",
        "AlertDialogCancel",
        "AlertDialogContent",
        "AlertDialogDescription",
        "AlertDialogFooter",
        "AlertDialogHeader",
        "AlertDialogTitle",
    ].map((name) => [name, name]),
);

test("shared confirmation uses native dialog primitives and preserves Cancel, Back and confirm handlers", () => {
    const calls = [];
    const component = mountNativeComponent("src/components/common/ConfirmDialog.tsx", {
        props: {
            visible: true,
            title: "Delete device",
            content: "Delete the selected device?",
            onCancel: () => calls.push("cancel"),
            onConfirm: () => calls.push("confirm"),
        },
        modules: {
            "@/components/ui/alert-dialog": dialogParts,
            "@rn-primitives/portal": { PortalHost: "PortalHost" },
            "react-native-safe-area-context": {
                useSafeAreaInsets: () => ({ top: 24, bottom: 16 }),
            },
            "./Button": "Button",
            "./Icon": "Icon",
        },
    });
    const modal = component.elements().find((node) => node.type === "Modal");
    assert.equal(modal.props.visible, true);
    modal.props.onRequestClose();
    const cancel = component.elements().find((node) => node.props.name === "Cancel");
    cancel.props.onPress();
    assert.deepEqual(calls, ["cancel", "cancel"]);
    component
        .elements()
        .find((node) => node.props.name === "Remove")
        .props.onPress();
    assert.deepEqual(calls, ["cancel", "cancel", "confirm"]);
    const host = component.elements().find((node) => node.type === "PortalHost");
    assert.equal(
        component.elements().find((node) => node.type === "AlertDialogContent").props.portalHost,
        host.props.name,
    );
    assert.ok(component.elements().some((node) => node.type === "ScrollView"));
});

test("all current and future routes exclude retired global toast infrastructure", () => {
    const sources = (directory) =>
        readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
            entry.isDirectory()
                ? sources(join(directory, entry.name))
                : /\.[jt]sx?$/.test(entry.name)
                  ? [join(directory, entry.name)]
                  : [],
        );
    for (const path of sources("src")) {
        assert.doesNotMatch(
            readFileSync(path, "utf8"),
            /ToastProvider|useToast|RootSiblingParent|react-native-root-(toast|siblings)/,
            path,
        );
    }
    for (const path of ["package.json", "pnpm-lock.yaml"]) {
        assert.doesNotMatch(readFileSync(path, "utf8"), /react-native-root-(toast|siblings)/, path);
    }
});

test("account reads return local errors for default and retained requests without consuming error bodies", async () => {
    const reads = [];
    const provider = mountNativeComponent("src/contexts/domain/UserProvider.tsx", {
        exportName: "UserProvider",
        modules: {
            "../HttpClientProvider": {
                useHttpClient: () => ({
                    get: () => new Promise((resolve) => reads.push(resolve)),
                    patch: async () => ({ isSuccess: false }),
                }),
            },
            "../SessionProvider": {
                useSession: () => ({ session: { authenticated: true, accessToken: "access-1" } }),
            },
            "../ThemeProvider": {
                useTheme: () => ({ resetTheme() {}, lightTheme() {}, darkTheme() {} }),
            },
        },
    });
    const user = provider.elements()[0].props.value;
    const pending = user.getUserData();
    provider.render();
    reads[0]({
        isSuccess: false,
        statusCode: 500,
        response: { text: () => assert.fail("Local recovery owns feedback") },
    });
    assert.equal((await pending).errorMessage, "Failed to load account details.");
    const retry = user.getUserData({ silent: true });
    reads[1]({ isSuccess: false, statusCode: 0, response: null });
    assert.equal((await retry).isSuccess, false);
    assert.equal((await user.updateLanguage("en")).errorMessage, "Failed to update language.");
});

test("HTTP failures preserve caller recovery and session logout without keyboard or overlay side effects", async () => {
    let response = { isSuccess: false, statusCode: 500, response: null };
    let dismissed = 0;
    let logout = 0;
    let refresh = 0;
    let token = null;
    const requests = [];
    const provider = mountNativeComponent("src/contexts/HttpClientProvider.tsx", {
        exportName: "HttpClientProvider",
        modules: {
            "./SessionProvider": {
                useSession: () => ({
                    session: { authenticated: true, accessToken: "old" },
                    logout: () => logout++,
                    refresh: async () => {
                        refresh++;
                        return token;
                    },
                }),
            },
            "./ConfigurationProvider": {
                useConfiguration: () => ({ getApiUrl: (path) => `https://fixture.test/${path}` }),
            },
            "@/utils/httpClient": {
                executeTimeout: async (_url, options) => {
                    requests.push(options);
                    return response;
                },
            },
            "react-native": { Keyboard: { dismiss: () => dismissed++ } },
        },
    });
    const client = provider.elements()[0].props.value;
    for (const statusCode of [400, 404, 408, 500]) {
        response = { isSuccess: false, statusCode, response: null };
        assert.equal((await client.get("v1/homes/current")).statusCode, statusCode);
    }
    response = { isSuccess: false, statusCode: 401, response: null };
    for (let index = 0; index < 12; index++)
        assert.equal((await client.get("v1/users")).statusCode, 401);
    assert.equal(refresh, 12);
    token = "renewed";
    await client.get("v1/users");
    assert.equal(requests.at(-1).headers.Authorization, "Bearer renewed");
    response = { isSuccess: false, statusCode: 403, response: null };
    assert.equal((await client.get("v1/users")).statusCode, 401);
    assert.equal(logout, 1);
    assert.equal(dismissed, 0);
});

const validHome = { id: "home-1", name: "Home", icon: "home-outline", isOwner: true, rooms: [] };
const success = (value) => ({
    isSuccess: true,
    statusCode: 200,
    response: { json: async () => value },
});
const settle = () => new Promise((resolve) => setImmediate(resolve));
function mountHomes(get) {
    const component = mountNativeComponent("src/contexts/domain/HomeProvider.tsx", {
        exportName: "HomeProvider",
        modules: {
            "../HttpClientProvider": { useHttpClient: () => ({ get }) },
            "@/utils/location": { getCurrentLocation: async () => null },
        },
    });
    return {
        component,
        value: () => {
            component.render();
            return component.elements()[0].props.value;
        },
    };
}

test("Home initialization distinguishes confirmed empty from errors and preserves cached data until recovery", async () => {
    let mode = "failed";
    const homes = mountHomes(async (path) => {
        if (mode === "failed") return { isSuccess: false, statusCode: 500, response: null };
        if (mode === "empty") return { isSuccess: false, statusCode: 404, response: null };
        if (mode === "malformed")
            return success(
                path.startsWith("v1/homes/current")
                    ? { id: "home-1" }
                    : { id: "home-1", rooms: null },
            );
        return success(validHome);
    });
    assert.equal(await homes.value().initializeCurrentHome(), false);
    assert.match(homes.value().error, /Couldn't load your home/);
    assert.equal(homes.value().current, undefined);
    mode = "empty";
    await homes.value().initializeCurrentHome();
    assert.equal(homes.value().error, "");
    assert.equal(homes.value().current, undefined);
    mode = "ready";
    assert.equal(await homes.value().initializeCurrentHome(), true);
    const cached = homes.value().current;
    mode = "malformed";
    assert.equal(await homes.value().initializeCurrentHome(), false);
    assert.equal(homes.value().current, cached);
    assert.ok(homes.value().error);
    mode = "ready";
    await homes.value().initializeCurrentHome();
    assert.equal(homes.value().error, "");
});

test("a late Home initialization failure cannot replace a newer successful retry", async () => {
    const reads = [];
    const homes = mountHomes(() => new Promise((resolve) => reads.push(resolve)));
    const first = homes.value().initializeCurrentHome();
    await settle();
    const retry = homes.value().initializeCurrentHome();
    await settle();
    reads[1](success({ id: "home-1" }));
    await settle();
    reads[2](success(validHome));
    assert.equal(await retry, true);
    reads[0]({ isSuccess: false, statusCode: 500, response: null });
    assert.equal(await first, false);
    assert.equal(homes.value().error, "");
    assert.equal(homes.value().current.id, "home-1");
});

test("removed-home recovery retains a previously chosen different home without a current-home read", async () => {
    const reads = [];
    const chosen = {
        ...validHome,
        id: "home-2",
        rooms: [{ id: "room-2", name: "Room" }],
        dataSource: { id: "source-2", name: "Broker", state: "Working" },
    };
    const homes = mountHomes(async (path) => {
        reads.push(path);
        return path === "v1/homes/home-2"
            ? success(chosen)
            : { isSuccess: false, statusCode: 404, response: null };
    });
    assert.equal(await homes.value().setCurrent("home-2"), true);
    const selected = homes.value().current;
    assert.equal(await homes.value().initializeCurrentHome({ removedHomeId: "home-1" }), true);
    assert.equal(homes.value().current, selected);
    assert.equal(homes.value().current.rooms[0].id, "room-2");
    assert.equal(homes.value().current.dataSource.id, "source-2");
    assert.deepEqual(reads, ["v1/homes/home-2"]);
});
