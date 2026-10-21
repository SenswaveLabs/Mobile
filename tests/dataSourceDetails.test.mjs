import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const broker = {
    id: "broker-1",
    name: "MQTT",
    url: "mqtt.example.com",
    clientName: "mobile-client",
    port: 1883,
    mqttVersion: "MqttV5",
    tls: false,
};

function mountSettingsForm(onClick) {
    const form = mountNativeComponent("src/components/dataSource/DataSourceForm.tsx", {
        exportName: "DataSourceForm",
        props: {
            edit: true,
            id: broker.id,
            initName: broker.name,
            initServer: broker.url,
            initClientName: broker.clientName,
            initPort: broker.port,
            initMqttVersion: broker.mqttVersion,
            initTls: broker.tls,
            onClick,
        },
        modules: {
            "../common/Input": "Input",
            "../common/PasswordInput": "PasswordInput",
            "@/components/common/BottomSheetSelect": "BottomSheetSelect",
            "./tile/DataSourceTile": "DataSourceTile",
            "../common/Dropdown": { __esModule: true, default: "Dropdown" },
            "../common/SwitchDropdown": "SwitchDropdown",
            "@/components/common/UserNote": "UserNote",
            "../common/Divider": "Divider",
            "@/components/common/Button": "Button",
            "@/components/ui/alert": {
                Alert: "Alert",
                AlertDescription: "AlertDescription",
            },
        },
    });
    form.flushEffects();
    const input = (title) =>
        form.elements().find((node) => node.type === "Input" && node.props.title === title);
    const field = (title) =>
        form.elements().find((node) => node.type === "PasswordInput" && node.props.title === title);
    const button = (name) =>
        form.elements().find((node) => node.type === "Button" && node.props.name === name);
    return {
        ...form,
        input,
        field,
        button,
        change(title, value) {
            (input(title) ?? field(title)).props.setValue(value);
            form.render();
            form.flushEffects();
            form.render();
        },
    };
}

const brokerClient = (status) => ({ connectionStatus: status, latestSessionId: "session-1" });

function mountClient(httpClient, push = () => {}) {
    let focus;
    const client = mountNativeComponent("src/components/dataSource/brokers/BrokerClient.tsx", {
        props: { id: broker.id },
        modules: {
            "@/contexts/HttpClientProvider": { useHttpClient: () => httpClient },
            "@/contexts/domain/HomeProvider": {
                useHomes: () => ({ refreshCurrent: async () => {} }),
            },
            "@/contexts/ToastProvider": {
                useToast: () => ({ error() {}, info() {}, success() {} }),
            },
            "expo-router": {
                useLocalSearchParams: () => ({ id: broker.id }),
                useRouter: () => ({ push }),
                useFocusEffect: (callback) => {
                    focus = callback;
                },
            },
            "@/components/dataSource/state/DataSourceState": "DataSourceState",
            "@/components/common/Button": "Button",
            "@/components/common/Text": "Text",
            "@/components/common/Icon": "Icon",
            "@/components/common/Loading": "Loading",
            "@/components/ui/alert": { Alert: "Alert", AlertDescription: "AlertDescription" },
        },
    });
    client.flushEffects();
    focus?.();
    return { ...client, refocus: () => focus?.() };
}

function mountSubscriptions(httpClient) {
    let focus;
    const subscriptions = mountNativeComponent(
        "src/components/dataSource/subscriptions/BrokerSubscriptions.tsx",
        {
            props: { id: broker.id },
            modules: {
                "@/contexts/HttpClientProvider": { useHttpClient: () => httpClient },
                "@/contexts/ToastProvider": {
                    useToast: () => ({ error() {}, info() {}, success() {}, httpError() {} }),
                },
                "expo-router": {
                    useLocalSearchParams: () => ({ id: broker.id }),
                    useRouter: () => ({ push() {} }),
                    useFocusEffect: (callback) => {
                        focus = callback;
                    },
                },
                "lucide-react-native": {
                    CircleAlert: "CircleAlert",
                    Plus: "Plus",
                    Trash2: "Trash2",
                },
                "@/components/common/ConfirmDialog": "ConfirmDialog",
                "@/components/common/Button": "Button",
                "@/components/common/Text": "Text",
                "@/components/common/Icon": "Icon",
                "@/components/common/Loading": "Loading",
                "@/components/common/FAB": "FAB",
                "@/styles/shadowStyles": { shadowStyles: { default: {} } },
                "@/components/ui/alert": { Alert: "Alert", AlertDescription: "AlertDescription" },
            },
        },
    );
    subscriptions.flushEffects();
    focus?.();
    return { ...subscriptions, refocus: () => focus?.() };
}

