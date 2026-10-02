import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const currentHome = {
    id: "current",
    name: "My home",
    icon: "home-outline",
    isOwner: true,
    dataSource: { id: "source", name: "Broker", state: "Connected" },
    location: { latitude: 52, longitude: 21 },
    rooms: [],
};
const otherHome = { ...currentHome, id: "other", name: "Shared home", isOwner: false };
const flush = () => new Promise((resolve) => setImmediate(resolve));

async function mountList({ setCurrent = async () => true, get } = {}) {
    let focus;
    let backs = 0;
    const paths = [];
    const success = () => ({
        isSuccess: true,
        statusCode: 200,
        response: { json: async () => ({ items: [currentHome, otherHome] }) },
    });
    const httpClient = {
        get: async (path) => {
            paths.push(path);
            return get ? get(path) : success();
        },
    };
    const form = mountNativeComponent("src/components/home/lists/HomeList.tsx", {
        modules: {
            "@/contexts/domain/HomeProvider": {
                useHomes: () => ({ current: currentHome, setCurrent }),
            },
            "@/contexts/HttpClientProvider": {
                useHttpClient: () => httpClient,
            },
            "expo-router": {
                useFocusEffect: (callback) => {
                    focus = callback;
                },
                useRouter: () => ({
                    back: () => {
                        backs++;
                    },
                    canGoBack: () => true,
                    replace: () => {
                        backs++;
                    },
                }),
            },
        },
    });
    form.flushEffects();
    const blur = focus();
    await flush();
    form.render();
    const list = () => form.elements().find((node) => node.type === "FlatList");
    const rowTree = () => {
        const element = list().props.renderItem({ item: otherHome });
        return element.type(element.props);
    };
    const row = () => form.elements(rowTree()).find((node) => node.type === "Pressable");
    return { ...form, list, row, rowTree, blur, paths, backs: () => backs };
}

test("home picker loads once on focus and keeps the current home out of the alternatives", async () => {
    const form = await mountList();
    assert.deepEqual(form.paths, ["v1/homes"]);
    assert.deepEqual(
        Array.from(form.list().props.data, (home) => home.id),
        ["other"],
    );
});

test("home picker waits for a successful switch and prevents repeated selection", async () => {
    let finish;
    let switches = 0;
    const form = await mountList({
        setCurrent: (id) => {
            assert.equal(id, "other");
            switches++;
            return new Promise((resolve) => {
                finish = resolve;
            });
        },
    });
    const press = form.row().props.onPress;
    press();
    press();
    assert.equal(form.backs(), 0, "Dashboard must wait for the new home");
    assert.equal(switches, 1, "One selection must dispatch only one switch");
    form.render();
    assert.equal(form.row().props.disabled, true);
    finish(true);
    await flush();
    assert.equal(form.backs(), 1);
});

test("failed home switches stay on screen and restore selection for retry", async () => {
    for (const reject of [false, true]) {
        let switches = 0;
        const form = await mountList({
            setCurrent: async () => {
                switches++;
                if (switches > 1) return true;
                if (reject) throw new Error("Network unavailable");
                return false;
            },
        });
        form.row().props.onPress();
        await flush();
        form.render();
        assert.equal(form.backs(), 0);
        assert.match(JSON.stringify(form.rowTree()), /switch.*try again/i);
        assert.equal(form.row().props.disabled, false);
        form.row().props.onPress();
        await flush();
        assert.equal(switches, 2);
        assert.equal(form.backs(), 1);
    }
});

test("home load failure remains visible and its retry reloads the alternatives", async () => {
    let fail = true;
    const form = await mountList({
        get: async () =>
            fail
                ? { isSuccess: false, statusCode: 503, response: null }
                : {
                      isSuccess: true,
                      statusCode: 200,
                      response: { json: async () => ({ items: [currentHome, otherHome] }) },
                  },
    });
    assert.match(form.text(), /load homes/i);
    const retry = form
        .elements(form.list().props.ListHeaderComponent)
        .find((node) => node.type === "Button");
    assert.ok(retry, "A failed list needs a visible retry action");
    fail = false;
    retry.props.onPress();
    await flush();
    form.render();
    assert.deepEqual(
        Array.from(form.list().props.data, (home) => home.id),
        ["other"],
    );
});

test("an invalid homes response shows recovery instead of crashing the picker", async () => {
    let form;
    await assert.doesNotReject(async () => {
        form = await mountList({
            get: async () => ({
                isSuccess: true,
                statusCode: 200,
                response: { json: async () => ({}) },
            }),
        });
    });
    assert.match(form.text(), /load homes/i);
});

test("a switch failure stays beside the attempted home row", async () => {
    const form = await mountList({ setCurrent: async () => false });
    form.row().props.onPress();
    await flush();
    form.render();
    const alert = form
        .elements(form.rowTree())
        .find((node) => node.type === "Text" && node.props.accessibilityRole === "alert");
    assert.ok(alert, "The attempted row needs a visible error, not only an accessibility hint");
    assert.match(alert.props.children.join(""), /switch.*try again/i);
});
