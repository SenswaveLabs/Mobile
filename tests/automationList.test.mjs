import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const home = (id = "home-1", role = "Owner") => ({
    id,
    name: `Home ${id}`,
    isOwner: role === "Owner",
    canManage: role === "Manage",
});

const automation = (id = "automation-1", homeId = "home-1", results = []) => ({
    id,
    homeId,
    name: `Automation ${id}`,
    icon: "flash-outline",
    conditionConnector: "And",
    isEnabled: true,
    conditions: [],
    results,
});

const response = (items) => ({
    isSuccess: true,
    statusCode: 200,
    response: { json: async () => ({ items }) },
});

const deferred = () => {
    let resolve;
    const promise = new Promise((done) => {
        resolve = done;
    });
    return { promise, resolve };
};

async function settle(component, turns = 10) {
    for (let index = 0; index < turns; index++) {
        await Promise.resolve();
        component.render();
        component.flushEffects();
    }
}

function mountAutomationListProvider(get, current = home()) {
    const homes = { current };
    const requests = [];
    const toasts = [];
    const component = mountNativeComponent("src/contexts/custom/AutomationListProvider.tsx", {
        exportName: "AutomationListProvider",
        modules: {
            "../domain/HomeProvider": { useHomes: () => homes },
            "../HttpClientProvider": {
                useHttpClient: () => ({
                    get: (path) => {
                        requests.push(path);
                        return get(path);
                    },
                }),
            },
            "../ToastProvider": {
                useToast: () => ({
                    httpError: () => toasts.push("http"),
                    error: (message) => toasts.push(message),
                }),
            },
        },
    });
    const value = () => component.output().props.value;
    return { component, homes, requests, toasts, value };
}

function mountAutomationList(provider, navigation = []) {
    return mountNativeComponent("src/components/automations/AutomationList.tsx", {
        modules: {
            "@/contexts/custom/AutomationListProvider": { useAutomationList: provider.value },
            "@/contexts/domain/HomeProvider": { useHomes: () => provider.homes },
            "@/contexts/ThemeProvider": {
                useTheme: () => ({
                    current: {
                        colors: {
                            background: "background",
                            authMuted: "muted",
                            authPrimary: "primary",
                            error: "error",
                        },
                    },
                }),
            },
            "expo-router": {
                useRouter: () => ({
                    push() {},
                    navigate: (route) => navigation.push(route),
                }),
            },
            "@/components/common/ContentSection": "ContentSection",
            "@/components/common/SectionHeaderAction": "SectionHeaderAction",
            "@/components/common/Icon": "Icon",
            "./AutomationTile": "AutomationTile",
        },
    });
}

const listHeader = (component) =>
    component.elements(
        component.elements().find((node) => node.type === "FlatList").props.ListHeaderComponent,
    );

const listEmpty = (component) =>
    component.elements(
        component.elements().find((node) => node.type === "FlatList").props.ListEmptyComponent,
    );

test("refresh for another home returns false without a request", async () => {
    const mounted = mountAutomationListProvider(async () => response([]));
    assert.equal(await mounted.value().refresh("other-home"), false);
    assert.equal(mounted.requests.length, 0);
});

test("no-home list has a home selection recovery action", () => {
    const provider = mountAutomationListProvider(async () => response([]), null);
    provider.component.flushEffects();
    const navigation = [];
    const list = mountAutomationList(provider, navigation);
    const selectHome = listEmpty(list).find(
        (node) => node.type === "SectionHeaderAction" && node.props.label === "Select home",
    );

    assert.ok(selectHome);
    assert.equal(selectHome.props.accessibilityLabel, "Select home");
    selectHome.props.onPress();
    assert.deepEqual(navigation, ["home/list"]);
});

test("empty wording distinguishes managers from viewers", async () => {
    const provider = mountAutomationListProvider(
        async () => response([]),
        home("home-1", "Manage"),
    );
    provider.component.flushEffects();
    await settle(provider.component);
    const list = mountAutomationList(provider);
    const text = () => listEmpty(list).find((node) => node.type === "Text")?.props.children[0];
    const managerCopy = text();

    provider.homes.current = home("home-1", "Display");
    list.render();
    const viewerCopy = text();

    assert.equal(managerCopy, "No automations yet. Add one to get started.");
    assert.equal(viewerCopy, "No automations are configured for this home yet.");
});

test("list rejects late previous-home data", async () => {
    const previousHome = deferred();
    const currentHome = deferred();
    const mounted = mountAutomationListProvider((path) =>
        path.endsWith("home-1") ? previousHome.promise : currentHome.promise,
    );
    mounted.component.flushEffects();
    assert.equal(mounted.requests.length, 1);
    assert.equal(mounted.requests[0], "v1/automations/display?homeId=home-1");
    const previousRefresh = mounted.value().refresh;

    mounted.homes.current = home("home-2", "Display");
    mounted.component.render();
    assert.equal(mounted.value().automations.length, 0);
    assert.equal(await previousRefresh("home-1"), false);
    assert.equal(mounted.requests.length, 1);
    mounted.component.flushEffects();
    assert.equal(mounted.requests.length, 2);

    currentHome.resolve(response([automation("current", "home-2")]));
    await settle(mounted.component);
    previousHome.resolve(response([automation("previous", "home-1")]));
    await settle(mounted.component);

    assert.equal(mounted.value().homeId, "home-2");
    assert.equal(mounted.value().automations[0].id, "current");
});

