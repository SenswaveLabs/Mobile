import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const dashboardPath = "v1/devices/dashboards";
const dashboardIcons = [
    "grid-outline",
    "apps-outline",
    "layers-outline",
    "albums-outline",
    "pie-chart-outline",
    "stats-chart-outline",
    "analytics-outline",
    "bar-chart-outline",
    "list-outline",
    "clipboard-outline",
    "document-text-outline",
    "options-outline",
    "settings-outline",
    "construct-outline",
    "briefcase-outline",
    "filter-outline",
];
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

function mountForm(options = {}) {
    const {
        deviceId = "device-a",
        home = { current: { isOwner: true, canManage: false }, loading: false },
        post = async () => ({ isSuccess: true }),
        refresh = async () => {},
        canGoBack = true,
        back = () => {},
        replace = () => {},
    } = options;
    const device = { deviceId: options.activeDeviceId ?? deviceId, refresh };
    const requests = [];
    const refreshCalls = [];
    const navigation = [];
    const toastCalls = [];
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
    const form = mountNativeComponent("src/components/device/dashboards/AddDashboardForm.tsx", {
        props: { deviceId },
        modules: {
            "react-native": {
                StyleSheet: { create: (styles) => styles },
                Text: "Text",
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
            "@/contexts/custom/DeviceProvider": {
                useDevice: () => ({
                    ...device,
                    refresh: (useLoading) => {
                        refreshCalls.push(useLoading);
                        return device.refresh(useLoading);
                    },
                }),
            },
            "@/contexts/ThemeProvider": { useTheme: () => theme },
            "@/contexts/domain/HomeProvider": { useHomes: () => home },
            "@/styles/defaultStyles": { keyboardOffset: 48 },
            "@/components/common/Button": "Button",
            "@/components/common/FormSection": "FormSection",
            "@/components/common/IconSelector": "IconSelector",
            "@/components/common/Input": "Input",
            "@/components/ui/alert": { Alert: "Alert", AlertDescription: "AlertDescription" },
        },
    });
    focusCleanup = focusEffect?.();

    const field = (title) =>
        form.elements().find((node) => node.type === "Input" && node.props.title === title);
    const button = (name) =>
        form.elements().find((node) => node.type === "Button" && node.props.name === name);
    const iconSelector = () => form.elements().find((node) => node.type === "IconSelector");
    const alert = () => form.elements().find((node) => node.type === "Alert");
    const press = () => {
        const action = button("Create dashboard");
        assert.ok(action, "Create dashboard action exists");
        return action.props.onPress();
    };

    return {
        ...form,
        device,
        requests,
        refreshCalls,
        navigation,
        toastCalls,
        field,
        button,
        iconSelector,
        alert,
        change(title, value) {
            assert.ok(field(title), `${title} field exists`);
            field(title).props.setValue(value);
            form.render();
        },
        selectIcon(value) {
            iconSelector().props.onIconSelected(value);
            form.render();
        },
        press,
        async submit() {
            await press();
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

function mountRoute(
    params,
    home = { loading: false, current: { isOwner: true, canManage: false } },
) {
    const navigation = [];
    const router = {
        replace: (destination) => navigation.push(["replace", destination]),
    };
    const route = mountNativeComponent("src/app/(app)/device/dashboard/add.tsx", {
        modules: {
            "expo-router": {
                useLocalSearchParams: () => params,
                useRouter: () => router,
            },
            "react-native": { StyleSheet: { create: (styles) => styles }, View: "View" },
            "@/contexts/domain/HomeProvider": { useHomes: () => home },
            "@/contexts/ThemeProvider": { useTheme: () => theme },
            "@/components/common/Button": "Button",
            "@/components/ui/text": { Text: "Text" },
            "@/components/device/dashboards/AddDashboardForm": "AddDashboardForm",
        },
    });
    return { ...route, navigation, params };
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

test("dashboard creation matches the Home icon selector and preserves the existing icon keys", async () => {
    const form = mountForm();
    const section = form.elements().find((node) => node.type === "FormSection");
    assert.equal(section.props.title, "Create dashboard");
    assert.equal(
        section.props.helper,
        "Choose a name, icon and grid size for this device's dashboard.",
    );
    assert.equal(form.field("Name").props.error, "");
    assert.equal(form.field("Rows").props.error, "");
    assert.equal(form.field("Columns").props.error, "");
    assert.equal(form.field("Name").props.placeholder, "Living room controls");
    assert.equal(form.field("Rows").props.value, "6");
    assert.equal(form.field("Columns").props.value, "4");
    assert.equal(form.field("Name").props.returnKeyType, "next");
    assert.equal(form.field("Rows").props.returnKeyType, "next");
    assert.equal(form.field("Columns").props.returnKeyType, "go");
    assert.ok(form.text().includes("1–10 rows"));
    assert.ok(form.text().includes("1–5 columns"));
    assert.equal(form.iconSelector().props.defaultIcon, "grid-outline");
    assert.equal(form.iconSelector().props.variant, "brand");
    assert.deepEqual(Array.from(form.iconSelector().props.iconList), dashboardIcons);
    assert.equal(form.alert(), undefined);

    const defaultGrid = mountForm();
    defaultGrid.change("Name", "Controls");
    await defaultGrid.submit();
    assert.deepEqual(defaultGrid.requests, [
        [
            dashboardPath,
            {
                deviceId: "device-a",
                name: "Controls",
                icon: "grid-outline",
                configuration: { rows: 6, columns: 4 },
            },
        ],
    ]);

    form.change("Name", " Controls ");
    form.selectIcon("albums-outline");
    form.change("Rows", "10");
    form.change("Columns", "5");
    await form.submit();

    assert.deepEqual(form.requests, [
        [
            dashboardPath,
            {
                deviceId: "device-a",
                name: "Controls",
                icon: "albums-outline",
                configuration: { rows: 10, columns: 5 },
            },
        ],
    ]);
    assert.deepEqual(form.refreshCalls, [false]);
    assert.deepEqual(form.navigation, [["back"]]);
});

test("dashboard name and dimensions validate their trimmed boundaries", async () => {
    for (const [value, message] of [
        ["", "Name is required."],
        [" \t ", "Name is required."],
        ["ab", "Use 3–64 characters."],
        ["x".repeat(65), "Use 3–64 characters."],
    ]) {
        const form = mountForm();
        form.change("Name", value);
        await form.submit();
        assert.equal(form.requests.length, 0);
        assert.equal(form.field("Name").props.error, message);
        assert.equal(form.focused.at(-1), "Name");
    }

    for (const length of [3, 64]) {
        const form = mountForm();
        form.change("Name", ` ${"n".repeat(length)} `);
        await form.submit();
        assert.equal(form.requests[0][1].name, "n".repeat(length));
    }

    for (const value of ["", " ", "0", "-1", "1.5", "1e0", "NaN", "Infinity", "11"]) {
        const form = mountForm();
        form.change("Name", "Controls");
        form.change("Rows", value);
        await form.submit();
        assert.equal(form.requests.length, 0, `Rows ${JSON.stringify(value)} must reject`);
        assert.equal(form.field("Rows").props.error, "Use a whole number from 1 to 10.");
        assert.equal(form.focused.at(-1), "Rows");
    }

    for (const value of ["", " ", "0", "-1", "1.5", "1e0", "NaN", "Infinity", "6"]) {
        const form = mountForm();
        form.change("Name", "Controls");
        form.change("Columns", value);
        await form.submit();
        assert.equal(form.requests.length, 0, `Columns ${JSON.stringify(value)} must reject`);
        assert.equal(form.field("Columns").props.error, "Use a whole number from 1 to 5.");
        assert.equal(form.focused.at(-1), "Columns");
    }

    for (const [title, values] of [
        ["Rows", ["1", "10"]],
        ["Columns", ["1", "5"]],
    ]) {
        for (const value of values) {
            const form = mountForm();
            form.change("Name", "Controls");
            form.change(title, value);
            await form.submit();
            assert.equal(form.requests.length, 1, `${title} ${value} is valid`);
        }
    }
});

test("Go and touch share a synchronous lock while pending fields stay editable but guarded", async () => {
    const request = deferred();
    const form = mountForm({ post: () => request.promise });
    form.change("Name", "Controls");
    const go = form.field("Columns").props.onSubmitEditing;
    const action = form.button("Create dashboard").props.onPress;
    const pending = action();
    go();
    action();
    await form.settle();

    const nameField = form.field("Name");
    const oldName = nameField.props.value;
    const oldIcon = form.iconSelector().props.defaultIcon;
    assert.notEqual(nameField.props.editable, false);
    assert.equal(nameField.props.accessibilityState.busy, true);
    const nativeInput = mountSharedInput(nameField.props)
        .elements()
        .find((node) => node.type === "ReusableInput");
    assert.ok(nativeInput, "shared Input renders its native input host");
    assert.equal(nativeInput.props.accessibilityState.busy, true);
    assert.equal(nativeInput.props.accessibilityState.disabled, false);
    assert.equal(form.iconSelector().props.disabled, true);
    assert.equal(form.button("Create dashboard").props.disabled, true);
    nativeInput.props.onChangeText("Changed while pending");
    form.iconSelector().props.onIconSelected("albums-outline");
    go();
    action();
    await form.settle();

    assert.equal(form.field("Name").props.value, oldName);
    assert.equal(form.iconSelector().props.defaultIcon, oldIcon);
    assert.equal(form.requests.length, 1);
    request.resolve({ isSuccess: false });
    await pending;
    await form.settle();
});

test("rejected and thrown creates keep the draft and allow retry", async () => {
    for (const fail of [
        async () => ({ isSuccess: false }),
        async () => {
            throw new Error("offline");
        },
    ]) {
        const attempts = [fail, async () => ({ isSuccess: true })];
        const form = mountForm({ post: () => attempts.shift()() });
        form.change("Name", "Controls");
        await form.submit();
        assert.ok(
            form
                .text()
                .includes("Couldn't create the dashboard. Check your connection and try again."),
        );
        assert.equal(form.field("Name").props.value, "Controls");
        assert.equal(form.button("Create dashboard").props.disabled, false);
        await form.submit();
        assert.equal(form.requests.length, 2);
        assert.deepEqual(form.navigation, [["back"]]);
    }
});

test("accepted creates stay latched through deferred or failed refreshes", async () => {
    const refreshResult = deferred();
    const form = mountForm({ refresh: () => refreshResult.promise });
    form.change("Name", "Controls");
    const pending = form.press();
    await form.settle();
    assert.deepEqual(form.refreshCalls, [false]);
    form.button("Create dashboard").props.onPress();
    assert.equal(form.requests.length, 1);
    assert.deepEqual(form.navigation, []);
    refreshResult.resolve();
    await pending;
    await form.settle();
    assert.deepEqual(form.navigation, [["back"]]);

    const failedRefresh = mountForm({
        refresh: async () => {
            throw new Error("refresh failed");
        },
    });
    failedRefresh.change("Name", "Controls");
    await failedRefresh.submit();
    assert.deepEqual(failedRefresh.refreshCalls, [false]);
    assert.equal(failedRefresh.alert(), undefined);
    assert.equal(failedRefresh.requests.length, 1);
    assert.deepEqual(failedRefresh.navigation, [["back"]]);

    const staleRefresh = deferred();
    const changedDevice = mountForm({ post: () => staleRefresh.promise });
    changedDevice.change("Name", "Controls");
    const post = changedDevice.press();
    changedDevice.device.deviceId = "device-b";
    changedDevice.render();
    staleRefresh.resolve({ isSuccess: true });
    await post;
    assert.deepEqual(changedDevice.refreshCalls, []);
    assert.deepEqual(changedDevice.navigation, [["back"]]);
});

test("blur suppresses stale errors and accepted creates return once after refocus", async () => {
    const rejected = deferred();
    const failed = mountForm({ post: () => rejected.promise });
    failed.change("Name", "Controls");
    const failedPost = failed.press();
    failed.blur();
    rejected.resolve({ isSuccess: false });
    await failedPost;
    await failed.settle();
    assert.equal(failed.alert(), undefined);
    assert.deepEqual(failed.navigation, []);

    const accepted = deferred();
    const form = mountForm({ post: () => accepted.promise });
    form.change("Name", "Controls");
    const acceptedPost = form.press();
    form.blur();
    accepted.resolve({ isSuccess: true });
    await acceptedPost;
    assert.deepEqual(form.navigation, []);
    form.focus();
    assert.deepEqual(form.navigation, [["back"]]);
    form.focus();
    assert.deepEqual(form.navigation, [["back"]]);
});

test("no-history return and navigation recovery never repeat an accepted POST", async () => {
    const noHistory = mountForm({ canGoBack: false });
    noHistory.change("Name", "Controls");
    await noHistory.submit();
    assert.deepEqual(noHistory.navigation, [
        ["replace", { pathname: "/device/device", params: { deviceId: "device-a" } }],
    ]);

    let returns = 0;
    const brokenNavigation = mountForm({
        back: () => {
            if (returns++ === 0) throw new Error("navigation failed");
        },
    });
    brokenNavigation.change("Name", "Controls");
    await brokenNavigation.submit();
    assert.ok(
        brokenNavigation.text().includes("Dashboard created. Return to the device to view it."),
    );
    const recovery = brokenNavigation.button("Return to device");
    assert.ok(recovery);
    recovery.props.onPress();
    assert.equal(brokenNavigation.requests.length, 1);
    assert.deepEqual(brokenNavigation.navigation, [["back"], ["back"]]);
});

test("accepted create callback cannot submit after management permission is lost", async () => {
    const home = { current: { isOwner: true, canManage: false }, loading: false };
    let requests = 0;
    const form = mountForm({ home, post: async () => (requests++, { isSuccess: true }) });
    form.change("Name", "Controls");
    home.current = { isOwner: false, canManage: false };
    form.render();
    await form.submit();
    assert.equal(requests, 0);
});

test("dashboard route guards missing IDs and keys valid forms by normalized ID", () => {
    for (const params of [
        {},
        { deviceId: "" },
        { deviceId: " \t " },
        { deviceId: [] },
        { deviceId: ["", "device-a"] },
    ]) {
        const route = mountRoute(params);
        assert.equal(
            route.elements().some((node) => node.type === "AddDashboardForm"),
            false,
        );
        assert.ok(route.text().includes("Device not found"));
        const recovery = route.elements().find((node) => node.type === "Button");
        assert.equal(recovery.props.name, "Return to home");
        recovery.props.onPress();
        assert.deepEqual(route.navigation, [["replace", "/"]]);
    }

    const params = { deviceId: ["device-a", "ignored"] };
    const route = mountRoute(params);
    let form = route.elements().find((node) => node.type === "AddDashboardForm");
    assert.equal(form.props.deviceId, "device-a");
    assert.equal(form.props.key, "device-a");
    params.deviceId = ["device-b"];
    route.render();
    form = route.elements().find((node) => node.type === "AddDashboardForm");
    assert.equal(form.props.deviceId, "device-b");
    assert.equal(form.props.key, "device-b");
});

test("device dashboard selector uses the first option until its current ID resolves", () => {
    const dashboards = {
        loading: false,
        loadError: null,
        deviceId: "device-a",
        dashboards: [
            { id: "dashboard-a", name: "Main" },
            { id: "dashboard-b", name: "Second" },
        ],
        currentDashboardId: "",
        currentDashboard: { type: "grid", configuration: {} },
        setCurrentDashboardId: () => {},
        setDeviceId: () => {},
        refresh: async () => {},
    };
    const screen = mountNativeComponent("src/app/(app)/device/device.tsx", {
        modules: {
            "react-native": {
                View: "View",
                StyleSheet: { create: (styles) => styles },
                ScrollView: "ScrollView",
                RefreshControl: "RefreshControl",
            },
            "expo-router": {
                useLocalSearchParams: () => ({ deviceId: "device-a" }),
                useRouter: () => ({ push: () => {} }),
            },
            "@/contexts/custom/DeviceProvider": {
                useDevice: () => dashboards,
            },
            "@/contexts/custom/DeviceListProvider": {
                useDeviceList: () => ({
                    devices: [{ id: "device-a", name: "Lamp", presence: { value: true } }],
                }),
            },
            "@/components/common/Text": "Text",
            "@/contexts/domain/HomeProvider": {
                useHomes: () => ({ loading: false, current: { isOwner: false, canManage: false } }),
            },
            "@/contexts/ThemeProvider": { useTheme: () => theme },
            "@/components/common/Button": "Button",
            "@/components/common/SectionHeaderAction": "SectionHeaderAction",
            "@/components/common/BottomSheetSelect": "BottomSheetSelect",
            "@/components/common/Icon": "Icon",
            "@/components/common/Loading": "Loading",
            "@/components/ui/alert": { Alert: "Alert", AlertDescription: "AlertDescription" },
            "@/components/device/dashboards/DashboardView": "DashboardView",
        },
    });
    const selector = () => screen.elements().find((node) => node.type === "BottomSheetSelect");

    assert.ok(selector());
    assert.equal(selector().props.value, "Main");
    assert.equal(
        selector().props.options.find((option) => option.selected).label,
        "Main",
        "The unresolved provider ID falls back to the first option for the selector",
    );

    dashboards.currentDashboardId = "stale-dashboard";
    screen.render();
    assert.equal(selector().props.value, "Main");

    dashboards.currentDashboardId = "dashboard-b";
    screen.render();
    assert.equal(selector().props.value, "Second");
});
