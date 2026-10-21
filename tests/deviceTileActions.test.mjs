import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const initial = { Switch: false, Slider: 0, Options: "Auto" };
const changed = { Switch: true, Slider: 25, Options: "Quiet" };
const tile = (type) => ({
    type,
    value: initial[type],
    configuration: {
        range: { min: -10, max: 100 },
        step: 1,
        unit: "%",
        options: ["Auto", "Quiet"],
    },
});

const mountActions = () =>
    mountNativeComponent("src/contexts/OptimisticActionProvider.tsx", {
        exportName: "OptimisticActionProvider",
        props: { children: "Router" },
    });

test("inactive controls block commands but keep live updates for recovery", async () => {
    const action = mountAction("Switch", { inactive: true });
    action.value().send(true);
    assert.equal(action.requests.length, 0);
    assert.equal(action.callbacks.length, 1);
    action.readSucceeds();
    await action.callbacks[0]();
    assert.equal(action.updates.length, 1);
    action.props.inactive = false;
    action.render();
    const pending = action.value().send(true);
    assert.equal(action.requests.length, 1);
    action.success();
    await pending;
});

test("a retained control callback cannot send after the device becomes inactive", () => {
    const action = mountAction("Switch");
    const retained = action.value().send;
    action.props.inactive = true;
    action.render();
    retained(true);
    assert.equal(action.requests.length, 0);
});

function mountAction(type, overrides = {}) {
    let resolvePost;
    let failRead = true;
    let now = 0;
    let id = 0;
    const tasks = new Map();
    const requests = [];
    const callbacks = [];
    const updates = [];
    const actions = mountActions();
    const props = { deviceId: "device-1", tile: tile(type), disabled: false, ...overrides };
    const response = () => ({ id: props.deviceId, tile: props.tile });
    const component = mountNativeComponent("src/hooks/useDeviceTileAction.ts", {
        exportName: "useDeviceTileAction",
        props,
        timers: {
            setTimeout: (callback, delay) => {
                tasks.set(++id, { callback, at: now + delay });
                return id;
            },
            clearTimeout: (timer) => tasks.delete(timer),
        },
        modules: {
            "@/contexts/OptimisticActionProvider": {
                useOptimisticActions: () => actions.output().props.value,
            },
            "@/contexts/domain/HomeProvider": { useHomes: () => ({ current: { id: "home-1" } }) },
            "@/contexts/custom/DeviceListProvider": {
                useDeviceList: () => ({ updateDeviceOperation: (value) => updates.push(value) }),
            },
            "@/contexts/domain/LiveUpdateProvider": {
                useLiveUpdate: () => ({
                    addDeviceTileCallback: (_id, callback) => callbacks.push(callback),
                }),
            },
            "@/contexts/HttpClientProvider": {
                useHttpClient: () => ({
                    post: (...args) => {
                        requests.push(args);
                        return new Promise((resolve) => {
                            resolvePost = resolve;
                        });
                    },
                    get: async () =>
                        failRead
                            ? { isSuccess: false }
                            : { isSuccess: true, response: { json: async () => response() } },
                }),
            },
        },
    });
    const render = () => {
        actions.render();
        component.render();
        component.flushEffects();
        component.render();
    };
    component.flushEffects();
    component.render();
    return {
        component,
        props,
        requests,
        callbacks,
        updates,
        tasks,
        render,
        value: component.output,
        advance(ms) {
            now += ms;
            for (const [timer, task] of tasks)
                if (task.at <= now) {
                    tasks.delete(timer);
                    task.callback();
                }
            render();
        },
        resolve(result) {
            resolvePost(result);
        },
        readSucceeds() {
            failRead = false;
        },
        success() {
            resolvePost({ isSuccess: true, response: { json: async () => response() } });
        },
    };
}

