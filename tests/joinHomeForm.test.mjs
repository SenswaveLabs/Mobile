import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

function mountJoin({ put, current, initialize = async () => true, canGoBack = true } = {}) {
    const requests = [];
    const navigation = [];
    const messages = [];
    let focus;
    let initializations = 0;
    const form = mountNativeComponent("src/components/homeSharing/JoinHomeForm.tsx", {
        modules: {
            "react-native-keyboard-controller": {
                KeyboardAwareScrollView: "KeyboardAwareScrollView",
                KeyboardAvoidingView: "KeyboardAvoidingView",
                KeyboardStickyView: "KeyboardStickyView",
            },
            "@/contexts/HttpClientProvider": {
                useHttpClient: () => ({
                    put: async (path, body) => {
                        requests.push({ path, body: { ...body } });
                        return put ? put() : { isSuccess: true, statusCode: 204, response: null };
                    },
                }),
            },
            "@/contexts/domain/HomeProvider": {
                useHomes: () => ({
                    current,
                    initializeCurrentHome: async () => {
                        initializations++;
                        return initialize();
                    },
                }),
            },
            "@/contexts/ToastProvider": {
                useToast: () => ({
                    success: (message) => messages.push(message),
                    info: (message) => messages.push(message),
                    error: (message) => messages.push(message),
                    httpError: () => {},
                }),
            },
            "expo-router": {
                useFocusEffect: (callback) => {
                    focus = callback;
                },
                useRouter: () => ({
                    canGoBack: () => canGoBack,
                    back: () => navigation.push("back"),
                    replace: (path) => navigation.push(path),
                }),
            },
        },
    });
    form.flushEffects();
    const blur = focus?.();
    const input = () =>
        form
            .elements()
            .find((node) => node.type === "Input" || node.type?.name === "HomeCodeInput");
    const button = () => form.elements().find((node) => node.type === "Button");
    const enter = (value) => {
        assert.ok(input(), "Invite codes need one labeled, pasteable native input");
        input().props.setValue(value);
        form.render();
    };
    return {
        ...form,
        input,
        button,
        enter,
        requests,
        navigation,
        messages,
        blur,
        initializations: () => initializations,
    };
}

test("invite entry keeps eight OTP segments backed by one editable native input", () => {
    const form = mountJoin();
    assert.equal(form.input().type?.name, "HomeCodeInput", "Preserve the segmented OTP interface");
    const changes = [];
    const field = mountNativeComponent("src/components/homeSharing/HomeCodeInput.tsx", {
        props: {
            ...form.input().props,
            value: "A3B7C9D2",
            setValue: (value) => changes.push(value),
        },
    });
    const inputs = field.elements().filter((node) => node.type === "TextInput");
    assert.equal(inputs.length, 1, "Paste, selection and Backspace use one native editing context");
    assert.equal(inputs[0].props.accessibilityLabel, "Invite code");
    assert.equal(inputs[0].props.value, "A3B7C9D2");
    const characters = field
        .elements()
        .filter((node) => node.type === "Text" && node.props.children.join("").length === 1);
    assert.equal(characters.map((node) => node.props.children.join("")).join(""), "A3B7C9D2");
    inputs[0].props.onChangeText("  a3b7c9d2  ");
    inputs[0].props.onChangeText("A3B7C9D");
    assert.deepEqual(changes, ["  a3b7c9d2  ", "A3B7C9D"]);
});

