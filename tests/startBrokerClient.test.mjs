import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const credentialKey = (brokerId) => `brokerClientCredentials-${brokerId}`;
const startPath = "v1/datasources/brokers/broker-a/clients";

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

async function settle(form) {
    for (let index = 0; index < 4; index++) await Promise.resolve();
    form.render();
}

function mountStartForm({
    brokerId = "broker-a",
    getItemAsync = async () => null,
    setItemAsync = async () => {},
    deleteItemAsync = async () => {},
    post = async () => ({ isSuccess: true }),
    currentSource = brokerId,
    refreshCurrent = async () => {},
    canGoBack = true,
    back = () => {},
    replace = () => {},
} = {}) {
    const reads = [];
    const writes = [];
    const order = [];
    const requests = [];
    const refreshes = [];
    const navigation = [];
    const toastCalls = [];
    const announcements = [];
    let focusEffect;
    let focusCleanup;
    const secureStore = {
        getItemAsync: (key) => {
            reads.push(key);
            return getItemAsync(key);
        },
        setItemAsync: (key, value) => {
            writes.push(["set", key, value]);
            order.push(["set", key, value]);
            return setItemAsync(key, value);
        },
        deleteItemAsync: (key) => {
            writes.push(["delete", key]);
            order.push(["delete", key]);
            return deleteItemAsync(key);
        },
    };
    const httpClient = {
        post: (path, body) => {
            const payload = JSON.parse(JSON.stringify(body));
            requests.push([path, payload]);
            order.push(["post", path, payload]);
            return post(path, body);
        },
    };
    const homes = {
        current: currentSource ? { dataSource: { id: currentSource } } : undefined,
        refreshCurrent: () => {
            refreshes.push(true);
            return refreshCurrent();
        },
    };
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
        "src/components/dataSource/brokers/StartBrokerClientForm.tsx",
        {
            props: { brokerId },
            modules: {
                "react-native": {
                    View: "View",
                    Pressable: "Pressable",
                    StyleSheet: { create: (styles) => styles },
                    AccessibilityInfo: {
                        announceForAccessibility: (message) => announcements.push(message),
                    },
                },
                "expo-secure-store": secureStore,
                "expo-router": {
                    useRouter: () => router,
                    useFocusEffect: (callback) => {
                        focusEffect = callback;
                    },
                },
                "@/contexts/domain/HomeProvider": { useHomes: () => homes },
                "@/contexts/HttpClientProvider": { useHttpClient: () => httpClient },
                "@/contexts/ToastProvider": { useToast: () => toast },
                "@/contexts/ThemeProvider": {
                    useTheme: () => ({
                        current: {
                            colors: {
                                background: "#f9f7f1",
                                authBackground: "#fffdf8",
                                authForeground: "#29251f",
                                authMuted: "#665f55",
                                authBorder: "#8c8376",
                                authPrimary: "#efaa00",
                                authOnPrimary: "#211700",
                                error: "#b42318",
                            },
                        },
                    }),
                },
                "@/components/common/FormSection": "FormSection",
                "@/components/common/Input": "Input",
                "@/components/common/PasswordInput": "PasswordInput",
                "@/components/common/Button": "Button",
                "@/components/common/Switch": { Switch: "Switch" },
                "@/components/common/UserNote": "UserNote",
            },
        },
    );
    form.flushEffects();
    form.render();
    focusCleanup = focusEffect?.();

    const find = (type, predicate = () => true) =>
        form.elements().find((node) => node.type === type && predicate(node));
    const field = (title) =>
        find(
            title === "Password" ? "PasswordInput" : "Input",
            (node) => node.props.title === title,
        );
    const button = (name) => find("Button", (node) => node.props.name === name);
    const startButton = () => button("Start broker client") ?? button("Start Broker Client");
    const checkboxRow = () =>
        find("Pressable", (node) => node.props.accessibilityRole === "checkbox");

    return {
        ...form,
        reads,
        writes,
        order,
        requests,
        refreshes,
        navigation,
        toastCalls,
        announcements,
        field,
        button,
        startButton,
        checkboxRow,
        change(title, value) {
            const control = field(title);
            assert.ok(control, `${title} field exists`);
            control.props.setValue(value);
            form.render();
        },
        toggleRemember() {
            const row = checkboxRow();
            assert.ok(row, "remember row exists");
            row.props.onPress();
            form.render();
        },
        submit() {
            const action = startButton();
            assert.ok(action, "Start broker client action exists");
            return Promise.resolve(action.props.onPress()).finally(() => form.render());
        },
        focus() {
            focusCleanup = focusEffect?.();
        },
        blur() {
            focusCleanup?.();
            focusCleanup = undefined;
        },
        settle() {
            return settle(form);
        },
    };
}

