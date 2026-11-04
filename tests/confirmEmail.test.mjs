import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { makeFocusLifecycle, mountNativeComponent } from "./nativeComponentHarness.mjs";

const require = createRequire(import.meta.url);
const { extractExpoPathFromURL } = require("expo-router/build/fork/extractPathFromURL.js");
const { parseQueryParams } = require("expo-router/build/fork/getStateFromPath-forks.js");

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

let actualRouteParams;
const actualHookModule = { exports: {} };
runInNewContext(readFileSync(require.resolve("expo-router/build/hooks.js"), "utf8"), {
    module: actualHookModule,
    exports: actualHookModule.exports,
    require(name) {
        if (name === "react") return { use: () => actualRouteParams };
        if (name === "./link/preview/PreviewRouteContext") return { usePreviewInfo: () => ({}) };
        return {};
    },
    URLSearchParams,
    console,
    process,
});

const nativeIntentModule = { exports: {} };
runInNewContext(
    ts.transpileModule(readFileSync("src/app/+native-intent.ts", "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
        module: nativeIntentModule,
        exports: nativeIntentModule.exports,
        URL,
        URLSearchParams,
    },
);
const { redirectSystemPath } = nativeIntentModule.exports;

function nativeRouteParams(path, initial) {
    const redirected = redirectSystemPath({ path, initial });
    const extracted = extractExpoPathFromURL([], redirected);
    actualRouteParams = parseQueryParams(extracted, { name: "confirmEmail" }) ?? {};
    return {
        redirected,
        params: Object.fromEntries(Object.entries(actualHookModule.exports.useLocalSearchParams())),
    };
}

function confirmationPath(userId, code, family = "scheme") {
    const query = new URLSearchParams([
        ["userId", userId],
        ["code", code],
    ]).toString();
    if (family === "triple") return `com.develite.senswave:///confirmEmail?${query}`;
    if (family === "https") return `https://api-dev.senswave.net/confirmEmail?${query}`;
    if (family === "trailing") return `https://api-dev.senswave.net/confirmEmail/?${query}`;
    if (family === "rooted") return `/confirmEmail?${query}`;
    return `com.develite.senswave://confirmEmail?${query}`;
}

function mountSessionProvider({ base = "https://api.example/", fetch: fetcher, apiUrl } = {}) {
    const logs = [];
    const config = {
        getApiUrl: apiUrl ?? ((path) => new URL(path, base)),
    };
    const sessionProvider = mountNativeComponent("src/contexts/SessionProvider.tsx", {
        exportName: "SessionProvider",
        props: { children: "session" },
        modules: {
            "expo-router": { useRouter: () => ({ replace: () => {} }) },
            "expo-secure-store": {
                getItemAsync: async () => null,
                setItemAsync: async () => {},
                deleteItemAsync: async () => {},
            },
            "./ConfigurationProvider": { useConfiguration: () => config },
        },
        timers: {
            setTimeout,
            clearTimeout,
            URL,
            AbortController,
            fetch: fetcher ?? (async () => ({ ok: true, status: 200 })),
            console: Object.fromEntries(
                ["debug", "info", "warn", "error"].map((method) => [
                    method,
                    (...args) => logs.push(args.join(" ")),
                ]),
            ),
        },
    });

    return {
        calls: () => sessionProvider.output().props.value,
        logs,
    };
}

function mountConfirmation({ params, confirmEmail = async () => ({ isSuccess: true }) } = {}) {
    let currentParams = params;
    let base = "https://api.example/";
    let focus;
    const routes = [];
    let currentSession = { confirmEmail };
    const router = {
        push: (path) => routes.push(["push", path]),
        replace: (path) => routes.push(["replace", path]),
    };
    const screen = mountNativeComponent("src/app/confirmEmail.tsx", {
        modules: (React) => {
            focus = makeFocusLifecycle(React);
            return {
                "expo-router": {
                    useLocalSearchParams: () => ({ ...currentParams }),
                    useRouter: () => router,
                    useFocusEffect: (callback) => focus.useFocusEffect(callback),
                },
                "expo-router/build/hooks": {
                    useSearchParams: () => new URLSearchParams(currentParams),
                    useRouter: () => router,
                },
                "@/contexts/SessionProvider": {
                    useSession: () => currentSession,
                },
                "@/contexts/ConfigurationProvider": {
                    useConfiguration: () => ({ getBaseUrl: () => new URL(base) }),
                },
                "@/components/common/Icon": { __esModule: true, default: "Icon" },
                "@/components/common/Loading": { __esModule: true, default: "Loading" },
                "@/components/common/Text": { __esModule: true, default: "Text" },
                "@/components/common/Button": { __esModule: true, default: "Button" },
            };
        },
    });
    screen.flushEffects();

    return {
        ...screen,
        routes,
        focus: () => focus.focus(),
        blur: () => focus.blur(),
        setParams: (next) => {
            currentParams = next;
            screen.render();
            screen.flushEffects();
        },
        setBase: (next) => {
            base = next;
            screen.render();
            screen.flushEffects();
        },
        setConfirm: (next) => {
            currentSession = { confirmEmail: next };
            screen.render();
            screen.flushEffects();
        },
        button: (name) =>
            screen.elements().find((node) => node.type === "Button" && node.props.name === name),
    };
}

test("confirmation sends exact opaque query values", async () => {
    const requests = [];
    const provider = mountSessionProvider({
        fetch: async (url, options) => {
            requests.push({ url, options });
            return { ok: true, status: 204 };
        },
    });

    const result = await provider.calls().confirmEmail("user+id/=&✓", "a+b/=&✓");
    const sent = new URL(requests[0].url);

    assert.equal(result.isSuccess, true);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].options.method, "POST");
    assert.equal(sent.pathname, "/v1/auth/confirmEmail");
    assert.equal(sent.searchParams.get("userId"), "user+id/=&✓");
    assert.equal(sent.searchParams.get("code"), "a+b/=&✓");

    const percentCode = "%2B";
    const percentProvider = mountSessionProvider({
        fetch: async (url) => {
            assert.equal(new URL(url).searchParams.get("code"), percentCode);
            return { ok: true, status: 204 };
        },
    });
    assert.equal((await percentProvider.calls().confirmEmail("user", percentCode)).isSuccess, true);
});