test("OTP taps select the visible wrapped cell without overriding native long press or drag", () => {
    const selections = [];
    const ref = { current: null };
    const props = { value: "A3B7C9D2", setValue: () => {}, error: "", inputRef: ref };
    const field = mountNativeComponent("src/components/homeSharing/HomeCodeInput.tsx", {
        props,
    });
    const input = field.elements().find((node) => node.type === "TextInput");
    assert.equal(typeof input.props.onTouchEnd, "function", "Map native taps to visible slots");
    const host = { setSelection: (start, end) => selections.push([start, end]) };
    if (typeof input.props.ref === "function") input.props.ref(host);
    else input.props.ref.current = host;
    assert.equal(ref.current, host, "Keep the caller's focus ref attached to the same input");

    const groups = field
        .elements()
        .filter(
            (node) =>
                node.type === "View" &&
                Array.isArray(node.props.children[0]) &&
                node.props.children[0].length === 4,
        );
    groups.forEach((group, row) => {
        group.props.onLayout({
            nativeEvent: { layout: { x: 0, y: row * 68, width: 200, height: 56 } },
        });
        group.props.children[0].forEach((slot, column) => {
            slot.props.onLayout({
                nativeEvent: { layout: { x: column * 50, y: 0, width: 44, height: 56 } },
            });
        });
    });
    const touch = (timestamp, locationX = 122, locationY = 96) => ({
        nativeEvent: { timestamp, locationX, locationY },
    });
    input.props.onTouchStart(touch(100));
    input.props.onTouchEnd(touch(200));
    assert.deepEqual(
        selections,
        [[6, 7]],
        "Second row's third cell selects character 6 for replacement, not single-line native glyph geometry",
    );

    input.props.onTouchStart(touch(300));
    input.props.onTouchEnd(touch(1100));
    input.props.onTouchStart(touch(1200));
    input.props.onTouchMove(touch(1250, 150));
    input.props.onTouchEnd(touch(1300));
    input.props.onTouchStart(touch(1400));
    input.props.onTouchCancel();
    input.props.onTouchEnd(touch(1450));
    assert.deepEqual(
        selections,
        [[6, 7]],
        "Leave native long press, drag and cancelled touches alone",
    );

    props.value = "A3B";
    field.render();
    const shorterInput = field.elements().find((node) => node.type === "TextInput");
    shorterInput.props.ref(host);
    shorterInput.props.onTouchStart(touch(1500));
    shorterInput.props.onTouchEnd(touch(1550));
    assert.deepEqual(
        selections.at(-1),
        [3, 3],
        "Empty cells put the cursor at the end of the code",
    );
});

test("join validates the whole code locally and pastes a normalized invitation", async () => {
    const form = mountJoin({ current: { id: "existing" } });
    for (const value of ["", "ABC", "A3B7C9D2E", "A3B7C9D!"]) {
        form.enter(value);
        await form.button().props.onPress();
        form.render();
        assert.match(form.input().props.error, /8.*letters.*numbers/i);
        assert.equal(form.requests.length, 0);
    }
    assert.ok(form.focused.includes("Invite code"));
    form.enter("  a3b7c9d2 \n");
    assert.equal(form.input().props.error, "");
    await form.button().props.onPress();
    assert.deepEqual(form.requests, [
        { path: "/v1/homes/sharings", body: { password: "A3B7C9D2" } },
    ]);
    assert.equal(form.initializations(), 0, "An existing current home stays selected");
    assert.deepEqual(form.navigation, ["back"]);
});

test("button and keyboard submissions share a synchronous lock until the first home loads", async () => {
    let finishJoin;
    let finishHome;
    const form = mountJoin({
        put: () => new Promise((resolve) => (finishJoin = resolve)),
        initialize: () => new Promise((resolve) => (finishHome = resolve)),
    });
    form.enter("A3B7C9D2");
    const submit = form.button().props.onPress;
    const pending = submit();
    await submit();
    assert.equal(form.requests.length, 1);
    form.render();
    assert.equal(form.input().props.editable, false);
    assert.equal(form.button().props.loading, true);
    form.input().props.onSubmitEditing();
    assert.equal(form.requests.length, 1);
    finishJoin({ isSuccess: true, statusCode: 204, response: null });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(form.initializations(), 1);
    assert.deepEqual(form.navigation, []);
    finishHome(true);
    await pending;
    assert.deepEqual(form.navigation, ["back"]);
});

test("invalid or expired invitations and connection failures stay visible and allow retry", async () => {
    for (const failure of [
        { isSuccess: false, statusCode: 400, response: {} },
        { isSuccess: false, statusCode: 404, response: {} },
        { isSuccess: false, statusCode: 408, response: null },
        new Error("Connection interrupted"),
    ]) {
        let attempt = 0;
        const form = mountJoin({
            current: { id: "existing" },
            put: async () => {
                if (++attempt > 1) return { isSuccess: true, statusCode: 204, response: null };
                if (failure instanceof Error) throw failure;
                return failure;
            },
        });
        form.enter("A3B7C9D2");
        await form.button().props.onPress();
        form.render();
        assert.match(form.input().props.error, /new invitation|try again/i);
        assert.equal(form.input().props.value, "A3B7C9D2");
        assert.equal(form.input().props.editable, true);
        assert.equal(form.button().props.loading, false);
        assert.deepEqual(form.navigation, []);
        await form.button().props.onPress();
        assert.equal(form.requests.length, 2);
        assert.deepEqual(form.navigation, ["back"]);
    }
});

