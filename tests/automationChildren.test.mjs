import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const theme = {
    current: {
        colors: {
            background: "background",
            authForeground: "foreground",
            authMuted: "muted",
            authPrimary: "primary",
            authOnPrimary: "on-primary",
            authBackground: "field",
            authFieldBackground: "field",
            authBorder: "border",
            authFocus: "focus",
            error: "error",
        },
    },
};

const devices = [
    { id: "device-a", name: "Device A" },
    { id: "device-b", name: "Device B" },
];

const operation = (id, type = "Text", name = id) => ({ id, name, type });
const operations = Array.from({ length: 11 }, (_, index) =>
    operation(`operation-${index + 1}`, "Text", `Operation ${index + 1}`),
);

const conditionValue = {
    operationId: "op",
    operationName: "Lamp",
    conditionType: "TextCondition",
    conditionConfiguration: { requiredValue: " exact text " },
};
const resultValue = { operationId: "op", operationName: "Lamp", valueToSend: "0" };

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((done, fail) => {
        resolve = done;
        reject = fail;
    });
    return { promise, resolve, reject };
}

async function settle(component, turns = 12) {
    for (let index = 0; index < turns; index++) {
        await Promise.resolve();
        component.render();
        component.flushEffects();
    }
}

function mountForm(
    kind,
    {
        get,
        operationItems = operations,
        onSubmit = async () => {},
        pending = false,
        accepted = false,
        deviceItems = devices,
        deviceLoading = false,
        deviceError = null,
        refreshDevices = async () => {},
    } = {},
) {
    const formFile =
        kind === "condition"
            ? "src/components/automations/conditions/AutomationConditionForm.tsx"
            : "src/components/automations/results/AutomationResultForm.tsx";
    const requests = [];
    const deviceState = {
        items: deviceItems,
        loading: deviceLoading,
        error: deviceError,
        refresh: refreshDevices,
    };
    const form = mountNativeComponent(formFile, {
        props: { pending, accepted, onSubmit },
        modules: {
            "react-native": {
                StyleSheet: { create: (styles) => styles },
                View: "View",
                Text: "Text",
                Pressable: "Pressable",
                ActivityIndicator: "ActivityIndicator",
            },
            "react-native-keyboard-controller": {
                KeyboardAwareScrollView: "KeyboardAwareScrollView",
            },
            "lucide-react-native": {
                Check: "Check",
                ChevronDown: "ChevronDown",
                CircleAlert: "CircleAlert",
            },
            "expo-router": { useRouter: () => ({ canGoBack: () => true, back: () => {} }) },
            "@/contexts/ThemeProvider": { useTheme: () => theme },
            "@/contexts/HttpClientProvider": {
                useHttpClient: () => ({
                    get: (path) => {
                        requests.push(path);
                        return get
                            ? get(path)
                            : Promise.resolve({
                                  isSuccess: true,
                                  response: { json: async () => ({ items: operationItems }) },
                              });
                    },
                }),
            },
            "@/contexts/custom/DeviceListProvider": {
                useDeviceList: () => ({
                    devices: deviceState.items,
                    loading: deviceState.loading,
                    error: deviceState.error,
                    refresh: deviceState.refresh,
                }),
            },
            "@/contexts/custom/AutomationProvider": {
                useAutomation: () => ({ addCondition: async () => {}, addResult: async () => {} }),
            },
            "@/contexts/ToastProvider": {
                useToast: () => ({ error() {}, info() {}, httpError() {} }),
            },
            "@/components/common/BottomSheetSelect": "BottomSheetSelect",
            "@/components/common/Input": "Input",
            "@/components/common/Button": "Button",
            "@/components/common/Dropdown": "Dropdown",
            "@/components/common/SwitchDropdown": "SwitchDropdown",
            "@/components/common/ImageButton": "ImageButton",
            "@/components/common/Text": "Text",
            "@/components/common/FormSection": "FormSection",
            "@/components/ui/alert": { Alert: "Alert", AlertDescription: "AlertDescription" },
            "@/components/ui/text": { Text: "Text" },
        },
    });
    form.flushEffects();
    return { form, requests, deviceState };
}

function elements(component) {
    return component.elements();
}

function field(component, title) {
    return elements(component).find((node) => node.type === "Input" && node.props.title === title);
}

