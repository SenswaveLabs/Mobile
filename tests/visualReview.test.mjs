import assert from "node:assert/strict";
import { allowedSharingWrite } from "../tools/expo-visual-review/lib/gateway.ts";
import { requestJson } from "../tools/expo-visual-review/lib/gateway.ts";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import http from "node:http";
import { discoverRoutes, resolveScenario } from "../tools/expo-visual-review/lib/discovery.ts";
import { ReviewStore, comparisonFor } from "../tools/expo-visual-review/lib/store.ts";
import {
    isAllowedRequest,
    localApiUrl,
    startGateway,
} from "../tools/expo-visual-review/lib/gateway.ts";
import {
    mqttConfiguration,
    fixtureTopic,
    reviewMessages,
    validateReviewControl,
} from "../tools/expo-visual-review/lib/testData.ts";
import { defaultScenarios, validateScenarios } from "../tools/expo-visual-review/lib/scenarios.ts";
import { maestroFlow } from "../tools/expo-visual-review/lib/capture.ts";
import { latestStateAttempts } from "../tools/expo-visual-review/lib/comparison.ts";
import {
    verificationTargets,
    verificationRuntime,
} from "../tools/expo-visual-review/lib/verification.ts";

const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRz8AAAAASUVORK5CYII=",
    "base64",
);
const temporary = (t) => {
    const path = mkdtempSync(join(tmpdir(), "expo-review-test-"));
    t.after(() => rmSync(path, { recursive: true, force: true }));
    return path;
};

test("Maestro serializes parameterless commands as scalar YAML entries", () => {
    const flow = maestroFlow("com.example.review", [
        { hideKeyboard: true },
        { back: true },
        { inputText: "a:b # literal" },
    ]);
    assert.ok(flow.includes("- hideKeyboard\n"));
    assert.ok(flow.includes("- back\n"));
    assert.ok(flow.includes('- {"inputText":"a:b # literal"}'));
    assert.ok(!flow.includes('"hideKeyboard":true'));
});

test("local scenario files reject arbitrary Maestro commands and external links", () => {
    const routes = [{ id: "/screen" }];
    const valid = {
        routeId: "/screen",
        state: "default",
        assertVisible: "Screen",
        steps: [{ back: true }],
    };
    assert.equal(validateScenarios([valid], routes)[0], valid);
    assert.throws(
        () => validateScenarios([{ ...valid, steps: [{ runScript: "danger.js" }] }], routes),
        /step/i,
    );
    assert.throws(
        () =>
            validateScenarios(
                [{ ...valid, setup: [{ openLink: "https://external.test" }] }],
                routes,
            ),
        /internal/i,
    );
    assert.throws(
        () => validateScenarios([{ ...valid, assertVisible: "[" }], routes),
        /assertion/i,
    );
    assert.throws(() => validateScenarios([{ ...valid, routeId: "/unknown" }], routes), /route/i);
});