test("native confirmation links preserve opaque values through the installed Router pipeline", async () => {
    const userId = "user+id/=&✓%2B";
    const codes = ["a+b/=&✓", "%2B", "%25", "qa+code%/= value", "+ %25 /=&✓"];

    for (const initial of [true, false]) {
        for (const code of codes) {
            const path = confirmationPath(userId, code);
            const { params } = nativeRouteParams(path, initial);
            assert.deepEqual(params, { userId, code }, `initial=${initial}, code=${code}`);

            const posted = [];
            const provider = mountSessionProvider({
                fetch: async (url, options) => {
                    posted.push({ url, options });
                    return { ok: true, status: 204 };
                },
            });
            const route = mountConfirmation({
                params,
                confirmEmail: (requestedUser, requestedCode) =>
                    provider.calls().confirmEmail(requestedUser, requestedCode),
            });
            route.focus();
            await flush();

            assert.equal(posted.length, 1);
            assert.equal(posted[0].options.method, "POST");
            assert.equal(new URL(posted[0].url).searchParams.get("userId"), userId);
            assert.equal(new URL(posted[0].url).searchParams.get("code"), code);
        }
    }
});

test("native confirmation link families preserve values and unrelated paths", () => {
    const userId = "user+id/=&✓%2B";
    const code = "a+b/=&✓";
    for (const initial of [true, false]) {
        for (const family of ["triple", "https", "trailing", "rooted"]) {
            const { params } = nativeRouteParams(confirmationPath(userId, code, family), initial);
            assert.deepEqual(params, { userId, code }, `${family}, initial=${initial}`);
        }

        for (const path of [
            "/resetPassword?code=%2B",
            "/privacy",
            "/terms",
            "/",
            "com.develite.senswave://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081",
            "/unknown?value=a%2Bb",
        ]) {
            assert.equal(redirectSystemPath({ path, initial }), path);
        }
    }
});

