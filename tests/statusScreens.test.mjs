import assert from "node:assert/strict";
import test from "node:test";
import { makeFocusLifecycle, mountNativeComponent } from "./nativeComponentHarness.mjs";

const flush = async () => {
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
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

const defaultExport = (value) => ({ __esModule: true, default: value });

function mountMaintenance(initialSession, router = { replace: () => {} }) {
    let session = initialSession;
    let focus;
    const screen = mountNativeComponent("src/app/maintenance.tsx", {
        modules: (React) => {
            focus = makeFocusLifecycle(React);
            return {
                "expo-router": {
                    useRouter: () => router,
                    useFocusEffect: (callback) => focus.useFocusEffect(callback),
                },
                "@/contexts/SessionProvider": { useSession: () => session },
                "@/components/common/Text": defaultExport("Text"),
                "@/components/common/Tile": defaultExport("Tile"),
                "@/components/common/Button": defaultExport("Button"),
                "../assets/icon.png": 1,
            };
        },
    });
    screen.flushEffects();
    return {
        ...screen,
        focus: () => focus.focus(),
        blur: () => focus.blur(),
        setSession: (next) => {
            session = next;
            screen.render();
        },
        button: () => screen.elements().find((node) => node.type === "Button"),
        scroll: () => screen.elements().find((node) => node.type === "ScrollView"),
    };
}

function mountInfo() {
    const paths = [];
    const screen = mountNativeComponent("src/app/(app)/user/info.tsx", {
        modules: {
            "expo-constants": defaultExport({ expoConfig: { version: "9.8.7" } }),
            "expo-router": { useRouter: () => ({ push: (path) => paths.push(path) }) },
            "@/components/common/SimpleItemList": defaultExport("SimpleItemList"),
        },
        timers: {
            process: {
                env: {
                    EXPO_PUBLIC_MINIMAL_API_VERSION: "4.5.6",
                    EXPO_PUBLIC_CONTACT_EMAIL: "contact@example.test",
                },
            },
        },
    });
    return { ...screen, paths };
}

function mountAppLayout() {
    const Stack = Object.assign(() => {}, { Screen: "Screen" });
    const screen = mountNativeComponent("src/app/(app)/_layout.tsx", {
        modules: {
            "@/contexts/SessionProvider": {
                useSession: () => ({
                    maintenance: false,
                    session: { loading: false, authenticated: true },
                }),
            },
            "expo-router": { Stack, Redirect: "Redirect" },
            "expo-splash-screen": {
                preventAutoHideAsync: () => {},
                setOptions: () => {},
                hide: () => {},
            },
            "@/components/headers/ProfileHeader": defaultExport("ProfileHeader"),
            "@/contexts/ThemeProvider": {
                useTheme: () => ({ current: { colors: { background: "#fff" } } }),
            },
            "@/contexts/domain/HomeProvider": { HomeProvider: "HomeProvider" },
            "@/contexts/domain/LiveUpdateProvider": { LiveUpdateProvider: "LiveUpdateProvider" },
            "@/contexts/custom/DeviceListProvider": { DeviceListProvider: "DeviceListProvider" },
            "@/components/headers/DefaultHeader": defaultExport("DefaultHeader"),
            "@/contexts/custom/DeviceProvider": { DeviceProvider: "DeviceProvider" },
            "@/components/common/Loading": defaultExport("Loading"),
            "@/contexts/ModalProvider": { ModalProvider: "ModalProvider" },
            "@/contexts/custom/AutomationListProvider": {
                AutomationListProvider: "AutomationListProvider",
            },
            "@/contexts/custom/AutomationProvider": defaultExport("AutomationProvider"),
        },
    });
    const internal = screen
        .elements()
        .find((node) => typeof node.type === "function" && node.type.name === "InternalLayout");
    assert.ok(internal, "authenticated Stack layout is present");
    return { screen, layout: internal.type() };
}

test("maintenance keeps neutral copy and shares Retry and pull refresh lock", async () => {
    const request = deferred();
    let attempts = 0;
    const screen = mountMaintenance({
        maintenance: true,
        session: { loading: false, authenticated: false },
        initialize: () => {
            attempts++;
            return request.promise;
        },
    });
    screen.focus();
    const retry = screen.button();
    assert.ok(retry);
    retry.props.onPress();
    screen.scroll().props.refreshControl.props.onRefresh();
    assert.equal(attempts, 1);

    const initialText = JSON.stringify(screen.output());
    assert.match(initialText, /unavailable|update/i);
    assert.doesNotMatch(initialText, /store|countdown/i);
    request.resolve();
    await flush();
    screen.render();
    screen.flushEffects();
    assert.equal(attempts, 1);
});

test("maintenance exits to Start only after completed compatible anonymous recovery", async () => {
    const request = deferred();
    const routes = [];
    let current;
    const router = { replace: (path) => routes.push(path) };
    current = {
        maintenance: true,
        session: { loading: false, authenticated: false },
        initialize: () => request.promise,
    };
    const screen = mountMaintenance(current, router);
    screen.focus();
    const retry = screen.button();
    assert.ok(retry);
    retry.props.onPress();

    current = {
        maintenance: false,
        session: { loading: false, authenticated: false },
        initialize: () => request.promise,
    };
    screen.setSession(current);
    request.resolve();
    await flush();
    screen.render();
    screen.flushEffects();

    assert.deepEqual(routes, ["/start"]);
});

test("maintenance preserves provider consents navigation after authenticated recovery", async () => {
    const request = deferred();
    const screenRoutes = [];
    const providerRoutes = [];
    const router = { replace: (path) => screenRoutes.push(path) };
    const initialize = async () => {
        await request.promise;
        providerRoutes.push("/consents");
    };
    let current = {
        maintenance: true,
        session: { loading: false, authenticated: false },
        initialize,
    };
    const screen = mountMaintenance(current, router);
    screen.focus();
    const retry = screen.button();
    assert.ok(retry);
    retry.props.onPress();

    current = {
        maintenance: false,
        session: { loading: true, authenticated: false },
        initialize,
    };
    screen.setSession(current);
    screen.flushEffects();
    assert.deepEqual(
        screenRoutes,
        [],
        "maintenance false alone cannot navigate before refresh finishes",
    );

    current = {
        maintenance: false,
        session: { loading: false, authenticated: true },
        initialize,
    };
    screen.setSession(current);
    request.resolve();
    await flush();
    screen.render();
    screen.flushEffects();

    assert.deepEqual(providerRoutes, ["/consents"]);
    assert.equal(screenRoutes.includes("/start"), false);
    assert.equal(screenRoutes.includes("/consents"), false);
});

test("maintenance shows local retry when initialization throws", async () => {
    const routes = [];
    const screen = mountMaintenance(
        {
            maintenance: true,
            session: { loading: false, authenticated: false },
            initialize: async () => {
                throw new Error("refresh failed");
            },
        },
        { replace: (path) => routes.push(path) },
    );
    screen.focus();
    screen.button().props.onPress();
    await flush();
    screen.render();

    assert.match(screen.text(), /couldn't check the service status/i);
    assert.ok(screen.button());
    assert.deepEqual(routes, []);
});

test("maintenance ignores screen navigation after blur but keeps provider initialization", async () => {
    const request = deferred();
    const routes = [];
    const router = { replace: (path) => routes.push(path) };
    let current = {
        maintenance: true,
        session: { loading: false, authenticated: false },
        initialize: async () => {
            await request.promise;
            routes.push("provider:/consents");
        },
    };
    const screen = mountMaintenance(current, router);
    screen.focus();
    const retry = screen.button();
    assert.ok(retry);
    retry.props.onPress();
    screen.blur();
    current = {
        maintenance: false,
        session: { loading: false, authenticated: true },
        initialize: current.initialize,
    };
    screen.setSession(current);
    request.resolve();
    await flush();
    screen.render();

    assert.deepEqual(routes, ["provider:/consents"]);
    assert.doesNotMatch(JSON.stringify(screen.output()), /couldn't check the service status/i);
});

test("App information retains metadata, legal destinations and a growing scroll", () => {
    const screen = mountInfo();
    const scrolls = screen.elements().filter((node) => node.type === "ScrollView");
    const list = screen.elements().find((node) => node.type === "SimpleItemList");

    assert.equal(scrolls.length, 1);
    assert.ok(scrolls[0].props.contentContainerStyle.paddingBottom >= 16);
    assert.ok(
        screen.elements().some((node) => Object.values(node.props?.style ?? {}).includes(448)),
    );
    assert.deepEqual(
        Array.from(list.props.items, ({ name, value }) => [name, value]),
        [
            ["App Version", "9.8.7"],
            ["Min. Api Version", "4.5.6"],
            ["Email", "contact@example.test"],
            ["Terms And Conditions", undefined],
            ["Privacy Policy", undefined],
        ],
    );
    list.props.items[3].onClick();
    list.props.items[4].onClick();
    assert.deepEqual(screen.paths, ["user/terms", "user/privacy"]);
});

test("App information renders long row values without the shared Text cap", () => {
    const list = mountNativeComponent("src/components/common/SimpleItemList.tsx", {
        props: {
            items: [
                {
                    icon: "mail-outline",
                    name: "Contact",
                    value: "contact-".repeat(30) + "@example.test",
                },
            ],
        },
        modules: {
            "./ListRow": defaultExport("ListRow"),
            "./Text": defaultExport("Text"),
            "./Icon": defaultExport("Icon"),
        },
    });
    const value = list.elements().find((node) => node.type === "Text");
    assert.equal(value?.props.numberOfLines, 0);
});

test("authenticated Stack gives private legal and info pages brand headers", () => {
    const { screen, layout } = mountAppLayout();
    const entries = screen.elements(layout).filter((node) => node.type === "Screen");
    for (const [name, titlePrefix, titleSuffix] of [
        ["user/privacy", "Privacy", "Policy"],
        ["user/terms", "Terms", ""],
        ["user/info", "App", "Info"],
    ]) {
        const entry = entries.find((node) => node.props.name === name);
        const header = entry?.props.options.header();
        assert.equal(header?.type, "DefaultHeader");
        assert.equal(header.props.variant, "brand");
        assert.equal(header.props.titlePrefix, titlePrefix);
        assert.equal(header.props.titleSuffix, titleSuffix);
    }
});
