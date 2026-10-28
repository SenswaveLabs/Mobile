import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const icons = [
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
            primary: "#d79b06",
            secondary: "#29251f",
        },
    },
};
const savedDashboard = {
    id: "dashboard-a",
    name: "Controls",
    icon: "grid-outline",
    type: "grid",
    configuration: { rows: 6, columns: 4 },
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
    for (let index = 0; index < 20; index++) await Promise.resolve();
    component.render();
}

function mountForm({
    dashboard = savedDashboard,
    onSubmit = async () => {},
    disabled = false,
} = {}) {
    let focusEffect;
    let cleanup;
    const form = mountNativeComponent("src/components/device/dashboards/DashboardForm.tsx", {
        props: { dashboard, onSubmit, disabled },
        modules: {
            "expo-router": { useFocusEffect: (callback) => (focusEffect = callback) },
            "react-native": {
                AccessibilityInfo: { announceForAccessibility: () => {} },
                StyleSheet: { create: (styles) => styles },
                TextInput: "TextInput",
                View: "View",
            },
            "react-native-keyboard-controller": {
                KeyboardAwareScrollView: "KeyboardAwareScrollView",
            },
            "@/contexts/ThemeProvider": { useTheme: () => theme },
            "@/styles/defaultStyles": { keyboardOffset: 48 },
            "@/components/common/Button": "Button",
            "@/components/common/ContentSection": "ContentSection",
            "@/components/common/FormSection": "FormSection",
            "@/components/common/IconSelector": "IconSelector",
            "@/components/common/Input": "Input",
            "@/components/ui/alert": { Alert: "Alert", AlertDescription: "AlertDescription" },
            "@/components/ui/text": { Text: "Text" },
            "lucide-react-native": { CircleAlert: "CircleAlert", Info: "Info" },
        },
    });
    form.flushEffects();
    cleanup = focusEffect?.();

    const field = (title) =>
        form.elements().find((node) => node.type === "Input" && node.props.title === title);
    const button = (name = "Save changes") =>
        form.elements().find((node) => node.type === "Button" && node.props.name === name);
    const iconSelector = () => form.elements().find((node) => node.type === "IconSelector");

    return {
        ...form,
        field,
        button,
        iconSelector,
        change(title, value) {
            assert.ok(field(title), `${title} field exists`);
            field(title).props.setValue(value);
            form.render();
        },
        selectIcon(value) {
            iconSelector().props.onIconSelected(value);
            form.render();
        },
        press(name) {
            const action = button(name);
            assert.ok(action, `${name ?? "Save changes"} action exists`);
            return action.props.onPress();
        },
        blur() {
            cleanup?.();
            cleanup = undefined;
        },
        focus() {
            cleanup = focusEffect?.();
        },
    };
}

