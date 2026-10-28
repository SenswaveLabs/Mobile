import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

function deferred() {
    let resolve;
    const promise = new Promise((done) => (resolve = done));
    return { promise, resolve };
}

function mountRoute({
    deviceId = ["device-a", "other"],
    providerId = "device-b",
    post = async () => ({ isSuccess: true }),
    back = () => {},
    refresh = async () => {},
    canGoBack = true,
} = {}) {
    const params = { deviceId };
    const home = { loading: false, current: { id: "home-a", isOwner: true } };
    const requests = [];
    const navigation = [];
    let focusEffect;
    let cleanup;
    const route = mountNativeComponent("src/app/(app)/device/operation/add.tsx", {
        modules: {
            "expo-router": {
                useLocalSearchParams: () => params,
                useFocusEffect: (effect) => {
                    focusEffect = effect;
                },
                useRouter: () => ({
                    canGoBack: () => canGoBack,
                    back: () => {
                        navigation.push("back");
                        return back();
                    },
                    replace: (value) => navigation.push(JSON.parse(JSON.stringify(value))),
                }),
            },
            "@/contexts/domain/HomeProvider": { useHomes: () => home },
            "@/contexts/custom/DeviceProvider": {
                useDevice: () => ({ deviceId: providerId, refresh }),
            },
            "@/contexts/HttpClientProvider": {
                useHttpClient: () => ({
                    post: (path, body) => {
                        requests.push([path, JSON.parse(JSON.stringify(body))]);
                        return post(path, body);
                    },
                }),
            },
            "@/components/device/operation/OperationForm": "OperationForm",
            "@/components/common/Button": "Button",
            "@/components/common/Loading": "Loading",
            "@/components/ui/alert": { Alert: "Alert", AlertDescription: "AlertDescription" },
        },
    });
    cleanup = focusEffect?.();
    return {
        ...route,
        params,
        home,
        requests,
        navigation,
        form: () => route.elements().find((node) => node.type === "OperationForm"),
        blur: () => cleanup?.(),
        focus: () => {
            cleanup = focusEffect?.();
        },
    };
}

test("operation creation pins the normalized device identity and denies missing identity or Display", async () => {
    const form = mountRoute();
    assert.equal(form.form().props.deviceId, "device-a");
    await form.form().props.onSubmit({ deviceId: "wrong", name: "Light", topic: "home/light" });
    assert.deepEqual(form.requests, [
        ["v1/devices/operations", { deviceId: "device-a", name: "Light", topic: "home/light" }],
    ]);
    const missing = mountRoute({ deviceId: "", providerId: "" });
    assert.equal(missing.form(), undefined);
    assert.match(missing.text(), /device/i);
    const display = mountRoute();
    display.home.current = { id: "home-a", isOwner: false, canManage: false };
    display.render();
    assert.equal(display.form(), undefined);
});

test("stale retained submits cannot create after a route, home, role or focus change", async () => {
    for (const change of [
        (route) => {
            route.params.deviceId = "device-c";
            route.render();
        },
        (route) => {
            route.home.current = { id: "home-b", isOwner: true };
            route.render();
        },
        (route) => {
            route.home.current = { id: "home-a", isOwner: false, canManage: false };
            route.render();
        },
        (route) => route.blur(),
    ]) {
        const route = mountRoute();
        const submit = route.form().props.onSubmit;
        change(route);
        await submit({ name: "Light" });
        assert.equal(route.requests.length, 0);
    }
});

test("pending and accepted creates share one lock, with navigation-only recovery", async () => {
    const pending = deferred();
    const route = mountRoute({
        post: () => pending.promise,
        back: () => {
            throw new Error("navigation failed");
        },
    });
    const submit = route.form().props.onSubmit;
    const first = submit({ name: "Light" });
    await submit({ name: "Light" });
    assert.equal(route.requests.length, 1);
    pending.resolve({ isSuccess: true });
    await first;
    route.render();
    await submit({ name: "Light" });
    assert.equal(route.requests.length, 1);
    const recovery = route.form().props.returnAction;
    assert.ok(recovery, "Accepted create must offer navigation-only recovery");
    recovery.props.onPress();
    assert.equal(route.requests.length, 1);
});

test("a rejected create retains the form and exposes inline feedback for retry", async () => {
    const route = mountRoute({ post: async () => ({ isSuccess: false }) });
    await route.form().props.onSubmit({ name: "Light" });
    route.render();
    assert.ok(route.form().props.feedback);
    assert.equal(route.requests.length, 1);
    await route.form().props.onSubmit({ name: "Light" });
    assert.equal(route.requests.length, 2);
});

test("blur suppresses failure and an accepted create returns only once after refocus", async () => {
    const failed = deferred();
    const failure = mountRoute({ post: () => failed.promise });
    const first = failure.form().props.onSubmit({ name: "Light" });
    failure.blur();
    failed.resolve({ isSuccess: false });
    await first;
    failure.render();
    assert.equal(failure.form().props.feedback, undefined);

    const pending = deferred();
    const success = mountRoute({ post: () => pending.promise });
    const submit = success.form().props.onSubmit;
    const create = submit({ name: "Light" });
    success.blur();
    pending.resolve({ isSuccess: true });
    await create;
    assert.deepEqual(success.navigation, []);
    success.focus();
    success.render();
    success.focus();
    await submit({ name: "Light" });
    assert.deepEqual(success.navigation, ["back"]);
    assert.equal(success.requests.length, 1);
});

test("refresh failure offers return-only recovery and no-history return keeps device identity", async () => {
    const failed = mountRoute({
        providerId: "device-a",
        refresh: async () => {
            throw new Error("offline");
        },
    });
    await failed.form().props.onSubmit({ name: "Light" });
    failed.render();
    assert.ok(failed.form().props.returnAction);
    failed.form().props.returnAction.props.onPress();
    assert.deepEqual(failed.navigation, ["back"]);
    await failed.form().props.onSubmit({ name: "Light" });
    assert.equal(failed.requests.length, 1);

    const root = mountRoute({ canGoBack: false });
    await root.form().props.onSubmit({ name: "Light" });
    assert.deepEqual(root.navigation, [
        { pathname: "/device/widget/list", params: { deviceId: "device-a" } },
    ]);
});
