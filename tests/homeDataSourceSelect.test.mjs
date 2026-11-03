import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const home = (id = "home-a", overrides = {}) => ({
    id,
    name: id === "home-a" ? "Home A" : "Home B",
    isOwner: true,
    canManage: true,
    dataSource: undefined,
    ...overrides,
});
const success = (data) => ({
    isSuccess: true,
    statusCode: 200,
    response: { json: async () => data },
});
const deferred = () => {
    let resolve;
    return { promise: new Promise((done) => (resolve = done)), resolve };
};
const settle = async (component) => {
    for (let index = 0; index < 6; index++) await Promise.resolve();
    await new Promise((resolve) => setImmediate(resolve));
    component.render();
};

function mountSelection({
    homeId = "home-a",
    current = home(),
    put = async () => ({ isSuccess: true, statusCode: 204, response: null }),
    refreshCurrent = async () => true,
    canGoBack = true,
    back = () => {},
    replace = () => {},
} = {}) {
    let focusEffect;
    const homes = { loading: false, current, refreshCurrent };
    const linkCalls = [];
    const refreshCalls = [];
    const navigation = [];
    const toastCalls = [];
    const router = {
        canGoBack: () => canGoBack,
        back: () => {
            navigation.push(["back"]);
            return back();
        },
        replace: (path) => {
            navigation.push(["replace", path]);
            return replace(path);
        },
        push: (path) => navigation.push(["push", path]),
    };
    const component = mountNativeComponent("src/app/(app)/home/dataSource/select.tsx", {
        modules: {
            "expo-router": {
                useLocalSearchParams: () => ({ homeId }),
                useFocusEffect: (callback) => (focusEffect = callback),
                useRouter: () => router,
            },
            "@/contexts/domain/HomeProvider": {
                useHomes: () => ({
                    ...homes,
                    refreshCurrent: (options) => {
                        refreshCalls.push(options && JSON.parse(JSON.stringify(options)));
                        return homes.refreshCurrent(options);
                    },
                }),
            },
            "@/contexts/HttpClientProvider": {
                useHttpClient: () => ({
                    put: (path, body) => {
                        linkCalls.push([path, JSON.parse(JSON.stringify(body))]);
                        return put(path, body);
                    },
                }),
            },
            "@/contexts/ToastProvider": {
                useToast: () =>
                    Object.fromEntries(
                        ["success", "error", "info", "httpError"].map((name) => [
                            name,
                            (...args) => toastCalls.push([name, ...args]),
                        ]),
                    ),
            },
            "@/components/common/ContentSection": "ContentSection",
            "@/components/common/SectionHeaderAction": "SectionHeaderAction",
            "@/components/common/Button": "Button",
            "@/components/common/Loading": "Loading",
            "@/components/common/ImageButton": "ImageButton",
            "@/components/dataSource/DataSourceList": "DataSourceList",
            "@/components/ui/alert": { Alert: "Alert", AlertDescription: "AlertDescription" },
            "@/components/ui/text": { Text: "Text" },
            "lucide-react-native": { CircleAlert: "CircleAlert", Info: "Info", Plus: "Plus" },
        },
    });
    return {
        component,
        homes,
        linkCalls,
        refreshCalls,
        navigation,
        toastCalls,
        list: () => component.elements().find((node) => node.type === "DataSourceList"),
        focus: () => focusEffect?.(),
        buttons: () =>
            [
                ...component.elements(),
                ...component.elements(
                    component.elements().find((node) => node.type === "DataSourceList")?.props
                        .feedback,
                ),
            ].filter((node) => node.type === "Button"),
    };
}

function mountHomeProvider(get) {
    const provider = mountNativeComponent("src/contexts/domain/HomeProvider.tsx", {
        exportName: "HomeProvider",
        modules: {
            "../HttpClientProvider": { useHttpClient: () => ({ get }) },
            "../ToastProvider": {
                useToast: () => ({ info() {}, httpError() {}, error() {} }),
            },
            "@/utils/location": { getCurrentLocation: async () => null },
        },
    });
    provider.flushEffects();
    return { provider, homes: () => provider.elements()[0].props.value };
}