function mountDetails({
    params = { dashboardId: "dashboard-a", deviceId: "device-a" },
    currentDashboardId = "dashboard-a",
    deviceId = "device-a",
    home = { loading: false, current: { isOwner: true, canManage: false } },
    get = async () => ({
        isSuccess: true,
        response: { json: async () => savedDashboard },
    }),
    patch = async () => ({ isSuccess: true }),
    remove = async () => ({ isSuccess: true }),
    refresh = async () => {},
    canGoBack = true,
    back = () => {},
    replace = () => {},
} = {}) {
    const requests = { get: [], patch: [], delete: [] };
    const refreshCalls = [];
    const navigation = [];
    const device = {
        deviceId,
        currentDashboardId,
        refresh: (useLoading) => {
            refreshCalls.push(useLoading);
            return refresh(useLoading);
        },
    };
    let focusEffect;
    let cleanup;
    let routeParams = params;
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
    const route = mountNativeComponent("src/app/(app)/device/dashboard/details.tsx", {
        modules: {
            "expo-router": {
                useLocalSearchParams: () => routeParams,
                useFocusEffect: (callback) => (focusEffect = callback),
                useRouter: () => router,
            },
            "react-native": {
                StyleSheet: { create: (styles) => styles },
                View: "View",
                ScrollView: "ScrollView",
                Modal: "Modal",
            },
            "@rn-primitives/portal": { PortalHost: "PortalHost" },
            "@/contexts/custom/DeviceProvider": { useDevice: () => device },
            "@/contexts/domain/HomeProvider": { useHomes: () => home },
            "@/contexts/HttpClientProvider": {
                useHttpClient: () => ({
                    get: (path) => {
                        requests.get.push(path);
                        return get(path);
                    },
                    patch: (path, values) => {
                        requests.patch.push([path, { ...values }]);
                        return patch(path, values);
                    },
                    delete: (path) => {
                        requests.delete.push(path);
                        return remove(path);
                    },
                }),
            },
            "@/components/common/Button": "Button",
            "@/components/common/ContentSection": "ContentSection",
            "@/components/common/Loading": "Loading",
            "@/components/device/dashboards/DashboardForm": "DashboardForm",
            "@/components/ui/alert": { Alert: "Alert", AlertDescription: "AlertDescription" },
            "@/components/ui/alert-dialog": {
                AlertDialog: "AlertDialog",
                AlertDialogAction: "AlertDialogAction",
                AlertDialogCancel: "AlertDialogCancel",
                AlertDialogContent: "AlertDialogContent",
                AlertDialogDescription: "AlertDialogDescription",
                AlertDialogFooter: "AlertDialogFooter",
                AlertDialogHeader: "AlertDialogHeader",
                AlertDialogTitle: "AlertDialogTitle",
                AlertDialogTrigger: "AlertDialogTrigger",
            },
        },
    });

    const focus = () => {
        cleanup = focusEffect?.();
    };
    const blur = () => {
        cleanup?.();
        cleanup = undefined;
    };
    const button = (name) =>
        route.elements().find((node) => node.type === "Button" && node.props.name === name);
    const form = () => route.elements().find((node) => node.type === "DashboardForm");
    const deleteTrigger = () => {
        const section = route.elements().find((node) => node.type === "ContentSection");
        return route
            .elements(section)
            .find((node) => node.type === "Button" && node.props.name === "Delete dashboard");
    };
    const confirmDelete = () => {
        const action = route.elements().find((node) => node.type === "AlertDialogAction");
        return route
            .elements(action)
            .find((node) => node.type === "Button" && node.props.name === "Delete dashboard");
    };

    return {
        ...route,
        device,
        requests,
        refreshCalls,
        navigation,
        router,
        button,
        form,
        deleteTrigger,
        confirmDelete,
        focus,
        blur,
        retarget(next) {
            routeParams = next;
            route.render();
        },
        async load() {
            focus();
            route.flushEffects();
            await settle(route);
        },
        async retry() {
            const retryButton = button("Retry");
            assert.ok(retryButton, "Failed dashboard reads expose Retry");
            retryButton.props.onPress();
            route.render();
            route.flushEffects();
            await settle(route);
        },
        async settle() {
            await settle(route);
        },
    };
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

function mountDashboardDetailsNavigation() {
    const pushed = [];
    const dashboards = {
        deviceId: "device-a",
        currentDashboardId: "dashboard-a",
        currentDashboard: { id: "dashboard-a", configuration: {} },
        dashboards: [{ id: "dashboard-a", name: "Controls" }],
        loading: false,
        loadError: "",
        refresh: async () => {},
        setDeviceId: () => {},
        setCurrentDashboardId: () => {},
    };
    const device = mountNativeComponent("src/app/(app)/device/device.tsx", {
        modules: {
            "expo-router": {
                useLocalSearchParams: () => ({ deviceId: "device-a" }),
                useRouter: () => ({
                    push: (route) => pushed.push(JSON.parse(JSON.stringify(route))),
                }),
            },
            "react-native": {
                StyleSheet: { create: (styles) => styles },
                View: "View",
                ScrollView: "ScrollView",
                RefreshControl: "RefreshControl",
            },
            "@/contexts/custom/DeviceProvider": { useDevice: () => dashboards },
            "@/contexts/custom/DeviceListProvider": {
                useDeviceList: () => ({ devices: [{ id: "device-a", name: "Device" }] }),
            },
            "@/contexts/domain/HomeProvider": {
                useHomes: () => ({ loading: false, current: { isOwner: true } }),
            },
            "@/contexts/ThemeProvider": { useTheme: () => theme },
            "@/components/common/BottomSheetSelect": "BottomSheetSelect",
            "@/components/common/Button": "Button",
            "@/components/common/SectionHeaderAction": "SectionHeaderAction",
            "@/components/common/Icon": "Icon",
            "@/components/common/Loading": "Loading",
            "@/components/common/Text": "Text",
            "@/components/device/dashboards/DashboardView": "DashboardView",
            "@/components/ui/alert": { Alert: "Alert", AlertDescription: "AlertDescription" },
            "lucide-react-native": { CircleAlert: "CircleAlert" },
        },
    });
    const edit = device
        .elements()
        .find(
            (node) =>
                node.type === "SectionHeaderAction" &&
                node.props.accessibilityLabel === "Dashboard details",
        );
    edit.props.onPress();
    return pushed;
}

test("dashboard details use route identity and retry failed reads", async () => {
    let attempts = 0;
    const route = mountDetails({
        params: { dashboardId: ["dashboard-a", "ignored"], deviceId: ["device-a", "ignored"] },
        currentDashboardId: "dashboard-b",
        get: async () => {
            attempts++;
            if (attempts === 1) return { isSuccess: false, statusCode: 503, response: null };
            return { isSuccess: true, response: { json: async () => savedDashboard } };
        },
    });
    await route.load();
    assert.equal(route.requests.get[0], "v1/devices/dashboards/dashboard-a");
    assert.equal(route.form(), undefined, "A failed read must not mount a default form");
    assert.ok(route.text().includes("Couldn't load this dashboard. Try again."));
    await route.retry();
    assert.equal(route.form().props.dashboard.id, "dashboard-a");

    for (const fail of [
        async () => {
            throw new Error("offline");
        },
        async () => ({
            isSuccess: true,
            response: {
                json: async () => {
                    throw new Error("bad JSON");
                },
            },
        }),
        async () => ({
            isSuccess: true,
            response: { json: async () => ({ ...savedDashboard, id: "dashboard-b" }) },
        }),
        async () => ({
            isSuccess: true,
            response: { json: async () => ({ ...savedDashboard, name: " " }) },
        }),
        async () => ({
            isSuccess: true,
            response: { json: async () => ({ ...savedDashboard, icon: null }) },
        }),
    ]) {
        let calls = 0;
        const failed = mountDetails({
            get: async () =>
                calls++ === 0
                    ? fail()
                    : { isSuccess: true, response: { json: async () => savedDashboard } },
        });
        await failed.load();
        assert.equal(failed.form(), undefined);
        assert.ok(failed.button("Retry"));
        await failed.retry();
        assert.equal(failed.form().props.dashboard.id, "dashboard-a");
    }

    for (const params of [
        {},
        { dashboardId: "" },
        { dashboardId: " \t " },
        { dashboardId: [] },
        { dashboardId: ["", "dashboard-a"] },
    ]) {
        const missing = mountDetails({ params });
        await missing.load();
        assert.deepEqual(missing.requests.get, []);
        assert.equal(missing.form(), undefined);
        assert.ok(missing.text().includes("Dashboard not found."));
    }

    assert.deepEqual(mountDashboardDetailsNavigation(), [
        {
            pathname: "device/dashboard/details",
            params: { dashboardId: "dashboard-a", deviceId: "device-a" },
        },
    ]);
});

test("dashboard form validates name and preserves icon and partial payloads", async () => {
    const submissions = [];
    const form = mountForm({
        dashboard: { ...savedDashboard, name: "Existing" },
        onSubmit: async (values) => submissions.push({ ...values }),
    });
    assert.equal(form.button().props.disabled, true, "An unchanged dashboard starts clean");
    assert.equal(form.field("Name").props.placeholder, "Living room controls");
    assert.deepEqual(Array.from(form.iconSelector().props.iconList), icons);
    assert.equal(form.iconSelector().props.defaultIcon, "grid-outline");
    assert.equal(form.iconSelector().props.variant, "brand");

    for (const [value, message] of [
        [" \t ", "Name is required."],
        ["ab", "Use 3–64 characters."],
        ["x".repeat(65), "Use 3–64 characters."],
    ]) {
        form.change("Name", value);
        await form.press();
        form.render();
        assert.equal(form.field("Name").props.error, message);
        assert.equal(submissions.length, 0);
    }
    assert.ok(form.focused.includes("Name"), "Invalid submission focuses Name");

    form.selectIcon("albums-outline");
    assert.equal(form.field("Name").props.error, "Use 3–64 characters.");
    form.change("Name", " Controls ");
    form.selectIcon("grid-outline");
    await form.press();
    assert.deepEqual(submissions[0], { name: "Controls" });

    for (const length of [3, 64]) {
        const boundary = mountForm({
            onSubmit: async (values) => submissions.push({ ...values }),
        });
        boundary.change("Name", ` ${"n".repeat(length)} `);
        await boundary.press();
        assert.deepEqual(submissions.at(-1), { name: "n".repeat(length) });
    }

    const iconSubmissions = [];
    const iconOnly = mountForm({
        dashboard: { ...savedDashboard, icon: "historical-dashboard-key" },
        onSubmit: async (values) => iconSubmissions.push({ ...values }),
    });
    assert.equal(iconOnly.iconSelector().props.defaultIcon, "historical-dashboard-key");
    iconOnly.change("Name", "Renamed");
    await iconOnly.press();
    assert.deepEqual(iconSubmissions[0], { name: "Renamed" });
    assert.equal(iconOnly.iconSelector().props.defaultIcon, "historical-dashboard-key");
    iconOnly.selectIcon("analytics-outline");
    await iconOnly.press();
    assert.deepEqual(iconSubmissions[1], { icon: "analytics-outline" });

    const gridSubmissions = [];
    const invalidGrid = mountForm({
        dashboard: { ...savedDashboard, configuration: { rows: 0, columns: 4 } },
        onSubmit: async (values) => gridSubmissions.push({ ...values }),
    });
    assert.ok(invalidGrid.text().includes("Grid size unavailable."));
    invalidGrid.selectIcon("historical-dashboard-key");
    await invalidGrid.press();
    assert.deepEqual(gridSubmissions[0], { icon: "historical-dashboard-key" });

    const exactPatch = mountDetails({
        get: async () => ({
            isSuccess: true,
            response: { json: async () => ({ ...savedDashboard, name: "Existing" }) },
        }),
    });
    await exactPatch.load();
    await exactPatch.form().props.onSubmit({ name: "Controls" });
    await exactPatch.form().props.onSubmit({ icon: "historical-dashboard-key" });
    assert.deepEqual(exactPatch.requests.patch, [
        ["v1/devices/dashboards/dashboard-a", { name: "Controls" }],
        ["v1/devices/dashboards/dashboard-a", { icon: "historical-dashboard-key" }],
    ]);
});

test("dashboard save locks pending drafts and retains accepted baseline", async () => {
    const request = deferred();
    const submissions = [];
    const form = mountForm({
        onSubmit: (values) => {
            submissions.push({ ...values });
            return request.promise;
        },
    });
    form.change("Name", "Controls updated");
    const keyboardDone = form.field("Name").props.onSubmitEditing;
    const touchSave = form.button().props.onPress;
    const pending = touchSave();
    keyboardDone();
    touchSave();
    form.render();

    assert.equal(submissions.length, 1, "Keyboard and touch share one synchronous lock");
    const name = form.field("Name");
    assert.notEqual(name.props.editable, false);
    assert.equal(name.props.accessibilityState.busy, true);
    const nativeInput = mountSharedInput(name.props)
        .elements()
        .find((node) => node.type === "ReusableInput");
    assert.equal(nativeInput.props.accessibilityState.busy, true);
    assert.equal(nativeInput.props.accessibilityState.disabled, false);
    assert.equal(form.iconSelector().props.disabled, true);
    assert.equal(form.button().props.disabled, true);
    name.props.setValue("Ignored edit");
    form.iconSelector().props.onIconSelected("albums-outline");
    form.render();
    assert.equal(form.field("Name").props.value, "Controls updated");
    assert.equal(form.iconSelector().props.defaultIcon, "grid-outline");

    form.blur();
    request.resolve();
    await pending;
    form.render();
    assert.equal(form.button().props.disabled, true, "Accepted values become the clean baseline");
    assert.equal(
        form.text().includes("Dashboard saved."),
        false,
        "Blurred saves do not leave stale feedback",
    );
    await form.button().props.onPress();
    assert.equal(submissions.length, 1, "The accepted payload cannot be repeated");

    form.focus();
    form.change("Name", "Another name");
    await form.press();
    assert.deepEqual(submissions[1], { name: "Another name" });

    const attempts = [
        async () => {
            throw new Error("offline");
        },
        async () => {},
    ];
    const retry = mountForm({
        onSubmit: async (values) => {
            submissions.push({ ...values });
            return attempts.shift()();
        },
    });
    retry.change("Name", "Saved on retry");
    await retry.press();
    retry.render();
    assert.ok(retry.text().includes("Couldn't save this dashboard. Try again."));
    assert.equal(retry.field("Name").props.value, "Saved on retry");
    assert.equal(retry.button().props.disabled, false);
    await retry.press();
    retry.render();
    assert.equal(retry.button().props.disabled, true);
    assert.ok(retry.text().includes("Dashboard saved."));
});

test("dashboard deletion requires confirmation and shares mutation lock", async () => {
    const removeRequest = deferred();
    const route = mountDetails({ remove: () => removeRequest.promise });
    await route.load();

    route.deleteTrigger().props.onPress();
    route.render();
    let dialog = route.elements().find((node) => node.type === "AlertDialog");
    assert.equal(dialog.props.open, true);
    assert.equal(route.elements().find((node) => node.type === "Modal").props.visible, true);
    route.button("Cancel").props.onPress();
    route.render();
    assert.deepEqual(route.requests.delete, []);

    route.deleteTrigger().props.onPress();
    route.render();
    dialog = route.elements().find((node) => node.type === "AlertDialog");
    dialog.props.onOpenChange(false);
    route.render();
    assert.deepEqual(route.requests.delete, []);

    route.deleteTrigger().props.onPress();
    route.render();
    route
        .elements()
        .find((node) => node.type === "Modal")
        .props.onRequestClose();
    route.render();
    assert.deepEqual(route.requests.delete, [], "Android Back cancels confirmation");

    const patchRequest = deferred();
    const concurrent = mountDetails({ patch: () => patchRequest.promise });
    await concurrent.load();
    const save = concurrent.form().props.onSubmit({ name: "Changed" });
    concurrent.deleteTrigger().props.onPress();
    concurrent.render();
    assert.equal(
        concurrent.elements().find((node) => node.type === "AlertDialog").props.open,
        false,
    );
    assert.deepEqual(concurrent.requests.delete, []);
    patchRequest.resolve({ isSuccess: false });
    await assert.rejects(save);

    const failed = mountDetails({ remove: async () => ({ isSuccess: false, statusCode: 503 }) });
    await failed.load();
    failed.deleteTrigger().props.onPress();
    failed.render();
    const deleteButton = failed.confirmDelete();
    const result = deleteButton.props.onPress();
    deleteButton.props.onPress();
    await result;
    failed.render();
    assert.deepEqual(failed.requests.delete, ["v1/devices/dashboards/dashboard-a"]);
    assert.ok(failed.text().includes("Couldn't delete this dashboard. Try again."));
    assert.equal(failed.form().props.dashboard.name, "Controls");
});

test("accepted dashboard deletion survives refresh and navigation failures", async () => {
    const refreshResult = deferred();
    const route = mountDetails({
        params: { dashboardId: "dashboard-a", deviceId: "device-a" },
        currentDashboardId: "dashboard-b",
        refresh: () => refreshResult.promise,
        canGoBack: false,
    });
    await route.load();
    route.deleteTrigger().props.onPress();
    route.render();
    const button = route.confirmDelete();
    await button.props.onPress();
    route.render();
    assert.deepEqual(route.requests.delete, ["v1/devices/dashboards/dashboard-a"]);
    assert.deepEqual(route.requests.get, ["v1/devices/dashboards/dashboard-a"]);
    assert.deepEqual(route.refreshCalls, [false]);
    assert.deepEqual(route.navigation, [
        ["replace", { pathname: "/device/device", params: { deviceId: "device-a" } }],
    ]);
    assert.equal(route.form().props.disabled, true);
    await assert.rejects(route.form().props.onSubmit({ name: "Must not save" }));
    refreshResult.reject(new Error("Refresh unavailable"));
    await route.settle();

    let attempts = 0;
    const brokenNavigation = mountDetails({
        canGoBack: false,
        replace: () => {
            if (attempts++ === 0) throw new Error("navigation failed");
        },
        remove: async () => ({ isSuccess: true }),
    });
    await brokenNavigation.load();
    brokenNavigation.deleteTrigger().props.onPress();
    brokenNavigation.render();
    await brokenNavigation.confirmDelete().props.onPress();
    brokenNavigation.render();
    assert.ok(
        brokenNavigation.text().includes("Dashboard deleted. Return to the device to continue."),
    );
    await brokenNavigation.button("Return to device").props.onPress();
    assert.equal(
        brokenNavigation.requests.delete.length,
        1,
        "Navigation recovery never repeats DELETE",
    );
    assert.equal(brokenNavigation.navigation.length, 2);

    const unknownDevice = mountDetails({
        params: { dashboardId: "dashboard-a" },
        currentDashboardId: "dashboard-b",
        canGoBack: false,
    });
    await unknownDevice.load();
    unknownDevice.deleteTrigger().props.onPress();
    unknownDevice.render();
    await unknownDevice.confirmDelete().props.onPress();
    assert.deepEqual(unknownDevice.navigation, [["replace", "/"]]);
});

test("dashboard lifecycles isolate routes and devices", async () => {
    const failedPatch = deferred();
    const route = mountDetails({ patch: () => failedPatch.promise });
    await route.load();
    const save = route.form().props.onSubmit({ name: "Changed" });
    route.blur();
    failedPatch.resolve({ isSuccess: false });
    await assert.rejects(save);
    await route.settle();
    assert.equal(route.text().includes("Couldn't save this dashboard."), false);
    assert.deepEqual(route.navigation, []);

    const finishDelete = deferred();
    const accepted = mountDetails({ remove: () => finishDelete.promise });
    await accepted.load();
    accepted.deleteTrigger().props.onPress();
    accepted.render();
    const deletion = accepted.confirmDelete().props.onPress();
    accepted.blur();
    finishDelete.resolve({ isSuccess: true });
    await deletion;
    assert.deepEqual(accepted.navigation, []);
    accepted.focus();
    accepted.focus();
    assert.deepEqual(
        accepted.navigation,
        [["back"]],
        "Accepted deletion returns once after refocus",
    );
    assert.equal(accepted.requests.delete.length, 1);

    const staleGet = deferred();
    const changed = mountDetails({
        get: (path) =>
            path.endsWith("dashboard-a")
                ? staleGet.promise
                : Promise.resolve({
                      isSuccess: true,
                      response: {
                          json: async () => ({
                              ...savedDashboard,
                              id: "dashboard-b",
                              name: "Second",
                          }),
                      },
                  }),
    });
    changed.focus();
    changed.flushEffects();
    changed.retarget({ dashboardId: "dashboard-b", deviceId: "device-b" });
    changed.flushEffects();
    await changed.settle();
    staleGet.resolve({ isSuccess: true, response: { json: async () => savedDashboard } });
    await changed.settle();
    assert.equal(changed.form().props.dashboard.id, "dashboard-b");

    const wrongDevice = mountDetails({
        patch: async () => ({ isSuccess: true }),
    });
    await wrongDevice.load();
    wrongDevice.device.deviceId = "device-b";
    await wrongDevice.form().props.onSubmit({ name: "Changed" });
    assert.deepEqual(wrongDevice.refreshCalls, [], "A different active device is never refreshed");
});

test("dashboard details deny Display before loading and reject retained mutations after role loss", async () => {
    const display = mountDetails({
        home: { loading: false, current: { isOwner: false, canManage: false } },
    });
    await display.load();
    assert.deepEqual(display.requests.get, []);
    assert.equal(display.form(), undefined);
    assert.ok(display.text().includes("You don't have permission to manage this device."));

    const home = { loading: false, current: { isOwner: true, canManage: false } };
    const route = mountDetails({ home });
    await route.load();
    const retainedSubmit = route.form().props.onSubmit;
    home.current = { isOwner: false, canManage: false };
    route.render();
    await assert.rejects(retainedSubmit({ name: "Changed" }));
    assert.deepEqual(route.requests.patch, []);
    assert.equal(route.deleteTrigger(), undefined);
});
