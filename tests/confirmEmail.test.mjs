import assert from "node:assert/strict";
import test from "node:test";
import { makeFocusLifecycle, mountNativeComponent } from "./nativeComponentHarness.mjs";

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
    let currentConfirm = confirmEmail;
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
                    useSession: () => ({ confirmEmail: (...args) => currentConfirm(...args) }),
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
            currentConfirm = next;
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
