import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const source = (id, name = "Broker") => ({
    id,
    name,
    server: "mqtt.example.test",
    createdAt: "",
    updatedAt: "",
});
const response = (items) => ({
    isSuccess: true,
    statusCode: 200,
    response: { json: async () => ({ items }) },
});
const deferred = () => {
    let resolve;
    return { promise: new Promise((done) => (resolve = done)), resolve };
};
const settle = async (component) => {
    for (let index = 0; index < 5; index++) await Promise.resolve();
    await new Promise((resolve) => setImmediate(resolve));
    component.render();
};

function mountList({ get } = {}) {
    let focusEffect;
    let session = { session: { authenticated: true, accessToken: "session-a" } };
    const reads = [];
    const client = {
        get: (path) => {
            reads.push(path);
            return get(path);
        },
    };
    const component = mountNativeComponent("src/components/dataSource/DataSourceList.tsx", {
        props: {
            header: { type: "SectionHeader", props: {} },
            feedback: { type: "ActionFeedback", props: {} },
            selectedSourceId: "source-11",
            pending: true,
        },
        modules: {
            "expo-router": { useFocusEffect: (callback) => (focusEffect = callback) },
            "@/contexts/SessionProvider": { useSession: () => session },
            "@/contexts/HttpClientProvider": { useHttpClient: () => client },
            "@/contexts/ThemeProvider": {
                useTheme: () => ({ current: { colors: { authForeground: "#111" } } }),
            },
            "@/contexts/ToastProvider": {
                useToast: () => ({ error() {}, info() {}, httpError() {} }),
            },
            "@/components/dataSource/tile/DataSourceTile": "DataSourceTile",
            "@/components/common/Loading": "Loading",
            "@/components/common/Text": "Text",
            "@/components/common/Button": "Button",
            "@/components/ui/alert": { Alert: "Alert", AlertDescription: "AlertDescription" },
        },
    });
    return {
        component,
        reads,
        flushEffects: () => component.flushEffects(),
        setSession(value) {
            session = value;
            component.render();
        },
        focus() {
            return focusEffect?.();
        },
        list() {
            return component.elements().find((node) => node.type === "FlatList");
        },
    };
}

test("source list loads all sources once per focus and keys rows by source ID", async () => {
    const list = mountList({ get: async () => response([source("source-11")]) });
    list.flushEffects();
    const blur = list.focus();
    await settle(list.component);

    assert.equal(list.reads[0], "v1/datasources/brokers?page=1&size=2147483647");
    assert.equal(list.reads.length, 1);
    assert.equal(list.list().props.keyExtractor(source("source-11"), 0), "source-11");
    assert.equal(list.list().props.data[0].id, "source-11");
    const selected = list.list().props.renderItem({ item: source("source-11"), index: 0 });
    const row = list.component.elements(selected).find((node) => node.type === "DataSourceTile");
    assert.equal(row.props.selected, true);
    assert.equal(row.props.loading, true);
    assert.equal(row.props.onClickDisabled, true);
    assert.ok(list.component.elements(selected).some((node) => node.type === "ActionFeedback"));
    blur?.();
});

test("404 is an empty list while failed, malformed and thrown first reads show recovery", async () => {
    const cases = [
        {
            get: async () => ({ isSuccess: false, statusCode: 404, response: null }),
            empty: true,
        },
        { get: async () => ({ isSuccess: false, statusCode: 503, response: null }) },
        {
            get: async () => ({
                isSuccess: true,
                statusCode: 200,
                response: { json: async () => ({ items: [{ name: "Missing ID" }] }) },
            }),
        },
        {
            get: async () => {
                throw new Error("offline");
            },
        },
    ];
    for (const { get, empty } of cases) {
        const unhandled = [];
        const onUnhandled = (error) => unhandled.push(error);
        process.on("unhandledRejection", onUnhandled);
        const list = mountList({ get });
        list.flushEffects();
        list.focus();
        await settle(list.component);
        process.off("unhandledRejection", onUnhandled);
        const flatList = list.list();
        if (list.reads.length === 0) assert.fail("Focused source list must request data");
        assert.ok(Array.isArray(flatList.props.data));
        if (empty) {
            assert.equal(flatList.props.data.length, 0);
            assert.match(JSON.stringify(flatList.props.ListEmptyComponent), /no data sources/i);
            assert.doesNotMatch(JSON.stringify(flatList.props.ListHeaderComponent) ?? "", /retry/i);
            assert.match(JSON.stringify(flatList.props.ListHeaderComponent), /ActionFeedback/);
        } else {
            assert.match(JSON.stringify(flatList.props.ListHeaderComponent) ?? "", /retry/i);
        }
        assert.deepEqual(unhandled, []);
    }
});

