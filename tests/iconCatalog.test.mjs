import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers";
import { URL } from "node:url";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const flush = () => new Promise((resolve) => setImmediate(resolve));
const success = (keys) => ({
    isSuccess: true,
    statusCode: 200,
    response: { json: async () => keys },
});

function mountCatalog(get = async () => success(["home-outline", "building"])) {
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
                ? ["bulb-outline", "plug-outline"]
                : ["home-outline", "building"],
        ),
    );
    await hook.settle();
    assert.deepEqual(Array.from(hook.output().keys), ["home-outline", "building"]);
    hook.render("devices");
    await hook.settle();
    assert.deepEqual(Array.from(hook.output().keys), ["bulb-outline", "plug-outline"]);
    hook.render("homes");
    await hook.settle();
    assert.deepEqual(hook.paths, ["v1/homes/icons", "v1/devices/icons"]);
    assert.deepEqual(Array.from(hook.output().keys), ["home-outline", "building"]);
});

test("catalog keys stay opaque, including newly added keys and original letter case", async () => {
    const hook = mountCatalog(async () => success(["home-outline", "Future.Key"]));
    await hook.settle();
    assert.deepEqual(Array.from(hook.output().keys), ["home-outline", "Future.Key"]);
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
    pending[0](success(["home-outline"]));
    pending[1](success(["bulb-outline"]));
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
            { items: ["home-outline"] },
            [],
            [""],
            [" "],
            [42],
            ["home-outline", "home-outline"],
        ].map((data) => () => success(data)),
    ];
    for (const fail of failures) {
        let first = true;
        const hook = mountCatalog(async () => {
            if (first) {
                first = false;
                return fail();
            }
            return success(["home-outline"]);
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
    pending[0](success(["old-server-key"]));
    await flush();
    hook.render();
    assert.deepEqual(Array.from(hook.output().keys), []);
    pending[1](success(["new-server-key"]));
    await flush();
    hook.render();
    assert.deepEqual(Array.from(hook.output().keys), ["new-server-key"]);
    hook.scope.token = "account-two";
    hook.render();
    assert.deepEqual(Array.from(hook.output().keys), []);
    hook.flushEffects();
    pending[2](success(["new-account-key"]));
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
