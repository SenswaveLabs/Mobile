import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const ThemeMode = { Light: "light", Dark: "dark", Default: "default" };
const success = () => ({ isSuccess: true, errorMessage: null });
const failure = (errorMessage) => ({ isSuccess: false, errorMessage });
const flush = () => new Promise((resolve) => setImmediate(resolve));

function defaultExport(value) {
    return { __esModule: true, default: value };
}

const alertDialogPrimitives = {
    AlertDialog: "AlertDialog",
    AlertDialogAction: "AlertDialogAction",
    AlertDialogCancel: "AlertDialogCancel",
    AlertDialogContent: "AlertDialogContent",
    AlertDialogDescription: "AlertDialogDescription",
    AlertDialogFooter: "AlertDialogFooter",
    AlertDialogHeader: "AlertDialogHeader",
    AlertDialogTitle: "AlertDialogTitle",
    AlertDialogTrigger: "AlertDialogTrigger",
};
const RouteDialogStub = function RemoveAccountDialog() {};

function profileModules({ user, router, focus }) {
    return {
        "expo-router": {
            useRouter: () => router,
            useFocusEffect: (callback) => {
                focus.effect = callback;
            },
        },
        "@/contexts/ThemeProvider": {
            useTheme: () => ({
                current: {
                    colors: {
                        background: "#fff",
                        authBackground: "#fff",
                        authForeground: "#111",
                        authMuted: "#555",
                        authBorder: "#ddd",
                        authPrimary: "#a50",
                        error: "#b22",
                    },
                },
            }),
        },
        "@/contexts/domain/UserProvider": {
            ThemeMode,
            useUser: () => user.context(),
        },
        "@/contexts/SessionProvider": {
            useSession: () => user.session,
        },
        "@/components/common/ContentSection": defaultExport("ContentSection"),
        "@/components/common/ListRow": defaultExport("ListRow"),
        "@/components/common/BottomSheetSelect": defaultExport("BottomSheetSelect"),
        "@/components/common/Dropdown": defaultExport("Dropdown"),
        "@/components/common/Divider": defaultExport("Divider"),
        "@/components/common/Text": defaultExport("Text"),
        "@/components/common/Loading": defaultExport("Loading"),
        "@/components/common/Button": defaultExport("Button"),
        "@/components/user/UserProfileImage": defaultExport("UserProfileImage"),
        "@/components/user/RemoveAccountDialog": defaultExport(RouteDialogStub),
        "@/components/ui/alert-dialog": alertDialogPrimitives,
        "@rn-primitives/portal": { PortalHost: "PortalHost" },
        "lucide-react-native": { ChevronRight: "ChevronRight", CircleAlert: "CircleAlert" },
        "react-native-gesture-handler": { ScrollView: "ScrollView" },
    };
}

function mountProfile({
    data = { email: "kamil@example.com", name: "Kamil", language: "en", theme: ThemeMode.Light },
    updateTheme = async () => success(),
    updateLanguage = async () => success(),
    getUserData = async () => ({ isSuccess: true, data, errorMessage: null }),
    removeUserAccount = async () => success(),
} = {}) {
    let userData = data;
    let focusEffect;
    const focus = { effect: undefined };
    const paths = [];
    let sessionLogoutCalls = 0;
    const router = { push: (path) => paths.push(path) };
    const user = {
        session: { logout: () => sessionLogoutCalls++ },
        context: () => ({
            data: userData,
            updateTheme,
            updateLanguage,
            getUserData: async () => {
                const result = await getUserData();
                if (result.isSuccess && result.data) userData = result.data;
                return result;
            },
            removeUserAccount,
        }),
    };
    const screen = mountNativeComponent("src/app/(app)/user/profile.tsx", {
        modules: profileModules({ user, router, focus }),
    });
    focusEffect = focus.effect;
    let blur = focusEffect?.();

    return {
        ...screen,
        paths,
        sessionLogoutCalls: () => sessionLogoutCalls,
        userData: () => userData,
        focus: () => {
            focusEffect = focus.effect;
            blur = focusEffect?.();
        },
        blur: () => blur?.(),
        themeField: () => screen.elements().find((node) => node.type === "BottomSheetSelect"),
        listRows: () => screen.elements().filter((node) => node.type === "ListRow"),
        buttons: () => screen.elements().filter((node) => node.type === "Button"),
        dialogProps: () =>
            screen.elements().find((node) => node.type?.name === "RemoveAccountDialog")?.props,
        pressButton: (name) => {
            const button = screen
                .elements()
                .find((node) => node.type === "Button" && node.props.name === name);
            assert.ok(button, `Expected ${name} button`);
            button.props.onPress?.({});
            return button;
        },
    };
}

