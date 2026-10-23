import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const subscriptionPath = "v1/datasources/brokers/broker-a/subscriptions";
const theme = {
    current: {
        colors: {
            background: "#f9f7f1",
            authForeground: "#29251f",
            authMuted: "#665f55",
            error: "#b42318",
        },
    },
};

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

async function settle(component) {
    for (let index = 0; index < 4; index++) await Promise.resolve();
    component.render();
}

function mountForm({
    brokerId = "broker-a",
    post = async () => ({ isSuccess: true }),
    canGoBack = true,
    back = () => {},
    replace = () => {},
} = {}) {
    const requests = [];
    const navigation = [];
    const toastCalls = [];
    const announcements = [];
    let focusEffect;
    let focusCleanup;
    const router = {
        canGoBack: () => canGoBack,
        back: () => {
            navigation.push(["back"]);
            return back();
        },
        replace: (destination) => {
            navigation.push(["replace", JSON.parse(JSON.stringify(destination))]);
            return replace(destination);
        },
    };
    const toast = Object.fromEntries(
        ["success", "error", "info", "httpError"].map((name) => [
            name,
            (...args) => toastCalls.push([name, ...args]),
        ]),
    );
    const form = mountNativeComponent(
        "src/components/dataSource/subscriptions/AddSubscriptionForm.tsx",
        {
            props: { brokerId },
            modules: {
                "react-native": {
                    AccessibilityInfo: {
                        announceForAccessibility: (message) => announcements.push(message),
                    },
                    StyleSheet: { create: (styles) => styles },
                    TextInput: "TextInput",
                    View: "View",
                },
                "react-native-keyboard-controller": {
                    KeyboardAwareScrollView: "KeyboardAwareScrollView",
                },
                "expo-router": {
                    useFocusEffect: (callback) => {
                        focusEffect = callback;
                    },
                    useRouter: () => router,
                },
                "@/contexts/HttpClientProvider": {
                    useHttpClient: () => ({
                        post: (path, body) => {
                            requests.push([path, JSON.parse(JSON.stringify(body))]);
                            return post(path, body);
                        },
                    }),
                },
                "@/contexts/ThemeProvider": { useTheme: () => theme },
                "@/contexts/ToastProvider": { useToast: () => toast },
                "@/styles/defaultStyles": { keyboardOffset: 48 },
                "@/components/common/Button": "Button",
                "@/components/common/FormSection": "FormSection",
                "@/components/common/Input": "Input",
                "@/components/ui/alert": {
                    Alert: "Alert",
                    AlertDescription: "AlertDescription",
                },
            },
        },
    );
    form.flushEffects();
    form.render();
    focusCleanup = focusEffect?.();

    const field = () =>
        form.elements().find((node) => node.type === "Input" && node.props.title === "Topic");
    const button = (name) =>
        form
            .elements()
            .find(
                (node) =>
                    node.type === "Button" && (name === undefined || node.props.name === name),
            );
    const submitButton = () => button("Add subscription") ?? button("Create Subscription");
    const alert = () => form.elements().find((node) => node.type === "Alert");

    return {
        ...form,
        requests,
        navigation,
        toastCalls,
        announcements,
        field,
        button,
        alert,
        change(value) {
            assert.ok(field(), "Topic field exists");
            field().props.setValue(value);
            form.render();
        },
        async submit() {
            const action = submitButton();
            assert.ok(action, "Add subscription action exists");
            const result = action.props.onPress();
            await result;
            form.render();
        },
        blur() {
            focusCleanup?.();
            focusCleanup = undefined;
        },
        focus() {
            focusCleanup = focusEffect?.();
        },
        async settle() {
            await settle(form);
        },
    };
}

function mountSharedInput(props) {
    return mountNativeComponent("src/components/common/Input.tsx", {
        props,
        modules: {
            "@/contexts/ThemeProvider": { useTheme: () => theme },
            "@/components/ui/input": { Input: "ReusableInput" },
            "@/components/ui/label": { Label: "Label" },
            "@/components/ui/text": { Text: "Text" },
            "@/styles/shadowStyles": { shadowStyles: { default: {} } },
        },
    });
}

function mountRoute(params) {
    const navigation = [];
    const router = {
        replace: (destination) => navigation.push(["replace", destination]),
    };
    const route = mountNativeComponent("src/app/(app)/dataSource/brokers/addSubscription.tsx", {
        modules: {
            "expo-router": {
                useLocalSearchParams: () => params,
                useRouter: () => router,
            },
            "react-native": {
                StyleSheet: { create: (styles) => styles },
                View: "View",
            },
            "@/contexts/ThemeProvider": { useTheme: () => theme },
            "@/components/common/Button": "Button",
            "@/components/common/FormSection": "FormSection",
            "@/components/ui/text": { Text: "Text" },
            "@/components/dataSource/subscriptions/AddSubscriptionForm": "AddSubscriptionForm",
        },
    });
    return { ...route, navigation };
}

