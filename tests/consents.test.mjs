import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const ThemeMode = { Light: "light", Dark: "dark", Default: "default" };
const flush = async () => {
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
};

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

const activeUser = (hasActiveConsent = false, theme = ThemeMode.Light) => ({
    Id: "user-1",
    email: "user@example.com",
    theme,
    language: "en",
    hasActiveConsent,
});

const successResponse = (body = {}) => ({
    isSuccess: true,
    statusCode: 200,
    response: { json: async () => ({ ...activeUser(), ...body }) },
});

const failureResponse = (statusCode = 500) => ({
    isSuccess: false,
    statusCode,
    response: {
        url: "/v1/users",
        text: async () => JSON.stringify({ statusCode, title: "Failure", type: "", errors: [] }),
    },
});

function mountRuntime({ pathname = "/consents" } = {}) {
    let currentPath = pathname;
    let currentSession = {
        loading: false,
        authenticated: true,
        accessToken: "access-1",
        refreshToken: "refresh-1",
    };
    const runtime = { provider: undefined, router: undefined };
    let logoutCalls = 0;
    let keyboardDismissals = 0;
    let replaceFailures = 0;
    const toasts = [];
    const hiddenToasts = [];
    const requests = { get: [], post: [] };
    const themeCalls = [];
    const colors = {
        success: "#008000",
        error: "#b00020",
        secondary: "#eeeeee",
        primary: "#222222",
        background: "#ffffff",
        authBackground: "#ffffff",
        authForeground: "#111111",
        authMuted: "#555555",
        authBorder: "#dddddd",
        complementary: "#555555",
    };
    const theme = {
        current: { colors },
        resetTheme: async () => themeCalls.push(ThemeMode.Default),
        lightTheme: async () => themeCalls.push(ThemeMode.Light),
        darkTheme: async () => themeCalls.push(ThemeMode.Dark),
    };
    const toastProvider = mountNativeComponent("src/contexts/ToastProvider.tsx", {
        exportName: "ToastProvider",
        modules: {
            "expo-router": { usePathname: () => currentPath },
            "react-native": { Keyboard: { dismiss: () => keyboardDismissals++ } },
            "react-native-root-toast": {
                positions: { BOTTOM: -20 },
                show: (message) => {
                    const toast = { message };
                    toasts.push(toast);
                    return toast;
                },
                hide: (toast) => hiddenToasts.push(toast),
            },
            "./ThemeProvider": { useTheme: () => theme },
        },
    });
    toastProvider.flushEffects();

    const httpClient = {
        get: (path) => {
            const request = deferred();
            requests.get.push({ path, ...request });
            return request.promise;
        },
        post: (path, body) => {
            const request = deferred();
            requests.post.push({ path, body, ...request });
            return request.promise;
        },
        patch: async () => failureResponse(),
        delete: async () => failureResponse(),
    };
    const session = {
        get session() {
            return currentSession;
        },
        logout: () => {
            logoutCalls++;
            currentSession = {
                loading: false,
                authenticated: false,
                accessToken: "",
                refreshToken: "",
            };
            runtime.provider.render();
            runtime.router?.replace("/start");
        },
    };
    runtime.provider = mountNativeComponent("src/contexts/domain/UserProvider.tsx", {
        exportName: "UserProvider",
        props: { children: "Consent test" },
        modules: {
            "../HttpClientProvider": { useHttpClient: () => httpClient },
            "../ToastProvider": { useToast: () => toastProvider.elements()[0].props.value },
            "../ThemeProvider": { useTheme: () => theme },
            "../SessionProvider": { useSession: () => session },
        },
    });

    const history = [];
    const replacements = [];
    const navigate = (path) => {
        currentPath = typeof path === "string" ? path : path.pathname;
        toastProvider.render();
        toastProvider.flushEffects();
    };
    runtime.router = {
        canGoBack: () => history.length > 0,
        back: () => {
            if (history.length) navigate(history.pop());
        },
        push: (path) => {
            history.push(currentPath);
            navigate(path);
        },
        replace: (path) => {
            const destination = typeof path === "string" ? path : path.pathname;
            replacements.push(destination);
            if (replaceFailures > 0) {
                replaceFailures--;
                throw new Error("Navigation failed");
            }
            history.length = 0;
            navigate(destination);
        },
    };

    return {
        provider: runtime.provider,
        user: () => runtime.provider.elements()[0].props.value,
        session,
        setSession: (next) => {
            currentSession = next;
            runtime.provider.render();
        },
        requests,
        themeCalls,
        theme: () => theme,
        toastProvider,
        toasts,
        hiddenToasts,
        keyboardDismissals: () => keyboardDismissals,
        logoutCalls: () => logoutCalls,
        path: () => currentPath,
        history,
        replacements,
        failNextReplace: () => replaceFailures++,
        router: () => runtime.router,
        navigate,
    };
}

