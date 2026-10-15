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

function mountOtp(value = "A3B7C9D2", immediateFocus = false) {
    const changes = [];
    const focused = [];
    const ref = { current: null };
    const props = {
        value,
        error: "",
        inputRef: ref,
        setValue: (next) => {
            changes.push(next);
            props.value = next;
        },
    };
    const field = mountNativeComponent("src/components/homeSharing/HomeCodeInput.tsx", { props });
    const inputs = () => field.elements().filter((node) => node.type === "TextInput");
    inputs().forEach((input, index) => {
        input.props.ref({
            focus: () => {
                focused.push(index);
                if (immediateFocus) inputs()[index].props.onFocus();
            },
        });
    });
    return { ...field, props, changes, focused, ref, inputs };
}

test("OTP segments own their native editing and selection geometry", () => {
    const field = mountOtp();
    assert.equal(
        field.inputs().length,
        8,
        "Each visible segment needs its own native focus bounds",
    );
    assert.deepEqual(
        field.inputs().map((input) => input.props.value),
        [..."A3B7C9D2"],
    );
    field.inputs().forEach((input, index) => {
        assert.match(input.props.accessibilityLabel, new RegExp(`${index + 1} of 8`));
        assert.equal(
            input.props.selectTextOnFocus,
            true,
            "Replace the character in the tapped cell",
        );
        assert.equal(
            input.props.onTouchEnd,
            undefined,
            "Native focus must not use overlay coordinates",
        );
    });
    field.ref.current.focus();
    assert.deepEqual(field.focused, [0], "Validation can focus the first native segment");

    field.inputs()[6].props.onFocus();
    field.render();
    field.inputs()[6].props.onChangeText("x");
    field.render();
    assert.equal(field.props.value, "A3B7C9X2");
    assert.equal(field.focused.at(-1), 7);
});

test("OTP supports whole-code paste, autofill, deletion and consecutive keyboard focus", () => {
    const field = mountOtp("");
    field.inputs()[0].props.onChangeText("a");
    field.render();
    assert.equal(field.props.value, "A");
    assert.equal(field.focused.at(-1), 1);
    field.inputs()[1].props.onChangeText("3");
    field.render();
    assert.equal(field.props.value, "A3");
    assert.equal(field.focused.at(-1), 2);
    field.inputs()[2].props.onKeyPress({ nativeEvent: { key: "Backspace" } });
    field.render();
    assert.equal(field.props.value, "A");
    assert.equal(field.focused.at(-1), 1);

    field.inputs()[1].props.onChangeText("  a3b7c9d2  ");
    field.render();
    assert.equal(
        field.props.value,
        "A3B7C9D2",
        "A complete pasted code replaces the whole invitation",
    );
    assert.equal(field.focused.at(-1), 7);
    field.inputs()[2].props.onChangeText("");
    field.render();
    assert.equal(field.props.value, "A37C9D2");
    assert.equal(field.focused.at(-1), 1);

    field.inputs()[0].props.onChangeText("A3B7C9D2E");
    field.render();
    assert.equal(
        field.props.value,
        "A3B7C9D2E",
        "Do not silently join with a truncated pasted code",
    );
});

test("OTP keeps the latest code and next focus before parent updates commit", () => {
    const field = mountOtp("", true);
    field.inputs()[0].props.onChangeText("A");
    assert.deepEqual(field.focused, [1]);
    field.inputs()[1].props.onChangeText("3");
    assert.equal(field.props.value, "A3");
    assert.deepEqual(field.focused, [1, 2]);
});

test("OTP preserves invalid pasted suffixes and selects the final character for replacement", () => {
    const field = mountOtp("ABCDEFGHI", true);
    field.inputs()[0].props.onChangeText("X");
    field.render();
    assert.equal(
        field.props.value,
        "XBCDEFGHI",
        "Editing must not silently truncate an invalid code",
    );
    field.inputs()[0].props.onChangeText("ABCDEFGH");
    field.render();
    assert.deepEqual({ ...field.inputs()[7].props.selection }, { start: 0, end: 1 });
    assert.equal(field.inputs()[7].props.selectionColor, "transparent");
    assert.equal(field.inputs()[7].props.caretHidden, true);
    field.inputs()[7].props.onChangeText("J");
    field.render();
    assert.equal(field.props.value, "ABCDEFGJ");
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
        assert.equal(form.input().props.error, "", "Request failures belong to the join action");
        const actions = form
            .elements()
            .find((node) => node.type === "View" && node.props.children.includes(form.button()));
        const message = actions.props.children[0];
        assert.equal(message.props.accessibilityRole, "alert");
        assert.match(
            JSON.stringify(message),
            failure.statusCode === 400 || failure.statusCode === 404
                ? /new invitation/i
                : /try again/i,
        );
        assert.deepEqual(form.messages, [], "Inline errors must not also produce overlay toasts");
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
        assert.deepEqual(
            form.messages,
            [],
            "Recovery must not cover home-picker actions with a toast",
        );
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