test("discovery uses Expo route semantics without executing screens", (t) => {
    const root = temporary(t);
    for (const [file, source] of Object.entries({
        "_layout.tsx": "export default () => <Stack />;",
        "(tabs)/_layout.tsx": 'export default () => <Tabs><Tabs.Screen name="index" /></Tabs>;',
        "(tabs)/index.tsx": 'throw new Error("Never import screens"); export default () => null;',
        "(auth)/login.tsx": "export default () => null;",
        "devices/[id].tsx":
            "const { id, mode } = useLocalSearchParams<{id: string; mode?: string}>(); export default () => null;",
        "help/[...slug].tsx": "export default () => null;",
        "+not-found.tsx": "export default () => null;",
        "+native-intent.ts": 'export const redirectSystemPath = () => "/";',
        "health+api.ts": "export const GET = () => null;",
    })) {
        const path = join(root, "src/app", file);
        mkdirSync(join(path, ".."), { recursive: true });
        writeFileSync(path, source);
    }
    const discovery = discoverRoutes(root);
    assert.equal(discovery.engine, "expo-router");
    assert.equal(discovery.routes.length, 5);
    assert.ok(discovery.layouts.some((layout) => layout.navigator === "Tabs"));
    assert.equal(discovery.routes.find((route) => route.id === "/(tabs)").pathname, "/");
    const dynamic = discovery.routes.find((route) => route.pathname === "/devices/[id]");
    assert.deepEqual(dynamic.parameters, [{ name: "id", catchAll: false }]);
    assert.ok(dynamic.queryParameters.includes("mode"));
    assert.equal(resolveScenario(dynamic), null);
    assert.throws(
        () => resolveScenario(dynamic, { state: "detail", params: { id: "fake" } }),
        /testData/,
    );
    assert.equal(
        resolveScenario(dynamic, {
            state: "detail",
            params: { id: "real/id", mode: "a+b" },
            testData: true,
        }).href,
        "/devices/real%2Fid?mode=a%2Bb",
    );
    const catchAll = discovery.routes.find((route) => route.pathname === "/help/[...slug]");
    assert.equal(
        resolveScenario(catchAll, {
            state: "docs",
            params: { slug: ["room", "a b"] },
            testData: true,
        }).href,
        "/help/room/a%20b",
    );
    assert.throws(
        () => resolveScenario(dynamic, { state: "bad", params: { id: "" }, testData: true }),
        /id/,
    );
});

test("captures are immutable, SQLite persists annotations and acceptance needs approval", (t) => {
    const root = temporary(t);
    const store = new ReviewStore(root, "/tmp/review-repo");
    const route = {
        id: "/login",
        pathname: "/login",
        source: "src/app/login.tsx",
        groups: [],
        parameters: [],
        queryParameters: [],
        layouts: [],
    };
    store.saveRoutes({
        routes: [route],
        layouts: [],
        engine: "expo-router",
        warnings: [],
        routeRoot: "src/app",
    });
    const input = {
        routeId: route.id,
        state: "default",
        platform: "android",
        device: "emulator-5554",
        commit: "abc",
        dirty: false,
        href: "/login",
        steps: [{ openLink: "/login" }],
        runId: "run-1",
    };
    const before = store.recordCapture(input, png);
    const finding = store.addAnnotation(before.id, {
        geometry: { type: "point", x: 0, y: 0 },
        comment: "Align label",
        priority: "high",
    });
    assert.throws(
        () =>
            store.addAnnotation(before.id, {
                geometry: { type: "point", x: 2, y: 0 },
                comment: "bad",
                priority: "high",
            }),
        /bounds/,
    );
    assert.throws(
        () =>
            store.addAnnotation(before.id, {
                geometry: { type: "rect", x: 0, y: 0, width: 0, height: 1 },
                comment: "bad",
                priority: "high",
            }),
        /bounds/,
    );
    assert.throws(() => store.updateAnnotation(finding.id, { status: "accepted" }), /approval/);
    const after = store.recordCapture({ ...input, commit: "def", runId: "run-2" }, png);
    assert.notEqual(before.file, after.file);
    assert.deepEqual(readFileSync(join(root, before.file)), png);
    assert.equal(comparisonFor(store.manifest(), before.id).after.id, after.id);
    const exported = store.exportTasks();
    assert.equal(exported.tasks[0].route, "/login");
    assert.deepEqual(exported.tasks[0].annotation.geometry, { type: "point", x: 0, y: 0 });
    assert.ok(exported.tasks[0].navigation.length);
    store.close();
    const reopened = new ReviewStore(root, "/tmp/review-repo");
    assert.equal(reopened.annotations()[0].status, "open");
    assert.equal(reopened.manifest().captures.length, 2);
    reopened.updateAnnotation(finding.id, { status: "accepted" }, true);
    assert.equal(reopened.exportTasks().tasks.length, 0);
    reopened.close();
});