test("accepted link survives assigned-home refresh and Retry never repeats PUT", async () => {
    let refresh = false;
    const routeOptions = [];
    const route = mountSelection({
        homeId: ["home-a", "ignored-home"],
        current: home(),
        refreshCurrent: async (options) => {
            routeOptions.push(options && JSON.parse(JSON.stringify(options)));
            if (refresh) route.homes.current = home("home-a", { dataSource: { id: "source-11" } });
            return refresh;
        },
    });
    const list = route.list();
    assert.ok(list);
    await list.props.onListItemSelected("source-11");
    await settle(route.component);

    assert.deepEqual(route.linkCalls[0], ["v1/homes/home-a/datasource", { brokerId: "source-11" }]);
    assert.equal(route.linkCalls.length, 1);
    assert.deepEqual(route.refreshCalls, [{ homeId: "home-a", background: true }]);
    assert.deepEqual(routeOptions, [{ homeId: "home-a", background: true }]);
    const failedRefresh = route.buttons().find((button) => button.props.name === "Retry");
    assert.ok(failedRefresh);

    refresh = true;
    route.homes.current = home("home-a", { dataSource: { id: "source-11" } });
    route.component.render();
    const retry = route.buttons().find((button) => button.props.name === "Retry");
    assert.ok(retry, route.component.text());
    await retry.props.onPress();
    await settle(route.component);

    assert.equal(route.linkCalls.length, 1);
    assert.deepEqual(route.refreshCalls, [
        { homeId: "home-a", background: true },
        { homeId: "home-a", background: true },
    ]);
    assert.deepEqual(routeOptions, [
        { homeId: "home-a", background: true },
        { homeId: "home-a", background: true },
    ]);
    assert.deepEqual(route.navigation, [["back"]]);
    assert.deepEqual(route.toastCalls, []);
});

test("home source assignment requires matching routed home and owner", async () => {
    for (const { homeId, current } of [
        { homeId: "home-a", current: home("home-a", { isOwner: false, canManage: true }) },
        { homeId: "home-a", current: home("home-a", { isOwner: false, canManage: false }) },
        { homeId: "home-a", current: home("home-b") },
        { homeId: "home-a", current: home("home-a", { dataSource: { id: "existing-source" } }) },
        { homeId: "", current: home("home-a") },
    ]) {
        const route = mountSelection({ homeId, current });
        const rowList = route.list();
        if (rowList) await rowList.props.onListItemSelected("source-11");
        assert.deepEqual(route.linkCalls, []);
        assert.equal(route.list(), undefined);
        assert.equal(
            route.component.elements().some((node) => node.type === "SectionHeaderAction"),
            false,
        );
    }
});

test("home-owner Add action shares route identity and stays disabled after acceptance", async () => {
    const route = mountSelection();
    const action = () =>
        route.component.elements().find((node) => node.type === "SectionHeaderAction");
    const header = action();
    assert.equal(header.props.label, "Add data source");
    assert.equal(header.props.disabled, false);
    header.props.onPress();
    assert.deepEqual(route.navigation, [["push", "dataSource/add"]]);

    const assigned = mountSelection({ refreshCurrent: async () => false });
    const list = assigned.list();
    await list.props.onListItemSelected("source-11");
    await settle(assigned.component);
    assert.equal(
        assigned.component.elements().find((node) => node.type === "SectionHeaderAction").props
            .disabled,
        true,
    );
});

test("double taps share a lock and retained row callbacks recheck ownership", async () => {
    const request = deferred();
    const route = mountSelection({ put: () => request.promise });
    const onSelect = route.list().props.onListItemSelected;
    const first = onSelect("source-11");
    const second = onSelect("source-11");
    assert.equal(route.linkCalls.length, 1);
    request.resolve({ isSuccess: false, statusCode: 503, response: null });
    await Promise.all([first, second]);
    await settle(route.component);

    const denied = mountSelection({ current: home("home-a") });
    const retained = denied.list().props.onListItemSelected;
    denied.homes.current.isOwner = false;
    denied.component.render();
    await retained("source-11");
    assert.deepEqual(denied.linkCalls, []);
});