function mountRemoveAccountDialog(props) {
    return mountNativeComponent("src/components/user/RemoveAccountDialog.tsx", {
        props,
        modules: {
            "@/components/common/Dialog": defaultExport("Dialog"),
            "@/components/common/Icon": defaultExport("Icon"),
            "@/components/common/Button": defaultExport("Button"),
            "@/contexts/ThemeProvider": {
                useTheme: () => ({
                    current: {
                        colors: {
                            authForeground: "#111111",
                            authBackground: "#ffffff",
                            authBorder: "#aaaaaa",
                            error: "#b22222",
                        },
                    },
                }),
            },
            "@/components/ui/alert-dialog": alertDialogPrimitives,
            "@rn-primitives/portal": { PortalHost: "PortalHost" },
        },
    });
}

function mountProfileImage() {
    return mountNativeComponent("src/components/user/UserProfileImage.tsx", {
        modules: {
            "expo-router": { useRouter: () => ({ push: () => {} }) },
            "@/contexts/domain/UserProvider": { useUser: () => ({ data: { name: "Kamil" } }) },
            "@/contexts/ThemeProvider": {
                useTheme: () => ({
                    current: {
                        colors: {
                            authFieldBackground: "#eee",
                            authBorder: "#aaa",
                            authForeground: "#111",
                        },
                    },
                }),
            },
        },
    });
}

function mountUserProvider() {
    const toastErrors = [];
    let logouts = 0;
    const provider = mountNativeComponent("src/contexts/domain/UserProvider.tsx", {
        exportName: "UserProvider",
        props: { children: "Profile route" },
        modules: {
            "../HttpClientProvider": {
                useHttpClient: () => ({
                    patch: async () => ({ isSuccess: false, statusCode: 500 }),
                    delete: async () => ({ isSuccess: false, statusCode: 500 }),
                }),
            },
            "../ToastProvider": {
                useToast: () => ({
                    httpError: (response) => toastErrors.push(response.statusCode),
                }),
            },
            "../ThemeProvider": {
                useTheme: () => ({
                    resetTheme: async () => {},
                    lightTheme: async () => {},
                    darkTheme: async () => {},
                }),
            },
            "../SessionProvider": {
                useSession: () => ({ session: { authenticated: false }, logout: () => logouts++ }),
            },
        },
    });
    provider.flushEffects();
    return {
        ...provider,
        values: () =>
            provider.elements().find((node) => node.type === "ContextProvider").props.value,
        toastErrors,
        logouts: () => logouts,
    };
}

test("profile preference saves preserve exact values and ignore unchanged selections", async () => {
    const themeRequests = [];
    const languageRequests = [];
    const screen = mountProfile({
        updateTheme: async (theme) => {
            themeRequests.push(theme);
            return success();
        },
        updateLanguage: async (language) => {
            languageRequests.push(language);
            return success();
        },
    });
    const field = screen.themeField();
    assert.ok(field, "Profile should use the native Theme selector");
    assert.equal(field.props.value, "Light");
    assert.deepEqual(
        [...field.props.options].map(({ label }) => label),
        ["Light", "Dark", "System"],
    );
    assert.deepEqual(
        [...field.props.options].map(({ selected }) => selected),
        [true, false, false],
    );
    field.props.options[0].onPress();
    field.props.options[1].onPress();
    await flush();
    field.props.options[2].onPress();
    await flush();
    assert.deepEqual(themeRequests, [ThemeMode.Dark, ThemeMode.Default]);
    assert.deepEqual(languageRequests, []);
    const language = screen.listRows().find((row) => row.props.title === "Language");
    assert.equal(language?.props.description, "English");
    assert.equal(language?.props.onPress, undefined);
});