function mountDetailsRoute(httpClient) {
    return mountNativeComponent("src/app/(app)/dataSource/details.tsx", {
        modules: {
            "@/contexts/HttpClientProvider": { useHttpClient: () => httpClient },
            "@/contexts/ThemeProvider": {
                useTheme: () => ({
                    current: {
                        colors: {
                            background: "#fff",
                            authBorder: "#999",
                            authPrimary: "#fbbf24",
                            authOnPrimary: "#321a03",
                            authBackground: "#fff",
                            authForeground: "#111",
                        },
                    },
                }),
            },
            "expo-router": {
                useLocalSearchParams: () => ({ id: broker.id }),
                useRouter: () => ({ back() {}, push() {} }),
            },
            "@/components/common/Button": "Button",
            "@/components/common/Loading": "Loading",
            "@/components/dataSource/brokers/BrokerClient": "BrokerClient",
            "@/components/dataSource/sections/DataSourceDetailsSection": "DataSourceDetailsSection",
            "@/components/dataSource/subscriptions/BrokerSubscriptions": "BrokerSubscriptions",
            "@/components/ui/alert": { Alert: "Alert", AlertDescription: "AlertDescription" },
            "@/components/ui/text": { Text: "Text" },
            "@/components/ui/tabs": {
                Tabs: "Tabs",
                TabsList: "TabsList",
                TabsTrigger: "TabsTrigger",
                TabsContent: "TabsContent",
            },
        },
    });
}

const settle = async () => {
    for (let index = 0; index < 10; index++) await Promise.resolve();
};

test("failed settings save keeps draft and credentials available for retry", async () => {
    let attempts = 0;
    const form = mountSettingsForm(async () => {
        attempts++;
        if (attempts === 1) throw new Error("Broker settings could not be saved.");
    });
    form.change("Name", "Cabin broker");
    form.change("Username", "broker-user");
    form.change("Password", "secret-123");

    const save = form.button("Save changes");
    assert.ok(save, "Settings must expose its Save changes action in the form");
    await save.props.onPress();
    form.render();

    assert.equal(form.input("Name").props.value, "Cabin broker");
    assert.equal(form.input("Username").props.value, "broker-user");
    assert.equal(form.field("Password").props.value, "secret-123");
    assert.match(form.text(), /Broker settings could not be saved\./);
    assert.equal(form.button("Save changes").props.loading, false);
    assert.equal(attempts, 1);

    await form.button("Save changes").props.onPress();
    form.render();
    assert.equal(attempts, 2);
    assert.equal(form.button("Save changes").props.disabled, true);
    assert.doesNotMatch(form.text(), /secret-123/);
});

test("settings save locks immediately, updates the saved baseline, and has no Reset action", async () => {
    let attempts = 0;
    let finish;
    const form = mountSettingsForm(async () => {
        attempts++;
        await new Promise((resolve) => (finish = resolve));
    });
    form.change("Name", "Cabin broker");
    form.change("Username", "broker-user");
    form.change("Password", "secret-123");

    const save = form.button("Save changes");
    assert.ok(save, "Settings must expose Save changes");
    const first = save.props.onPress();
    const duplicate = save.props.onPress();
    assert.equal(attempts, 1, "A second tap before rerender must not send another update");
    form.render();
    const pendingSelector = form.elements().find((node) => node.type === "BottomSheetSelect");
    assert.ok(pendingSelector, "settings selectors should be present while saving");
    assert.equal(pendingSelector.props.disabled, true, "selectors stay disabled while saving");
    finish();
    await Promise.all([first, duplicate]);
    form.render();

    form.change("Name", "Temporary name");
    form.render();

    assert.equal(form.input("Name").props.value, "Temporary name");
    assert.equal(form.button("Reset"), undefined);
    assert.equal(form.button("Save changes").props.disabled, false);
    assert.equal(attempts, 1);
});

