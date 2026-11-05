import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { localApiUrl, requestJson } from "./gateway.ts";

export const fixtureName = "Expo Visual Review";
export function mqttConfiguration(env: NodeJS.ProcessEnv = process.env) {
    const server = env.AGENT_MQTT_SERVER?.trim();
    const port = Number(env.AGENT_MQTT_PORT);
    const versions: Record<string, string> = {
        "5": "MqttV5",
        "5.0": "MqttV5",
        "5.0.0": "MqttV5",
        mqttv5: "MqttV5",
        "3.1.1": "MqttV311",
        "4": "MqttV311",
        mqttv311: "MqttV311",
        "3.1": "MqttV310",
        "3.1.0": "MqttV310",
        "3": "MqttV310",
        mqttv310: "MqttV310",
    };
    const version = versions[env.AGENT_MQTT_VERSION?.trim().toLowerCase() ?? ""];
    if (!server || !Number.isInteger(port) || port < 1 || port > 65535 || !version)
        throw new Error(
            "Valid AGENT_MQTT_SERVER/PORT/VERSION are required (5, 3.1.1, 3.1 or API enum names).",
        );
    const url = new URL(server.includes("://") ? server : `mqtt://${server}`);
    if (
        !["mqtt:", "mqtts:", "tcp:", "ssl:"].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.pathname !== ""
    )
        throw new Error(
            "Invalid MQTT server address; credentials belong in separate environment keys.",
        );
    return {
        host: url.hostname,
        port,
        version,
        tls:
            env.AGENT_MQTT_TLS === "true" ||
            ["mqtts:", "ssl:"].includes(url.protocol) ||
            port === 8883,
        username: env.AGENT_MQTT_LOGIN ?? "",
        password: env.AGENT_MQTT_PASSWORD ?? "",
    };
}
export interface Fixtures {
    homeId?: string;
    brokerId?: string;
    roomId?: string;
    deviceId?: string;
    dashboardId?: string;
    automationId?: string;
    operations: Record<string, string>;
    widgets: Record<string, string>;
    topic: string;
    homes?: { id: string; name: string }[];
    devices?: {
        id: string;
        name: string;
        homeId: string;
        operationId: string;
        widgetId: string;
        topic: string;
        value: string;
    }[];
}

export function fixtureTopic(repoRoot: string) {
    return `expo-visual-review/${createHash("sha256").update(repoRoot).digest("hex").slice(0, 12)}`;
}