test("profile mutations share a synchronous pending lock", async () => {
    let finishTheme;
    let finishDelete;
    let themeCalls = 0;
    let deleteCalls = 0;
    const screen = mountProfile({
        updateTheme: () => {
            themeCalls++;
            return new Promise((resolve) => {
                finishTheme = resolve;
            });
        },
        removeUserAccount: async () => {
            deleteCalls++;
            return new Promise((resolve) => {
                finishDelete = resolve;
            });
        },
    });
    const field = screen.themeField();
    assert.ok(field, "Profile should use the native Theme selector");
    field.props.options[1].onPress();
    field.props.options[2].onPress();
    assert.equal(themeCalls, 1);

    screen.render();
    screen.pressButton("Delete account");
    screen.render();
    const dialog = screen.dialogProps();
    assert.ok(dialog, "Profile should render its account confirmation");
    await dialog.onConfirm();
    assert.equal(deleteCalls, 0, "A theme save must block account deletion while pending");

    finishTheme(success());
    await flush();
    screen.render();
    assert.equal(screen.themeField().props.busy, false);

    screen.pressButton("Delete account");
    screen.render();
    const confirm = screen.dialogProps().onConfirm;
    const deletion = confirm();
    confirm();
    assert.equal(deleteCalls, 1, "Repeated confirmation must keep one request pending");
    finishDelete(success());
    await deletion;
    await flush();
});

test("profile failures stay inline and retain saved settings", async () => {
    let deleteCalls = 0;
    const screen = mountProfile({
        updateTheme: async () => failure("Failed to update theme."),
        removeUserAccount: async () => {
            deleteCalls++;
            throw new Error("Unexpected account removal error.");
        },
    });
    const field = screen.themeField();
    assert.ok(field, "Profile should use the native Theme selector");
    field.props.options[1].onPress();
    await flush();
    screen.render();
    assert.equal(screen.themeField().props.value, "Light");
    assert.match(screen.text(), /Failed to update theme/);

    screen.pressButton("Delete account");
    screen.render();
    await screen.dialogProps().onConfirm();
    await flush();
    screen.render();
    assert.equal(deleteCalls, 1);
    assert.match(screen.text(), /Unexpected account removal error/);
    assert.equal(screen.sessionLogoutCalls(), 0);
    screen.pressButton("Delete account");
    screen.render();
    screen.dialogProps().onCancel();
    screen.render();
    assert.match(screen.text(), /Unexpected account removal error/);
});

test("profile deletion requires confirmation and cancellation sends no request", async () => {
    let deleteCalls = 0;
    let confirmCalls = 0;
    const screen = mountProfile({
        removeUserAccount: async () => {
            deleteCalls++;
            return failure("Failed to remove account.");
        },
    });
    screen.pressButton("Delete account");
    screen.render();
    const routeDialog = screen.dialogProps();
    assert.ok(routeDialog, "Profile should render its account confirmation");
    routeDialog.onCancel();
    assert.equal(deleteCalls, 0);

    screen.pressButton("Delete account");
    screen.render();
    await screen.dialogProps().onConfirm();
    await flush();
    screen.render();
    assert.equal(deleteCalls, 1);
    assert.match(screen.text(), /Failed to remove account/);
    assert.equal(screen.sessionLogoutCalls(), 0);

    let providerLogoutCalls = 0;
    const successful = mountProfile({
        removeUserAccount: async () => {
            deleteCalls++;
            providerLogoutCalls++;
            return success();
        },
    });
    successful.pressButton("Delete account");
    successful.render();
    await successful.dialogProps().onConfirm();
    await flush();
    assert.equal(deleteCalls, 2, "Only confirmed deletions send requests");
    assert.equal(successful.sessionLogoutCalls(), 0, "The route must not repeat provider logout");
    assert.equal(providerLogoutCalls, 1, "Successful deletion remains provider-owned");

    let cancelCalls = 0;
    const dialog = mountRemoveAccountDialog({
        visible: true,
        onConfirm: () => confirmCalls++,
        onCancel: () => cancelCalls++,
    });
    const modal = dialog.elements().find((node) => node.type === "Modal");
    assert.ok(modal, "The native confirmation must own Android Back cancellation");
    modal.props.onRequestClose();
    assert.equal(cancelCalls, 1);
    const cancel = dialog
        .elements()
        .find((node) => node.type === "Button" && node.props.name === "Cancel");
    assert.ok(cancel, "The dialog should expose a Cancel action");
    cancel.props.onPress();
    assert.equal(cancelCalls, 2);
    assert.equal(confirmCalls, 0, "Cancel and Android Back must not confirm deletion");
    const remove = dialog
        .elements()
        .find((node) => node.type === "Button" && node.props.name === "Delete account");
    assert.ok(remove, "The dialog should expose an explicitly named destructive action");
    remove.props.onPress();
    assert.equal(confirmCalls, 1);
});