test("deleting one finding persists, removes its export and preserves screenshots and other findings", (t) => {
    const root = temporary(t);
    const store = new ReviewStore(root, "/tmp/review-repo");
    store.saveRoutes({
        routes: [
            {
                id: "/screen",
                pathname: "/screen",
                source: "app/screen.tsx",
                groups: [],
                parameters: [],
                queryParameters: [],
                layouts: [],
            },
        ],
        layouts: [],
        routeRoot: "app",
        engine: "expo-router",
        warnings: [],
    });
    const capture = store.recordCapture(
        {
            routeId: "/screen",
            state: "default",
            platform: "android",
            device: "emulator-5554",
            commit: "abc",
            dirty: false,
            href: "/screen",
            steps: [],
            runId: "run-1",
        },
        png,
    );
    const add = (comment) =>
        store.addAnnotation(capture.id, {
            geometry: { type: "point", x: 0, y: 0 },
            comment,
            priority: "medium",
        });
    const removed = add("Remove this finding");
    const retained = add("Keep this finding");
    store.deleteAnnotation(removed.id);
    assert.deepEqual(
        store.exportTasks().tasks.map((task) => task.id),
        [retained.id],
    );
    assert.throws(() => store.deleteAnnotation("' OR 1=1 --"), /not found/i);
    store.close();
    const reopened = new ReviewStore(root, "/tmp/review-repo");
    assert.deepEqual(
        reopened.annotations().map((finding) => finding.id),
        [retained.id],
    );
    assert.equal(reopened.manifest().captures.length, 1);
    assert.deepEqual(readFileSync(join(root, capture.file)), png);
    reopened.updateAnnotation(retained.id, { status: "accepted" }, true);
    reopened.deleteAnnotation(retained.id);
    assert.deepEqual(reopened.annotations(), []);
    reopened.close();
});

test("comparisons reject unrelated state, device and image dimensions", () => {
    const base = {
        id: "one",
        routeId: "/login",
        state: "form",
        platform: "android",
        device: "one",
        width: 100,
        height: 200,
    };
    const manifest = {
        captures: [
            base,
            { ...base, id: "two", state: "error" },
            { ...base, id: "three", device: "two" },
            { ...base, id: "four", width: 200 },
            { ...base, id: "five", href: "/login?deviceId=other" },
        ],
    };
    assert.equal(comparisonFor(manifest, "one").after, null);
});

test("verification selects exactly the requested capture and preserves runtime/resource identity", () => {
    const a = {
        id: "a",
        routeId: "/device",
        state: "default",
        href: "/device?id=a",
        platform: "android",
        device: "emulator-5554",
        width: 100,
        height: 200,
    };
    const b = { ...a, id: "b", href: "/device?id=b" };
    const c = { ...a, id: "c", platform: "ios", device: "ios-udid" };
    const manifest = { captures: [a, b, c] };
    const annotations = [
        { captureId: "a", status: "open" },
        { captureId: "b", status: "open" },
    ];
    assert.deepEqual(
        verificationTargets(manifest, annotations, { captureId: "b" }).map((capture) => capture.id),
        ["b"],
    );
    assert.equal(verificationTargets(manifest, annotations).length, 2);
    assert.throws(
        () => verificationTargets(manifest, annotations, { captureId: "missing" }),
        /does not exist/,
    );
    assert.deepEqual(verificationRuntime([c], {}), { platform: "ios", device: "ios-udid" });
    assert.throws(() => verificationRuntime([a, c], {}), /different/);
    assert.throws(() => verificationRuntime([c], { platform: "android" }), /does not match/);
    const attempts = {
        attempts: [
            { routeId: "/device", state: "slider", status: "failed" },
            { routeId: "/device", state: "color", status: "captured" },
        ],
    };
    assert.equal(
        latestStateAttempts(attempts, "/device").filter((attempt) => attempt.status === "failed")
            .length,
        1,
    );
});