function mountConsent(options) {
    const runtime = mountRuntime(options);
    let focusEffect;
    let removeFocusEffect = () => {};
    const backHandlers = new Set();
    const native = {
        View: "View",
        Pressable: "Pressable",
        Text: "Text",
        ScrollView: "ScrollView",
        Platform: { select: (values) => values.default },
        StyleSheet: { create: (styles) => styles },
        Keyboard: { dismiss: () => runtime.keyboardDismissals() },
        BackHandler: {
            addEventListener: (_event, handler) => {
                backHandlers.add(handler);
                return { remove: () => backHandlers.delete(handler) };
            },
        },
    };
    const screen = mountNativeComponent("src/app/consents.tsx", {
        modules: {
            "expo-router": {
                useRouter: runtime.router,
                useFocusEffect: (callback) => {
                    focusEffect = callback;
                },
            },
            "react-native": native,
            "react-native-keyboard-controller": {
                KeyboardAwareScrollView: "KeyboardAwareScrollView",
            },
            "@/contexts/domain/UserProvider": { useUser: runtime.user },
            "@/contexts/SessionProvider": { useSession: () => runtime.session },
            "@/contexts/ThemeProvider": { useTheme: runtime.theme },
            "@/components/common/ImageButton": "ImageButton",
        },
    });
    const focus = () => {
        removeFocusEffect();
        removeFocusEffect = focusEffect?.() ?? (() => {});
    };
    const blur = () => {
        removeFocusEffect();
        removeFocusEffect = () => {};
    };
    const render = () => screen.render();
    const buttons = () => screen.elements().filter((node) => node.type === "Button");
    const button = (name) => buttons().find((node) => node.props.name === name);
    return {
        ...runtime,
        screen,
        focus,
        blur,
        render,
        backHandlers,
        buttons,
        button,
        header: () => screen.elements().find((node) => node.type?.name === "DefaultHeader"),
        legalLinks: () =>
            screen
                .elements()
                .filter(
                    (node) => node.type === "Pressable" && node.props.accessibilityRole === "link",
                ),
    };
}

test("accepted consent retries only account verification", async () => {
    const app = mountConsent();
    app.focus();
    app.screen.flushEffects();
    assert.equal(app.requests.get.length, 1);
    app.requests.get[0].resolve(successResponse());
    await flush();
    app.provider.render();
    app.render();

    const firstAccept = app.button("Accept");
    assert.ok(firstAccept, "The gate should offer Accept after confirming consent is missing");
    const acceptPromise = firstAccept.props.onPress();
    assert.equal(app.requests.post.length, 1);
    app.requests.post[0].resolve({ isSuccess: true, statusCode: 204, response: null });
    await flush();
    assert.equal(app.requests.get.length, 2);
    app.requests.get[1].resolve(failureResponse());
    await flush();
    app.render();

    const retry = app.button("Retry account check");
    assert.ok(retry, "A failed post-acceptance account check should offer recovery");
    const retryPromise = retry.props.onPress();
    assert.equal(app.requests.get.length, 3);
    app.requests.get[2].resolve(failureResponse());
    await flush();
    app.render();
    await Promise.all([acceptPromise, retryPromise]);

    const acceptButton = app.button("Accept");
    const homeReturns = app.replacements.filter((path) => path === "/");
    assert.equal(app.requests.post.length, 1);
    assert.equal(homeReturns.length, 0);
    assert.equal(acceptButton?.props.disabled, true);
    assert.equal(app.toasts.length, 0);
    assert.match(app.screen.text(), /Consent submitted\. Check account status to continue\./);
});