function flattenStyle(style) {
    return Array.isArray(style)
        ? Object.assign({}, ...style.map(flattenStyle))
        : style && typeof style === "object"
          ? style
          : {};
}

function mountStartRoute(params, { replace = () => {} } = {}) {
    const navigation = [];
    const router = {
        back: () => navigation.push(["back"]),
        replace: (destination) => {
            navigation.push(["replace", destination]);
            return replace(destination);
        },
    };
    const route = mountNativeComponent("src/app/(app)/dataSource/brokers/startBrokerClient.tsx", {
        modules: {
            "expo-router": {
                useRouter: () => router,
                useLocalSearchParams: () => params,
            },
            "@/contexts/ThemeProvider": {
                useTheme: () => ({ current: { colors: { background: "#f9f7f1" } } }),
            },
            "@/components/common/Button": "Button",
            "@/components/common/FormSection": "FormSection",
            "@/components/common/Text": "Text",
            "@/components/dataSource/brokers/StartBrokerClientForm": "StartBrokerClientForm",
        },
    });
    return { ...route, navigation };
}

test("broker start validates required and backend length boundaries", async () => {
    const invalid = [
        ["", "valid"],
        ["   ", "valid"],
        ["valid", ""],
        ["valid", " \t "],
    ];
    for (const [username, password] of invalid) {
        const form = mountStartForm();
        await form.settle();
        form.change("Username", username);
        form.change("Password", password);
        await form.submit();
        assert.equal(form.requests.length, 0);
        assert.equal(form.writes.length, 0);
        assert.ok(form.field("Username").props.error || form.field("Password").props.error);
    }

    const firstInvalid = mountStartForm();
    await firstInvalid.settle();
    await firstInvalid.submit();
    assert.deepEqual(firstInvalid.focused, ["Username"]);
    assert.equal(firstInvalid.field("Username").props.error, "Username is required.");
    assert.equal(firstInvalid.field("Password").props.error, "Password is required.");
    firstInvalid.change("Username", "valid");
    assert.equal(firstInvalid.field("Username").props.error, "");
    assert.equal(firstInvalid.field("Password").props.error, "Password is required.");

    for (const [username, password] of [
        ["u", "p"],
        ["u".repeat(256), "p".repeat(256)],
    ]) {
        const form = mountStartForm();
        await form.settle();
        form.change("Username", username);
        form.change("Password", password);
        await form.submit();
        assert.deepEqual(form.requests, [[startPath, { username, password }]]);
        assert.equal(form.button("Start broker client")?.props.name, "Start broker client");
    }

    for (const [title, username, password] of [
        ["Username", "u".repeat(257), "valid"],
        ["Password", "valid", "p".repeat(257)],
    ]) {
        const form = mountStartForm();
        await form.settle();
        form.change("Username", username);
        form.change("Password", password);
        await form.submit();
        assert.ok(form.field(title).props.error);
        assert.equal(form.requests.length, 0);
        assert.equal(form.writes.length, 0);
    }

    const exact = mountStartForm();
    await exact.settle();
    exact.change("Username", " u ");
    exact.change("Password", " p ");
    await exact.submit();
    assert.deepEqual(exact.requests, [[startPath, { username: " u ", password: " p " }]]);
});