test("invalid native confirmation links reach local recovery without a POST", async () => {
    const paths = [
        "com.develite.senswave://confirmEmail",
        "com.develite.senswave://confirmEmail?userId=&code=code",
        "com.develite.senswave://confirmEmail?userId=user&code=",
        "com.develite.senswave://confirmEmail?userId=user&code=code&code=again",
        "com.develite.senswave://confirmEmail?userId=user&userId=again&code=code",
        "com.develite.senswave://confirmEmail?userId=user&code=%",
        "com.develite.senswave://confirmEmail?userId=user&code=%ZZ",
        "com.develite.senswave://confirmEmail?userId=user&code=%E0%A4",
    ];

    for (const initial of [true, false]) {
        for (const path of paths) {
            let result;
            assert.doesNotThrow(() => {
                result = nativeRouteParams(path, initial);
            });
            assert.equal(result.redirected, "/confirmEmail");
            assert.deepEqual(result.params, {});

            let confirmationCalls = 0;
            const route = mountConfirmation({
                params: result.params,
                confirmEmail: async () => {
                    confirmationCalls++;
                    return { isSuccess: true };
                },
            });
            route.focus();
            await flush();
            assert.equal(confirmationCalls, 0);
        }
    }
});

test("confirmation transport failures never log the opaque code or URL encoding", async () => {
    const code = "a+b/=&✓";
    let sentUrl;
    const provider = mountSessionProvider({
        fetch: async (url) => {
            sentUrl = url;
            throw new Error(`network failed for ${url} with code ${code}`);
        },
    });

    const result = await provider.calls().confirmEmail("user", code);
    const logged = provider.logs.join(" ");

    assert.equal(result.isSuccess, false);
    assert.equal(logged.includes(code), false);
    assert.equal(logged.includes("a%2Bb%2F%3D%26%E2%9C%93"), false);
    assert.equal(logged.includes(sentUrl), false);

    const thrownProvider = mountSessionProvider({
        apiUrl: () => {
            throw new Error(`configuration failed for ${code}`);
        },
    });
    await thrownProvider.calls().confirmEmail("user", code);
    assert.equal(thrownProvider.logs.join(" ").includes(code), false);
});

test("confirmation rejects missing, empty and repeated route parameters", async () => {
    for (const params of [
        {},
        { userId: "user", code: "" },
        { userId: ["user", "other"], code: "code" },
        { userId: "user", code: ["code", "other"] },
    ]) {
        let posts = 0;
        const screen = mountConfirmation({
            params,
            confirmEmail: async () => {
                posts++;
                return { isSuccess: true };
            },
        });
        screen.focus();
        await flush();
        screen.render();

        assert.equal(posts, 0);
        assert.ok(screen.button("Sign in"));
        assert.equal(screen.button("Retry verification"), undefined);
        screen.button("Sign in").props.onPress();
        assert.deepEqual(screen.routes, [["replace", "/login"]]);
    }
});

test("confirmation succeeds once across rerenders and focus changes", async () => {
    const request = deferred();
    const posts = [];
    const screen = mountConfirmation({
        params: { userId: "user", code: "opaque" },
        confirmEmail: (...args) => {
            posts.push(args);
            return request.promise;
        },
    });

    screen.focus();
    await flush();
    screen.render();
    screen.flushEffects();
    screen.focus();
    assert.equal(posts.length, 1);
    screen.blur();
    screen.focus();
    await flush();
    screen.render();
    assert.equal(posts.length, 1);

    request.resolve({ isSuccess: true });
    await flush();
    screen.render();
    screen.blur();
    screen.focus();
    await flush();
    screen.render();

    assert.equal(posts.length, 1);
    assert.ok(screen.button("Sign in"));
    assert.equal(screen.routes.length, 0);
    screen.button("Sign in").props.onPress();
    assert.deepEqual(screen.routes, [["replace", "/login"]]);
});