test("initial account read error blocks acceptance until Retry succeeds", async () => {
    const app = mountConsent();
    app.focus();
    app.screen.flushEffects();
    app.requests.get[0].resolve(failureResponse());
    await flush();
    app.render();

    assert.equal(app.button("Accept")?.props.disabled, true);
    assert.ok(app.button("Retry account check"));
    const retry = app.button("Retry account check").props.onPress();
    assert.equal(app.requests.get.length, 2);
    app.requests.get[1].resolve(successResponse());
    await flush();
    await retry;
    app.render();

    assert.equal(app.button("Accept")?.props.disabled, false);
    assert.equal(app.toasts.length, 0);
});

test("already-active consent returns to the app after account verification", async () => {
    const app = mountConsent();
    app.focus();
    app.screen.flushEffects();
    app.requests.get[0].resolve(successResponse({ hasActiveConsent: true }));
    await flush();

    assert.deepEqual(app.replacements, ["/"]);
    assert.deepEqual(app.requests.post, []);
    assert.equal(app.toasts.length, 0);
});

test("failed and thrown consent writes stay local and allow another attempt", async () => {
    const app = mountConsent();
    app.focus();
    app.screen.flushEffects();
    app.requests.get[0].resolve(successResponse());
    await flush();
    app.render();

    const failedPress = app.button("Accept").props.onPress();
    app.requests.post[0].resolve(failureResponse());
    await flush();
    await failedPress;
    app.render();
    assert.match(app.screen.text(), /Could not submit consent/);
    assert.equal(app.button("Accept")?.props.disabled, false);

    const thrownPress = app.button("Accept").props.onPress();
    const thrownHandled = thrownPress.catch(() => {});
    app.requests.post[1].reject(new Error("Request failed"));
    await flush();
    await thrownHandled;
    app.render();
    assert.match(app.screen.text(), /Could not submit consent/);
    assert.equal(app.requests.post.length, 2);
    assert.equal(app.toasts.length, 0);
});

test("same-tick double press sends only one consent request", async () => {
    const app = mountConsent();
    app.focus();
    app.screen.flushEffects();
    app.requests.get[0].resolve(successResponse());
    await flush();
    app.render();

    const accept = app.button("Accept").props.onPress;
    const first = accept();
    const second = accept();
    assert.equal(app.requests.post.length, 1);
    app.requests.post[0].resolve(failureResponse());
    await flush();
    await Promise.all([first, second]);
});

test("accepted consent keeps its latch through refocus and Continue retries navigation only", async () => {
    const app = mountConsent();
    app.focus();
    app.screen.flushEffects();
    app.requests.get[0].resolve(successResponse());
    await flush();
    app.render();

    app.failNextReplace();
    const accept = app.button("Accept").props.onPress();
    const acceptedHandled = accept.catch(() => {});
    app.blur();
    app.focus();
    app.requests.post[0].resolve({ isSuccess: true, statusCode: 204, response: null });
    await flush();
    assert.equal(app.requests.get.length, 2);
    app.requests.get[1].resolve(successResponse({ hasActiveConsent: true }));
    await flush();
    await acceptedHandled;
    app.render();
    assert.ok(app.button("Continue"));

    app.blur();
    app.focus();
    app.render();
    const continuePress = app.button("Continue").props.onPress();
    await flush();
    await continuePress;

    assert.deepEqual(app.replacements, ["/", "/"]);
    assert.equal(app.requests.post.length, 1);
    assert.equal(app.requests.get.length, 2);
});

test("a different session clears the accepted latch before its own consent decision", async () => {
    const app = mountConsent();
    app.focus();
    app.screen.flushEffects();
    app.requests.get[0].resolve(successResponse());
    await flush();
    app.render();

    const accept = app.button("Accept").props.onPress();
    app.requests.post[0].resolve({ isSuccess: true, statusCode: 204, response: null });
    await flush();
    app.requests.get[1].resolve(failureResponse());
    await flush();
    await accept;
    app.render();
    assert.equal(app.button("Accept")?.props.disabled, true);

    app.setSession({
        loading: false,
        authenticated: true,
        accessToken: "access-2",
        refreshToken: "refresh-2",
    });
    app.render();
    app.screen.flushEffects();
    assert.equal(app.requests.get.length, 3);
    app.requests.get[2].resolve(successResponse());
    await flush();
    app.render();

    assert.equal(app.button("Accept")?.props.disabled, false);
    const secondAccept = app.button("Accept").props.onPress();
    assert.equal(app.requests.post.length, 2);
    app.requests.post[1].resolve(failureResponse());
    await flush();
    await secondAccept;
});