test("client status stays unknown after a failed read and retry loads the real state", async () => {
    let reads = 0;
    const client = mountClient({
        async get() {
            reads++;
            if (reads === 1) throw new Error("offline");
            return { isSuccess: true, response: { json: async () => brokerClient("Working") } };
        },
    });
    await settle();
    client.render();

    assert.match(client.text(), /Couldn't load broker status/);
    assert.doesNotMatch(client.text(), /Disconnected/);
    assert.ok(
        client.elements().some((node) => node.type === "Button" && node.props.name === "Retry"),
    );

    client
        .elements()
        .find((node) => node.type === "Button" && node.props.name === "Retry")
        .props.onPress();
    client.render();
    client.flushEffects();
    await settle();
    client.render();

    assert.equal(reads, 2);
    assert.match(client.text(), /Working/);
});

test("unrecognized client status stays unavailable instead of showing disconnected", async () => {
    let reads = 0;
    const client = mountClient({
        async get() {
            reads++;
            const status = reads === 1 ? "UnknownState" : "Stopped";
            return { isSuccess: true, response: { json: async () => brokerClient(status) } };
        },
    });
    await settle();
    client.render();

    assert.match(client.text(), /Broker status is unavailable/);
    assert.doesNotMatch(client.text(), /Disconnected/);
    client
        .elements()
        .find((node) => node.type === "Button" && node.props.name === "Retry")
        .props.onPress();
    client.render();
    client.flushEffects();
    await settle();
    client.render();
    assert.equal(reads, 2);
    assert.match(client.text(), /Stopped/);
});

test("client action blocks duplicate stops and updates the visible status", async () => {
    let release;
    let deletes = 0;
    let reads = 0;
    const client = mountClient({
        async get() {
            reads++;
            const status = reads === 1 ? "Working" : "Stopped";
            return { isSuccess: true, response: { json: async () => brokerClient(status) } };
        },
        async delete() {
            deletes++;
            await new Promise((resolve) => (release = resolve));
            return { isSuccess: true };
        },
    });
    await settle();
    client.render();
    const stop = client
        .elements()
        .find((node) => node.type === "Button" && node.props.name === "Stop");
    const first = stop.props.onPress();
    const duplicate = stop.props.onPress();
    assert.equal(deletes, 1);
    release();
    await Promise.all([first, duplicate]);
    await settle();
    client.render();

    assert.equal(deletes, 1);
    assert.match(client.text(), /Stopped/);
});

test("restart availability and handler follow the broker lifecycle state table", async () => {
    const cases = [
        ["Working", false],
        ["Connected", false],
        ["NotStarted", false],
        ["Stopped", false],
        ["Restarting", true],
        ["Connecting", true],
        ["Disconnected", true],
        ["Error", true],
    ];

    for (const [status, allowed] of cases) {
        let patches = 0;
        let reads = 0;
        const client = mountClient({
            async get() {
                reads++;
                return {
                    isSuccess: true,
                    response: { json: async () => brokerClient(status) },
                };
            },
            async patch() {
                patches++;
                return { isSuccess: true };
            },
        });
        await settle();
        client.render();
        const restart = client
            .elements()
            .find((node) => node.type === "Button" && node.props.name === "Restart");

        assert.equal(restart.props.disabled, !allowed, `${status} disabled state`);
        await restart.props.onPress();
        await settle();
        client.render();

        assert.equal(patches, Number(allowed), `${status} handler eligibility`);
        assert.equal(reads, allowed ? 2 : 1, `${status} status reconciliation`);
    }
});

test("accepted restart reconciles the displayed status from the broker DTO", async () => {
    let reads = 0;
    let patches = 0;
    const client = mountClient({
        async get() {
            reads++;
            const status = reads === 1 ? "Restarting" : "Working";
            return { isSuccess: true, response: { json: async () => brokerClient(status) } };
        },
        async patch() {
            patches++;
            return { isSuccess: true };
        },
    });
    await settle();
    client.render();

    await client
        .elements()
        .find((node) => node.type === "Button" && node.props.name === "Restart")
        .props.onPress();
    await settle();
    client.render();

    assert.equal(patches, 1);
    assert.equal(reads, 2);
    assert.match(client.text(), /connectionStatus":"Working/);
    assert.match(client.text(), /Restart request accepted/);
});

test("failed ambiguous action reconciles status and releases its mutation lock", async () => {
    let reads = 0;
    let patches = 0;
    const client = mountClient({
        async get() {
            reads++;
            return {
                isSuccess: true,
                response: {
                    json: async () => brokerClient(reads === 1 ? "Restarting" : "Stopped"),
                },
            };
        },
        async patch() {
            patches++;
            throw new Error("request timed out");
        },
    });
    await settle();
    client.render();

    await client
        .elements()
        .find((node) => node.type === "Button" && node.props.name === "Restart")
        .props.onPress();
    await settle();
    client.render();

    assert.equal(patches, 1);
    assert.equal(reads, 2);
    assert.match(client.text(), /Couldn't restart the broker client/);
    assert.match(client.text(), /connectionStatus":"Stopped/);
    assert.equal(
        client.elements().find((node) => node.type === "Button" && node.props.name === "Restart")
            .props.loading,
        false,
    );
});

test("failed status reconciliation can retry without repeating an accepted restart", async () => {
    let reads = 0;
    let patches = 0;
    const client = mountClient({
        async get() {
            reads++;
            if (reads === 2) throw new Error("offline after restart");
            return {
                isSuccess: true,
                response: {
                    json: async () => brokerClient(reads === 1 ? "Restarting" : "Working"),
                },
            };
        },
        async patch() {
            patches++;
            return { isSuccess: true };
        },
    });
    await settle();
    client.render();

    await client
        .elements()
        .find((node) => node.type === "Button" && node.props.name === "Restart")
        .props.onPress();
    await settle();
    client.render();

    assert.match(client.text(), /Restart request accepted/);
    assert.match(client.text(), /Couldn't refresh broker status/);
    assert.equal(patches, 1);
    assert.ok(
        client.elements().some((node) => node.type === "Button" && node.props.name === "Retry"),
    );

    client
        .elements()
        .find((node) => node.type === "Button" && node.props.name === "Retry")
        .props.onPress();
    client.render();
    client.flushEffects();
    await settle();
    client.render();

    assert.equal(reads, 3);
    assert.equal(patches, 1);
    assert.match(client.text(), /connectionStatus":"Working/);
});

test("client refocus during its first read starts a fresh read and ignores the stale response", async () => {
    let reads = 0;
    let releaseFirst;
    const client = mountClient({
        get() {
            reads++;
            if (reads === 1)
                return new Promise((resolve) => {
                    releaseFirst = () =>
                        resolve({
                            isSuccess: true,
                            response: { json: async () => brokerClient("Stopped") },
                        });
                });
            return Promise.resolve({
                isSuccess: true,
                response: { json: async () => brokerClient("Working") },
            });
        },
    });

    client.refocus();
    client.render();
    client.flushEffects();
    await settle();
    client.render();
    assert.equal(reads, 2);
    assert.match(client.text(), /connectionStatus":"Working/);

    releaseFirst();
    await settle();
    client.render();
    assert.match(client.text(), /connectionStatus":"Working/);
});

test("subscription refocus during its first read reloads and ignores the stale list", async () => {
    let reads = 0;
    let releaseFirst;
    const subscriptions = mountSubscriptions({
        get() {
            reads++;
            if (reads === 1)
                return new Promise((resolve) => {
                    releaseFirst = () =>
                        resolve({
                            isSuccess: true,
                            response: {
                                json: async () => ({
                                    items: [{ id: "old", topic: "old/topic" }],
                                }),
                            },
                        });
                });
            return Promise.resolve({
                isSuccess: true,
                response: {
                    json: async () => ({ items: [{ id: "new", topic: "new/topic" }] }),
                },
            });
        },
    });

    subscriptions.refocus();
    subscriptions.render();
    subscriptions.flushEffects();
    await settle();
    subscriptions.render();
    assert.equal(reads, 2);
    assert.match(subscriptions.text(), /new\/topic/);

    releaseFirst();
    await settle();
    subscriptions.render();
    assert.match(subscriptions.text(), /new\/topic/);
    assert.doesNotMatch(subscriptions.text(), /old\/topic/);
});

test("settings selectors keep TLS boolean and MQTT enum values in the saved payload", async () => {
    let saved;
    const form = mountSettingsForm(async (values) => {
        saved = values;
    });
    const selector = (title) =>
        form
            .elements()
            .find((node) => node.type === "BottomSheetSelect" && node.props.title === title);
    const tls = selector("TLS");
    const mqtt = selector("MQTT version");
    assert.ok(tls, "TLS must be a selected-value field");
    assert.ok(mqtt, "MQTT version must be a selected-value field");
    assert.equal(tls.props.value, "Disabled");
    assert.equal(mqtt.props.value, "5.0.0");
    assert.deepEqual(
        Array.from(mqtt.props.options, ({ label, selected }) => [label, selected]),
        [
            ["5.0.0", true],
            ["3.1.1", false],
            ["3.1.0", false],
        ],
    );

    tls.props.options.find((option) => option.selected).onPress();
    mqtt.props.options.find((option) => option.selected).onPress();
    form.render();
    assert.equal(form.button("Save changes").props.disabled, true, "unchanged choices stay clean");

    selector("TLS")
        .props.options.find((option) => option.label === "Enabled")
        .onPress();
    selector("MQTT version")
        .props.options.find((option) => option.label === "3.1.1")
        .onPress();
    form.render();
    assert.equal(selector("TLS").props.value, "Enabled");
    assert.equal(selector("MQTT version").props.value, "3.1.1");

    form.change("Username", "broker-user");
    form.change("Password", "secret-123");
    await form.button("Save changes").props.onPress();

    assert.equal(typeof saved.useTls, "boolean");
    assert.equal(saved.useTls, true);
    assert.equal(saved.protocolVersion, "MqttV311");
    assert.equal(typeof saved.protocolVersion, "string");
});

test("subscription removal can be cancelled, retried after failure, and recover", async () => {
    let deletes = 0;
    const httpClient = {
        async get() {
            return {
                isSuccess: true,
                response: {
                    json: async () => ({ items: [{ id: "sub-1", topic: "home/kitchen" }] }),
                },
            };
        },
        async delete() {
            deletes++;
            return { isSuccess: deletes > 1 };
        },
    };
    const subscriptions = mountSubscriptions(httpClient);
    await settle();
    subscriptions.render();
    const remove = () =>
        subscriptions
            .elements()
            .find(
                (node) =>
                    node.type === "Pressable" &&
                    node.props.accessibilityLabel === "Remove subscription home/kitchen",
            );

    remove().props.onPress();
    subscriptions.render();
    subscriptions
        .elements()
        .find((node) => node.type === "ConfirmDialog")
        .props.onCancel();
    assert.equal(deletes, 0);
    assert.match(subscriptions.text(), /home\/kitchen/);

    remove().props.onPress();
    subscriptions.render();
    subscriptions
        .elements()
        .find((node) => node.type === "ConfirmDialog")
        .props.onConfirm();
    await settle();
    subscriptions.render();
    assert.match(subscriptions.text(), /Couldn't remove subscription/);
    assert.match(subscriptions.text(), /home\/kitchen/);

    remove().props.onPress();
    subscriptions.render();
    subscriptions
        .elements()
        .find((node) => node.type === "ConfirmDialog")
        .props.onConfirm();
    await settle();
    subscriptions.render();
    assert.equal(deletes, 2);
    assert.match(subscriptions.text(), /No subscriptions yet/);
});

test("details route shows retry instead of edit fields after a failed broker load", async () => {
    let reads = 0;
    const details = mountDetailsRoute({
        async get() {
            reads++;
            if (reads === 1) throw new Error("offline");
            return { isSuccess: true, response: { json: async () => broker } };
        },
    });
    details.flushEffects();
    await settle();
    details.render();
    assert.match(details.text(), /Couldn't load this data source/);
    assert.doesNotMatch(details.text(), /DataSourceDetailsSection/);

    details
        .elements()
        .find((node) => node.type === "Button" && node.props.name === "Retry")
        .props.onPress();
    details.render();
    details.flushEffects();
    await settle();
    details.render();
    assert.equal(reads, 2);
    assert.match(details.text(), /MQTT/);
    assert.ok(details.elements().some((node) => node.type === "DataSourceDetailsSection"));
});

test("details route keeps the settings panel mounted while switching tabs", async () => {
    const details = mountDetailsRoute({
        async get() {
            return { isSuccess: true, response: { json: async () => broker } };
        },
    });
    details.flushEffects();
    await settle();
    details.render();
    const tabs = () => details.elements().find((node) => node.type === "Tabs");
    assert.ok(tabs(), "details should use the shared RNR tabs root");
    assert.equal(tabs().props.value, "Overview");
    const settings = details
        .elements()
        .find((node) => node.type === "TabsTrigger" && node.props.value === "Settings");
    assert.ok(settings, "Settings should be a tab trigger");
    tabs().props.onValueChange("Settings");
    details.render();
    assert.equal(tabs().props.value, "Settings");
    assert.ok(details.elements().some((node) => node.type === "DataSourceDetailsSection"));
    const panels = details.elements().filter((node) => node.type === "TabsContent");
    assert.equal(panels.length, 2, "both panels remain mounted across tab changes");
    assert.ok(panels.every((node) => node.props.forceMount));
    tabs().props.onValueChange("Overview");
    details.render();
    assert.equal(tabs().props.value, "Overview");
    assert.ok(details.elements().some((node) => node.type === "DataSourceDetailsSection"));
});