export function reviewMessages(fixtures: Fixtures) {
    const values = {
        ...Object.fromEntries(
            Object.entries({
                switch: "true",
                display: "22.5",
                slider: "45",
                button: "review",
                color: "#F7B817",
                radio: "low",
            }).map(([name, value]) => [`${fixtures.topic}/${name}`, value]),
        ),
        ...Object.fromEntries(
            (fixtures.devices ?? []).map((device) => [device.topic, device.value]),
        ),
    };
    if (
        !/^expo-visual-review\/[a-f0-9]{12}$/.test(fixtures.topic) ||
        Object.entries(values).some(
            ([topic, value]) =>
                !topic.startsWith(`${fixtures.topic}/`) ||
                /[+#]/.test(topic) ||
                typeof value !== "string",
        )
    )
        throw new Error("MQTT messages must remain inside this repository's review namespace.");
    return values;
}

export function accountCredentials(profile = process.env.EXPO_REVIEW_ACCOUNT ?? "AGENT") {
    if (!/^AGENT[2-4]?$/.test(profile))
        throw new Error("Review account must be AGENT, AGENT2, AGENT3 or AGENT4.");
    const email = process.env[`${profile}_ACCOUNT_EMAIL`];
    const password = process.env[`${profile}_ACCOUNT_PASSWORD`];
    if (!email || !password)
        throw new Error(
            `Set ${profile}_ACCOUNT_EMAIL and ${profile}_ACCOUNT_PASSWORD in local .env.`,
        );
    return { email, password };
}

export async function testApi(profile = "AGENT") {
    const origin = localApiUrl(
        process.env.EXPO_REVIEW_API_URL ??
            process.env.EXPO_PUBLIC_SENSWAVE__API__URL ??
            "http://127.0.0.1:8080",
    );
    const { email, password } = accountCredentials(profile);
    const response = await requestJson(origin, "/api/v1/auth/login", {
        method: "POST",
        body: { email, password },
    });
    if (response.status !== 200 || typeof response.body?.accessToken !== "string")
        throw new Error(`Test-account login failed (HTTP ${response.status}).`);
    const token = response.body.accessToken;
    const call = async (path: string, method = "GET", body?: unknown) => {
        const response = await requestJson(origin, `/api/${path}`, { method, body, token });
        if (response.status >= 400 && !(method === "GET" && response.status === 404))
            throw new Error(
                `Local test API: ${method} ${path.split("?")[0]} returned HTTP ${response.status}.`,
            );
        return response;
    };
    const items = async (path: string): Promise<any[]> => {
        const response = await call(path);
        if (response.status === 404) return [];
        const rows = Array.isArray(response.body) ? response.body : response.body?.items;
        if (
            !Array.isArray(rows) ||
            rows.some((row) => !row || typeof row.id !== "string" || !row.id)
        )
            throw new Error(`Invalid local fixture catalog: ${path.split("?")[0]}`);
        return rows;
    };
    return { origin, call, items };
}

export async function prepareFixtures(
    directory: string,
    repoRoot: string,
    seed: boolean,
): Promise<Fixtures> {
    const api = await testApi();
    const path = join(directory, "fixtures.json");
    const saved = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null;
    if (saved && saved.origin !== api.origin.origin)
        throw new Error(
            "Fixture API changed. Use a different EXPO_REVIEW_HOME for that test environment.",
        );
    const fixtures: Fixtures = { operations: {}, widgets: {}, topic: fixtureTopic(repoRoot) };
    const persist = () =>
        writeFileSync(
            path,
            JSON.stringify({ origin: api.origin.origin, ...fixtures }, null, 2) + "\n",
            { mode: 0o600 },
        );
    const ensure = async (rows: any[], name: string, endpoint: string, body: unknown) => {
        const found = rows.find((row) => row.name === name);
        if (found) return found.id as string;
        if (!seed) return undefined;
        const result = await api.call(endpoint, "POST", body);
        if (typeof result.body?.id !== "string" || !result.body.id)
            throw new Error(`Creation did not return a valid ID: ${endpoint}`);
        return result.body.id as string;
    };
    const brokers = await api.items("v1/datasources/brokers?page=1&size=1000");
    const mqtt = seed ? mqttConfiguration() : null;
    fixtures.brokerId = await ensure(brokers, fixtureName, "v1/datasources/brokers", {
        name: fixtureName,
        url: mqtt?.host,
        port: mqtt?.port,
        protocolVersion: mqtt?.version,
        useTls: mqtt?.tls,
        clientName: `expo-review-${fixtures.topic.split("/")[1]}`,
        username: mqtt?.username,
        password: mqtt?.password,
    });
    persist();
    if (fixtures.brokerId && seed) {
        const state = await api.call(`v1/datasources/brokers/${fixtures.brokerId}/clients`);
        if (
            !["Connected", "Working", "Connecting", "Restarting"].includes(
                state.body?.connectionStatus,
            )
        )
            await api.call(`v1/datasources/brokers/${fixtures.brokerId}/clients`, "POST", {
                username: mqtt?.username,
                password: mqtt?.password,
            });
        const subscriptions = await api.items(
            `v1/datasources/brokers/${fixtures.brokerId}/subscriptions?page=1&size=1000`,
        );
        if (!subscriptions.some((row) => row.topic === `${fixtures.topic}/#`))
            await api.call(`v1/datasources/brokers/${fixtures.brokerId}/subscriptions`, "POST", {
                topic: `${fixtures.topic}/#`,
            });
    }
    const homeIcons = seed ? (await api.call("v1/homes/icons")).body : [];
    const homeIcon = homeIcons?.[0]?.key;
    if (seed && typeof homeIcon !== "string") throw new Error("Home icon catalog is unavailable.");
    fixtures.homeId = await ensure(
        await api.items("v1/homes?page=1&size=1000"),
        fixtureName,
        "v1/homes",
        { name: fixtureName, icon: homeIcon, dataSourceId: fixtures.brokerId },
    );
    persist();
    if (!fixtures.homeId) return fixtures;
    const home = await api.call(`v1/homes/${fixtures.homeId}`);
    if (
        home.body?.id !== fixtures.homeId ||
        home.body?.name !== fixtureName ||
        home.body?.isOwner !== true
    )
        throw new Error(
            "Test home must match the review namespace and belong to the test account.",
        );
    if (seed && fixtures.brokerId && home.body.dataSource?.id !== fixtures.brokerId)
        await api.call(`v1/homes/${fixtures.homeId}/datasource`, "PUT", {
            brokerId: fixtures.brokerId,
        });
    fixtures.roomId = await ensure(
        await api.items(`v1/homes/${fixtures.homeId}/rooms/display`),
        "Review room",
        `v1/homes/${fixtures.homeId}/rooms`,
        { name: "Review room" },
    );
    const deviceIcons = seed ? (await api.call("v1/devices/icons")).body : [];
    if (seed && typeof deviceIcons?.[0]?.key !== "string")
        throw new Error("Device icon catalog is unavailable.");
    fixtures.deviceId = await ensure(
        await api.items(`v1/devices?homeId=${fixtures.homeId}&page=1&size=1000`),
        fixtureName,
        "v1/devices",
        {
            homeId: fixtures.homeId,
            roomId: fixtures.roomId,
            name: fixtureName,
            icon: deviceIcons?.[0]?.key,
        },
    );
    persist();
    if (!fixtures.deviceId) return fixtures;
    const operations = await api.items(
        `v1/devices/operations/display?deviceId=${fixtures.deviceId}&page=1&size=1000`,
    );
    const definitions = [
        {
            type: "Boolean",
            widget: "Switch",
            configuration: { trueValue: true, falseValue: false },
            widgetConfiguration: {},
            value: "true",
        },
        {
            type: "Number",
            widget: "Display",
            configuration: { min: 0, max: 100, decimalSeparator: "." },
            widgetConfiguration: { unit: "°C" },
            value: "22.5",
        },
        {
            type: "Number",
            widget: "Slider",
            configuration: { min: 0, max: 100, decimalSeparator: "." },
            widgetConfiguration: { step: 1 },
            value: "45",
        },
        {
            type: "Text",
            widget: "Button",
            configuration: {},
            widgetConfiguration: { value: "review" },
            value: "review",
        },
        {
            type: "HexColor",
            widget: "Color",
            configuration: {},
            widgetConfiguration: {},
            value: "#F7B817",
        },
        {
            type: "Options",
            widget: "Radio",
            configuration: {
                options: [
                    { name: "Low", value: "low" },
                    { name: "High", value: "high" },
                ],
            },
            widgetConfiguration: {
                options: [
                    { optionName: "Low", displayName: "Low", icon: "bulb-outline" },
                    { optionName: "High", displayName: "High", icon: "bulb-outline" },
                ],
            },
            value: "low",
        },
    ];
    for (const definition of definitions) {
        const name = `Review ${definition.widget}`;
        const id = await ensure(operations, name, "v1/devices/operations", {
            deviceId: fixtures.deviceId,
            name,
            type: definition.type,
            topic: `${fixtures.topic}/${definition.widget.toLowerCase()}`,
            configuration: {
                isJson: false,
                jsonNames: [],
                saveOnUserAction: true,
                ...definition.configuration,
            },
        });
        if (id) fixtures.operations[definition.widget] = id;
        persist();
    }
    const widgets = await api.items(
        `v2/devices/widgets/display?deviceId=${fixtures.deviceId}&page=1&pageSize=50`,
    );
    for (const definition of definitions) {
        const operationId = fixtures.operations[definition.widget];
        if (!operationId) continue;
        const id = await ensure(widgets, `Review ${definition.widget}`, "v1/devices/widgets", {
            operationId,
            name: `Review ${definition.widget}`,
            type: definition.widget,
            configuration: definition.widgetConfiguration,
        });
        if (id) fixtures.widgets[definition.widget] = id;
        persist();
    }
    fixtures.dashboardId = await ensure(
        await api.items(
            `v1/devices/dashboards/display?deviceId=${fixtures.deviceId}&page=1&size=1000`,
        ),
        fixtureName,
        "v1/devices/dashboards",
        {
            deviceId: fixtures.deviceId,
            name: fixtureName,
            icon: "grid-outline",
            configuration: { rows: 4, columns: 2 },
        },
    );
    persist();
    if (seed && fixtures.dashboardId) {
        const dashboard = (await api.call(`v1/devices/dashboards/${fixtures.dashboardId}/display`))
            .body;
        const positioned = dashboard?.configuration?.positionedWidgets;
        if (!Array.isArray(positioned)) throw new Error("Invalid test dashboard configuration.");
        for (const [index, id] of Object.values(fixtures.widgets).entries()) {
            if (!positioned.some((row) => row.widget?.id === id || row.widgetId === id))
                await api.call(`v1/devices/dashboards/${fixtures.dashboardId}/widgets`, "PUT", {
                    widgetId: id,
                    row: Math.floor(index / 2),
                    column: index % 2,
                    rowSpan: 1,
                    columnSpan: 1,
                });
        }
    }
    fixtures.automationId = await ensure(
        await api.items(`v1/automations/display?homeId=${fixtures.homeId}&page=1&size=1000`),
        fixtureName,
        "v1/automations",
        {
            homeId: fixtures.homeId,
            name: fixtureName,
            icon: "flash-outline",
            conditionConnector: "And",
            conditions: [
                {
                    operationId: fixtures.operations.Switch,
                    conditionType: "BooleanCondition",
                    conditionConfiguration: { isOn: true },
                },
            ],
            results: [
                { operationId: fixtures.operations.Button, valueToSend: "review-automation" },
            ],
        },
    );
    fixtures.homes = [{ id: fixtures.homeId, name: fixtureName }];
    const homes = await api.items("v1/homes?page=1&size=1000");
    for (const suffix of ["Loft", "Garden"]) {
        const name = `${fixtureName} ${suffix}`;
        const id = await ensure(homes, name, "v1/homes", { name, icon: homeIcon });
        if (id) fixtures.homes.push({ id, name });
    }
    fixtures.devices = [];
    const examples = [
        {
            home: 0,
            room: "Living room",
            name: "Review living light",
            kind: "Switch",
            value: "true",
            unit: "",
        },
        {
            home: 0,
            room: "Living room",
            name: "Review thermostat",
            kind: "Slider",
            value: "21.5",
            unit: "°C",
        },
        {
            home: 0,
            room: "Office",
            name: "Review climate",
            kind: "Display",
            value: "23.2",
            unit: "°C",
        },
        { home: 0, room: "Office", name: "Review scene", kind: "Radio", value: "low", unit: "" },
        {
            home: 0,
            room: "Bedroom",
            name: "Review bedroom lamp",
            kind: "Switch",
            value: "false",
            unit: "",
        },
        {
            home: 0,
            room: "Bedroom",
            name: "Review air quality",
            kind: "Display",
            value: "48",
            unit: "ppm",
        },
        {
            home: 0,
            room: "Garden",
            name: "Review garden pump",
            kind: "Switch",
            value: "true",
            unit: "",
        },
        {
            home: 0,
            room: "Garden",
            name: "Review soil moisture",
            kind: "Display",
            value: "34",
            unit: "%",
        },
    ];
    for (const [index, example] of examples.entries()) {
        const targetHome = fixtures.homes[example.home];
        if (!targetHome) continue;
        const detail = (await api.call(`v1/homes/${targetHome.id}`)).body;
        if (
            detail?.id !== targetHome.id ||
            detail?.name !== targetHome.name ||
            detail?.isOwner !== true
        )
            throw new Error("Additional review home identity/ownership does not match.");
        const roomId = await ensure(
            await api.items(`v1/homes/${targetHome.id}/rooms/display`),
            example.room,
            `v1/homes/${targetHome.id}/rooms`,
            { name: example.room },
        );
        const id = await ensure(
            await api.items(`v1/devices?homeId=${targetHome.id}&page=1&size=1000`),
            example.name,
            "v1/devices",
            {
                homeId: targetHome.id,
                roomId,
                name: example.name,
                icon: deviceIcons?.[index % Math.max(deviceIcons.length, 1)]?.key,
            },
        );
        if (!id) continue;
        const definition = definitions.find((definition) => definition.widget === example.kind)!;
        const topic = `${fixtures.topic}/devices/${index + 1}/state`;
        const operationId = await ensure(
            await api.items(`v1/devices/operations/display?deviceId=${id}&page=1&size=1000`),
            example.name,
            "v1/devices/operations",
            {
                deviceId: id,
                name: example.name,
                type: definition.type,
                topic,
                configuration: {
                    isJson: false,
                    jsonNames: [],
                    saveOnUserAction: true,
                    ...definition.configuration,
                },
            },
        );
        if (!operationId) continue;
        const widgetId = await ensure(
            await api.items(`v2/devices/widgets/display?deviceId=${id}&page=1&pageSize=50`),
            example.name,
            "v1/devices/widgets",
            {
                operationId,
                name: example.name,
                type: definition.widget,
                configuration: {
                    ...definition.widgetConfiguration,
                    ...(example.unit ? { unit: example.unit } : {}),
                },
            },
        );
        if (!widgetId) continue;
        if (seed)
            await api.call(`v1/devices/${id}`, "PATCH", {
                type: example.kind === "Radio" ? "Options" : example.kind,
                ...(example.kind === "Display"
                    ? { displayableOperationId: operationId }
                    : { operationId }),
                configuration: {
                    unit: example.unit,
                    ...(example.kind === "Slider" ? { step: 0.5 } : {}),
                },
            });
        fixtures.devices.push({
            id,
            name: example.name,
            homeId: targetHome.id,
            operationId,
            widgetId,
            topic,
            value: example.value,
        });
        persist();
    }
    persist();
    return fixtures;
}

export function validateReviewControl(
    fixtures: Fixtures,
    type: string,
    widget: Record<string, unknown> | undefined,
    operation: Record<string, unknown> | undefined,
) {
    if (
        !/^expo-visual-review\/[a-f0-9]{12}$/.test(fixtures.topic) ||
        !fixtures.widgets[type] ||
        !fixtures.operations[type] ||
        widget?.id !== fixtures.widgets[type] ||
        widget.deviceId !== fixtures.deviceId ||
        widget.name !== `Review ${type}` ||
        widget.type !== type ||
        widget.operationId !== fixtures.operations[type] ||
        operation?.id !== fixtures.operations[type] ||
        operation.topic !== `${fixtures.topic}/${type.toLowerCase()}`
    )
        throw new Error("Control probe must target its matching named review widget and topic.");
}

export async function exerciseMqtt(fixtures: Fixtures, controls = false) {
    if (
        !fixtures.topic.startsWith("expo-visual-review/") ||
        !fixtures.brokerId ||
        !fixtures.homeId ||
        !fixtures.deviceId
    )
        throw new Error("Only fully prepared review fixtures can exercise MQTT.");
    const values = reviewMessages(fixtures);
    const commandValues = {
        Switch: false,
        Slider: 55,
        Button: "",
        Color: "#009286",
        Radio: "High",
    };
    const api = await testApi();
    if (controls)
        for (const type of Object.keys(commandValues)) {
            const widget = (await api.call(`v1/devices/widgets/${fixtures.widgets[type]}`)).body;
            const operation = (await api.call(`v1/devices/operations/${fixtures.operations[type]}`))
                .body;
            validateReviewControl(fixtures, type, widget, operation);
        }
    let connection = (await api.call(`v1/datasources/brokers/${fixtures.brokerId}/clients`)).body
        ?.connectionStatus;
    const deadlineReady = Date.now() + 20000;
    while (["Connecting", "Restarting"].includes(connection) && Date.now() < deadlineReady) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        connection = (await api.call(`v1/datasources/brokers/${fixtures.brokerId}/clients`)).body
            ?.connectionStatus;
    }
    if (!["Connected", "Working"].includes(connection))
        throw new Error(
            "Review broker client is not connected. Rerun capture with --seed to restore its test session after an API restart.",
        );
    const { connectAsync } = await import("mqtt");
    const mqtt = mqttConfiguration();
    const client = await connectAsync(
        `${mqtt.tls ? "mqtts" : "mqtt"}://${mqtt.host}:${mqtt.port}`,
        {
            username: mqtt.username,
            password: mqtt.password,
            protocolVersion: mqtt.version === "MqttV5" ? 5 : mqtt.version === "MqttV310" ? 3 : 4,
            connectTimeout: 15000,
            reconnectPeriod: 0,
            clientId: `review-probe-${Date.now()}`,
        },
    );
    const received: Record<string, string[]> = {};
    client.on("message", (topic, message) => {
        (received[topic] ??= []).push(message.toString());
    });
    try {
        await client.subscribeAsync(`${fixtures.topic}/#`, { qos: 1 });
        for (const [name, value] of Object.entries(values))
            await client.publishAsync(name, value, {
                qos: 1,
                retain: false,
            });
        const commands: { widget: string; status: number }[] = [];
        if (controls) {
            for (const [widget, value] of Object.entries(commandValues)) {
                const id = fixtures.widgets[widget];
                if (!id) throw new Error(`Missing review widget for command probe: ${widget}`);
                const response = await api.call(`v1/devices/widgets/${id}/action`, "POST", {
                    value,
                });
                commands.push({ widget, status: response.status });
            }
        }
        const deadline = Date.now() + 5000;
        while (Object.keys(received).length < Object.keys(values).length && Date.now() < deadline)
            await new Promise((resolve) => setTimeout(resolve, 100));
        if (!Object.entries(values).every(([name, value]) => received[name]?.includes(value)))
            throw new Error("MQTT loopback did not receive every test value.");
        return {
            topic: fixtures.topic,
            sent: values,
            received,
            commands,
            verifiedAt: new Date().toISOString(),
        };
    } finally {
        await client.endAsync();
    }
}