test("accepted invitations recover through the home picker if the first home cannot load", async () => {
    for (const throws of [false, true]) {
        const form = mountJoin({
            initialize: async () => {
                if (throws) throw new Error("Couldn't load the new home");
                return false;
            },
        });
        form.enter("A3B7C9D2");
        await form.button().props.onPress();
        assert.equal(form.requests.length, 1, "An accepted invitation must not be resent");
        assert.deepEqual(form.navigation, ["/home/list"]);
        assert.ok(form.messages.some((message) => /joined.*select/i.test(message)));
    }
});

test("successful joining has a dashboard fallback without navigation history", async () => {
    const form = mountJoin({ current: { id: "existing" }, canGoBack: false });
    form.enter("A3B7C9D2");
    await form.button().props.onPress();
    assert.deepEqual(form.navigation, ["/"]);
});

test("a response after leaving join does not navigate or announce feedback", async () => {
    let finish;
    const form = mountJoin({ put: () => new Promise((resolve) => (finish = resolve)) });
    form.enter("A3B7C9D2");
    const pending = form.button().props.onPress();
    assert.equal(typeof form.blur, "function");
    form.blur();
    finish({ isSuccess: true, statusCode: 204, response: null });
    await pending;
    assert.deepEqual(form.navigation, []);
    assert.deepEqual(form.messages, []);
    assert.equal(form.initializations(), 0);
});

test("the recovery picker stays available without a selected current home", () => {
    const route = mountNativeComponent("src/app/(app)/home/list.tsx", {
        modules: {
            "@/contexts/domain/HomeProvider": {
                useHomes: () => ({ current: undefined, loading: false }),
            },
            "@/contexts/HttpClientProvider": {
                useHttpClient: () => ({}),
            },
            "expo-router": {
                Redirect: "Redirect",
                useRouter: () => ({ push: () => {} }),
            },
        },
    });
    assert.ok(
        route.elements().some((node) => node.type?.name === "HomeList"),
        "The joined home must remain selectable when current-home initialization fails",
    );
    assert.equal(
        route.elements().some((node) => node.type === "Redirect"),
        false,
    );
});

test("current-home initialization releases loading after failures and supports quiet join recovery", async () => {
    const home = {
        id: "joined",
        name: "Shared home",
        icon: "home-outline",
        isOwner: false,
        dataSource: { id: "broker", name: "Broker", state: "Connected" },
        location: { latitude: 52, longitude: 21 },
        rooms: [],
    };
    for (const failure of ["location", "request", "missing", "json", "details"]) {
        let failing = true;
        const messages = [];
        const provider = mountNativeComponent("src/contexts/domain/HomeProvider.tsx", {
            exportName: "HomeProvider",
            props: { children: null },
            modules: {
                "@/utils/location": {
                    getCurrentLocation: async () => {
                        if (failing && failure === "location") throw new Error("Location failed");
                        return undefined;
                    },
                },
                "../HttpClientProvider": {
                    useHttpClient: () => ({
                        get: async (path) => {
                            if (failing && failure === "request") throw new Error("GET failed");
                            const current = path.startsWith("v1/homes/current");
                            if (failing && failure === "missing")
                                return { isSuccess: false, statusCode: 0, response: null };
                            return {
                                isSuccess: true,
                                statusCode: 200,
                                response: {
                                    json: async () => {
                                        if (
                                            failing &&
                                            ((current && failure === "json") ||
                                                (!current && failure === "details"))
                                        )
                                            throw new Error("Invalid home JSON");
                                        return current ? { id: home.id } : home;
                                    },
                                },
                            };
                        },
                    }),
                },
                "../ToastProvider": {
                    useToast: () => ({
                        info: (message) => messages.push(message),
                        error: (message) => messages.push(message),
                        httpError: () => messages.push("HTTP error"),
                    }),
                },
            },
        });
        const context = () => provider.elements()[0].props.value;
        assert.equal(await context().initializeCurrentHome({ silent: true }), false);
        provider.render();
        assert.equal(context().loading, false, `Loading must end after ${failure} failure`);
        assert.equal(context().current, undefined);
        assert.deepEqual(messages, [], "Join owns its feedback during recovery");
        failing = false;
        assert.equal(await context().initializeCurrentHome(), true);
        provider.render();
        assert.equal(context().loading, false);
        assert.equal(context().current.id, home.id);
    }
});