test("confirmation retry locks duplicate presses and changed links ignore late results", async () => {
    const first = deferred();
    const second = deferred();
    const calls = [];
    const screen = mountConfirmation({
        params: { userId: "user-a", code: "code-a" },
        confirmEmail: (...args) => {
            calls.push(args);
            return calls.length === 1 ? first.promise : second.promise;
        },
    });

    screen.focus();
    await flush();
    first.resolve({ isSuccess: false });
    await flush();
    screen.render();
    const retry = screen.button("Retry verification");
    assert.ok(retry);
    retry.props.onPress();
    retry.props.onPress();
    await flush();
    assert.equal(calls.length, 2);

    screen.setParams({ userId: "user-b", code: "code-b" });
    await flush();
    assert.equal(calls.length, 3);
    second.resolve({ isSuccess: false });
    await flush();
    screen.render();
    assert.equal(screen.button("Retry verification")?.props.name, "Retry verification");
    assert.equal(calls[2][0], "user-b");
    assert.equal(calls[2][1], "code-b");
});

test("confirmation rejects retained Retry after the route identity changes", async () => {
    const calls = [];
    const screen = mountConfirmation({
        params: { userId: "user-a", code: "code-a" },
        confirmEmail: async (...args) => {
            calls.push(args);
            return { isSuccess: false };
        },
    });

    screen.focus();
    await flush();
    screen.render();
    const retainedRetry = screen.button("Retry verification").props.onPress;

    screen.setParams({ userId: "user-b", code: "code-b" });
    await flush();
    assert.deepEqual(calls, [
        ["user-a", "code-a"],
        ["user-b", "code-b"],
    ]);

    retainedRetry();
    await flush();
    assert.deepEqual(calls, [
        ["user-a", "code-a"],
        ["user-b", "code-b"],
    ]);
});

test("confirmation rejects retained Retry after blur", async () => {
    let attempts = 0;
    const screen = mountConfirmation({
        params: { userId: "user", code: "opaque" },
        confirmEmail: async () => {
            attempts++;
            return { isSuccess: false };
        },
    });

    screen.focus();
    await flush();
    screen.render();
    const retainedRetry = screen.button("Retry verification").props.onPress;
    screen.blur();

    retainedRetry();
    await flush();
    assert.equal(attempts, 1);
});

test("confirmation cancels queued work before blur and leaves Retry after refocus", async () => {
    let attempts = 0;
    const screen = mountConfirmation({
        params: { userId: "user", code: "opaque" },
        confirmEmail: async () => {
            attempts++;
            return { isSuccess: false };
        },
    });

    screen.focus();
    screen.blur();
    screen.focus();
    await flush();
    screen.render();

    assert.equal(attempts, 0);
    assert.ok(screen.button("Retry verification"));
});

test("confirmation retained Retry uses current method for the same scalar identity", async () => {
    let replacementAttempts = 0;
    const screen = mountConfirmation({
        params: { userId: "user", code: "opaque" },
        confirmEmail: async () => ({ isSuccess: false }),
    });

    screen.focus();
    await flush();
    screen.render();
    const retainedRetry = screen.button("Retry verification").props.onPress;
    screen.setConfirm(async () => {
        replacementAttempts++;
        return { isSuccess: false };
    });

    retainedRetry();
    await flush();
    assert.equal(replacementAttempts, 1);
    screen.render();
    assert.ok(screen.button("Sign in"));
});

test("confirmation binds a queued Retry to its captured method across provider recreation", async () => {
    let originalAttempts = 0;
    let replacementAttempts = 0;
    const screen = mountConfirmation({
        params: { userId: "user", code: "opaque" },
        confirmEmail: async () => {
            originalAttempts++;
            return { isSuccess: false };
        },
    });

    screen.focus();
    await flush();
    screen.render();
    const retry = screen.button("Retry verification").props.onPress;
    retry();
    screen.setConfirm(async () => {
        replacementAttempts++;
        return { isSuccess: false };
    });

    await flush();
    assert.equal(originalAttempts, 2);
    assert.equal(replacementAttempts, 0);
});

