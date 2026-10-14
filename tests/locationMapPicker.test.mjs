import assert from "node:assert/strict";
import { test } from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

function mountPicker({ initialLocation = {}, getCenter = async () => [15, 0] } = {}) {
    const selected = [];
    const timeouts = new Map();
    let timerId = 0;
    let nativeLog;
    let cancelled = 0;
    const picker = mountNativeComponent("src/components/home/LocationMapPicker.tsx", {
        timers: {
            setTimeout: (callback) => {
                timeouts.set(++timerId, callback);
                return timerId;
            },
            clearTimeout: (id) => timeouts.delete(id),
        },
        props: {
            initialLocation,
            onConfirm: (...coordinates) => selected.push(coordinates),
            onCancel: () => cancelled++,
        },
        modules: {
            "@maplibre/maplibre-react-native": {
                Map: "Map",
                Camera: "Camera",
                TransformRequestManager: { addHeader: () => {} },
                LogManager: {
                    onLog: (handler) => {
                        nativeLog = handler;
                    },
                },
            },
            "@/components/common/SenswaveModal": "SenswaveModal",
            "@/components/common/Button": "Button",
            "lucide-react-native": { MapPin: "MapPin", CircleAlert: "CircleAlert" },
            "react-native": {
                View: "View",
                ScrollView: "ScrollView",
                Pressable: "Pressable",
                StyleSheet: { create: (value) => value },
                Linking: { openURL: async () => {} },
                useWindowDimensions: () => ({ height: 844 }),
            },
        },
    });
    const map = () => picker.elements().find((node) => node.type === "Map");
    const confirm = () =>
        picker.elements().find((node) => node.props?.name === "Use this location");
    const ready = () => {
        map().props.ref.current = { getCenter };
        map().props.onDidFinishRenderingMapFully();
        picker.render();
    };
    return {
        ...picker,
        map,
        confirm,
        ready,
        selected,
        cancelled: () => cancelled,
        expireLoading: () => {
            picker.flushEffects();
            [...timeouts.values()].forEach((callback) => callback());
            picker.render();
        },
        failTiles: () => {
            picker.flushEffects();
            nativeLog?.({
                level: "error",
                tag: "Mbgl",
                message: "Failed to load tile for source osm",
            });
            picker.render();
        },
    };
}

test("map waits for loading and preserves a zero initial latitude", async () => {
    const picker = mountPicker({ initialLocation: { latitude: 0, longitude: 15 } });
    assert.equal(picker.confirm().props.disabled, true);
    const camera = picker.elements().find((node) => node.type === "Camera");
    assert.deepEqual(JSON.parse(JSON.stringify(camera.props.initialViewState.center)), [15, 0]);
    picker.ready();
    await picker.confirm().props.onPress();
    assert.deepEqual(picker.selected, [[0, 15]]);
});

test("map submits the current center only once and converts longitude/latitude order", async () => {
    let finish;
    let calls = 0;
    const picker = mountPicker({
        getCenter: () => {
            calls++;
            return new Promise((resolve) => (finish = resolve));
        },
    });
    picker.ready();
    const press = picker.confirm().props.onPress;
    const first = press();
    const second = press();
    assert.equal(calls, 1);
    finish([-1.25, 0]);
    await Promise.all([first, second]);
    assert.deepEqual(picker.selected, [[0, -1.25]]);
});

test("cancelling the map ignores an outstanding confirmation", async () => {
    let finish;
    const picker = mountPicker({
        getCenter: () => new Promise((resolve) => (finish = resolve)),
    });
    picker.ready();
    const work = picker.confirm().props.onPress();
    picker
        .elements()
        .find((node) => node.type === "SenswaveModal")
        .props.onClose();
    finish([15, 0]);
    await work;
    assert.equal(picker.cancelled(), 1);
    assert.deepEqual(picker.selected, []);
});

test("map loading failure offers retry before enabling confirmation", () => {
    const picker = mountPicker();
    picker.map().props.onDidFailLoadingMap();
    picker.render();
    assert.equal(picker.confirm().props.disabled, true);
    assert.ok(picker.elements().some((node) => node.type === "Alert"));
    picker
        .elements()
        .find((node) => node.props?.name === "Retry map")
        .props.onPress();
    picker.render();
    assert.ok(!picker.elements().some((node) => node.type === "Alert"));
    assert.equal(picker.confirm().props.disabled, true);
    picker.ready();
    assert.equal(picker.confirm().props.disabled, false);
});

test("invalid native coordinates leave the draft untouched and release confirmation", async () => {
    const picker = mountPicker({ getCenter: async () => [Number.NaN, 100] });
    picker.ready();
    await picker.confirm().props.onPress();
    picker.render();
    assert.deepEqual(picker.selected, []);
    assert.ok(picker.elements().some((node) => node.type === "Alert"));
    assert.equal(picker.confirm().props.disabled, false);
    assert.equal(picker.confirm().props.loading, false);
});

test("a map with no completion callback exposes bounded retry", () => {
    const picker = mountPicker();
    picker.expireLoading();
    assert.equal(picker.confirm().props.disabled, true);
    assert.ok(picker.elements().some((node) => node.type === "Alert"));
    assert.ok(picker.elements().some((node) => node.props?.name === "Retry map"));
});

test("tile failures prevent blank-map confirmation even after a full-render event", () => {
    const picker = mountPicker();
    picker.failTiles();
    picker.ready();
    assert.equal(picker.confirm().props.disabled, true);
    assert.ok(picker.elements().some((node) => node.type === "Alert"));
    picker
        .elements()
        .find((node) => node.props?.name === "Retry map")
        .props.onPress();
    picker.render();
    picker.ready();
    assert.equal(picker.confirm().props.disabled, false);
});

test("a tile error during center lookup preserves the draft", async () => {
    let finish;
    const picker = mountPicker({
        getCenter: () =>
            new Promise((resolve) => {
                finish = resolve;
            }),
    });
    picker.ready();
    const work = picker.confirm().props.onPress();
    picker.failTiles();
    finish([15, 0]);
    await work;
    assert.deepEqual(picker.selected, []);
});
