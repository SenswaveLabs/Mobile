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

const defaultExport = (value) => ({ __esModule: true, default: value });
const document = {
    version: "  legal-v7  ",
    summary: "",
    content: "## Exact server copy\n\nKeep *all* whitespace.\n",
};

function mountLegalProvider({ base = "https://api.example/", fetch: fetcher, apiUrl } = {}) {
    const requests = [];
    const logs = [];
    const provider = mountNativeComponent("src/contexts/domain/LegalProvider.tsx", {
        exportName: "LegalProvider",
        props: { children: "legal" },
        modules: {
            "@/contexts/ConfigurationProvider": {
                useConfiguration: () => ({
                    getApiUrl: apiUrl ?? ((path) => new URL(path, base)),
                }),
            },
        },
        timers: {
            setTimeout,
            clearTimeout,
            URL,
            AbortController,
            fetch: async (url, options) => {
                requests.push({ url, options });
                return fetcher
                    ? fetcher(url, options)
                    : { ok: true, status: 200, json: async () => document };
            },
            console: Object.fromEntries(
                ["debug", "info", "warn", "error"].map((method) => [
                    method,
                    (...args) => logs.push(args.join(" ")),
                ]),
            ),
        },
    });
    return {
        value: () => provider.output().props.value,
        requests,
        logs,
    };
}

function mountPolicy(
    kind = "privacy",
    { base = "https://api.example/", getLegal, toastCalls = [] } = {},
) {
    let currentBase = base;
    let currentLegal =
        getLegal ??
        (() => ({
            getPrivacy: async () => ({ isSuccess: true, data: document }),
            getTerms: async () => ({ isSuccess: true, data: document }),
        }));
    let focus;
    const path =
        kind === "privacy"
            ? "src/components/user/PrivacyPolicy.tsx"
            : "src/components/user/TermsAndConditions.tsx";
    const screen = mountNativeComponent(path, {
        modules: (React) => {
            focus = makeFocusLifecycle(React);
            return {
                "expo-router": { useFocusEffect: (callback) => focus.useFocusEffect(callback) },
                "@/contexts/ConfigurationProvider": {
                    useConfiguration: () => ({ getBaseUrl: () => new URL(currentBase) }),
                },
                "@/contexts/domain/LegalProvider": { useLegal: () => currentLegal() },
                "@/contexts/ToastProvider": {
                    useToast: () => ({ error: (...args) => toastCalls.push(args) }),
                },
                "@/components/common/Loading": defaultExport("Loading"),
                "@/components/common/Markdown": defaultExport("Markdown"),
                "@/components/common/Divider": defaultExport("Divider"),
                "@/components/common/Text": defaultExport("Text"),
                "@/components/common/Button": defaultExport("Button"),
            };
        },
    });

    const renderView = (kindOverride) => {
        screen.render();
        const element = screen
            .elements()
            .find(
                (node) => typeof node.type === "function" && node.type.name === "LegalDocumentView",
            );
        assert.ok(element, "the policy wrapper delegates to LegalDocumentView");
        const tree = element.type({
            ...element.props,
            ...(kindOverride ? { kind: kindOverride } : {}),
        });
        screen.flushEffects();
        return { tree, elements: screen.elements(tree), kind: element.props.kind };
    };

    return {
        ...screen,
        renderView,
        focus: () => focus.focus(),
        blur: () => focus.blur(),
        setBase: (next) => {
            currentBase = next;
        },
        setLegal: (next) => {
            currentLegal = next;
        },
    };
}

function mountPublicLegalRoute(path) {
    const routes = [];
    const screen = mountNativeComponent(path, {
        modules: {
            "expo-router": {
                useRouter: () => ({
                    back: () => routes.push("back"),
                    replace: (to) => routes.push(to),
                }),
            },
            "@/components/headers/DefaultHeader": defaultExport("DefaultHeader"),
            "@/components/common/ImageButton": defaultExport("ImageButton"),
            "@/components/common/Text": defaultExport("Text"),
            "@/components/user/PrivacyPolicy": defaultExport("PrivacyPolicy"),
            "@/components/user/TermsAndConditions": defaultExport("TermsAndConditions"),
        },
    });
    return { ...screen, routes };
}