test("gateway only permits reads and exact authentication endpoints on a local API", () => {
    assert.equal(localApiUrl("http://10.0.2.2:7070").origin, "http://127.0.0.1:7070");
    assert.throws(() => localApiUrl("https://api.senswave.net"), /local/i);
    assert.throws(() => localApiUrl("http://127.0.0.1@external.test"), /local/i);
    assert.equal(isAllowedRequest("GET", "/api/v1/homes"), true);
    assert.equal(isAllowedRequest("POST", "/api/v1/auth/login"), true);
    assert.equal(isAllowedRequest("POST", "/api/v1/auth/refresh"), true);
    assert.equal(
        isAllowedRequest("POST", "/signalr/liveupdates/live/negotiate?negotiateVersion=1"),
        true,
    );
    assert.equal(
        isAllowedRequest("POST", "/api/v1/devices/widgets/review-widget/action", ["review-widget"]),
        true,
    );
    assert.equal(
        isAllowedRequest("POST", "/api/v1/devices/widgets/other-widget/action", ["review-widget"]),
        false,
    );
    for (const [method, path] of [
        ["DELETE", "/api/v1/homes/1"],
        ["POST", "/api/v1/devices/1/commands"],
        ["POST", "/api/v1/auth/confirmEmail"],
        ["POST", "/api/v1/auth/login/../confirmEmail"],
        ["PUT", "/api/v1/homes/1"],
    ]) {
        assert.equal(isAllowedRequest(method, path), false);
    }
});

test("sharing writes require the exact review home, recipient and unused local code", () => {
    const policy = {
        homeId: "review-home",
        emails: ["test@example.test"],
        consent: true,
        invitations: [
            {
                homeId: "review-home",
                email: "test@example.test",
                password: "ABC12345",
                used: false,
            },
        ],
    };
    const invite = {
        homeId: "review-home",
        friendEmail: "test@example.test",
        sharingType: "Manage",
    };
    assert.equal(allowedSharingWrite("POST", "/api/v1/homes/sharings", invite, policy), true);
    assert.equal(
        allowedSharingWrite(
            "POST",
            "/api/v1/homes/sharings",
            { ...invite, homeId: "other" },
            policy,
        ),
        false,
    );
    assert.equal(
        allowedSharingWrite(
            "POST",
            "/api/v1/homes/sharings",
            { ...invite, friendEmail: "other@example.test" },
            policy,
        ),
        false,
    );
    assert.equal(
        allowedSharingWrite("PUT", "/api/v1/homes/sharings", { password: "ABC12345" }, policy),
        true,
    );
    policy.invitations[0].used = true;
    assert.equal(
        allowedSharingWrite("PUT", "/api/v1/homes/sharings", { password: "ABC12345" }, policy),
        false,
    );
    assert.equal(allowedSharingWrite("DELETE", "/api/v1/homes/sharings", invite, policy), false);
    assert.equal(allowedSharingWrite("POST", "/api/v1/users/consents", {}, {}), false);
    assert.equal(allowedSharingWrite("POST", "/api/v1/users/consents", {}, policy), true);
});

test("sharing proxy captures issued codes and blocks a second accepted join", async (t) => {
    let writes = 0;
    const upstream = http.createServer((request, response) => {
        request.resume();
        request.on("end", () => {
            writes++;
            response.writeHead(request.method === "POST" ? 201 : 204, {
                "Content-Type": "application/json",
            });
            response.end(
                request.method === "POST" ? JSON.stringify({ password: "ABCD1234" }) : undefined,
            );
        });
    });
    await new Promise((resolve) => upstream.listen(0, "127.0.0.1", resolve));
    const gateway = await startGateway(new URL(`http://127.0.0.1:${upstream.address().port}`), [], {
        homeId: "home",
        emails: ["member@example.test"],
    });
    t.after(() => {
        gateway.close();
        upstream.closeAllConnections();
        upstream.close();
    });
    const origin = new URL(`http://127.0.0.1:${gateway.port}`);
    const created = await requestJson(origin, "/api/v1/homes/sharings", {
        method: "POST",
        body: { homeId: "home", friendEmail: "member@example.test", sharingType: "Display" },
    });
    assert.equal(created.status, 201);
    assert.equal(gateway.invitations[0].password, "ABCD1234");
    assert.equal(
        (
            await requestJson(origin, "/api/v1/homes/sharings", {
                method: "PUT",
                body: { password: "ABCD1234" },
            })
        ).status,
        204,
    );
    assert.equal(
        (
            await requestJson(origin, "/api/v1/homes/sharings", {
                method: "PUT",
                body: { password: "ABCD1234" },
            })
        ).status,
        403,
    );
    assert.equal(writes, 2);
});