for (const type of ["Switch", "Slider", "Options"]) {
    test(
        type +
            " applies optimistic value immediately, delays feedback and rolls back with recovery info",
        async () => {
            const action = mountAction(type);
            const first = action.value().send(changed[type]);
            action.value().send(changed[type]);
            action.render();
            assert.equal(action.value().value, changed[type]);
            assert.equal(action.value().pending, true);
            assert.equal(action.requests.length, 1);
            assert.equal(action.requests[0][0], "v1/devices/device-1/tile/action");
            assert.equal(action.requests[0][1].value, changed[type]);
            action.advance(299);
            assert.equal(action.value().feedback, "none");
            action.advance(1);
            assert.equal(action.value().feedback, "spinner");
            action.advance(3700);
            assert.equal(action.value().feedback, "spinner");
            action.resolve({ isSuccess: false });
            await first;
            action.render();
            assert.equal(action.value().pending, false);
            assert.equal(action.value().value, initial[type]);
            assert.equal(action.value().feedback, "none");
            assert.match(action.value().error, /Previous value restored.*Try again/);
            assert.equal(action.tasks.size, 0);
            await action.callbacks[0]();
            action.render();
            assert.match(action.value().error, /Pull to refresh/);
            action.readSucceeds();
            await action.callbacks[0]();
            action.render();
            assert.equal(
                action.value().error,
                "",
                "A successful same-value read clears recovery feedback",
            );

            const retry = action.value().send(changed[type]);
            action.render();
            action.advance(100);
            action.success();
            await retry;
            action.render();
            assert.equal(
                action.value().value,
                changed[type],
                "Accepted commands retain their optimistic value even if the response contains the earlier reading",
            );
            assert.equal(action.updates.at(-1).tile.value, changed[type]);
            action.advance(5000);
            assert.equal(
                action.value().feedback,
                "none",
                "Quick commands never flash a delayed indicator",
            );
            assert.equal(action.tasks.size, 0);
        },
    );

    test(type + " preview cannot send or subscribe", () => {
        const action = mountAction(type, { disabled: true, deviceId: "" });
        action.value().send(changed[type]);
        assert.equal(action.requests.length, 0);
        assert.equal(action.callbacks.length, 0);
    });

    test(
        type + " control keeps its layout slots while pending and uses an Alert after rollback",
        () => {
            const action = {
                value: initial[type],
                pending: false,
                feedback: "none",
                error: "",
                send() {},
            };
            const props = {
                name: "Living room device",
                tile: tile(type),
                action,
                disablePress: false,
            };
            const component = mountNativeComponent(
                "src/components/device/tile/" +
                    (type === "Switch" ? "Switch" : "Control") +
                    "DeviceTile.tsx",
                {
                    props,
                    modules: {
                        "@/components/common/Switch": { Switch: "Switch" },
                        "@/components/common/Slider": "Slider",
                        "@/components/common/BottomSheetSelect": "BottomSheetSelect",
                    },
                },
            );
            const flow = () =>
                JSON.stringify(
                    component
                        .elements()
                        .filter((node) => ["View", "Text"].includes(node.type))
                        .map((node) => [node.type, node.props.style]),
                );
            const baseline = flow();
            for (const feedback of ["none", "spinner"]) {
                action.pending = true;
                action.feedback = feedback;
                component.render();
                assert.equal(flow(), baseline);
                assert.equal(
                    component.elements().some((node) => node.type === "ActivityIndicator"),
                    type !== "Options" && feedback === "spinner",
                );
                if (type === "Options")
                    assert.equal(
                        component.elements().find((node) => node.type === "BottomSheetSelect").props
                            .busy,
                        feedback === "spinner",
                    );
            }
            action.pending = false;
            action.error = "Previous value restored. Try again.";
            component.render();
            assert.equal(
                component.elements().find((node) => node.type === "Alert").props.variant,
                "destructive",
            );
            assert.match(component.text(), /Previous value restored/);
        },
    );
}

test("a completed command after unmount cannot update another screen's cache", async () => {
    const action = mountAction("Switch");
    const pending = action.value().send(true);
    action.render();
    action.component.unmount();
    action.success();
    await pending;
    assert.equal(action.updates.length, 0);
});

test("optimistic actions finish independently while another device is still pending", async () => {
    const actions = mountActions();
    let resolveFirst;
    let resolveSecond;
    const first = actions.output().props.value.run(
        "home:a",
        false,
        () =>
            new Promise((resolve) => {
                resolveFirst = resolve;
            }),
    );
    actions.render();
    const second = actions.output().props.value.run(
        "home:b",
        0,
        () =>
            new Promise((resolve) => {
                resolveSecond = resolve;
            }),
    );
    actions.render();
    assert.equal(actions.output().props.value.values["home:a"], false);
    assert.equal(actions.output().props.value.values["home:b"], 0);
    resolveFirst();
    await first;
    actions.render();
    assert.equal(actions.output().props.value.values["home:a"], undefined);
    assert.equal(actions.output().props.value.values["home:b"], 0);
    resolveSecond();
    await second;
    actions.render();
    assert.equal(Object.keys(actions.output().props.value.values).length, 0);
});

test("a read started before a command cannot overwrite optimistic state or its cache", async () => {
    const action = mountAction("Switch");
    action.readSucceeds();
    const read = action.callbacks[0]();
    const pending = action.value().send(true);
    await read;
    action.render();
    assert.equal(action.value().value, true);
    assert.equal(action.updates.length, 0);
    action.success();
    await pending;
    action.render();
    assert.equal(action.updates.length, 1);
    assert.equal(action.updates[0].tile.value, true);
});
