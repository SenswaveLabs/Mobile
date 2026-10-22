import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

function mountCreateForm(onClick) {
    const form = mountNativeComponent("src/components/dataSource/DataSourceForm.tsx", {
        exportName: "DataSourceForm",
        props: { edit: false, onClick },
        modules: {
            "../common/Input": "Input",
            "../common/PasswordInput": "PasswordInput",
            "@/components/common/BottomSheetSelect": "BottomSheetSelect",
            "@/components/common/Button": "Button",
            "@/components/ui/alert": { Alert: "Alert", AlertDescription: "AlertDescription" },
            "@/components/ui/text": { Text: "Text" },
        },
    });
    form.flushEffects();
    form.render();
    const input = (title) =>
        form.elements().find((node) => node.type === "Input" && node.props.title === title);
    const password = (title) =>
        form.elements().find((node) => node.type === "PasswordInput" && node.props.title === title);
    const button = () =>
        form
            .elements()
            .find((node) => node.type === "Button" && node.props.name === "Create data source");
    return {
        ...form,
        input,
        password,
        button,
        submit() {
            return button()?.props.onPress?.();
        },
        change(title, value) {
            const control = input(title) ?? password(title);
            assert.ok(control, `${title} input exists`);
            control.props.setValue(value);
            form.render();
            form.flushEffects();
            form.render();
        },
        select(title, label) {
            const selector = form
                .elements()
                .find((node) => node.type === "BottomSheetSelect" && node.props.title === title);
            assert.ok(selector, `${title} selector exists`);
            const option = selector.props.options.find((item) => item.label === label);
            assert.ok(option, `${label} option exists`);
            option.onPress();
            form.render();
            form.flushEffects();
            form.render();
        },
    };
}

function fillValidForm(form) {
    form.change("Name", "Cabin broker");
    form.change("Server", "mqtts://broker.local");
    form.change("Client name", "mobile-client");
    form.change("Username", "sensor-user");
    form.change("Password", "secret-123");
}

function mountCreateRoute(httpClient, { canGoBack = true } = {}) {
    const navigation = [];
    const announcements = [];
    let focusEffect;
    const router = {
        canGoBack: () => canGoBack,
        back: () => navigation.push(["back"]),
        replace: (path) => navigation.push(["replace", path]),
    };
    const route = mountNativeComponent("src/app/(app)/dataSource/add.tsx", {
        modules: {
            "@/contexts/HttpClientProvider": { useHttpClient: () => httpClient },
            "expo-router": {
                useRouter: () => router,
                useFocusEffect: (callback) => {
                    focusEffect = callback;
                },
            },
            "@/components/dataSource/DataSourceForm": { DataSourceForm: "DataSourceForm" },
            "react-native": {
                AccessibilityInfo: {
                    announceForAccessibility: (message) => announcements.push(message),
                },
            },
        },
    });
    const createForm = () => route.elements().find((node) => node.type === "DataSourceForm");
    return {
        ...route,
        navigation,
        announcements,
        router,
        createForm,
        focus: () => focusEffect?.(),
    };
}

const createValues = {
    name: "Cabin broker",
    url: "mqtts://broker.local",
    clientName: "mobile-client",
    port: 8883,
    protocolVersion: "MqttV5",
    useTls: true,
    username: "sensor-user",
    password: "secret-123",
};

test("create keeps required fields quiet until submit and then shows their field errors", async () => {
    let calls = 0;
    const form = mountCreateForm(async () => calls++);

    assert.match(form.text(), /One data source belongs only to one user account\./);
    assert.match(form.text(), /Username and password are required to verify this connection\./);
    assert.match(form.text(), /Credentials are used only for verification purposes\./);

    for (const title of ["Name", "Server", "Client name", "Username", "Password"])
        assert.equal((form.input(title) ?? form.password(title)).props.error, "");

    await form.submit();
    form.render();

    assert.equal(calls, 0);
    assert.equal(form.input("Name").props.error, "Name is required.");
    assert.equal(form.input("Server").props.error, "Server is required.");
    assert.equal(form.input("Client name").props.error, "Client name is required.");
    assert.equal(form.input("Username").props.error, "Username is required.");
    assert.equal(form.password("Password").props.error, "Password is required.");
});

test("create preserves broker payload names, credentials, MQTT enum keys and TLS boolean", async () => {
    for (const [versionLabel, version] of [
        ["5.0.0", "MqttV5"],
        ["3.1.1", "MqttV311"],
        ["3.1.0", "MqttV310"],
    ]) {
        let submitted;
        const form = mountCreateForm(async (values) => {
            submitted = values;
        });
        fillValidForm(form);
        if (version !== "MqttV5") form.select("MQTT version", versionLabel);
        if (version === "MqttV311") form.select("TLS", "Disabled");

        await form.submit();

        assert.deepEqual(
            { ...submitted },
            {
                name: "Cabin broker",
                url: "mqtts://broker.local",
                clientName: "mobile-client",
                port: 8883,
                protocolVersion: version,
                useTls: version !== "MqttV311",
                username: "sensor-user",
                password: "secret-123",
            },
        );
    }
});

