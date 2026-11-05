import type { RouteRecord, Scenario, Step } from "./types.ts";
import type { Fixtures } from "./testData.ts";

export function validateScenarios(input: unknown, routes: Pick<RouteRecord, "id">[]): Scenario[] {
    if (!Array.isArray(input)) throw new Error("Scenario configuration must be an array.");
    for (const scenario of input) {
        if (
            !scenario ||
            typeof scenario !== "object" ||
            !routes.some((route) => route.id === scenario.routeId)
        )
            throw new Error("Scenario references an unknown route.");
        if (
            typeof scenario.state !== "string" ||
            !scenario.state.trim() ||
            scenario.state.length > 120
        )
            throw new Error("Scenario state must be a short nonempty string.");
        if (
            typeof scenario.assertVisible !== "string" ||
            !scenario.assertVisible ||
            scenario.assertVisible.length > 1000
        )
            throw new Error("Scenario needs a bounded visible assertion.");
        try {
            new RegExp(scenario.assertVisible);
        } catch {
            throw new Error("Invalid scenario assertion expression.");
        }
        for (const kind of ["steps", "setup", "cleanup", "verifySteps"]) {
            if (scenario[kind] === undefined) continue;
            if (!Array.isArray(scenario[kind]) || scenario[kind].length > 100)
                throw new Error("Scenario steps must be a bounded array.");
            for (const step of scenario[kind]) {
                if (!step || typeof step !== "object" || Object.keys(step).length !== 1)
                    throw new Error("Invalid scenario step.");
                const [key, value] = Object.entries(step)[0];
                if (["back", "scroll", "hideKeyboard", "eraseText"].includes(key) && value === true)
                    continue;
                if (
                    ["assertVisible", "assertNotVisible", "inputText"].includes(key) &&
                    typeof value === "string"
                )
                    continue;
                if (key === "openLink") {
                    if (
                        typeof value !== "string" ||
                        !/^\/(?!\/)/.test(value) ||
                        value.includes("\\")
                    )
                        throw new Error("Navigation steps must use internal route paths.");
                    continue;
                }
                if (
                    key === "inputTextEnv" &&
                    typeof value === "string" &&
                    /^(?:AGENT[2-4]_ACCOUNT_EMAIL|EXPO_REVIEW_INVITE_CODE_AGENT[2-4])$/.test(value)
                )
                    continue;
                if (
                    key === "tapOn" &&
                    (typeof value === "string" ||
                        (value &&
                            typeof value === "object" &&
                            Object.keys(value).every((name) =>
                                ["text", "id", "index"].includes(name),
                            ) &&
                            ("text" in value || "id" in value)))
                )
                    continue;
                throw new Error(`Unsupported scenario step: ${key}`);
            }
        }
    }
    return input as Scenario[];
}