function mountActualHeader(props, router) {
    const header = mountNativeComponent("src/components/headers/DefaultHeader.tsx", {
        props,
        modules: {
            "expo-router": { useRouter: () => router },
            "react-native": {
                View: "View",
                Pressable: "Pressable",
                Text: "Text",
                StyleSheet: { create: (styles) => styles },
                Keyboard: { dismiss: () => {} },
            },
            "../common/Icon": defaultExport("Icon"),
            "../common/Text": defaultExport("Text"),
            "@/contexts/ThemeProvider": {
                useTheme: () => ({ current: { colors: { authBackground: "#ffffff" } } }),
            },
        },
    });
    return header.elements().find((node) => node.props.accessibilityLabel === "Go back");
}

test("legal provider preserves exact server fields and permits an empty summary", async () => {
    const provider = mountLegalProvider();
    const terms = await provider.value().getTerms();
    const privacy = await provider.value().getPrivacy();

    assert.equal(terms.isSuccess, true);
    assert.equal(privacy.isSuccess, true);
    assert.deepEqual(privacy.data, document);
    assert.equal(provider.requests.length, 2);
    assert.equal(new URL(provider.requests[0].url).pathname, "/v1/legal/terms");
    assert.equal(new URL(provider.requests[1].url).pathname, "/v1/legal/privacy");
});

test("legal provider returns failures for request, JSON and consumed-shape errors", async () => {
    const cases = [
        {
            fetch: async () => {
                throw new Error("offline");
            },
        },
        { fetch: async () => ({ ok: false, status: 503, json: async () => ({}) }) },
        {
            fetch: async () => ({
                ok: true,
                status: 200,
                json: async () => {
                    throw new Error("bad JSON");
                },
            }),
        },
        { fetch: async () => ({ ok: true, status: 200, json: async () => undefined }) },
        {
            fetch: async () => ({
                ok: true,
                status: 200,
                json: async () => ({ ...document, version: "  " }),
            }),
        },
        {
            fetch: async () => ({
                ok: true,
                status: 200,
                json: async () => ({ ...document, summary: null }),
            }),
        },
        {
            fetch: async () => ({
                ok: true,
                status: 200,
                json: async () => ({ ...document, content: "\n " }),
            }),
        },
    ];

    for (const input of cases) {
        const provider = mountLegalProvider(input);
        const result = await provider
            .value()
            .getPrivacy()
            .catch((error) => ({ threw: error }));
        assert.equal(result.isSuccess, false);
        assert.equal(result.data, null);
    }

    const urlFailure = mountLegalProvider({
        apiUrl: () => {
            throw new Error("invalid URL");
        },
    });
    const result = await urlFailure
        .value()
        .getTerms()
        .catch((error) => ({ threw: error }));
    assert.equal(result.isSuccess, false);
});

test("legal wrappers delegate each document kind to the shared growing view", async () => {
    for (const kind of ["privacy", "terms"]) {
        const toastCalls = [];
        const wrapper = mountPolicy(kind, { toastCalls });
        const first = wrapper.renderView();
        assert.equal(first.kind, kind);
        assert.equal(
            first.elements.some((node) =>
                JSON.stringify(node.props?.children ?? "").includes("Version:"),
            ),
            false,
        );
        wrapper.focus();
        await flush();
        const loaded = wrapper.renderView();
        const markdown = loaded.elements.filter((node) => node.type === "Markdown");
        assert.deepEqual(
            markdown.map((node) => node.props.children[0]),
            [document.summary, document.content],
        );
        assert.ok(
            loaded.elements.some((node) => node.type === "Text" && node.props.numberOfLines === 0),
            "essential legal text grows without the common three-line cap",
        );
        assert.deepEqual(toastCalls, []);
    }
});

