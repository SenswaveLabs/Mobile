import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

function mountCreate({ result = { isSuccess: true }, failNavigation = false } = {}) {
    const posts = [];
    const navigation = [];
    let canManage = true;
    let onFocus;
    const home = {
        loading: false,
        get current() {
            return { isOwner: canManage };
        },
    };
    const route = mountNativeComponent("src/components/device/widgets/AddWidgetForm.tsx", {
        props: { operationId: "operation-a", deviceId: "device-a" },
        modules: {
            "expo-router": {
                useFocusEffect: (callback) => {
                    onFocus = callback;
                },
                useRouter: () => ({
                    canGoBack: () => true,
                    back: () => {
                        if (failNavigation) throw new Error("navigation");
                        navigation.push("back");
                    },
                }),
            },
            "./WidgetForm": "WidgetForm",
            "@/contexts/domain/HomeProvider": { useHomes: () => home },
            "@/contexts/custom/DeviceProvider": { useDevice: () => ({ deviceId: "device-b" }) },
            "@/contexts/custom/WidgetDetailsProvider": {
                useWidgetDetails: () => ({
                    loading: false,
                    loadError: "",
                    operation: {},
                    widget: {},
                    initializeForAdd: async () => {},
                }),
            },
            "@/contexts/HttpClientProvider": {
                useHttpClient: () => ({
                    post: async (...args) => {
                        posts.push(args);
                        return await result;
                    },
                }),
            },
        },
    });
    route.flushEffects();
    const blur = onFocus();
    const form = () => route.elements().find((node) => node.type === "WidgetForm");
    return {
        route,
        form,
        posts,
        navigation,
        blur,
        refocus: () => onFocus(),
        revoke: () => {
            canManage = false;
            route.render();
        },
    };
}
const dto = {
    operationId: "operation-a",
    name: "Brightness",
    type: "Slider",
    configuration: { step: 1 },
};

test("widget creation locks duplicate requests and never repeats an accepted write", async () => {
    let resolve;
    const result = new Promise((done) => {
        resolve = done;
    });
    const page = mountCreate({ result });
    const submit = page.form().props.onSubmit;
    const first = submit(dto);
    await submit(dto);
    assert.equal(page.posts.length, 1);
    resolve({ isSuccess: true });
    await first;
    await submit(dto);
    assert.equal(page.posts.length, 1);
    assert.deepEqual(page.navigation, ["back"]);
});

test("widget creation failure keeps the form and exposes inline retry", async () => {
    const page = mountCreate({ result: { isSuccess: false } });
    await page.form().props.onSubmit(dto);
    page.route.render();
    assert.match(page.route.text(), /Couldn't create/);
    assert.equal(page.form().props.disabled, false);
    assert.deepEqual(page.navigation, []);
});

test("accepted widget recovers return without another POST", async () => {
    const page = mountCreate({ failNavigation: true });
    await page.form().props.onSubmit(dto);
    page.route.render();
    assert.match(page.route.text(), /Widget created/);
    assert.equal(page.form().props.disabled, true);
    await page.form().props.onSubmit(dto);
    assert.equal(page.posts.length, 1);
});

test("retained widget submit checks permission, identity and focus", async () => {
    const page = mountCreate();
    const submit = page.form().props.onSubmit;
    await submit({ ...dto, operationId: "operation-b" });
    assert.equal(page.posts.length, 0);
    page.revoke();
    await submit(dto);
    assert.equal(page.posts.length, 0);
    const blurred = mountCreate();
    blurred.blur();
    await blurred.form().props.onSubmit(dto);
    assert.equal(blurred.posts.length, 0);
});

test("accepted widget waits for focus before returning", async () => {
    let resolve;
    const result = new Promise((done) => {
        resolve = done;
    });
    const page = mountCreate({ result });
    const pending = page.form().props.onSubmit(dto);
    page.blur();
    resolve({ isSuccess: true });
    await pending;
    assert.deepEqual(page.navigation, []);
    page.refocus();
    await Promise.resolve();
    assert.deepEqual(page.navigation, ["back"]);
});