test("empty differs from failure", async () => {
    const empty = mountAutomationListProvider(async () => response([]));
    empty.component.flushEffects();
    await settle(empty.component);
    assert.equal(empty.value().automations.length, 0);
    assert.equal(empty.value().error, undefined);

    const failed = mountAutomationListProvider(async () => ({ isSuccess: false, statusCode: 503 }));
    failed.component.flushEffects();
    await settle(failed.component);
    assert.equal(failed.value().automations.length, 0);
    assert.ok(failed.value().error);
    assert.deepEqual(failed.toasts, []);

    const notFound = mountAutomationListProvider(async () => ({
        isSuccess: false,
        statusCode: 404,
    }));
    notFound.component.flushEffects();
    await settle(notFound.component);
    assert.equal(notFound.value().automations.length, 0);
    assert.equal(notFound.value().error, undefined);

    const malformed = mountAutomationListProvider(async () => ({
        isSuccess: true,
        statusCode: 200,
        response: { json: async () => ({ items: "not-a-list" }) },
    }));
    malformed.component.flushEffects();
    await settle(malformed.component);
    assert.equal(malformed.value().automations.length, 0);
    assert.ok(malformed.value().error);
});

test("one operation automation remains one visible list row", async () => {
    const item = automation("one-result", "home-1", [
        { operationId: "operation-1", operationName: "Lamp", valueToSend: "on" },
    ]);
    const provider = mountAutomationListProvider(
        async () => response([item]),
        home("home-1", "Display"),
    );
    provider.component.flushEffects();
    await settle(provider.component);

    const navigation = [];
    const list = mountAutomationList(provider, navigation);

    const flatList = list.elements().find((node) => node.type === "FlatList");
    assert.equal(flatList.props.data.length, 1);
    assert.equal(flatList.props.data[0].results.length, 1);
    assert.equal(
        listHeader(list).some(
            (node) => node.type === "SectionHeaderAction" && node.props.label === "Add automation",
        ),
        false,
    );

    provider.homes.current = home("home-1", "Manage");
    list.render();
    const add = listHeader(list).find(
        (node) => node.type === "SectionHeaderAction" && node.props.label === "Add automation",
    );
    assert.ok(add);
    add.props.onPress();
    assert.deepEqual(navigation, ["automation/add"]);
});

test("automation rows keep status text, details navigation, and no long-press deletion", () => {
    const navigation = [];
    const component = mountNativeComponent("src/components/automations/AutomationTile.tsx", {
        props: {
            automationId: "automation-1",
            automationIcon: "flash-outline",
            automationName: "Night lights",
            automationIsEnabled: false,
            isPressDisabled: false,
            variant: "list",
        },
        modules: {
            "@/contexts/ThemeProvider": {
                useTheme: () => ({
                    current: { colors: { authMuted: "muted", error: "error", success: "success" } },
                }),
            },
            "@/components/common/Icon": "Icon",
            "@/components/common/Text": "Text",
            "@/components/common/ListRow": "ListRow",
            "@/styles/shadowStyles": { shadowStyles: { default: {} } },
            "expo-router": { useRouter: () => ({ push: (route) => navigation.push(route) }) },
        },
    });
    const row = component.elements().find((node) => node.type === "ListRow");
    assert.equal(row.props.accessibilityLabel, "Night lights");
    assert.equal(row.props.onLongPress, undefined);
    assert.ok(
        component
            .elements(row.props.description)
            .some((node) => node.type === "Text" && node.props.children[0] === "Disabled"),
    );
    row.props.onPress();
    assert.equal(navigation[0].pathname, "automation/details");
    assert.equal(navigation[0].params.automationId, "automation-1");
});

test("refresh failure retains rows and exposes local recovery", async () => {
    let result = response([automation()]);
    const mounted = mountAutomationListProvider(async () => result);
    mounted.component.flushEffects();
    await settle(mounted.component);
    const previousRows = mounted.value().automations;

    result = { isSuccess: false, statusCode: 503 };
    assert.equal(await mounted.value().refresh(), false);
    await settle(mounted.component);
    const refreshFailureRows = mounted.value().automations;
    assert.equal(refreshFailureRows.length, previousRows.length);
    assert.ok(mounted.value().error);

    const list = mountAutomationList(mounted);
    const header = listHeader(list);
    assert.ok(
        header.some(
            (node) => node.type === "Text" && node.props.children[0] === mounted.value().error,
        ),
    );
    const retry = header.find(
        (node) => node.type === "SectionHeaderAction" && node.props.label === "Retry",
    );
    assert.ok(retry);
    const requestCount = mounted.requests.length;
    retry.props.onPress();
    assert.equal(mounted.requests.length, requestCount + 1);
});