test("cached rows stay visible when refresh fails and Retry reloads them", async () => {
    let next = response([source("source-11")]);
    const list = mountList({ get: async () => next });
    list.flushEffects();
    list.focus();
    await settle(list.component);
    assert.equal(list.list().props.data[0].id, "source-11");

    next = { isSuccess: false, statusCode: 503, response: null };
    await list.list().props.refreshControl.props.onRefresh();
    await settle(list.component);
    assert.equal(list.list().props.data[0].id, "source-11");
    assert.match(JSON.stringify(list.list().props.ListHeaderComponent) ?? "", /retry/i);

    next = response([source("source-12", "Second broker")]);
    const retry = list.component
        .elements(list.list().props.ListHeaderComponent)
        .find((node) => node.type === "Button" && /retry/i.test(node.props.name ?? ""));
    assert.ok(retry);
    await retry.props.onPress();
    await settle(list.component);
    assert.equal(list.list().props.data[0].id, "source-12");
});

test("late reads from an old focus and session cannot replace current sources", async () => {
    const oldRead = deferred();
    const newRead = deferred();
    const list = mountList({
        get: () => (list.reads.length === 1 ? oldRead.promise : newRead.promise),
    });
    const oldBlur = list.focus();
    oldBlur?.();
    list.setSession({ session: { authenticated: true, accessToken: "session-b" } });
    list.focus();

    newRead.resolve(response([source("new-session-source")]));
    await settle(list.component);
    oldRead.resolve(response([source("old-session-source")]));
    await settle(list.component);

    assert.equal(list.list().props.data[0]?.id, "new-session-source");
});

test("selected linking row keeps status badge and names the source", () => {
    const tile = mountNativeComponent("src/components/dataSource/tile/DataSourceTile.tsx", {
        props: {
            id: "source-11",
            name: "Kitchen broker",
            server: "mqtt.example.test",
            variant: "list",
            selected: true,
            loading: true,
            onClickDisabled: true,
            onClicked() {},
        },
        modules: {
            "expo-router": { useRouter: () => ({ push() {} }) },
            "@/contexts/ThemeProvider": {
                useTheme: () => ({
                    current: {
                        colors: {
                            authBackground: "#fff",
                            authForeground: "#111",
                            authMuted: "#666",
                            authBorder: "#aaa",
                            authPrimary: "#fbbf24",
                        },
                    },
                }),
            },
            "../state/DataSourceStateGet": "DataSourceStateGet",
        },
    });
    const row = tile.elements().find((node) => node.type?.name === "ListRow");
    assert.equal(row.props.selected, true);
    assert.equal(row.props.loading, true);
    assert.equal(row.props.disabled, true);
    assert.match(JSON.stringify(row.props.children), /Linking/);
    assert.match(JSON.stringify(row.props.children), /Kitchen broker/);
    assert.match(JSON.stringify(row.props.trailing.props.children), /DataSourceStateGet/);
});

test("account source Add action stays available in list header", () => {
    const navigation = [];
    const route = mountNativeComponent("src/app/(app)/dataSource/list.tsx", {
        modules: {
            "expo-router": { useRouter: () => ({ navigate: (path) => navigation.push(path) }) },
            "lucide-react-native": { Plus: "Plus" },
            "@/contexts/ThemeProvider": {
                useTheme: () => ({ current: { colors: { authForeground: "#111" } } }),
            },
            "@/components/common/ContentSection": "ContentSection",
            "@/components/common/SectionHeaderAction": "SectionHeaderAction",
            "@/components/dataSource/DataSourceList": "DataSourceList",
        },
    });
    const list = route.elements().find((node) => node.type === "DataSourceList");
    const header = list.props.header;
    assert.equal(header.props.title, "Data sources");
    assert.equal(header.props.headerAction.props.label, "Add data source");
    header.props.headerAction.props.onPress();
    assert.deepEqual(navigation, ["dataSource/add"]);
});