test("a new session starts its own account read while the previous read is pending", async () => {
    const app = mountConsent();
    app.focus();
    app.screen.flushEffects();
    assert.equal(app.requests.get.length, 1);

    app.setSession({
        loading: false,
        authenticated: true,
        accessToken: "access-2",
        refreshToken: "refresh-2",
    });
    app.render();
    app.screen.flushEffects();
    assert.equal(app.requests.get.length, 2);

    app.requests.get[1].resolve(
        successResponse({ Id: "user-2", email: "new@example.com", hasActiveConsent: false }),
    );
    await flush();
    app.provider.render();
    app.render();
    assert.equal(app.button("Accept")?.props.disabled, false);

    app.requests.get[0].resolve(
        successResponse({
            Id: "user-1",
            email: "old@example.com",
            hasActiveConsent: true,
            theme: ThemeMode.Dark,
        }),
    );
    await flush();
    app.provider.render();
    app.render();

    assert.equal(app.user().data.email, "new@example.com");
    assert.equal(app.themeCalls.includes(ThemeMode.Dark), false);
    assert.equal(app.replacements.includes("/"), false);
});

test("cancelled account read cannot restore session data", async () => {
    const app = mountConsent();
    app.focus();
    app.screen.flushEffects();
    assert.ok(app.header(), "Back remains available while the account read is pending");
    app.header().props.onBack();
    assert.equal(app.logoutCalls(), 1);

    app.requests.get[0].resolve(successResponse({ hasActiveConsent: true, theme: ThemeMode.Dark }));
    await flush();
    app.provider.render();
    app.render();

    assert.equal(app.user().data.email, "");
    assert.deepEqual(app.themeCalls, []);
    assert.deepEqual(app.replacements, ["/start"]);
    assert.equal(app.toasts.length, 0);
});

test("consent Back signs out while legal Back returns to gate", () => {
    const app = mountConsent();
    const previousPath = app.path();
    for (const [label, file] of [
        ["Terms of Service", "src/app/terms.tsx"],
        ["Privacy Policy", "src/app/privacy.tsx"],
    ]) {
        app.render();
        const link = app.legalLinks().find((node) => node.props.accessibilityLabel === label);
        assert.ok(link, `${label} should have a separate named target`);
        app.router().push(label === "Terms of Service" ? "/terms" : "/privacy");
        const legal = mountNativeComponent(file, {
            modules: {
                "expo-router": { useRouter: app.router },
                "react-native": {
                    View: "View",
                    Pressable: "Pressable",
                    StyleSheet: { create: (styles) => styles },
                },
                "@/components/common/ImageButton": "ImageButton",
                "@/components/common/Text": "Text",
                "@/components/user/TermsAndConditions": "TermsAndConditions",
                "@/components/user/PrivacyPolicy": "PrivacyPolicy",
            },
        });
        const back = legal.elements().find((node) => node.type === "ImageButton");
        assert.ok(back, `${label} page should expose Back`);
        back.props.onPress();
        assert.equal(app.path(), previousPath);
    }

    app.render();
    app.header().props.onBack();
    assert.equal(app.logoutCalls(), 1);
    assert.deepEqual(app.replacements, ["/start"]);
});

test("Android Back logs out and consumes the event while consent gate is focused", () => {
    const app = mountConsent();
    app.focus();
    assert.equal(app.backHandlers.size, 1);
    const onBack = [...app.backHandlers][0];
    assert.equal(onBack(), true);
    assert.equal(app.logoutCalls(), 1);
    assert.deepEqual(app.replacements, ["/start"]);
});