test("legal view keeps local Retry and retries the matching document", async () => {
    const responses = [
        { isSuccess: false, errorMessage: "do not render server detail" },
        { isSuccess: true, data: document },
    ];
    const reads = [];
    const wrapper = mountPolicy("terms", {
        getLegal: () => ({
            getTerms: async () => {
                reads.push("terms");
                return responses.shift();
            },
            getPrivacy: async () => {
                reads.push("privacy");
                return responses.shift();
            },
        }),
    });

    wrapper.renderView();
    wrapper.focus();
    await flush();
    let view = wrapper.renderView();
    const retry = view.elements.find(
        (node) => node.type === "Button" && node.props.name === "Retry",
    );
    assert.ok(retry);
    retry.props.onPress();
    await flush();
    view = wrapper.renderView();
    assert.deepEqual(reads, ["terms", "terms"]);
    assert.ok(view.elements.some((node) => node.type === "Markdown"));
});

test("legal view reloads on kind or server change, not provider object replacement", async () => {
    const first = deferred();
    const currentRequest = deferred();
    const termsRequest = deferred();
    const calls = [];
    const wrapper = mountPolicy("privacy", {
        getLegal: () => ({
            getPrivacy: () => {
                calls.push("privacy");
                return calls.length === 1 ? first.promise : currentRequest.promise;
            },
            getTerms: () => {
                calls.push("terms");
                return termsRequest.promise;
            },
        }),
    });

    wrapper.renderView();
    wrapper.focus();
    await flush();
    assert.deepEqual(calls, ["privacy"]);
    wrapper.renderView();
    wrapper.setBase("https://next.example/");
    wrapper.renderView();
    wrapper.setLegal(() => ({
        getPrivacy: async () => ({
            isSuccess: true,
            data: { ...document, content: "replacement provider content" },
        }),
        getTerms: () => {
            calls.push("terms");
            return termsRequest.promise;
        },
    }));
    wrapper.renderView();
    await flush();
    assert.deepEqual(calls, ["privacy", "privacy"]);
    first.resolve({ isSuccess: true, data: { ...document, content: "stale" } });
    await flush();
    let view = wrapper.renderView();
    assert.equal(
        view.elements.some((node) => node.type === "Markdown"),
        false,
    );

    wrapper.renderView("terms");
    await flush();
    assert.deepEqual(calls, ["privacy", "privacy", "terms"]);
    termsRequest.resolve({ isSuccess: true, data: { ...document, content: "current" } });
    await flush();
    view = wrapper.renderView("terms");
    assert.ok(
        view.elements.some(
            (node) => node.type === "Markdown" && node.props.children[0] === "current",
        ),
    );
});

test("legal view rejects retained Retry after the server identity changes", async () => {
    let reads = 0;
    const wrapper = mountPolicy("privacy", {
        getLegal: () => ({
            getPrivacy: async () => {
                reads++;
                return { isSuccess: false };
            },
            getTerms: async () => ({ isSuccess: false }),
        }),
    });
    wrapper.renderView();
    wrapper.focus();
    await flush();
    const previous = wrapper.renderView();
    const retainedRetry = previous.elements.find(
        (node) => node.type === "Button" && node.props.name === "Retry",
    ).props.onPress;

    wrapper.setBase("https://next.example/");
    wrapper.renderView();
    await flush();
    assert.equal(reads, 2);

    retainedRetry();
    await flush();
    assert.equal(reads, 2);
});

test("legal view cancels queued work when the server identity changes", async () => {
    let reads = 0;
    const wrapper = mountPolicy("privacy", {
        getLegal: () => ({
            getPrivacy: async () => {
                reads++;
                return { isSuccess: false };
            },
            getTerms: async () => ({ isSuccess: false }),
        }),
    });
    wrapper.renderView();
    wrapper.focus();
    await flush();
    const error = wrapper.renderView();
    const retry = error.elements.find(
        (node) => node.type === "Button" && node.props.name === "Retry",
    ).props.onPress;
    retry();

    wrapper.setBase("https://next.example/");
    wrapper.renderView();
    await flush();

    assert.equal(reads, 2);
});

test("legal view rejects retained Retry after blur", async () => {
    let reads = 0;
    const wrapper = mountPolicy("privacy", {
        getLegal: () => ({
            getPrivacy: async () => {
                reads++;
                return { isSuccess: false };
            },
            getTerms: async () => ({ isSuccess: false }),
        }),
    });
    wrapper.renderView();
    wrapper.focus();
    await flush();
    const error = wrapper.renderView();
    const retainedRetry = error.elements.find(
        (node) => node.type === "Button" && node.props.name === "Retry",
    ).props.onPress;
    wrapper.blur();

    retainedRetry();
    await flush();
    assert.equal(reads, 1);
});