test("confirmation cancels queued work when the scalar identity changes", async () => {
    const calls = [];
    const screen = mountConfirmation({
        params: { userId: "user-a", code: "code-a" },
        confirmEmail: async (...args) => {
            calls.push(args);
            return { isSuccess: false };
        },
    });

    screen.focus();
    await flush();
    screen.render();
    const retry = screen.button("Retry verification").props.onPress;
    retry();
    screen.setParams({ userId: "user-b", code: "code-b" });
    await flush();

    assert.deepEqual(calls, [
        ["user-a", "code-a"],
        ["user-b", "code-b"],
    ]);
});

test("valid link survives provider recreation before its queued POST dispatches", async () => {
    const posts = [];
    const replacements = [];
    const screen = mountConfirmation({
        params: { userId: "user-a", code: "code-a" },
        confirmEmail: async (userId, code) => {
            posts.push([userId, code]);
            return { isSuccess: true };
        },
    });

    screen.focus();
    await flush();
    screen.render();
    assert.ok(screen.button("Sign in"));

    screen.setParams({ userId: "user-b", code: "code-b" });
    screen.setConfirm(async (userId, code) => {
        replacements.push([userId, code]);
        return { isSuccess: false };
    });
    await flush();
    screen.render();

    assert.deepEqual(posts, [
        ["user-a", "code-a"],
        ["user-b", "code-b"],
    ]);
    assert.deepEqual(replacements, []);
    assert.match(screen.text(), /Email verified/i);
    assert.doesNotMatch(screen.text(), /Unable to verify email/i);
    assert.equal(screen.button("Retry verification"), undefined);
});

test("confirmation retries returned failures and scopes success to server and user", async () => {
    const posts = [];
    const screen = mountConfirmation({
        params: { userId: "user", code: "%2B" },
        confirmEmail: async (...args) => {
            posts.push(args);
            if (posts.length === 1) return { isSuccess: false };
            return { isSuccess: true };
        },
    });

    screen.focus();
    await flush();
    screen.render();
    assert.ok(screen.button("Retry verification"));
    screen.button("Retry verification").props.onPress();
    await flush();
    screen.render();
    assert.equal(posts.length, 2);
    assert.ok(screen.button("Sign in"));

    screen.setBase("https://other.example/");
    await flush();
    assert.equal(posts.length, 3);
    screen.setParams({ userId: "other-user", code: "%2B" });
    await flush();
    assert.equal(posts.length, 4);
    assert.deepEqual(posts.at(-1), ["other-user", "%2B"]);
});

test("confirmation ignores stale identities and retains accepted success per link", async () => {
    const first = deferred();
    const second = deferred();
    const otherServer = deferred();
    const calls = [];
    const screen = mountConfirmation({
        params: { userId: "user-a", code: "code-a" },
        confirmEmail: (userId, code) => {
            calls.push([userId, code]);
            if (userId === "user-a" && code === "code-a" && calls.length === 1)
                return first.promise;
            if (userId === "user-b") return second.promise;
            return otherServer.promise;
        },
    });

    screen.focus();
    await flush();
    screen.setParams({ userId: "user-b", code: "code-b" });
    await flush();
    assert.equal(calls.length, 2);

    first.resolve({ isSuccess: true });
    await flush();
    screen.render();
    assert.equal(screen.text().includes("Email verified"), false);

    second.resolve({ isSuccess: false });
    await flush();
    screen.render();
    assert.equal(screen.text().includes("Unable to verify email"), true);

    screen.setParams({ userId: "user-a", code: "code-a" });
    await flush();
    screen.render();
    assert.equal(calls.length, 2);
    assert.equal(screen.text().includes("Email verified"), true);

    screen.setBase("https://other.example/");
    await flush();
    screen.setParams({ userId: "user-a", code: "code-c" });
    await flush();
    assert.deepEqual(calls.slice(2), [
        ["user-a", "code-a"],
        ["user-a", "code-c"],
    ]);
    otherServer.resolve({ isSuccess: false });
    await flush();
});