export function defaultScenarios(routes: RouteRecord[], fixtures: Fixtures): Scenario[] {
    const { homeId, brokerId, deviceId, roomId, dashboardId, automationId } = fixtures;
    const definitions: Record<
        string,
        { marker: string; params?: Record<string, string | undefined> }
    > = {
        "/start": { marker: "Smart home.*|Choose server" },
        "/login": { marker: "Enter your email and password.*" },
        "/register": { marker: "Create your account to get started.*" },
        "/forgotPassword": { marker: "Send reset code" },
        "/server": { marker: "Server URL" },
        "/privacy": { marker: "Privacy Policy" },
        "/terms": { marker: "Terms and Conditions" },
        "/resetPassword": {
            marker: "Reset code",
            params: { email: process.env.AGENT_ACCOUNT_EMAIL },
        },
        "/confirmEmail": { marker: "Sign in" },
        "/maintenance": { marker: "Senswave is under maintenance" },
        "/": { marker: "Expo Visual Review" },
        "/home/list": { marker: "Expo Visual Review" },
        "/home/add": { marker: "e.g. My home" },
        "/home/join": { marker: ".*code.*|.*Code.*" },
        "/home/details": { marker: "Rooms" },
        "/home/share": { marker: ".*invit.*|.*Invit.*", params: { id: homeId } },
        "/home/dataSource/select": {
            marker: "This home already has a data source.*",
            params: { homeId },
        },
        "/home/room/add": { marker: ".*room.*|.*Room.*" },
        "/home/room/details": { marker: "Review room", params: { id: roomId } },
        "/dataSource/list": { marker: "Data sources" },
        "/dataSource/add": { marker: "Client name" },
        "/dataSource/details": { marker: "Overview", params: { id: brokerId } },
        "/dataSource/brokers/startBrokerClient": { marker: "Username", params: { brokerId } },
        "/dataSource/brokers/addSubscription": { marker: "Topic", params: { brokerId } },
        "/device/add": { marker: "Name" },
        "/device/details": { marker: "Expo Visual Review", params: { deviceId } },
        "/device/device": { marker: "Review Switch", params: { deviceId } },
        "/device/dashboard/add": { marker: "Rows", params: { deviceId } },
        "/device/dashboard/details": {
            marker: "Dashboard details",
            params: { deviceId, dashboardId },
        },
        "/device/dashboard/placeWidget": {
            marker: "Choose widget",
            params: { deviceId, dashboardId, row: "3", column: "0", rowSpan: "1", columnSpan: "1" },
        },
        "/device/operation/add": { marker: "Topic", params: { deviceId } },
        "/device/operation/details": {
            marker: "Review Switch",
            params: { deviceId, operationId: fixtures.operations.Switch },
        },
        "/device/operation/list": { marker: "Review Switch", params: { deviceId } },
        "/device/widget/list": { marker: "Review Switch", params: { deviceId } },
        "/device/widget/add": {
            marker: "Name",
            params: { deviceId, operationId: fixtures.operations.Switch },
        },
        "/device/widget/details": {
            marker: "Review Switch",
            params: { deviceId, widgetId: fixtures.widgets.Switch },
        },
        "/automation/list": { marker: "Expo Visual Review" },
        "/automation/add": { marker: "Create automation" },
        "/automation/details": { marker: "Automation details", params: { automationId } },
        "/user/profile": { marker: "Preferences" },
        "/user/info": { marker: ".*Version.*|.*version.*" },
        "/user/privacy": { marker: "Privacy Policy" },
        "/user/terms": { marker: "Terms and Conditions" },
    };
    const result: Scenario[] = [];
    for (const route of routes) {
        const definition = definitions[route.pathname];
        if (!definition) continue;
        const missing = Object.entries(definition.params ?? {}).find(([, value]) => !value);
        result.push({
            routeId: route.id,
            state:
                route.pathname === "/confirmEmail"
                    ? "missing-link-recovery"
                    : route.pathname === "/home/dataSource/select"
                      ? "already-linked-recovery"
                      : "default",
            params: definition.params as Record<string, string> | undefined,
            testData: true,
            authenticated: route.groups.includes("(app)"),
            assertVisible: definition.marker,
            ...(missing
                ? {
                      skip: `Missing local test fixture: ${missing[0]}. Run review:scan --capture --seed.`,
                  }
                : {}),
        });
    }
    const find = (pathname: string) => routes.find((route) => route.pathname === pathname)?.id;
    const chooseHome = (name: string): Step[] => [
        { openLink: "/" },
        { openLink: "/home/list" },
        { tapOn: `${name},.*` },
        { openLink: "/" },
        { assertVisible: name },
    ];
    const home = find("/");
    const sourceSelect = find("/home/dataSource/select");
    for (const alternate of fixtures.homes?.filter((item) => item.id !== homeId) ?? []) {
        if (home)
            result.push({
                routeId: home,
                state: `no-source-${alternate.name.endsWith("Loft") ? "loft" : "garden"}`,
                authenticated: true,
                setup: chooseHome(alternate.name),
                cleanup: chooseHome("Expo Visual Review"),
                assertVisible: "No data source connected.*",
            });
    }
    const unlinked = fixtures.homes?.find((item) => item.id !== homeId);
    if (sourceSelect && unlinked)
        result.push({
            routeId: sourceSelect,
            state: "choose-unlinked-home",
            params: { homeId: unlinked.id },
            testData: true,
            authenticated: true,
            setup: [
                ...chooseHome(unlinked.name),
                { openLink: `/home/dataSource/select?homeId=${encodeURIComponent(unlinked.id)}` },
            ],
            cleanup: chooseHome("Expo Visual Review"),
            assertVisible: "Choose a data source",
        });
    const brokerRoute = find("/dataSource/details");
    if (brokerRoute && brokerId)
        result.push({
            routeId: brokerRoute,
            state: "settings",
            params: { id: brokerId },
            testData: true,
            authenticated: true,
            steps: [{ tapOn: "Settings" }],
            assertVisible: "Client name",
        });
    const homeAdd = find("/home/add");
    if (homeAdd)
        result.push({
            routeId: homeAdd,
            state: "icon-sheet",
            cleanup: [{ tapOn: "Close selector" }],
            authenticated: true,
            steps: [{ tapOn: "Icon, .*" }],
            assertVisible: "Select icon",
        });
    const dashboard = find("/device/device");
    if (dashboard && deviceId)
        result.push({
            routeId: dashboard,
            state: "color-editor",
            cleanup: [{ tapOn: "Close selector" }],
            params: { deviceId },
            testData: true,
            authenticated: true,
            steps: [{ tapOn: "Review Color,.*" }],
            assertVisible: "Confirm color",
        });
    for (const type of ["Switch", "Button", "Display", "Slider", "Color", "Radio"]) {
        const operationId = fixtures.operations[type];
        const widgetId = fixtures.widgets[type];
        const add = find("/device/widget/add");
        const details = find("/device/widget/details");
        if (deviceId && operationId && add)
            result.push({
                routeId: add,
                state: `create-${type.toLowerCase()}`,
                params: { deviceId, operationId },
                testData: true,
                authenticated: true,
                ...(type !== "Button"
                    ? { steps: [{ tapOn: "Widget type, .*" }, { tapOn: type }] }
                    : {}),
                assertVisible: `Widget type, ${type}`,
            });
        if (deviceId && widgetId && details)
            result.push({
                routeId: details,
                state: `details-${type.toLowerCase()}`,
                params: { deviceId, widgetId },
                testData: true,
                authenticated: true,
                assertVisible: `Review ${type}`,
            });
    }
    for (const child of ["conditions", "results"]) {
        const id = find(`/automation/${child}/add`);
        if (id)
            result.push({
                routeId: id,
                state: "draft-child",
                authenticated: true,
                setup: [
                    { openLink: "/automation/add" },
                    { scroll: true },
                    { tapOn: child === "conditions" ? "Add condition" : "Add result" },
                ],
                assertVisible: "Device",
            });
    }
    return result;
}