test("legal retained Retry uses current method when scalar identity is unchanged", async () => {
    let replacementReads = 0;
    const wrapper = mountPolicy("privacy", {
        getLegal: () => ({
            getPrivacy: async () => ({ isSuccess: false }),
            getTerms: async () => ({ isSuccess: false }),
        }),
    });
    wrapper.renderView();
    wrapper.focus();
    await flush();
    const error = wrapper.renderView();
    const retainedRetry = error.elements.find(
        (node) => node.type === "Button" && node.props.name === "Retry",
    ).props.onPress;

    wrapper.setLegal(() => ({
        getPrivacy: async () => {
            replacementReads++;
            return { isSuccess: false };
        },
        getTerms: async () => ({ isSuccess: false }),
    }));
    wrapper.renderView();

    retainedRetry();
    await flush();
    assert.equal(replacementReads, 1);
});

test("legal view binds queued Retry to the captured method across provider recreation", async () => {
    let originalReads = 0;
    let replacementReads = 0;
    const wrapper = mountPolicy("privacy", {
        getLegal: () => ({
            getPrivacy: async () => {
                originalReads++;
                return { isSuccess: false };
            },
            getTerms: async () => ({ isSuccess: false }),
        }),
    });
    wrapper.renderView();
    wrapper.focus();
    await flush();
    const error = wrapper.renderView();
    const retry = error.elements.find(
        (node) => node.type === "Button" && node.props.name === "Retry",
    ).props.onPress;
    retry();

    wrapper.setLegal(() => ({
        getPrivacy: async () => {
            replacementReads++;
            return { isSuccess: false };
        },
        getTerms: async () => ({ isSuccess: false }),
    }));
    wrapper.renderView();
    await flush();

    assert.equal(originalReads, 2);
    assert.equal(replacementReads, 0);
});

test("all legal routes use the shared page and keep public fallback separate from Stack headers", () => {
    const publicPrivacy = mountPublicLegalRoute("src/app/privacy.tsx");
    const publicTerms = mountPublicLegalRoute("src/app/terms.tsx");
    const privacyHeader = publicPrivacy.elements().find((node) => node.type === "DefaultHeader");
    const termsHeader = publicTerms.elements().find((node) => node.type === "DefaultHeader");
    assert.equal(privacyHeader?.props.variant, "brand");
    assert.equal(privacyHeader?.props.backFallback, "/start");
    assert.equal(termsHeader?.props.variant, "brand");
    assert.equal(termsHeader?.props.backFallback, "/start");

    const fallbackCalls = [];
    const legalBack = mountActualHeader(privacyHeader.props, {
        canGoBack: () => false,
        back: () => fallbackCalls.push("back"),
        replace: (path) => fallbackCalls.push(path),
    });
    legalBack.props.onPress();
    assert.deepEqual(fallbackCalls, ["/start"]);
    assert.ok(publicPrivacy.elements().some((node) => node.type === "PrivacyPolicy"));
    assert.ok(publicTerms.elements().some((node) => node.type === "TermsAndConditions"));

    const privatePrivacy = mountNativeComponent("src/app/(app)/user/privacy.tsx", {
        modules: { "@/components/user/PrivacyPolicy": defaultExport("PrivacyPolicy") },
    });
    const privateTerms = mountNativeComponent("src/app/(app)/user/terms.tsx", {
        modules: { "@/components/user/TermsAndConditions": defaultExport("TermsAndConditions") },
    });
    assert.ok(privatePrivacy.elements().some((node) => node.type === "PrivacyPolicy"));
    assert.ok(privateTerms.elements().some((node) => node.type === "TermsAndConditions"));
    assert.equal(
        privatePrivacy.elements().some((node) => node.type === "ScrollView"),
        false,
    );
    assert.equal(
        privateTerms.elements().some((node) => node.type === "ScrollView"),
        false,
    );
});