function selector(component, title) {
    return elements(component).find(
        (node) => node.type === "BottomSheetSelect" && node.props.title === title,
    );
}

function button(component, name) {
    return elements(component).find((node) => node.type === "Button" && node.props.name === name);
}

function textContent(component) {
    const strings = [];
    const visit = (value) => {
        if (typeof value === "string") strings.push(value);
        else if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === "object") {
            visit(value.props?.children);
            visit(value.props?.title);
            visit(value.props?.accessibilityLabel);
        }
    };
    visit(component.output());
    return strings.join(" ");
}

function plain(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

async function submitForm(component, kind) {
    await button(component, addButton(kind)).props.onPress();
    component.render();
}

function choose(component, title, label) {
    const control = selector(component, title);
    assert.ok(control, `real form exposes a ${title} selection field`);
    const option = control.props.options.find((item) => item.label === label);
    assert.ok(option, `${title} offers ${label}`);
    option.onPress();
    component.render();
    component.flushEffects();
}

function change(component, title, value) {
    const input = field(component, title);
    assert.ok(input, `real form exposes ${title} input`);
    input.props.setValue(value);
    component.render();
}

function addButton(kind) {
    return kind === "condition" ? "Add condition" : "Add result";
}

function submitRoute(child, value) {
    const submit = child.form()?.props.onSubmit;
    assert.equal(typeof submit, "function", "route passes its child form an async submit handler");
    return submit(value);
}

function mountChildRoute(
    kind,
    {
        params = { sessionToken: "session-1" },
        home = { current: { id: "home-1", isOwner: true, canManage: false } },
        session,
        put = async () => ({ isSuccess: true }),
        canGoBack = true,
        back = () => {},
        replace = () => {},
    } = {},
) {
    const rawAutomationId = params.automationId;
    const automationId = Array.isArray(rawAutomationId) ? rawAutomationId[0] : rawAutomationId;
    let currentSession = session ?? {
        token: "session-1",
        homeId: "home-1",
        ...(automationId && { automationId }),
        conditions: [],
        results: [],
    };
    const requests = [];
    const appendCalls = [];
    const navigation = [];
    const toasts = [];
    const provider = {
        value: () => ({
            session: currentSession,
            isCurrentSession: (token) =>
                currentSession?.token === token && currentSession.homeId === home.current?.id,
            appendCondition: (token, value) => {
                appendCalls.push(["condition", token, value]);
                if (token !== currentSession?.token) return false;
                currentSession = {
                    ...currentSession,
                    conditions: [...currentSession.conditions, value],
                };
                return true;
            },
            appendResult: (token, value) => {
                appendCalls.push(["result", token, value]);
                if (token !== currentSession?.token) return false;
                currentSession = { ...currentSession, results: [...currentSession.results, value] };
                return true;
            },
        }),
        get session() {
            return currentSession;
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
            navigation.push(["replace", destination]);
            return replace(destination);
        },
    };
    const formName = kind === "condition" ? "AutomationConditionForm" : "AutomationResultForm";
    const file =
        kind === "condition"
            ? "src/app/(app)/automation/conditions/add.tsx"
            : "src/app/(app)/automation/results/add.tsx";
    const route = mountNativeComponent(file, {
        modules: {
            "expo-router": {
                useLocalSearchParams: () => routeParams,
                useFocusEffect: (callback) => (focusEffect = callback),
                useRouter: () => router,
            },
            "react-native": { StyleSheet: { create: (styles) => styles }, View: "View" },
            "lucide-react-native": { CircleAlert: "CircleAlert", Check: "Check" },
            "@/contexts/HttpClientProvider": {
                useHttpClient: () => ({
                    put: (path, body) => {
                        requests.push([path, JSON.parse(JSON.stringify(body))]);
                        return put(path, body);
                    },
                }),
            },
            "@/contexts/custom/AutomationProvider": { useAutomation: provider.value },
            "@/contexts/domain/HomeProvider": { useHomes: () => home },
            "@/contexts/AutomationProvider": { useAutomation: provider.value },
            "@/contexts/ToastProvider": {
                useToast: () => ({
                    success: (message) => toasts.push(["success", message]),
                    error: (message) => toasts.push(["error", message]),
                    info: (message) => toasts.push(["info", message]),
                }),
            },
            "@/contexts/ThemeProvider": { useTheme: () => theme },
            "@/components/common/Button": "Button",
            "@/components/common/FormSection": "FormSection",
            "@/components/common/Loading": "Loading",
            "@/components/ui/alert": { Alert: "Alert", AlertDescription: "AlertDescription" },
            [kind === "condition"
                ? "@/components/automations/conditions/AutomationConditionForm"
                : "@/components/automations/results/AutomationResultForm"]: formName,
        },
    });
    route.flushEffects();
    cleanup = focusEffect?.();
    const form = () => route.elements().find((node) => node.type === formName);
    return {
        route,
        home,
        provider,
        requests,
        appendCalls,
        navigation,
        toasts,
        router,
        form,
        focus() {
            cleanup = focusEffect?.();
        },
        blur() {
            cleanup?.();
            cleanup = undefined;
        },
        retarget(next, nextSession) {
            cleanup?.();
            routeParams = next;
            if (nextSession) currentSession = nextSession;
            route.render();
            route.flushEffects();
            cleanup = focusEffect?.();
        },
    };
}

test("condition form loads entire operation collection and can submit operation eleven", async () => {
    const submitted = [];
    const { form, requests } = mountForm("condition", {
        onSubmit: async (value) => submitted.push(value),
        get: async (path) => ({
            isSuccess: true,
            response: {
                json: async () => ({
                    items: path.includes("size=2147483647") ? operations : operations.slice(0, 10),
                }),
            },
        }),
    });
    choose(form, "Device", "Device A");
    await settle(form);
    assert.deepEqual(requests, ["v1/devices/operations/display?deviceId=device-a&size=2147483647"]);
    choose(form, "Operation", "Operation 11");
    change(form, "Required value", " exact text ");
    await submitForm(form, "condition");
    assert.equal(submitted[0].operationId, "operation-11");
    assert.equal(submitted[0].conditionType, "TextCondition");
    assert.deepEqual(plain(submitted[0].conditionConfiguration), { requiredValue: " exact text " });
});

test("result form loads entire operation collection and preserves zero as exact text", async () => {
    const submitted = [];
    const { form, requests } = mountForm("result", {
        onSubmit: async (value) => submitted.push(value),
        get: async (path) => ({
            isSuccess: true,
            response: {
                json: async () => ({
                    items: path.includes("size=2147483647") ? operations : operations.slice(0, 10),
                }),
            },
        }),
    });
    choose(form, "Device", "Device A");
    await settle(form);
    assert.deepEqual(requests, ["v1/devices/operations/display?deviceId=device-a&size=2147483647"]);
    choose(form, "Operation", "Operation 11");
    change(form, "Value to send", "0");
    await submitForm(form, "result");
    assert.deepEqual(plain(submitted[0]), {
        operationId: "operation-11",
        operationName: "Operation 11",
        valueToSend: "0",
    });
});

test("condition form maps all supported operation types and preserves Boolean false", async () => {
    const submitted = [];
    const supported = [
        operation("bool", "Boolean", "Boolean"),
        operation("number", "Number", "Number"),
        operation("integer", "Integer", "Integer"),
        operation("text", "Text", "Text"),
        operation("color", "HexColor", "Hex color"),
        operation("options", "Options", "Options"),
    ];
    const { form } = mountForm("condition", {
        operationItems: supported,
        onSubmit: async (value) => submitted.push(value),
    });
    choose(form, "Device", "Device A");
    await settle(form);
    choose(form, "Operation", "Boolean");
    const off = elements(form).find(
        (node) => node.type === "Pressable" && node.props.accessibilityLabel === "Off",
    );
    assert.ok(off, "Boolean condition has a labelled Off choice");
    off.props.onPress();
    form.render();
    await submitForm(form, "condition");
    assert.deepEqual(plain(submitted[0].conditionConfiguration), { isOn: false });

    for (const [name, expectedType] of [
        ["Number", "NumberCondition"],
        ["Integer", "NumberCondition"],
        ["Text", "TextCondition"],
        ["Hex color", "TextCondition"],
        ["Options", "TextCondition"],
    ]) {
        choose(form, "Operation", name);
        if (expectedType === "NumberCondition") {
            change(form, "Min value", "-1");
            change(form, "Max value", "0");
        } else change(form, "Required value", " exact text ");
        await submitForm(form, "condition");
        assert.equal(submitted.at(-1).conditionType, expectedType);
    }
    assert.deepEqual(plain(submitted[0]), {
        operationId: "bool",
        operationName: "Boolean",
        conditionType: "BooleanCondition",
        conditionConfiguration: { isOn: false },
    });
});

test("condition form rejects blank, nonfinite, equal, and reversed bounds but accepts negative and zero", async () => {
    const submitted = [];
    const { form } = mountForm("condition", {
        operationItems: [operation("number", "Number", "Number")],
        onSubmit: async (value) => submitted.push(value),
    });
    choose(form, "Device", "Device A");
    await settle(form);
    choose(form, "Operation", "Number");
    for (const [minValue, maxValue] of [
        ["", "0"],
        ["NaN", "0"],
        ["Infinity", "0"],
        ["-Infinity", "0"],
        ["1", "1"],
        ["1", "0"],
    ]) {
        change(form, "Min value", minValue);
        change(form, "Max value", maxValue);
        await submitForm(form, "condition");
        assert.equal(submitted.length, 0, `${minValue}..${maxValue} must be rejected`);
        assert.ok(field(form, "Min value").props.error || field(form, "Max value").props.error);
    }
    change(form, "Min value", "-1");
    change(form, "Max value", "0");
    await submitForm(form, "condition");
    assert.deepEqual(plain(submitted[0].conditionConfiguration), { minValue: -1, maxValue: 0 });
});

test("condition and result forms distinguish empty operation responses from load errors and retry", async () => {
    for (const kind of ["condition", "result"]) {
        let attempt = 0;
        const { form } = mountForm(kind, {
            get: async () => {
                attempt++;
                if (attempt === 1) return { isSuccess: false, statusCode: 500 };
                return { isSuccess: true, response: { json: async () => ({ items: [] }) } };
            },
        });
        choose(form, "Device", "Device A");
        assert.match(textContent(form), /Loading operations/i);
        await settle(form);
        assert.match(textContent(form), /Couldn't load operations/i);
        const retry = button(form, "Retry");
        assert.ok(retry, "load error offers a local retry");
        await retry.props.onPress();
        await settle(form);
        assert.match(textContent(form), /does not have any operations/i);
        assert.equal(selector(form, "Operation"), undefined);
    }
});

test("both child forms distinguish device loading from a successfully empty catalog", () => {
    for (const kind of ["condition", "result"]) {
        const loading = mountForm(kind, { deviceItems: [], deviceLoading: true });
        assert.match(textContent(loading.form), /Loading devices/i);
        assert.doesNotMatch(textContent(loading.form), /No devices available/i);

        const empty = mountForm(kind, { deviceItems: [] });
        assert.match(textContent(empty.form), /No devices available/i);
        assert.doesNotMatch(textContent(empty.form), /Loading devices/i);
    }
});

test("both child forms retry device catalog locally and preserve entered values", async () => {
    for (const kind of ["condition", "result"]) {
        let refreshCalls = 0;
        const pendingRefresh = deferred();
        const submitted = [];
        const { form, deviceState } = mountForm(kind, {
            deviceItems: [],
            deviceError: "Couldn't load devices. Please try again.",
            refreshDevices: () => {
                refreshCalls++;
                return pendingRefresh.promise;
            },
            operationItems: [operation("op", "Text", "Lamp")],
            onSubmit: async (value) => submitted.push(value),
        });
        assert.match(textContent(form), /Couldn't load devices/i);
        assert.doesNotMatch(textContent(form), /No devices available/i);
        const inputTitle = kind === "condition" ? "Required value" : "Value to send";
        const draftValue = kind === "condition" ? " exact condition " : " exact result ";

        const retry = button(form, "Retry devices");
        assert.ok(retry, "device load failure offers a named local retry");
        assert.equal(
            retry.props.onPress(),
            undefined,
            "retry schedules refresh without awaiting it",
        );
        assert.equal(refreshCalls, 1);

        deviceState.items = devices;
        deviceState.loading = false;
        deviceState.error = null;
        form.render();
        choose(form, "Device", "Device A");
        await settle(form);
        choose(form, "Operation", "Lamp");
        change(form, inputTitle, draftValue);
        assert.equal(field(form, inputTitle).props.value, draftValue);
        await submitForm(form, kind);
        if (kind === "condition")
            assert.deepEqual(plain(submitted[0].conditionConfiguration), {
                requiredValue: draftValue,
            });
        else assert.equal(submitted[0].valueToSend, draftValue);
    }
});

test("device catalog refresh error keeps an active child draft intact", async () => {
    for (const kind of ["condition", "result"]) {
        let refreshCalls = 0;
        const submitted = [];
        const { form, deviceState } = mountForm(kind, {
            operationItems: [operation("op", "Text", "Lamp")],
            refreshDevices: async () => {
                refreshCalls++;
                return true;
            },
            onSubmit: async (value) => submitted.push(value),
        });
        choose(form, "Device", "Device A");
        await settle(form);
        choose(form, "Operation", "Lamp");
        const inputTitle = kind === "condition" ? "Required value" : "Value to send";
        const draftValue = kind === "condition" ? " exact condition " : " exact result ";
        change(form, inputTitle, draftValue);

        deviceState.error = "Couldn't load devices. Please try again.";
        form.render();
        const retry = button(form, "Retry devices");
        assert.ok(retry);
        retry.props.onPress();
        assert.equal(refreshCalls, 1);
        assert.equal(field(form, inputTitle).props.value, draftValue);

        deviceState.error = null;
        form.render();
        assert.equal(field(form, inputTitle).props.value, draftValue);
        await submitForm(form, kind);
        assert.equal(submitted.length, 1);
    }
});

test("device catalog retry respects pending and accepted child locks", () => {
    const pending = mountForm("result", {
        pending: true,
        deviceItems: [],
        deviceError: "Couldn't load devices. Please try again.",
    });
    assert.equal(button(pending.form, "Retry devices").props.disabled, true);

    const accepted = mountForm("condition", {
        accepted: true,
        deviceItems: [],
        deviceError: "Couldn't load devices. Please try again.",
    });
    assert.equal(button(accepted.form, "Retry devices").props.disabled, true);
});

test("result form rejects inherited operation map keys from an invalid catalog response", async () => {
    const { form } = mountForm("result", {
        operationItems: [operation("unexpected", "toString", "Unexpected")],
    });
    choose(form, "Device", "Device A");
    await settle(form);
    assert.equal(selector(form, "Operation"), undefined);
    assert.match(textContent(form), /Couldn't load operations/i);
});

test("one operation remains selectable and a stale read cannot replace newer device operations", async () => {
    const first = deferred();
    const second = deferred();
    let calls = 0;
    const { form } = mountForm("result", {
        get: (path) => {
            calls++;
            assert.match(path, /deviceId=device-[ab]&size=2147483647/);
            return calls === 1 ? first.promise : second.promise;
        },
    });
    choose(form, "Device", "Device A");
    choose(form, "Device", "Device B");
    second.resolve({
        isSuccess: true,
        response: { json: async () => ({ items: [operation("new", "Text", "New operation")] }) },
    });
    await settle(form);
    first.resolve({
        isSuccess: true,
        response: { json: async () => ({ items: [operation("old", "Text", "Old operation")] }) },
    });
    await settle(form);
    const operationField = selector(form, "Operation");
    assert.ok(operationField, "a single operation remains selectable");
    assert.ok(operationField.props.options.some((item) => item.label === "New operation"));
    assert.ok(!operationField.props.options.some((item) => item.label === "Old operation"));
});

test("both forms refuse an operation after its device disappears from the current home", async () => {
    for (const kind of ["condition", "result"]) {
        const submitted = [];
        const { form, deviceState } = mountForm(kind, {
            operationItems: [operation("op", "Boolean", "Lamp")],
            onSubmit: async (value) => submitted.push(value),
        });
        choose(form, "Device", "Device A");
        await settle(form);
        choose(form, "Operation", "Lamp");
        if (kind === "result") change(form, "Value to send", "0");
        deviceState.items = devices.filter((device) => device.id !== "device-a");
        form.render();
        await submitForm(form, kind);
        assert.equal(submitted.length, 0);
        assert.match(textContent(form), /select a device|current device/i);
    }
});

test("condition form keeps exact operation identity when two operations share a name", async () => {
    const submitted = [];
    const { form } = mountForm("condition", {
        operationItems: [
            operation("operation-first", "Boolean", "Same name"),
            operation("operation-second", "Boolean", "Same name"),
        ],
        onSubmit: async (value) => submitted.push(value),
    });
    choose(form, "Device", "Device A");
    await settle(form);
    const operationField = selector(form, "Operation");
    assert.equal(operationField.props.options.length, 2);
    operationField.props.options[1].onPress();
    form.render();
    await submitForm(form, "condition");
    assert.equal(submitted[0].operationId, "operation-second");
});

test("result form rejects missing operation and empty value, then preserves exact result text", async () => {
    const submitted = [];
    const { form } = mountForm("result", {
        operationItems: [operation("op", "Text", "Lamp")],
        onSubmit: async (value) => submitted.push(value),
    });
    choose(form, "Device", "Device A");
    await settle(form);
    change(form, "Value to send", "");
    await submitForm(form, "result");
    assert.equal(submitted.length, 0);
    choose(form, "Operation", "Lamp");
    await submitForm(form, "result");
    assert.equal(submitted.length, 0, "empty result text is rejected");
    change(form, "Value to send", " exact result ");
    await submitForm(form, "result");
    assert.deepEqual(plain(submitted[0]), {
        operationId: "op",
        operationName: "Lamp",
        valueToSend: " exact result ",
    });
});

test("pending child form ignores input changes and button and keyboard share one submit lock", async () => {
    const pendingSubmit = deferred();
    const submitted = [];
    const { form } = mountForm("condition", {
        operationItems: [operation("op", "Text", "Lamp")],
        onSubmit: (value) => {
            submitted.push(value);
            return pendingSubmit.promise;
        },
    });
    choose(form, "Device", "Device A");
    await settle(form);
    choose(form, "Operation", "Lamp");
    change(form, "Required value", "Exact");
    const firstSubmit = button(form, addButton("condition")).props.onPress();
    form.render();
    const required = field(form, "Required value");
    assert.notEqual(required.props.editable, false, "pending input remains native-editable");
    required.props.setValue("Changed during request");
    form.render();
    assert.equal(field(form, "Required value").props.value, "Exact");
    field(form, "Required value").props.onSubmitEditing();
    await button(form, addButton("condition")).props.onPress();
    assert.equal(submitted.length, 1);
    pendingSubmit.resolve();
    await firstSubmit;
});

test("child routes reject invalid identities without HTTP and normalize array params", async () => {
    for (const params of [
        {},
        { sessionToken: "  " },
        { sessionToken: "stale" },
        { sessionToken: "session-1", automationId: "  " },
    ]) {
        const route = mountChildRoute("condition", { params });
        assert.equal(route.form(), undefined);
        assert.equal(route.requests.length, 0);
    }
    const mismatched = mountChildRoute("result", {
        params: { sessionToken: ["session-1", "stale"], automationId: "other" },
        session: {
            token: "session-1",
            homeId: "home-1",
            automationId: "automation-1",
            conditions: [],
            results: [],
        },
    });
    assert.equal(mismatched.form(), undefined);
    assert.equal(mismatched.requests.length, 0);

    const otherHome = mountChildRoute("result", {
        params: { sessionToken: "session-1" },
        home: { current: { id: "home-2", isOwner: true, canManage: false } },
        session: {
            token: "session-1",
            homeId: "home-1",
            conditions: [],
            results: [],
        },
    });
    assert.equal(otherHome.form(), undefined);
    assert.equal(otherHome.requests.length, 0);

    const array = mountChildRoute("condition", {
        params: { sessionToken: ["session-1", "other"] },
    });
    await submitRoute(array, conditionValue);
    assert.equal(array.appendCalls[0][1], "session-1");
});

test("draft child routes append locally once and never send HTTP", async () => {
    for (const kind of ["condition", "result"]) {
        const child = mountChildRoute(kind);
        child.focus();
        assert.ok(child.form());
        await submitRoute(child, kind === "condition" ? conditionValue : resultValue);
        assert.equal(child.requests.length, 0);
        assert.equal(child.appendCalls.length, 1);
        assert.equal(child.navigation.length, 1);
        await submitRoute(child, kind === "condition" ? conditionValue : resultValue);
        assert.equal(child.appendCalls.length, 1);
        assert.equal(child.requests.length, 0);
        assert.equal(child.toasts.length, 0);
    }
});

test("draft child return failures recover to the list without replacing the live draft", async () => {
    const existingCondition = {
        operationId: "existing-condition",
        operationName: "Existing condition",
        conditionType: "BooleanCondition",
        conditionConfiguration: { isOn: true },
    };
    const existingResult = {
        operationId: "existing-result",
        operationName: "Existing result",
        valueToSend: "keep exactly",
    };
    const initialSession = {
        token: "session-1",
        homeId: "home-1",
        conditions: [existingCondition],
        results: [existingResult],
    };

    for (const kind of ["condition", "result"]) {
        for (const route of [
            { name: "no history", canGoBack: false },
            {
                name: "Back throws",
                canGoBack: true,
                back: () => {
                    throw new Error("Back failed");
                },
            },
        ]) {
            let failFallback = true;
            const child = mountChildRoute(kind, {
                session: initialSession,
                canGoBack: route.canGoBack,
                back: route.back,
                replace: () => {
                    if (failFallback) throw new Error("fallback failed");
                },
            });
            child.focus();
            const value = kind === "condition" ? conditionValue : resultValue;
            await submitRoute(child, value);
            child.route.render();

            assert.equal(child.requests.length, 0, `${kind} draft must not send HTTP`);
            assert.equal(child.appendCalls.length, 1, `${kind} draft appends once before recovery`);
            assert.equal(child.provider.session.token, initialSession.token);
            assert.deepEqual(
                plain(child.provider.session.conditions),
                kind === "condition" ? [existingCondition, value] : [existingCondition],
            );
            assert.deepEqual(
                plain(child.provider.session.results),
                kind === "result" ? [existingResult, value] : [existingResult],
            );
            assert.match(child.form().props.actionError, /Couldn't return to automation/i);

            failFallback = false;
            await submitRoute(child, value);
            child.route.render();
            assert.equal(child.requests.length, 0, `${kind} accepted retry must not send HTTP`);
            assert.equal(
                child.appendCalls.length,
                1,
                `${kind} accepted retry must not append twice`,
            );
            assert.equal(child.provider.session.token, initialSession.token);
            assert.deepEqual(
                plain(child.provider.session.conditions),
                kind === "condition" ? [existingCondition, value] : [existingCondition],
            );
            assert.deepEqual(
                plain(child.provider.session.results),
                kind === "result" ? [existingResult, value] : [existingResult],
            );
            assert.ok(
                child.navigation.some(([, destination]) => destination === "/automation/list"),
            );
            assert.ok(
                child.navigation.every(([, destination]) => destination !== "/automation/add"),
                `${route.name} must not replace the draft with a fresh create route`,
            );
        }
    }
});

test("saved child PUT waits for acceptance, strips display names, and appends once", async () => {
    for (const kind of ["condition", "result"]) {
        const pendingPut = deferred();
        const child = mountChildRoute(kind, {
            params: { sessionToken: "session-1", automationId: "automation-1" },
            put: () => pendingPut.promise,
        });
        child.focus();
        const value = kind === "condition" ? conditionValue : resultValue;
        const pending = submitRoute(child, value);
        assert.equal(child.requests.length, 1);
        assert.equal(child.appendCalls.length, 0);
        assert.equal(child.navigation.length, 0);
        if (kind === "condition") {
            assert.deepEqual(child.requests[0], [
                "v1/automations/conditions/automation-1",
                {
                    operationId: "op",
                    conditionType: "TextCondition",
                    conditionConfiguration: { requiredValue: " exact text " },
                },
            ]);
        } else {
            assert.deepEqual(child.requests[0], [
                "v1/automations/results/automation-1",
                { operationId: "op", value: "0" },
            ]);
        }
        pendingPut.resolve({ isSuccess: true });
        await pending;
        assert.equal(child.appendCalls.length, 1);
        assert.equal(child.navigation.length, 1);
        assert.equal(child.toasts.length, 0);
    }
});

test("failed existing child write keeps draft and retries before append or navigation", async () => {
    const responses = [{ isSuccess: false, statusCode: 503 }, { isSuccess: true }];
    const child = mountChildRoute("result", {
        params: { sessionToken: "session-1", automationId: "automation-1" },
        put: async () => responses.shift(),
    });
    child.focus();
    await submitRoute(child, resultValue);
    child.route.render();
    assert.equal(child.appendCalls.length, 0);
    assert.equal(child.navigation.length, 0);
    assert.match(child.form().props.actionError, /Couldn't add this result/i);
    await submitRoute(child, resultValue);
    assert.equal(child.requests.length, 2);
    assert.equal(child.appendCalls.length, 1);
    assert.equal(child.navigation.length, 1);
});

test("saved child callbacks recheck live owner and session identity", async () => {
    const child = mountChildRoute("condition", {
        params: { sessionToken: "session-1", automationId: "automation-1" },
    });
    child.focus();
    const submit = child.form()?.props.onSubmit;
    assert.equal(typeof submit, "function", "route callback is retained with child form");
    child.home.current.isOwner = false;
    await submit(conditionValue);
    assert.equal(child.requests.length, 0);
    assert.equal(child.appendCalls.length, 0);
    assert.equal(child.navigation.length, 0);

    child.home.current.isOwner = true;
    child.retarget({ sessionToken: "another-session", automationId: "automation-1" });
    await submit(conditionValue);
    assert.equal(child.requests.length, 0, "retained callback cannot write after session changes");
});

test("accepted child write after blur appends once and returns only after refocus", async () => {
    const pendingPut = deferred();
    const child = mountChildRoute("result", {
        params: { sessionToken: "session-1", automationId: "automation-1" },
        put: () => pendingPut.promise,
    });
    child.focus();
    const pending = submitRoute(child, resultValue);
    child.blur();
    pendingPut.resolve({ isSuccess: true });
    await pending;
    assert.equal(child.appendCalls.length, 1);
    assert.equal(child.navigation.length, 0);
    child.focus();
    assert.equal(child.requests.length, 1);
    assert.equal(child.appendCalls.length, 1);
    assert.equal(child.navigation.length, 1);
    assert.equal(child.toasts.length, 0);
});

test("failed return recovery cannot repeat accepted child write or append", async () => {
    let failReturn = true;
    const child = mountChildRoute("condition", {
        params: { sessionToken: "session-1", automationId: "automation-1" },
        back: () => {
            if (failReturn) throw new Error("navigation failed");
        },
        replace: () => {
            if (failReturn) throw new Error("fallback failed");
        },
    });
    child.focus();
    await submitRoute(child, conditionValue);
    assert.equal(child.requests.length, 1);
    assert.equal(child.appendCalls.length, 1);
    failReturn = false;
    await submitRoute(child, conditionValue);
    assert.equal(child.requests.length, 1);
    assert.equal(child.appendCalls.length, 1);
    assert.equal(child.toasts.length, 0);
});

test("a deferred write for a retargeted child route cannot lock or accept the new visit", async () => {
    for (const kind of ["condition", "result"]) {
        const firstPut = deferred();
        const secondPut = deferred();
        const responses = [firstPut, secondPut];
        const child = mountChildRoute(kind, {
            params: { sessionToken: "token-a", automationId: "automation-a" },
            session: {
                token: "token-a",
                homeId: "home-1",
                automationId: "automation-a",
                conditions: [],
                results: [],
            },
            put: () => responses.shift().promise,
        });
        child.focus();
        const submitA = submitRoute(child, kind === "condition" ? conditionValue : resultValue);
        child.retarget(
            { sessionToken: "token-b", automationId: "automation-b" },
            {
                token: "token-b",
                homeId: "home-1",
                automationId: "automation-b",
                conditions: [],
                results: [],
            },
        );
        const submitB = submitRoute(child, kind === "condition" ? conditionValue : resultValue);
        const putCountWhileAIsPending = child.requests.length;
        firstPut.resolve({ isSuccess: true });
        await submitA;
        assert.equal(
            child.appendCalls.length,
            0,
            "stale accepted write cannot append to the new session",
        );
        assert.equal(child.navigation.length, 0, "stale completion cannot return the new route");
        assert.equal(child.form().props.accepted, false);
        assert.equal(
            putCountWhileAIsPending,
            2,
            "new session can submit while old request is pending",
        );
        secondPut.resolve({ isSuccess: true });
        await submitB;
        assert.equal(child.appendCalls.length, 1);
        assert.equal(child.appendCalls[0][1], "token-b");
        assert.equal(child.navigation.length, 1);
        assert.equal(child.toasts.length, 0);
    }
});