test("broker start restores credentials without changing storage", async () => {
    const delayedInitialRead = deferred();
    const restoring = mountStartForm({ getItemAsync: () => delayedInitialRead.promise });
    assert.equal(restoring.field("Username").props.editable, false);
    assert.equal(restoring.field("Password").props.editable, false);
    assert.equal(restoring.checkboxRow().props.accessibilityState.disabled, true);
    assert.equal(restoring.startButton().props.disabled, true);
    delayedInitialRead.resolve(null);
    await restoring.settle();

    const saved = mountStartForm({
        getItemAsync: async (key) => {
            assert.equal(key, credentialKey("broker-a"));
            return JSON.stringify({ username: " stored user ", password: " stored pass " });
        },
    });
    await saved.settle();
    assert.deepEqual(saved.reads, [credentialKey("broker-a")]);
    assert.equal(saved.field("Username").props.value, " stored user ");
    assert.equal(saved.field("Password").props.value, " stored pass ");
    assert.equal(saved.checkboxRow().props.accessibilityState.checked, true);
    saved.toggleRemember();
    assert.equal(saved.checkboxRow().props.accessibilityState.checked, false);
    assert.deepEqual(saved.writes, []);

    const empty = mountStartForm();
    await empty.settle();
    assert.equal(empty.checkboxRow().props.accessibilityState.checked, false);
    assert.equal(empty.field("Username").props.editable, true);

    for (const read of [
        async () => "{invalid json",
        async () => JSON.stringify({ username: 1, password: false }),
        async () => {
            throw new Error("secure storage unavailable");
        },
    ]) {
        const form = mountStartForm({ getItemAsync: read });
        await form.settle();
        assert.match(form.text(), /Couldn't load saved credentials\. Enter them again\./);
        assert.equal(form.field("Username").props.editable, true);
        assert.equal(form.startButton().props.disabled, false);
        assert.deepEqual(form.writes, []);
    }

    const delayedRead = deferred();
    const oldForm = mountStartForm({ getItemAsync: () => delayedRead.promise });
    oldForm.unmount();
    const nextForm = mountStartForm({ brokerId: "broker-b" });
    await nextForm.settle();
    delayedRead.resolve(JSON.stringify({ username: "old user", password: "old pass" }));
    await oldForm.settle();
    assert.equal(nextForm.field("Username").props.value, "");
    assert.equal(nextForm.field("Password").props.value, "");
});

test("broker start retains exact credential storage and request order", async () => {
    const save = deferred();
    const saved = mountStartForm({ setItemAsync: () => save.promise });
    await saved.settle();
    saved.change("Username", " user ");
    saved.change("Password", " pass ");
    saved.toggleRemember();
    const saving = saved.submit();
    assert.deepEqual(saved.order, [
        [
            "set",
            credentialKey("broker-a"),
            JSON.stringify({ username: " user ", password: " pass " }),
        ],
    ]);
    assert.deepEqual(saved.requests, []);
    save.resolve();
    await saving;
    assert.deepEqual(saved.order, [
        [
            "set",
            credentialKey("broker-a"),
            JSON.stringify({ username: " user ", password: " pass " }),
        ],
        ["post", startPath, { username: " user ", password: " pass " }],
    ]);

    const remove = deferred();
    const deleted = mountStartForm({ deleteItemAsync: () => remove.promise });
    await deleted.settle();
    deleted.change("Username", "user");
    deleted.change("Password", "pass");
    const deleting = deleted.submit();
    assert.deepEqual(deleted.order, [["delete", credentialKey("broker-a")]]);
    assert.deepEqual(deleted.requests, []);
    remove.resolve();
    await deleting;
    assert.deepEqual(deleted.requests, [[startPath, { username: "user", password: "pass" }]]);
});

test("broker start shares a synchronous lock and retains input on failures", async () => {
    const delayedDelete = deferred();
    const locked = mountStartForm({ deleteItemAsync: () => delayedDelete.promise });
    await locked.settle();
    assert.equal(locked.field("Username").props.submitBehavior, "submit");
    assert.equal(locked.field("Password").props.submitBehavior, "submit");
    locked.change("Username", "draft user");
    locked.change("Password", "draft pass");
    const oldButton = locked.startButton().props.onPress;
    const oldUsernameSetter = locked.field("Username").props.setValue;
    const oldPasswordSetter = locked.field("Password").props.setValue;
    const oldGo = locked.field("Password").props.onSubmitEditing;
    assert.equal(typeof oldGo, "function", "Password Go invokes the same submit handler");
    const pending = oldButton();
    await oldGo();
    locked.render();
    assert.equal(locked.writes.length, 1);
    assert.equal(locked.requests.length, 0);
    assert.equal(locked.startButton().props.loading, true);
    assert.equal(locked.startButton().props.disabled, true);
    assert.equal(locked.field("Username").props.editable, true);
    assert.equal(locked.field("Password").props.editable, true);
    assert.equal(locked.field("Username").props.accessibilityState.busy, true);
    assert.equal(locked.field("Password").props.accessibilityState.busy, true);
    assert.equal(locked.checkboxRow().props.accessibilityState.disabled, true);
    oldUsernameSetter("changed user");
    oldPasswordSetter("changed pass");
    locked.render();
    assert.equal(locked.field("Username").props.value, "draft user");
    assert.equal(locked.field("Password").props.value, "draft pass");
    assert.equal(locked.requests.length, 0);
    delayedDelete.resolve();
    await pending;
    assert.deepEqual(locked.requests, [
        [startPath, { username: "draft user", password: "draft pass" }],
    ]);

    const delayedPost = deferred();
    const posting = mountStartForm({ post: () => delayedPost.promise });
    await posting.settle();
    posting.change("Username", "post user");
    posting.change("Password", "post pass");
    const postUsernameSetter = posting.field("Username").props.setValue;
    const postPasswordSetter = posting.field("Password").props.setValue;
    const postingPromise = posting.submit();
    await posting.settle();
    assert.equal(posting.requests.length, 1);
    assert.equal(posting.startButton().props.loading, true);
    assert.equal(posting.startButton().props.disabled, true);
    assert.equal(posting.checkboxRow().props.accessibilityState.disabled, true);
    assert.equal(posting.field("Username").props.editable, true);
    assert.equal(posting.field("Password").props.editable, true);
    assert.equal(posting.field("Username").props.accessibilityState.busy, true);
    assert.equal(posting.field("Password").props.accessibilityState.busy, true);
    postUsernameSetter("changed post user");
    postPasswordSetter("changed post pass");
    posting.render();
    assert.equal(posting.field("Username").props.value, "post user");
    assert.equal(posting.field("Password").props.value, "post pass");
    assert.deepEqual(posting.requests, [
        [startPath, { username: "post user", password: "post pass" }],
    ]);
    delayedPost.resolve({ isSuccess: false });
    await postingPromise;
    assert.match(posting.text(), /Couldn't start the broker client/);
    assert.equal(posting.field("Username").props.editable, true);
    assert.equal(posting.field("Password").props.editable, true);
    assert.equal(posting.field("Username").props.accessibilityState.busy, false);
    posting.change("Username", "edited after failure");
    assert.equal(posting.field("Username").props.value, "edited after failure");
    assert.doesNotMatch(posting.text(), /Couldn't start the broker client/);

    for (const [remember, fail] of [
        [true, () => Promise.reject(new Error("write failed"))],
        [false, () => Promise.reject(new Error("delete failed"))],
    ]) {
        const form = mountStartForm({
            setItemAsync: fail,
            deleteItemAsync: fail,
        });
        await form.settle();
        form.change("Username", "keep user");
        form.change("Password", "keep pass");
        if (remember) form.toggleRemember();
        await form.submit();
        assert.equal(form.requests.length, 0);
        assert.match(form.text(), /Couldn't update saved credentials on this device\. Try again\./);
        assert.equal(form.field("Username").props.value, "keep user");
        assert.equal(form.field("Password").props.value, "keep pass");
        assert.equal(form.startButton().props.disabled, false);
        assert.equal(form.field("Username").props.editable, true);
        assert.equal(form.field("Password").props.editable, true);
    }

    const results = [
        async () => ({ isSuccess: false }),
        async () => {
            throw new Error("request failed");
        },
        async () => ({ isSuccess: true }),
    ];
    const retried = mountStartForm({ post: () => results.shift()() });
    await retried.settle();
    retried.change("Username", "retained user");
    retried.change("Password", "retained pass");
    await retried.submit();
    assert.match(
        retried.text(),
        /Couldn't start the broker client\. Check your credentials and connection, then try again\./,
    );
    assert.equal(retried.field("Username").props.value, "retained user");
    assert.equal(retried.field("Password").props.value, "retained pass");
    assert.equal(retried.field("Username").props.editable, true);
    retried.change("Username", "edited user");
    assert.equal(retried.field("Username").props.value, "edited user");
    assert.doesNotMatch(retried.text(), /Couldn't start the broker client/);
    retried.change("Username", "retained user");
    await retried.submit();
    assert.match(
        retried.text(),
        /Couldn't start the broker client\. Check your credentials and connection, then try again\./,
    );
    assert.equal(retried.requests.length, 2);
    await retried.submit();
    assert.equal(retried.requests.length, 3);
    assert.deepEqual(retried.toastCalls, []);
});

test("broker start completes accepted requests only once", async () => {
    const accepted = mountStartForm();
    await accepted.settle();
    accepted.change("Username", "user");
    accepted.change("Password", "pass");
    await accepted.submit();
    assert.deepEqual(accepted.refreshes, [true]);
    assert.deepEqual(accepted.navigation, [["back"]]);
    assert.deepEqual(accepted.announcements, ["Broker client started."]);
    assert.equal(accepted.field("Username").props.editable, false);
    assert.equal(accepted.field("Password").props.editable, false);
    const staleButton = accepted.startButton().props.onPress;
    await staleButton();
    assert.equal(accepted.requests.length, 1);
    assert.equal(accepted.refreshes.length, 1);

    const noHistory = mountStartForm({ canGoBack: false, currentSource: "other-source" });
    await noHistory.settle();
    noHistory.change("Username", "user");
    noHistory.change("Password", "pass");
    await noHistory.submit();
    assert.deepEqual(noHistory.refreshes, []);
    assert.deepEqual(noHistory.navigation, [
        ["replace", { pathname: "/dataSource/details", params: { id: "broker-a" } }],
    ]);

    const refreshThrows = mountStartForm({
        refreshCurrent: async () => {
            throw new Error("refresh failed");
        },
    });
    await refreshThrows.settle();
    refreshThrows.change("Username", "user");
    refreshThrows.change("Password", "pass");
    await refreshThrows.submit();
    assert.deepEqual(refreshThrows.navigation, [["back"]]);
    assert.equal(refreshThrows.requests.length, 1);

    let backCalls = 0;
    const navigationFails = mountStartForm({
        back: () => {
            if (++backCalls === 1) throw new Error("navigation unavailable");
        },
    });
    await navigationFails.settle();
    navigationFails.change("Username", "user");
    navigationFails.change("Password", "pass");
    const oldSubmit = navigationFails.startButton().props.onPress;
    await oldSubmit();
    navigationFails.render();
    assert.match(
        navigationFails.text(),
        /Broker client started\. Return to the data source to check its connection\./,
    );
    const returnButton = navigationFails.button("Return to data source");
    assert.ok(returnButton);
    assert.equal(navigationFails.button("Start broker client"), undefined);
    await returnButton.props.onPress();
    await oldSubmit();
    assert.equal(navigationFails.requests.length, 1);
    assert.equal(navigationFails.refreshes.length, 1);
    assert.deepEqual(navigationFails.navigation, [["back"], ["back"]]);
});

test("broker start ignores stale completion and recovers on refocus", async () => {
    const acceptedRequest = deferred();
    const delayed = mountStartForm({ post: () => acceptedRequest.promise });
    await delayed.settle();
    delayed.change("Username", "user");
    delayed.change("Password", "pass");
    const oldSubmit = delayed.startButton().props.onPress;
    const pending = oldSubmit();
    delayed.blur();
    acceptedRequest.resolve({ isSuccess: true });
    await pending;
    assert.deepEqual(delayed.navigation, []);
    assert.deepEqual(delayed.toastCalls, []);
    assert.deepEqual(delayed.announcements, []);
    delayed.focus();
    assert.deepEqual(delayed.navigation, [["back"]]);
    assert.deepEqual(delayed.announcements, ["Broker client started."]);
    await oldSubmit();
    assert.equal(delayed.requests.length, 1);

    const failedRequest = deferred();
    const failed = mountStartForm({ post: () => failedRequest.promise });
    await failed.settle();
    failed.change("Username", "user");
    failed.change("Password", "pass");
    const failedSubmit = failed.startButton().props.onPress;
    const failedPending = failedSubmit();
    failed.blur();
    failedRequest.resolve({ isSuccess: false });
    await failedPending;
    failed.render();
    assert.deepEqual(failed.navigation, []);
    assert.deepEqual(failed.toastCalls, []);
    assert.doesNotMatch(failed.text(), /Couldn't start the broker client/);
    assert.equal(failed.startButton().props.disabled, false);
    failed.focus();
    assert.deepEqual(failed.navigation, []);
});

test("broker start handles missing route IDs and checkbox semantics", () => {
    for (const params of [{}, { brokerId: "" }, { brokerId: "   " }, { brokerId: [] }]) {
        const route = mountStartRoute(params);
        assert.equal(
            route.elements().some((node) => node.type === "StartBrokerClientForm"),
            false,
        );
        const recovery = route.elements().find((node) => node.type === "Button");
        assert.equal(recovery.props.name, "Return to data sources");
        recovery.props.onPress();
        assert.deepEqual(route.navigation, [["replace", "/dataSource/list"]]);
    }

    const normalized = mountStartRoute({ brokerId: ["broker-a", "ignored"] });
    const formElement = normalized.elements().find((node) => node.type === "StartBrokerClientForm");
    assert.equal(formElement.props.brokerId, "broker-a");
    assert.equal(formElement.props.key, "broker-a");
    const shell = normalized.elements()[0];
    assert.equal(flattenStyle(shell.props.style).backgroundColor, "#f9f7f1");

    const changingParams = { brokerId: "broker-a" };
    const changingRoute = mountStartRoute(changingParams);
    const oldRouteKey = changingRoute
        .elements()
        .find((node) => node.type === "StartBrokerClientForm").props.key;
    changingParams.brokerId = "broker-b";
    changingRoute.render();
    const newRouteKey = changingRoute
        .elements()
        .find((node) => node.type === "StartBrokerClientForm").props.key;
    assert.equal(oldRouteKey, "broker-a");
    assert.equal(newRouteKey, "broker-b");
});

test("broker start remember row has one accessible 48 dp target", async () => {
    const form = mountStartForm();
    await form.settle();
    const row = form.checkboxRow();
    assert.ok(row);
    assert.equal(row.props.accessibilityLabel, "Remember credentials on this device");
    assert.equal(row.props.accessibilityState.checked, false);
    assert.ok(flattenStyle(row.props.style).minHeight >= 48);
    assert.equal(flattenStyle(row.props.style).alignItems, "flex-start");
    assert.equal(row.props.onPress !== undefined, true);
    const visual = row.props.children[0];
    assert.equal(visual.type, "View");
    assert.equal(flattenStyle(visual.props.style).marginTop, 4);
    assert.equal(visual.props.accessible, false);
    assert.equal(visual.props.accessibilityElementsHidden, true);
    assert.equal(visual.props.importantForAccessibility, "no-hide-descendants");
    assert.equal(visual.props.pointerEvents, "none");
    const checkbox = visual.props.children[0];
    assert.equal(checkbox.props.className, "border-border");
    assert.equal(checkbox.props.accessible, false);
    assert.equal(checkbox.props.pointerEvents, "none");
    form.toggleRemember();
    assert.equal(form.checkboxRow().props.accessibilityState.checked, true);
    assert.equal(
        form.checkboxRow().props.children[0].props.children[0].props.className,
        "border-primary",
    );
    assert.deepEqual(form.writes, []);
    form.toggleRemember();
    assert.equal(form.checkboxRow().props.accessibilityState.checked, false);
    assert.deepEqual(form.writes, []);
});