test("profile dialog actions use the shared Button with accessible labels", () => {
    const dialog = mountRemoveAccountDialog({
        visible: true,
        onConfirm: () => {},
        onCancel: () => {},
    });
    const actions = dialog.elements().filter((node) => node.type === "Button");
    assert.deepEqual(
        actions.map(({ props: { name, type, loading, onPress } }) => ({
            name,
            type,
            loading,
            onPress: typeof onPress,
        })),
        [
            { name: "Cancel", type: "brand-outline", loading: false, onPress: "function" },
            {
                name: "Delete account",
                type: "brand-destructive",
                loading: false,
                onPress: "function",
            },
        ],
    );
});

test("profile avatar keeps its decorative initial inside the circle at large text scale", () => {
    const avatar = mountProfileImage();
    const target = avatar.elements().find((node) => node.type === "Pressable");
    const initial = avatar.elements().find((node) => node.type === "Text");
    assert.equal(target.props.accessibilityLabel, "Kamil");
    assert.equal(initial.props.children[0], "K");
    assert.equal(initial.props.accessible, false);
    assert.equal(initial.props.maxFontSizeMultiplier, 1);
});

test("profile late completions release pending without stale feedback", async () => {
    let finishTheme;
    const screen = mountProfile({
        updateTheme: () =>
            new Promise((resolve) => {
                finishTheme = resolve;
            }),
    });
    const field = screen.themeField();
    assert.ok(field, "Profile should use the native Theme selector");
    field.props.options[1].onPress();
    screen.blur();
    screen.focus();
    finishTheme(failure("Late theme failure"));
    await flush();
    screen.render();
    assert.equal(screen.themeField().props.busy, false);
    assert.doesNotMatch(screen.text(), /Late theme failure/);
});

test("profile navigation preserves data source and information routes", () => {
    const screen = mountProfile();
    const rows = screen.listRows();
    const dataSources = rows.find((row) => row.props.title === "Data sources");
    const information = rows.find((row) => row.props.title === "App information");
    assert.ok(dataSources, "Data sources should remain a native navigation row");
    assert.ok(information, "App information should remain a native navigation row");
    dataSources.props.onPress();
    information.props.onPress();
    assert.deepEqual(screen.paths, ["dataSource/list", "user/info"]);
});

test("profile missing identity can retry without exposing account mutations", async () => {
    const themeRequests = [];
    let deleteCalls = 0;
    let identityRequests = 0;
    const screen = mountProfile({
        data: { email: "", name: "", language: "en", theme: ThemeMode.Light },
        updateTheme: async (theme) => {
            themeRequests.push(theme);
            return success();
        },
        getUserData: async () => {
            identityRequests++;
            return {
                isSuccess: true,
                data: {
                    email: "recovered@example.com",
                    name: "Recovered",
                    language: "en",
                    theme: ThemeMode.Light,
                },
                errorMessage: null,
            };
        },
        removeUserAccount: async () => {
            deleteCalls++;
            return success();
        },
    });
    assert.match(screen.text(), /Retry account details/);
    assert.equal(screen.themeField()?.props.disabled, true);
    screen.themeField()?.props.options[1].onPress();
    const deleteButton = screen.buttons().find((button) => button.props.name === "Delete account");
    assert.ok(deleteButton, "The account action should remain visible");
    assert.equal(deleteButton.props.disabled, true);
    assert.deepEqual(themeRequests, []);
    assert.equal(deleteCalls, 0);

    screen.pressButton("Retry account details");
    await flush();
    screen.render();
    assert.equal(identityRequests, 1);
    assert.equal(screen.userData().email, "recovered@example.com");
    assert.equal(screen.themeField().props.disabled, false);
});

test("profile mutation failures leave toast feedback to the route", async () => {
    const provider = mountUserProvider();
    const user = provider.values();
    const themeResult = await user.updateTheme(ThemeMode.Dark);
    const deleteResult = await user.removeUserAccount();
    assert.equal(themeResult.isSuccess, false);
    assert.equal(themeResult.errorMessage, "Failed to update theme.");
    assert.equal(deleteResult.isSuccess, false);
    assert.equal(deleteResult.errorMessage, "Failed to remove account.");
    assert.deepEqual(provider.toastErrors, []);
    assert.equal(provider.logouts(), 0);
});