test("create rejects malformed numeric ports before calling the save handler", async () => {
    let calls = 0;
    const form = mountCreateForm(async () => calls++);
    fillValidForm(form);
    form.change("Port", "not-a-port");

    await form.submit();

    assert.equal(calls, 0);
    assert.equal(form.input("Port").props.error, "Port is not valid.");
});

test("create shares pending lock between password IME and button and retains its label", async () => {
    let finish;
    let calls = 0;
    const form = mountCreateForm(async () => {
        calls++;
        await new Promise((resolve) => (finish = resolve));
    });
    fillValidForm(form);

    const action = form.button();
    const submitFromPassword = form.password("Password").props.onSubmitEditing;
    assert.deepEqual(
        { action: action?.props.name, keyboardSubmit: typeof submitFromPassword },
        { action: "Create data source", keyboardSubmit: "function" },
    );

    const first = submitFromPassword();
    const duplicate = action.props.onPress();
    assert.equal(calls, 1);
    form.render();
    assert.equal(form.button().props.loading, true);
    assert.equal(form.button().props.name, "Create data source");

    finish();
    await Promise.all([first, duplicate]);
    form.render();

    assert.equal(form.button()?.props.loading, false);
    assert.equal(form.button().props.name, "Create data source");
});

test("failed create keeps broker and credential drafts for retry", async () => {
    let calls = 0;
    const form = mountCreateForm(async () => {
        calls++;
        throw new Error("Couldn't create this data source. Try again.");
    });
    fillValidForm(form);
    form.select("MQTT version", "3.1.0");

    await form.submit();
    form.render();

    assert.equal(calls, 1);
    assert.equal(form.input("Name").props.value, "Cabin broker");
    assert.equal(form.input("Server").props.value, "mqtts://broker.local");
    assert.equal(form.input("Client name").props.value, "mobile-client");
    assert.equal(form.input("Username").props.value, "sensor-user");
    assert.equal(form.password("Password").props.value, "secret-123");
    assert.match(form.text(), /Couldn't create this data source\. Try again\./);
    assert.equal(form.button().props.loading, false);
});

test("changing a draft clears stale create feedback and keeps retry available", async () => {
    const form = mountCreateForm(async () => {
        throw new Error("Couldn't create this data source. Try again.");
    });
    fillValidForm(form);
    await form.submit();
    form.render();

    assert.match(form.text(), /Couldn't create this data source\. Try again\./);
    form.change("Server", "mqtt-broker.local");
    assert.doesNotMatch(form.text(), /Couldn't create this data source\. Try again\./);
    assert.equal(form.button()?.props.name, "Create data source");
});

test("accepted create returns through Back and cannot repeat its POST", async () => {
    const requests = [];
    const httpClient = {
        post: async (path, values) => {
            requests.push({ path, values });
            return { isSuccess: true, statusCode: 201, response: null };
        },
    };
    const route = mountCreateRoute(httpClient, { canGoBack: true });
    route.focus();
    const submit = route.createForm().props.onClick;

    await submit(createValues);
    await submit(createValues);

    assert.deepEqual(requests, [{ path: "v1/datasources/brokers", values: createValues }]);
    assert.deepEqual(route.navigation, [["back"]]);
});

test("accepted create after blur waits for refocus and falls back to the source list", async () => {
    let finish;
    const requests = [];
    const httpClient = {
        post: (path, values) => {
            requests.push({ path, values });
            return new Promise((resolve) => (finish = resolve));
        },
    };
    const route = mountCreateRoute(httpClient, { canGoBack: false });
    const blur = route.focus();
    const submit = route.createForm().props.onClick;
    const pending = submit(createValues);
    blur?.();
    finish({ isSuccess: true, statusCode: 201, response: null });
    await pending;

    assert.deepEqual(route.navigation, []);
    route.focus();
    await submit(createValues);

    assert.deepEqual(requests, [{ path: "v1/datasources/brokers", values: createValues }]);
    assert.deepEqual(route.navigation, [["replace", "/dataSource/list"]]);
});

test("unsuccessful HTTP response rejects into the form's inline error path", async () => {
    const route = mountCreateRoute({
        post: async () => ({ isSuccess: false, statusCode: 503, response: null }),
    });
    route.focus();
    const submit = route.createForm().props.onClick;

    await assert.rejects(submit(createValues), /Couldn't create this data source\. Try again\./);
    assert.deepEqual(route.navigation, []);
});