test("gateway cleanup closes upgraded SignalR sockets as well as HTTP connections", async (t) => {
    const upstream = http.createServer();
    const peers = new Set();
    upstream.on("upgrade", (_request, socket) => {
        peers.add(socket);
        socket.on("close", () => peers.delete(socket));
        socket.write(
            "HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n",
        );
    });
    await new Promise((resolve) => upstream.listen(0, "127.0.0.1", resolve));
    const gateway = await startGateway(new URL(`http://127.0.0.1:${upstream.address().port}`));
    t.after(() => {
        gateway.close();
        for (const peer of peers) peer.destroy();
        upstream.close();
    });
    const socket = await new Promise((resolve, reject) => {
        const request = http.request(`http://127.0.0.1:${gateway.port}/signalr/liveupdates/live`, {
            headers: { Connection: "Upgrade", Upgrade: "websocket" },
        });
        request.on("upgrade", (_response, socket) => resolve(socket));
        request.on("error", reject);
        request.end();
    });
    const closed = new Promise((resolve) => socket.once("close", resolve));
    gateway.close();
    await Promise.race([
        closed,
        new Promise((_, reject) => {
            const timer = setTimeout(
                () => reject(new Error("Gateway left its SignalR socket open.")),
                1000,
            );
            timer.unref();
        }),
    ]);
    assert.equal(socket.destroyed, true);
});

test("MQTT test setup accepts standard protocol notation without changing credentials", () => {
    const config = mqttConfiguration({
        AGENT_MQTT_SERVER: "mqtts://localhost",
        AGENT_MQTT_PORT: "8883",
        AGENT_MQTT_VERSION: "5.0",
        AGENT_MQTT_LOGIN: " review ",
        AGENT_MQTT_PASSWORD: "secret",
    });
    assert.equal(config.version, "MqttV5");
    assert.equal(config.host, "localhost");
    assert.equal(config.tls, true);
    assert.equal(config.username, " review ");
    assert.equal(
        mqttConfiguration({
            AGENT_MQTT_SERVER: "localhost",
            AGENT_MQTT_PORT: "1883",
            AGENT_MQTT_VERSION: "5.0.0",
        }).version,
        "MqttV5",
    );
    assert.equal(
        mqttConfiguration({
            AGENT_MQTT_SERVER: "localhost",
            AGENT_MQTT_PORT: "1883",
            AGENT_MQTT_VERSION: "3.1.1",
        }).version,
        "MqttV311",
    );
    assert.throws(
        () =>
            mqttConfiguration({
                AGENT_MQTT_SERVER: "localhost",
                AGENT_MQTT_PORT: "0",
                AGENT_MQTT_VERSION: "5",
            }),
        /MQTT/,
    );
    assert.match(fixtureTopic("/test"), /^expo-visual-review\/[a-f0-9]{12}$/);
    assert.throws(
        () =>
            reviewMessages({
                topic: fixtureTopic("/test"),
                devices: [{ topic: "real-home/lights", value: "on" }],
            }),
        /namespace/,
    );
    assert.equal(
        Object.keys(reviewMessages({ topic: fixtureTopic("/test"), devices: [] })).length,
        6,
    );
});