test("subscription topic validation preserves the existing payload", async () => {
    const form = mountForm();
    const section = form.elements().find((node) => node.type === "FormSection");
    assert.equal(section.props.title, "Add subscription");
    assert.equal(section.props.helper, "Enter the MQTT topic this broker client should listen to.");
    assert.equal(form.field().props.error, "");
    assert.equal(form.field().props.placeholder, "home/sensor");
    assert.equal(form.field().props.variant, "auth");
    assert.equal(form.button("Add subscription").props.type, "auth");
    assert.equal(form.alert(), undefined);

    for (const [value, message] of [
        ["", "Topic is required."],
        [" \t ", "Topic is required."],
        ["x".repeat(257), "Topic must be 256 characters or fewer."],
    ]) {
        form.change(value);
        await form.submit();
        assert.equal(form.requests.length, 0);
        assert.equal(form.field().props.error, message);
        assert.equal(form.focused.at(-1), "Topic");
    }
    form.change("valid");
    assert.equal(form.field().props.error, "");

    for (const value of ["x", "x".repeat(256)]) {
        const valid = mountForm();
        valid.change(value);
        await valid.submit();
        assert.deepEqual(valid.requests, [[subscriptionPath, { topic: value }]]);
    }

    const preserved = mountForm();
    preserved.change(" House/+/room sensor/# ");
    await preserved.submit();
    assert.deepEqual(preserved.requests, [
        ["v1/datasources/brokers/broker-a/subscriptions", { topic: "House/+/room sensor/#" }],
    ]);

    const typed = mountForm();
    const sharedInput = mountSharedInput(typed.field().props);
    for (const character of "qa/Room sensor") {
        const props = typed.field().props;
        sharedInput.render(props);
        const nativeInput = sharedInput.elements().find((node) => node.type === "ReusableInput");
        assert.ok(nativeInput, "shared Input renders its native input host");
        nativeInput.props.onChangeText(props.value + character);
        typed.render();
    }
    assert.equal(typed.field().props.value, "qa/Room sensor");
    await typed.submit();
    assert.deepEqual(typed.requests, [[subscriptionPath, { topic: "qa/Room sensor" }]]);
});

test("subscription Go and button share a lock and recover after failure", async () => {
    const request = deferred();
    const results = [() => request.promise, async () => ({ isSuccess: true })];
    const form = mountForm({ post: () => results.shift()() });
    form.change("house/sensors/temperature");
    const oldButton = form.button().props.onPress;
    const oldSetter = form.field().props.setValue;
    const oldGo = form.field().props.onSubmitEditing;
    assert.equal(form.field().props.submitBehavior, "submit");
    assert.equal(form.field().props.returnKeyType, "go");
    assert.equal(typeof oldGo, "function", "Topic Go invokes the same submit handler");

    const pending = oldButton();
    const goPending = oldGo();
    assert.equal(form.requests.length, 1);
    await form.settle();
    assert.equal(form.field().props.value, "house/sensors/temperature");
    assert.equal(form.field().props.editable, true);
    assert.equal(form.field().props.accessibilityState.busy, true);
    assert.equal(form.button().props.loading, true);
    assert.equal(form.button().props.disabled, true);
    oldSetter("changed while pending");
    form.render();
    assert.equal(form.field().props.value, "house/sensors/temperature");
    assert.deepEqual(form.requests, [[subscriptionPath, { topic: "house/sensors/temperature" }]]);
    request.resolve({ isSuccess: false });
    await Promise.all([pending, goPending]);
    form.render();
    assert.equal(form.field().props.value, "house/sensors/temperature");
    assert.equal(form.button().props.disabled, false);
    assert.equal(form.field().props.accessibilityState.busy, false);
    assert.equal(form.alert().props.variant, "destructive");
    assert.match(
        form.text(),
        /Couldn't add the subscription\. Check your connection and try again\./,
    );
    assert.deepEqual(form.toastCalls, []);
    await form.submit();
    assert.equal(form.requests.length, 2);
    assert.deepEqual(form.navigation, [["back"]]);
    assert.deepEqual(form.toastCalls, []);

    const responses = [
        () => {
            throw new Error("offline");
        },
        async () => ({ isSuccess: true }),
    ];
    const retry = mountForm({ post: () => responses.shift()() });
    retry.change("office/room sensor");
    await retry.submit().catch(() => {});
    assert.equal(retry.field().props.value, "office/room sensor");
    assert.match(
        retry.text(),
        /Couldn't add the subscription\. Check your connection and try again\./,
    );
    assert.equal(retry.button().props.disabled, false);
    assert.deepEqual(retry.toastCalls, []);
    retry.change("office/edited sensor");
    assert.equal(retry.alert(), undefined);
    retry.change("office/room sensor");
    await retry.submit();
    assert.equal(retry.requests.length, 2);
    assert.deepEqual(retry.toastCalls, []);
});