test("consent links stay separate, named, and at least 48 dp high", () => {
    const app = mountConsent();
    app.render();
    const links = app.legalLinks();
    assert.deepEqual(
        links.map((link) => link.props.accessibilityLabel),
        ["Terms of Service", "Privacy Policy"],
    );
    for (const link of links) {
        assert.equal(link.props.accessibilityRole, "link");
        assert.ok(link.props.style.minHeight >= 48);
    }
});

test("consent flow shows no global toast after failed account checks", async () => {
    const app = mountConsent();
    app.focus();
    app.screen.flushEffects();
    app.requests.get[0].resolve(failureResponse());
    await flush();
    app.render();
    assert.ok(app.button("Retry account check"));
    assert.equal(app.toasts.length, 0);
});

test("UserProvider keeps silent reads silent after route changes and rejects stale failures", async () => {
    const app = mountRuntime({ pathname: "/user/info" });
    const silent = app.user().getUserData({ silent: true });
    app.navigate("/profile-archive");
    app.requests.get[0].resolve(failureResponse());
    const silentResult = await silent;
    assert.equal(silentResult.isSuccess, false);
    assert.equal(app.toasts.length, 0);

    const staleFailure = app.user().getUserData();
    app.setSession({
        loading: false,
        authenticated: false,
        accessToken: "",
        refreshToken: "",
    });
    app.navigate("/profile-archive");
    app.requests.get[1].resolve(failureResponse());
    const staleResult = await staleFailure;
    await flush();
    assert.equal(staleResult.isSuccess, false);
    assert.equal(app.toasts.length, 0);
});

test("UserProvider consent failures do not emit a global toast", async () => {
    const app = mountRuntime({ pathname: "/user/info" });
    const submit = app.user().makeConsents();
    assert.equal(app.requests.post.length, 1);
    assert.equal(app.requests.post[0].path, "v1/users/consents");
    assert.equal(Object.keys(app.requests.post[0].body).length, 0);
    app.requests.post[0].resolve(failureResponse());
    const result = await submit;
    await flush();

    assert.equal(result.isSuccess, false);
    assert.equal(app.toasts.length, 0);
});

function mountHeader(props, router) {
    let keyboardDismissals = 0;
    const native = {
        View: "View",
        Pressable: "Pressable",
        Text: "Text",
        StyleSheet: { create: (styles) => styles },
        Keyboard: { dismiss: () => keyboardDismissals++ },
        Platform: { select: (values) => values.default },
    };
    const header = mountNativeComponent("src/components/headers/DefaultHeader.tsx", {
        props,
        modules: {
            "expo-router": { useRouter: () => router },
            "react-native": native,
            "@/contexts/ThemeProvider": {
                useTheme: () => ({ current: { colors: { authBackground: "#ffffff" } } }),
            },
        },
    });
    return {
        header,
        keyboardDismissals: () => keyboardDismissals,
        back: () => header.elements().find((node) => node.props.accessibilityLabel === "Go back"),
    };
}

test("DefaultHeader preserves history, defaults brand fallback to slash, and supports custom Back", () => {
    const calls = [];
    const router = {
        canGoBack: () => true,
        back: () => calls.push("back"),
        replace: (path) => calls.push(path),
    };
    const historyHeader = mountHeader({ variant: "brand" }, router);
    historyHeader.back().props.onPress();
    assert.deepEqual(calls, ["back"]);
    assert.equal(historyHeader.keyboardDismissals(), 1);

    router.canGoBack = () => false;
    const defaultFallback = mountHeader({ variant: "brand" }, router);
    defaultFallback.back().props.onPress();
    assert.deepEqual(calls, ["back", "/"]);

    const startFallback = mountHeader({ variant: "brand", backFallback: "/start" }, router);
    startFallback.back().props.onPress();
    assert.deepEqual(calls, ["back", "/", "/start"]);

    let customCalls = 0;
    router.canGoBack = () => true;
    const customHeader = mountHeader({ variant: "brand", onBack: () => customCalls++ }, router);
    customHeader.back().props.onPress();
    assert.equal(customCalls, 1);
    assert.deepEqual(calls, ["back", "/", "/start"]);
    assert.equal(customHeader.keyboardDismissals(), 1);
});
