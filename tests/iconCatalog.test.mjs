import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers";
import { URL } from "node:url";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const flush = () => new Promise((resolve) => setImmediate(resolve));
const icon = (resource, key) => ({ key, labelKey: `icons.${resource}.${key}` });
const catalogEntries = (entries) => Array.from(entries, ({ key, labelKey }) => ({ key, labelKey }));
const homeIcons = [icon("homes", "home-outline"), icon("homes", "building")];
const success = (entries) => ({
    isSuccess: true,
    statusCode: 200,
    response: { json: async () => entries },
});

function mountCatalog(get = async () => success(homeIcons)) {
    const paths = [];
    const scope = {
        server: "https://first.example.test",
        token: "account-one",
        authenticated: true,
    };
    const http = {
        get: (path) => {
            paths.push(path);
            return get(path);
        },
    };
    const hook = mountNativeComponent("src/hooks/useIconCatalog.ts", {
        exportName: "useIconCatalog",
        props: "homes",
        modules: {
            "@/contexts/HttpClientProvider": { useHttpClient: () => http },
            "@/contexts/ConfigurationProvider": {
                useConfiguration: () => ({ getBaseUrl: () => new URL(scope.server) }),
            },
            "@/contexts/SessionProvider": {
                useSession: () => ({
                    session: { accessToken: scope.token, authenticated: scope.authenticated },
                }),
            },
        },
    });
    const settle = async () => {
        hook.flushEffects();
        await flush();
        hook.render();
    };
    return { ...hook, paths, scope, settle };
}

test("both authenticated catalogs use the HTTP client and retain successful results for reuse", async () => {
    const hook = mountCatalog(async (path) =>
        success(
            path.includes("devices")
                ? [icon("devices", "bulb-outline"), icon("devices", "plug-outline")]
                : homeIcons,
        ),
    );
    await hook.settle();
    assert.deepEqual(Array.from(hook.output().keys), ["home-outline", "building"]);
    assert.deepEqual(catalogEntries(hook.output().entries), homeIcons);
    hook.render("devices");
    await hook.settle();
    assert.deepEqual(Array.from(hook.output().keys), ["bulb-outline", "plug-outline"]);
    hook.render("homes");
    await hook.settle();
    assert.deepEqual(hook.paths, ["v1/homes/icons", "v1/devices/icons"]);
    assert.deepEqual(Array.from(hook.output().keys), ["home-outline", "building"]);
    assert.deepEqual(catalogEntries(hook.output().entries), homeIcons);
});

test("catalog keys stay opaque, including newly added keys and original letter case", async () => {
    const hook = mountCatalog(async () =>
        success([icon("homes", "home-outline"), icon("homes", "Future.Key")]),
    );
    await hook.settle();
    assert.deepEqual(Array.from(hook.output().keys), ["home-outline", "Future.Key"]);
    assert.deepEqual(catalogEntries(hook.output().entries), [
        { key: "home-outline", labelKey: "icons.homes.home-outline" },
        { key: "Future.Key", labelKey: "icons.homes.Future.Key" },
    ]);
});

test("a catalog request already in flight is reused when its resource is revisited", async () => {
    const pending = [];
    const hook = mountCatalog(() => new Promise((resolve) => pending.push(resolve)));
    hook.flushEffects();
    hook.render("devices");
    hook.flushEffects();
    hook.render("homes");
    hook.flushEffects();
    assert.deepEqual(hook.paths, ["v1/homes/icons", "v1/devices/icons"]);
    pending[0](success([icon("homes", "home-outline")]));
    pending[1](success([icon("devices", "bulb-outline")]));
    await flush();
    hook.render();
    assert.deepEqual(Array.from(hook.output().keys), ["home-outline"]);
    assert.equal(hook.output().loading, false);
});

test("HTTP, parsing and malformed catalog failures expose retry without a local allowed list", async () => {
    const failures = [
        () => ({ isSuccess: false, statusCode: 503, response: null }),
        () => {
            throw new Error("Offline");
        },
        () => ({
            isSuccess: true,
            statusCode: 200,
            response: {
                json: async () => {
                    throw new Error("Invalid JSON");
                },
            },
        }),
        ...[
            null,
            {},
            { items: [icon("homes", "home-outline")] },
            [],
            ["home-outline"],
            [""],
            [" "],
            [42],
            [null],
            [{}],
            [{ key: "home-outline" }],
            [{ labelKey: "icons.homes.home-outline" }],
            [{ key: "", labelKey: "icons.homes.home-outline" }],
            [{ key: "home-outline", labelKey: " " }],
            [icon("homes", "home-outline"), icon("homes", "home-outline")],
        ].map((data) => () => success(data)),
    ];
    for (const fail of failures) {
        let first = true;
        const hook = mountCatalog(async () => {
            if (first) {
                first = false;
                return fail();
            }
            return success([icon("homes", "home-outline")]);
        });
        await hook.settle();
        assert.equal(hook.output().loading, false);
        assert.ok(hook.output().error);
        assert.deepEqual(Array.from(hook.output().keys), []);
        hook.output().retry();
        hook.render();
        await hook.settle();
        assert.equal(hook.output().error, "");
        assert.deepEqual(Array.from(hook.output().keys), ["home-outline"]);
        assert.equal(hook.paths.length, 2);
    }
});

test("server and account changes hide previous keys immediately and ignore late responses", async () => {
    const pending = [];
    const hook = mountCatalog(() => new Promise((resolve) => pending.push(resolve)));
    hook.flushEffects();
    hook.scope.server = "https://second.example.test";
    hook.render();
    assert.deepEqual(Array.from(hook.output().keys), []);
    hook.flushEffects();
    pending[0](success([icon("homes", "old-server-key")]));
    await flush();
    hook.render();
    assert.deepEqual(Array.from(hook.output().keys), []);
    pending[1](success([icon("homes", "new-server-key")]));
    await flush();
    hook.render();
    assert.deepEqual(Array.from(hook.output().keys), ["new-server-key"]);
    hook.scope.token = "account-two";
    hook.render();
    assert.deepEqual(Array.from(hook.output().keys), []);
    hook.flushEffects();
    pending[2](success([icon("homes", "new-account-key")]));
    await flush();
    hook.render();
    assert.deepEqual(Array.from(hook.output().keys), ["new-account-key"]);
    assert.equal(hook.paths.length, 3);
});

test("logout prevents new catalog requests and clears visible keys", async () => {
    const hook = mountCatalog();
    await hook.settle();
    hook.scope.authenticated = false;
    hook.render();
    await hook.settle();
    assert.deepEqual(Array.from(hook.output().keys), []);
    assert.equal(hook.paths.length, 1);
});