test("accepted subscription returns once across navigation failure and refocus", async () => {
    const accepted = mountForm();
    accepted.change("home/accepted");
    const staleSubmit = accepted.button().props.onPress;
    await staleSubmit();
    assert.deepEqual(accepted.navigation, [["back"]]);
    assert.deepEqual(accepted.announcements, ["Subscription added."]);
    await staleSubmit();
    assert.equal(accepted.requests.length, 1);
    assert.deepEqual(accepted.announcements, ["Subscription added."]);

    const noHistory = mountForm({ canGoBack: false });
    noHistory.change("home/no-history");
    await noHistory.submit();
    assert.deepEqual(noHistory.navigation, [
        ["replace", { pathname: "/dataSource/details", params: { id: "broker-a" } }],
    ]);

    let attempts = 0;
    const navigationFails = mountForm({
        back: () => {
            if (++attempts === 1) throw new Error("navigation unavailable");
        },
    });
    navigationFails.change("home/navigation-error");
    const oldSubmit = navigationFails.button().props.onPress;
    await oldSubmit().catch(() => {});
    navigationFails.render();
    assert.match(
        navigationFails.text(),
        /Subscription added\. Return to the data source to view it\./,
    );
    assert.equal(navigationFails.field().props.editable, false);
    assert.equal(navigationFails.alert().props.variant, "default");
    assert.equal(navigationFails.button().props.name, "Return to data source");
    assert.deepEqual(
        navigationFails
            .elements()
            .filter((node) => node.type === "Button")
            .map((node) => node.props.name),
        ["Return to data source"],
    );
    await navigationFails.button("Return to data source").props.onPress();
    await oldSubmit();
    assert.equal(navigationFails.requests.length, 1);
    assert.deepEqual(navigationFails.navigation, [["back"], ["back"]]);
    assert.deepEqual(navigationFails.announcements, ["Subscription added."]);

    const delayedSuccess = deferred();
    const covered = mountForm({ post: () => delayedSuccess.promise });
    covered.change("home/covered");
    const coveredSubmit = covered.button().props.onPress;
    const success = coveredSubmit();
    covered.blur();
    delayedSuccess.resolve({ isSuccess: true });
    await success;
    assert.deepEqual(covered.navigation, []);
    assert.deepEqual(covered.announcements, []);
    covered.focus();
    assert.deepEqual(covered.navigation, [["back"]]);
    assert.deepEqual(covered.announcements, ["Subscription added."]);
    await coveredSubmit();
    assert.equal(covered.requests.length, 1);

    const delayedFailure = deferred();
    const failedWhileCovered = mountForm({ post: () => delayedFailure.promise });
    failedWhileCovered.change("home/covered-failure");
    const failedSubmit = failedWhileCovered.button().props.onPress;
    const failure = failedSubmit();
    failedWhileCovered.blur();
    delayedFailure.resolve({ isSuccess: false });
    await failure;
    failedWhileCovered.render();
    assert.deepEqual(failedWhileCovered.navigation, []);
    assert.doesNotMatch(failedWhileCovered.text(), /Couldn't add the subscription/);
    assert.equal(failedWhileCovered.button().props.disabled, false);
    failedWhileCovered.focus();
    assert.deepEqual(failedWhileCovered.navigation, []);
});

test("subscription route guards and isolates broker IDs", async () => {
    for (const params of [
        {},
        { brokerId: "" },
        { brokerId: " \t " },
        { brokerId: [] },
        { brokerId: ["", "broker-a"] },
        { brokerId: ["  ", "broker-a"] },
    ]) {
        const route = mountRoute(params);
        assert.equal(
            route.elements().some((node) => node.type === "AddSubscriptionForm"),
            false,
        );
        assert.ok(route.text().includes("Broker not found"));
        assert.ok(route.text().includes("Return to your data sources and choose a broker."));
        const recovery = route.elements().find((node) => node.type === "Button");
        assert.equal(recovery.props.name, "Return to data sources");
        recovery.props.onPress();
        assert.deepEqual(route.navigation, [["replace", "/dataSource/list"]]);
    }

    const validRoute = mountRoute({ brokerId: [" broker/a ", "ignored"] });
    const formElement = validRoute.elements().find((node) => node.type === "AddSubscriptionForm");
    assert.equal(formElement.props.brokerId, " broker/a ");
    assert.equal(formElement.props.key, " broker/a ");

    const staleRequest = deferred();
    const oldBroker = mountForm({ brokerId: "broker-a", post: () => staleRequest.promise });
    oldBroker.change("broker-a/topic");
    const oldSubmit = oldBroker.button().props.onPress;
    const pending = oldSubmit();
    oldBroker.blur();
    oldBroker.unmount();

    const newBroker = mountForm({ brokerId: "broker-b" });
    assert.equal(newBroker.field().props.value, "");
    staleRequest.resolve({ isSuccess: false });
    await pending;
    newBroker.render();
    assert.doesNotMatch(newBroker.text(), /Couldn't add the subscription/);
    assert.deepEqual(newBroker.navigation, []);
    assert.equal(newBroker.requests.length, 0);
});