test("a changed home blocks stale return and offers return to current home", async () => {
    const request = deferred();
    const route = mountSelection({ put: () => request.promise });
    const pending = route.list().props.onListItemSelected("source-11");
    route.homes.current = home("home-b");
    route.component.render();
    request.resolve({ isSuccess: true, statusCode: 204, response: null });
    await pending;
    await settle(route.component);

    assert.equal(route.linkCalls.length, 1);
    assert.deepEqual(route.navigation, []);
    assert.match(route.component.text(), /current home/i);
    const returnButton = route.buttons().find((button) => /home/i.test(button.props.name ?? ""));
    assert.ok(returnButton);
    await returnButton.props.onPress();
    assert.deepEqual(route.navigation, [["replace", "/home/details"]]);
});

test("no history returns to Home details and a thrown return retries without another PUT", async () => {
    const route = mountSelection({
        canGoBack: false,
        replace: (() => {
            let fail = true;
            return () => {
                if (fail) {
                    fail = false;
                    throw new Error("navigation failed");
                }
            };
        })(),
    });
    await route.list().props.onListItemSelected("source-11");
    await settle(route.component);
    assert.deepEqual(route.navigation, [["replace", "/home/details"]]);
    assert.equal(route.linkCalls.length, 1);

    const retry = route.buttons().find((button) => button.props.name === "Retry");
    assert.ok(retry, route.component.text());
    await retry.props.onPress();
    await settle(route.component);
    assert.equal(route.linkCalls.length, 1);
    assert.deepEqual(route.navigation, [
        ["replace", "/home/details"],
        ["replace", "/home/details"],
    ]);
});

test("captured refresh cannot replace another home and no-argument callers settle", async () => {
    let deferredHomeId;
    let pending;
    const provider = mountHomeProvider(async (path) => {
        if (path === "v1/homes/current")
            return { isSuccess: false, statusCode: 404, response: null };
        const id = path.split("/").at(-1);
        if (id === deferredHomeId) {
            deferredHomeId = undefined;
            pending = deferred();
            return pending.promise;
        }
        return success(home(id));
    });
    const context = provider.homes;
    await settle(provider.provider);
    await context().setCurrent("home-a");
    provider.provider.render();
    deferredHomeId = "home-a";
    const captured = context().refreshCurrent({ homeId: "home-a", background: true });
    await context().setCurrent("home-b");
    provider.provider.render();
    pending.resolve(success(home("home-a")));
    assert.equal(await captured, false);
    provider.provider.render();
    assert.equal(context().current.id, "home-b");
    assert.equal(context().loading, false);

    deferredHomeId = "home-b";
    const defaultRefresh = context().refreshCurrent();
    await context().setCurrent("home-a");
    provider.provider.render();
    pending.resolve(success(home("home-b")));
    assert.equal(await defaultRefresh, false);
    provider.provider.render();
    assert.equal(context().current.id, "home-a");
    assert.equal(context().loading, false);
});

test("refresh rejects malformed and thrown home responses and releases loading", async () => {
    for (const fail of [
        async () => ({ isSuccess: false, statusCode: 500, response: null }),
        async () => ({ isSuccess: true, statusCode: 200, response: { json: async () => ({}) } }),
        async () => ({
            isSuccess: true,
            statusCode: 200,
            response: { json: async () => ({ id: "another-home" }) },
        }),
        async () => {
            throw new Error("offline");
        },
    ]) {
        let homeReads = 0;
        const provider = mountHomeProvider(async (path) => {
            if (path === "v1/homes/current") return { isSuccess: false, statusCode: 404 };
            if (homeReads++ === 0) return success(home(path.split("/").at(-1)));
            return fail();
        });
        await settle(provider.provider);
        await provider.homes().setCurrent("home-a");
        provider.provider.render();
        // Make the selected-home read fail after the initial `setCurrent` request.
        const context = provider.homes();
        let refreshed;
        try {
            refreshed = await context.refreshCurrent();
        } catch {
            refreshed = "threw";
        }
        assert.equal(refreshed, false);
        provider.provider.render();
        assert.equal(provider.homes().loading, false);
    }
});