test("control probes reject changed widget bindings and topics outside review resources", () => {
    const fixtures = {
        deviceId: "review-device",
        widgets: { Switch: "review-widget" },
        operations: { Switch: "review-operation" },
        topic: fixtureTopic("/test"),
    };
    const widget = {
        id: "review-widget",
        deviceId: "review-device",
        operationId: "review-operation",
        name: "Review Switch",
        type: "Switch",
    };
    const operation = { id: "review-operation", topic: `${fixtures.topic}/switch` };
    validateReviewControl(fixtures, "Switch", widget, operation);
    assert.throws(
        () =>
            validateReviewControl(fixtures, "Switch", widget, {
                ...operation,
                topic: "real-home/lights",
            }),
        /matching/,
    );
    assert.throws(
        () =>
            validateReviewControl(
                fixtures,
                "Switch",
                { ...widget, operationId: "another-operation" },
                operation,
            ),
        /matching/,
    );
    assert.throws(
        () =>
            validateReviewControl(
                fixtures,
                "Switch",
                { ...widget, deviceId: "another-device" },
                operation,
            ),
        /matching/,
    );
});

test("unavailable dynamic fixtures are blocked and default steps never submit destructive actions", () => {
    const routes = discoverRoutes(process.cwd()).routes;
    const scenarios = defaultScenarios(routes, {
        operations: {},
        widgets: {},
        topic: fixtureTopic(process.cwd()),
    });
    const device = scenarios.find((scenario) => scenario.routeId.endsWith("/device/device"));
    assert.match(device.skip, /deviceId/);
    assert.ok(scenarios.every((scenario) => scenario.assertVisible));
    assert.ok(
        scenarios.every(
            (scenario) =>
                !JSON.stringify(scenario.steps ?? []).match(
                    /Delete|Remove|Save changes|Create device|Accept/,
                ),
        ),
    );
    assert.equal(
        scenarios.find((scenario) => scenario.routeId === "/confirmEmail").state,
        "missing-link-recovery",
    );
    const ready = defaultScenarios(routes, {
        homeId: "review-home",
        homes: [
            { id: "review-home", name: "Expo Visual Review" },
            { id: "review-loft", name: "Expo Visual Review Loft" },
        ],
        operations: {},
        widgets: {},
        topic: fixtureTopic(process.cwd()),
    });
    const chooser = ready.find((scenario) => scenario.state === "choose-unlinked-home");
    assert.equal(chooser.params.homeId, "review-loft");
    assert.ok(chooser.setup.some((step) => step.openLink === "/"));
    assert.ok(chooser.cleanup.some((step) => step.openLink === "/"));
    assert.ok(ready.some((scenario) => scenario.state === "already-linked-recovery"));
    assert.equal(validateScenarios(ready, routes), ready);
});

test("a failed recapture keeps original evidence and the finding open", (t) => {
    const store = new ReviewStore(temporary(t), "/tmp/review-repo");
    store.saveRoutes({
        routes: [
            {
                id: "/screen",
                pathname: "/screen",
                source: "app/screen.tsx",
                groups: [],
                parameters: [],
                queryParameters: [],
                layouts: [],
            },
        ],
        layouts: [],
        routeRoot: "app",
        engine: "expo-router",
        warnings: [],
    });
    const capture = store.recordCapture(
        {
            routeId: "/screen",
            state: "default",
            platform: "android",
            device: "test",
            commit: "a",
            dirty: false,
            href: "/screen",
            steps: [],
            runId: "first",
        },
        png,
    );
    const annotation = store.addAnnotation(capture.id, {
        geometry: { type: "rect", x: 0, y: 0, width: 1, height: 1 },
        comment: "Correct this region",
        priority: "medium",
    });
    store.recordAttempt({
        routeId: "/screen",
        state: "default",
        status: "failed",
        reason: "Permission redirect",
        runId: "second",
    });
    assert.equal(store.manifest().captures.length, 1);
    assert.equal(store.annotations().find((item) => item.id === annotation.id).status, "open");
    assert.equal(comparisonFor(store.manifest(), capture.id).after, null);
    store.close();
});
