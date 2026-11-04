import assert from "node:assert/strict";
import test from "node:test";
import { makeFocusLifecycle, mountNativeComponent } from "./nativeComponentHarness.mjs";

function mountForm(onSubmit, props = {}) {
    const ref = { current: null };
    const formProps = {
        deviceId: "device-1",
        edit: true,
        initName: "Lamp",
        initIcon: "bulb-outline",
        initRoomId: "room-1",
        initTileType: "Switch",
        initTileOperationId: "operation-1",
        initPresenceType: "Default",
        onSubmit,
        ...props,
        ref,
    };
    const form = mountNativeComponent("src/components/device/DeviceForm.tsx", {
        props: formProps,
        modules: {
            "../common/ImageButton": "ImageButton",
            "../common/Input": "Input",
            "../common/IconSelector": "IconSelector",
            "../common/Dropdown": "Dropdown",
            "../common/BottomSheetSelect": "BottomSheetSelect",
            "../common/Divider": "Divider",
            "../common/Expander": "Expander",
            "../common/Text": "Text",
            "./tile/DeviceTile": "DeviceTile",
            "@/contexts/HttpClientProvider": {
                useHttpClient: () => ({ get: async () => ({ isSuccess: false }) }),
            },
            "@/contexts/domain/HomeProvider": {
                useHomes: () => ({ current: { id: "home-1", rooms: [] } }),
            },
            "@/contexts/ToastProvider": { useToast: () => ({ info() {} }) },
            "@/hooks/useIconCatalog": {
                useIconCatalog: () => ({ keys: ["bulb-outline"], loading: false, error: "" }),
            },
            "./operation/OperationSelector": "OperationSelector",
            "../room/RoomSelector": "RoomSelector",
            "react-native-keyboard-controller": {
                KeyboardAwareScrollView: "KeyboardAwareScrollView",
            },
            "@/styles/defaultStyles": { keyboardOffset: 0 },
        },
    });
    form.flushEffects();
    return {
        ...form,
        ref,
        update: (changes) => form.render({ ...formProps, ...changes, ref }),
    };
}

function mountDeviceDetails(overrides = {}) {
    const device = {
        id: "device-1",
        name: "Lamp",
        icon: "bulb-outline",
        roomId: null,
        tile: { type: "Default" },
        presence: null,
    };
    const state = {
        params: { deviceId: "device-1" },
        homes: { loading: false, current: { id: "home-1", isOwner: true, canManage: false } },
        device,
        get: async () => ({ isSuccess: true, response: { json: async () => state.device } }),
        patch: async () => ({ isSuccess: true }),
        delete: async () => ({ isSuccess: true }),
        refresh: async () => true,
        devices: [device],
        devicesLoading: false,
        devicesError: null,
        router: {
            canGoBack: () => true,
            back() {},
            replace() {},
            push() {},
        },
        toasts: [],
        ...overrides,
    };
    let focusLifecycle;
    const route = mountNativeComponent("src/app/(app)/device/details.tsx", {
        modules: (React) => {
            focusLifecycle = makeFocusLifecycle(React);
            return {
                "@/components/common/ConfirmDialog": "ConfirmDialog",
                "@/components/common/ContentSection": "ContentSection",
                "@/components/common/ListRow": "ListRow",
                "@/components/common/Loading": "Loading",
                "@/components/common/Button": "Button",
                "@/components/device/DeviceForm": "DeviceForm",
                "@/contexts/custom/DeviceListProvider": {
                    useDeviceList: () => ({
                        devices: state.devices,
                        loading: state.devicesLoading,
                        error: state.devicesError,
                        refresh: (...args) => state.refresh(...args),
                    }),
                },
                "@/contexts/domain/HomeProvider": { useHomes: () => state.homes },
                "@/contexts/HttpClientProvider": {
                    useHttpClient: () => ({
                        get: (...args) => state.get(...args),
                        patch: (...args) => state.patch(...args),
                        delete: (...args) => state.delete(...args),
                    }),
                },
                "@/contexts/ToastProvider": {
                    useToast: () => ({
                        success: (message) => state.toasts.push(["success", message]),
                        error: (message) => state.toasts.push(["error", message]),
                        httpError: (response) => state.toasts.push(["http", response]),
                    }),
                },
                "expo-router": {
                    useFocusEffect: (callback) => focusLifecycle.useFocusEffect(callback),
                    useLocalSearchParams: () => state.params,
                    useRouter: () => state.router,
                },
                "react-native": { View: "View" },
            };
        },
    });
    route.flushEffects();
    focusLifecycle.focus();
    return {
        route,
        state,
        focus: () => focusLifecycle.focus(),
        blur: () => focusLifecycle.blur(),
        ready: async () => {
            await new Promise((resolve) => setImmediate(resolve));
            route.render();
            route.flushEffects();
            route.render();
        },
        form: () => route.elements().find((node) => node.type === "DeviceForm"),
        deleteButton: () =>
            route
                .elements()
                .find((node) => node.type === "Button" && node.props.name === "Delete device"),
        dialog: () => route.elements().find((node) => node.type === "ConfirmDialog"),
        retry: () =>
            route.elements().find((node) => node.type === "Button" && node.props.name === "Retry"),
    };
}

function selectField(form, title) {
    const field = form
        .elements()
        .find((node) => node.type === "BottomSheetSelect" && node.props.title === title);
    assert.ok(field, `${title} uses native BottomSheetSelect`);
    return field;
}

test("Display settings preserve multiple readings, strip runtime metadata and reset drafts", async () => {
    const requests = [];
    const form = mountForm(async (request) => requests.push(request), {
        initTileType: "Display",
        initTileDisplayableOperationId: "temperature",
        initTileUnit: "°C",
        initTileLabel: "Temperature",
        initTileReadings: [
            {
                operationId: "humidity",
                label: "Humidity",
                unit: "%",
                value: 61,
                operationType: "Number",
            },
        ],
    });
    const input = (title) =>
        form.elements().find((n) => n.type === "Input" && n.props.title === title);
    const save = () =>
        form.elements().find((n) => n.type === "Button" && n.props.name === "Save changes");
    assert.ok(
        form
            .elements()
            .find((n) => n.type === "OperationSelector")
            .props.filterTypes.includes("Boolean"),
    );
    input("Reading 2 label").props.setValue("Moisture");
    form.render();
    await save().props.onPress();
    assert.deepEqual(JSON.parse(JSON.stringify(requests[0])), {
        type: "Display",
        displayableOperationId: "temperature",
        configuration: {
            unit: "°C",
            label: "Temperature",
            readings: [{ operationId: "humidity", label: "Moisture", unit: "%" }],
        },
    });
    form.render();
    input("Reading 2 unit").props.setValue("ppm");
    form.render();
    form.elements()
        .find((n) => n.type === "Button" && n.props.name === "Reset")
        .props.onPress();
    form.render();
    assert.equal(input("Reading 2 unit").props.value, "%");
    assert.equal(save().props.disabled, true);
});

test("Display duplicate reading references cannot be saved", async () => {
    let requests = 0;
    const form = mountForm(async () => requests++, {
        initTileType: "Display",
        initTileDisplayableOperationId: "same",
        initTileReadings: [{ operationId: "same", label: "Duplicate", unit: "" }],
    });
    await form
        .elements()
        .find((n) => n.type === "Button" && n.props.name === "Save changes")
        .props.onPress();
    form.render();
    assert.equal(requests, 0);
    assert.match(form.text(), /different operation/);
});

for (const [type, filterTypes] of [
    ["Slider", ["Number", "Integer"]],
    ["Options", ["Options"]],
]) {
    test(
        type + " settings filter operations and resend retained configuration after Default",
        async () => {
            const requests = [];
            const form = mountForm(async (request) => requests.push(request), {
                initTileType: type,
                initTileUnit: "%",
                initTileStep: 2,
            });
            const select = () => selectField(form, "Tile Type");
            assert.deepEqual(
                Array.from(
                    form.elements().find((node) => node.type === "OperationSelector").props
                        .filterTypes,
                ),
                filterTypes,
            );
            assert.ok(select().props.options.some((option) => option.label === type));
            select()
                .props.options.find((option) => option.label === "Default")
                .onPress();
            form.render();
            await form
                .elements()
                .find((node) => node.type === "Button" && node.props.name === "Save changes")
                .props.onPress();
            form.render();
            select()
                .props.options.find((option) => option.label === type)
                .onPress();
            form.render();
            await form
                .elements()
                .find((node) => node.type === "Button" && node.props.name === "Save changes")
                .props.onPress();
            form.render();
            assert.equal(requests[1].type, type);
            assert.equal(requests[1].operationId, "operation-1");
            if (type === "Slider")
                assert.equal(
                    JSON.stringify(requests[1].configuration),
                    JSON.stringify({ unit: "%", step: 2 }),
                );
        },
    );
}

test("device editor sends changed fields only, keeps failed drafts, and saves new reset baseline", async () => {
    const requests = [];
    let fail = true;
    const form = mountForm(async (values) => {
        requests.push(values);
        if (fail) throw new Error("Connection unavailable");
    });
    const getInput = () => form.elements().find((node) => node.type === "Input");
    const getSave = () =>
        form
            .elements()
            .find((node) => node.type === "Button" && node.props.name === "Save changes");

    getInput().props.setValue("Desk lamp");
    form.render();
    assert.equal(getSave().props.disabled, false);
    await getSave().props.onPress();
    form.render();
    assert.equal(requests.length, 1);
    assert.equal(requests[0].name, "Desk lamp");
    assert.equal(getInput().props.value, "Desk lamp");
    assert.match(form.text(), /Connection unavailable/);
    assert.equal(getSave().props.disabled, false);

    fail = false;
    await getSave().props.onPress();
    form.render();
    assert.equal(requests[1].name, "Desk lamp");
    assert.equal(getSave().props.disabled, true);

    getInput().props.setValue("Unsaved draft");
    form.render();
    const reset = form
        .elements()
        .find((node) => node.type === "Button" && node.props.name === "Reset");
    reset.props.onPress();
    form.render();
    assert.equal(
        getInput().props.value,
        "Desk lamp",
        "Reset uses latest successful save as baseline",
    );
    assert.equal(getSave().props.disabled, true);
});

test("saving invalid hidden tile config reveals Tile disclosure and keeps current draft", async () => {
    const form = mountForm(async () => assert.fail("Invalid tile config must not submit"));
    const operation = form.elements().find((node) => node.type === "OperationSelector");
    operation.props.onSelected("None");
    form.render();
    const save = form
        .elements()
        .find((node) => node.type === "Button" && node.props.name === "Save changes");
    await save.props.onPress();
    form.render();
    const tile = form
        .elements()
        .find((node) => node.type === "Expander" && node.props.title === "Tile");
    assert.equal(tile.props.expanded, true);
    const operationField = form.elements().find((node) => node.type === "OperationSelector");
    assert.equal(operationField.props.title, "Tile operation");
    assert.match(operationField.props.error, /Select an operation/);
});

test("missing stored operation survives unrelated save", async () => {
    let request;
    const form = mountForm(async (values) => (request = values), {
        initTileOperationId: "missing-operation",
    });
    const name = form.elements().find((node) => node.type === "Input");
    name.props.setValue("Desk lamp");
    form.render();
    await form
        .elements()
        .find((node) => node.type === "Button" && node.props.name === "Save changes")
        .props.onPress();
    assert.deepEqual(JSON.parse(JSON.stringify(request)), { name: "Desk lamp" });
    assert.equal(Object.hasOwn(request, "operationId"), false);
});

test("operation selectors have distinct field titles for command, primary, additional and presence", () => {
    const command = mountForm(async () => {});
    assert.equal(
        command.elements().find((node) => node.type === "OperationSelector").props.title,
        "Tile operation",
    );

    const display = mountForm(async () => {}, {
        initTileType: "Display",
        initTileDisplayableOperationId: "primary",
        initTileReadings: [{ operationId: "extra", label: "", unit: "" }],
        initPresenceType: "BooleanOperation",
        initPresenceOperationId: "presence",
    });
    assert.deepEqual(
        display
            .elements()
            .filter((node) => node.type === "OperationSelector")
            .map((node) => node.props.title),
        ["Primary reading operation", "Reading 2 operation", "Presence operation"],
    );
});

test("required operation errors stay inline and selecting one field clears only its error", async () => {
    const form = mountForm(async () => {}, {
        initTileType: "Display",
        initTileDisplayableOperationId: "None",
        initPresenceType: "BooleanOperation",
        initPresenceOperationId: "None",
    });
    form.elements()
        .find((node) => node.type === "Input")
        .props.setValue("Desk lamp");
    form.render();
    await form
        .elements()
        .find((node) => node.type === "Button" && node.props.name === "Save changes")
        .props.onPress();
    form.render();

    const operation = (title) => {
        const field = form
            .elements()
            .find((node) => node.type === "OperationSelector" && node.props.title === title);
        assert.ok(field, `${title} is a named operation field`);
        return field;
    };
    const tile = form
        .elements()
        .find((node) => node.type === "Expander" && node.props.title === "Tile");
    const presence = form
        .elements()
        .find((node) => node.type === "Expander" && node.props.title === "Presence");
    assert.equal(tile.props.expanded, true);
    assert.equal(presence.props.expanded, true);
    assert.match(operation("Primary reading operation").props.error, /Select an operation/);
    assert.match(operation("Presence operation").props.error, /Select an operation/);

    operation("Primary reading operation").props.onSelected("display-1");
    form.render();
    assert.equal(operation("Primary reading operation").props.error, "");
    assert.match(operation("Presence operation").props.error, /Select an operation/);

    operation("Presence operation").props.onSelected("presence-1");
    form.render();
    assert.equal(operation("Presence operation").props.error, "");
});

test("retained selectors and reset cannot mutate a DeviceForm while externally disabled", async () => {
    let submits = 0;
    const form = mountForm(async () => submits++);
    const name = form.elements().find((node) => node.type === "Input");
    name.props.setValue("Desk lamp");
    form.render();
    const staleNameChange = form.elements().find((node) => node.type === "Input").props.setValue;
    const staleOperationChange = form.elements().find((node) => node.type === "OperationSelector")
        .props.onSelected;
    const staleTypeChoice = selectField(form, "Tile Type").props.options.find(
        (option) => option.label === "Default",
    ).onPress;
    const staleSave = form.ref.current.save;
    const staleReset = form.ref.current.reset;

    form.update({ disabled: true });
    const currentSelector = form.elements().find((node) => node.type === "OperationSelector");
    assert.equal(currentSelector.props.disabled, true);
    assert.equal(selectField(form, "Tile Type").props.disabled, true);
    assert.equal(form.elements().find((node) => node.type === "RoomSelector").props.disabled, true);
    staleNameChange("Ignored rename");
    staleOperationChange("operation-2");
    staleTypeChoice();
    await staleSave();
    staleReset();
    form.render();

    assert.equal(form.elements().find((node) => node.type === "Input").props.value, "Desk lamp");
    assert.equal(
        form.elements().find((node) => node.type === "OperationSelector").props.initialOperationId,
        "operation-1",
    );
    assert.equal(selectField(form, "Tile Type").props.value, "Switch");
    assert.equal(submits, 0);
});

test("device edit form keeps preview inside Tile disclosure and presents identity fields first", () => {
    const form = mountForm(async () => {});
    const types = form.elements().map((node) => node.type);
    assert.ok(types.indexOf("Input") < types.indexOf("IconSelector"));
    assert.ok(types.indexOf("IconSelector") < types.indexOf("RoomSelector"));
    const tile = form
        .elements()
        .find((node) => node.type === "Expander" && node.props.title === "Tile");
    assert.equal(tile.props.summary, "Switch tile");
    assert.ok(form.elements(tile).some((node) => node.type === "DeviceTile"));
});

test("Boolean presence operation edits submit PresenceType and operation ID together", async () => {
    let request;
    const form = mountForm(async (values) => (request = values), {
        initTileType: "Default",
        initPresenceType: "BooleanOperation",
        initPresenceOperationId: "operation-1",
    });
    const operation = form.elements().find((node) => node.type === "OperationSelector");
    operation.props.onSelected("operation-2");
    form.render();
    const save = () =>
        form
            .elements()
            .find((node) => node.type === "Button" && node.props.name === "Save changes");
    await save().props.onPress();
    assert.deepEqual(JSON.parse(JSON.stringify(request)), {
        presenceType: "BooleanOperation",
        presenceOperationId: "operation-2",
    });
});

test("Boolean presence type transition includes retained operation ID", async () => {
    const requests = [];
    const form = mountForm(async (values) => requests.push(values), {
        initTileType: "Default",
        initPresenceType: "BooleanOperation",
        initPresenceOperationId: "operation-1",
    });
    const type = () => selectField(form, "Presence Type");
    const save = () =>
        form
            .elements()
            .find((node) => node.type === "Button" && node.props.name === "Save changes");
    type()
        .props.options.find((option) => option.label === "No presence")
        .onPress();
    form.render();
    await save().props.onPress();
    form.render();
    type()
        .props.options.find((option) => option.label === "Boolean operation")
        .onPress();
    form.render();
    await save().props.onPress();
    assert.deepEqual(JSON.parse(JSON.stringify(requests[1])), {
        presenceType: "BooleanOperation",
        presenceOperationId: "operation-1",
    });
});

test("Display unit edit includes current operation ID in type payload", async () => {
    let request;
    const form = mountForm(async (values) => (request = values), {
        initTileType: "Display",
        initTileDisplayableOperationId: "operation-1",
        initTileUnit: "°C",
    });
    const unit = form
        .elements()
        .find((node) => node.type === "Input" && node.props.title === "Unit");
    unit.props.setValue("°F");
    form.render();
    const save = form
        .elements()
        .find((node) => node.type === "Button" && node.props.name === "Save changes");
    await save.props.onPress();
    assert.deepEqual(JSON.parse(JSON.stringify(request)), {
        type: "Display",
        displayableOperationId: "operation-1",
        configuration: { unit: "°F" },
    });
});

test("Display reactivation resends hidden unit draft after Default save", async () => {
    const requests = [];
    const form = mountForm(async (values) => requests.push(values), {
        initTileType: "Display",
        initTileDisplayableOperationId: "operation-1",
        initTileUnit: "°C",
    });
    const tileType = () => selectField(form, "Tile Type");
    const unit = () =>
        form.elements().find((node) => node.type === "Input" && node.props.title === "Unit");
    const save = () =>
        form
            .elements()
            .find((node) => node.type === "Button" && node.props.name === "Save changes");

    unit().props.setValue("°F");
    tileType()
        .props.options.find((option) => option.label === "Default")
        .onPress();
    form.render();
    await save().props.onPress();
    form.render();
    assert.deepEqual(JSON.parse(JSON.stringify(requests[0])), { type: "Default" });

    tileType()
        .props.options.find((option) => option.label === "Display")
        .onPress();
    form.render();
    await save().props.onPress();
    assert.deepEqual(JSON.parse(JSON.stringify(requests[1])), {
        type: "Display",
        displayableOperationId: "operation-1",
        configuration: { unit: "°F" },
    });
});

test("Switch type transition includes retained operation after a successful Default save", async () => {
    const requests = [];
    const form = mountForm(async (values) => requests.push(values));
    const tileType = () => selectField(form, "Tile Type");
    const save = () =>
        form
            .elements()
            .find((node) => node.type === "Button" && node.props.name === "Save changes");

    tileType()
        .props.options.find((option) => option.label === "Default")
        .onPress();
    form.render();
    await save().props.onPress();
    form.render();
    assert.deepEqual(JSON.parse(JSON.stringify(requests[0])), { type: "Default" });

    tileType()
        .props.options.find((option) => option.label === "Switch")
        .onPress();
    form.render();
    await save().props.onPress();
    assert.deepEqual(JSON.parse(JSON.stringify(requests[1])), {
        type: "Switch",
        operationId: "operation-1",
    });
});

test("device creation keeps home, null room, name and catalog icon payload", async () => {
    let request;
    const form = mountForm(
        async (values) => {
            request = values;
        },
        { edit: false, initName: undefined, initIcon: undefined, initRoomId: undefined },
    );
    const input = form.elements().find((node) => node.type === "Input");
    input.props.setValue("Desk lamp");
    form.render();
    const add = form
        .elements()
        .find((node) => node.type === "Button" && node.props.name === "Create device");
    await add.props.onPress();
    assert.deepEqual(Object.keys(request).sort(), ["homeId", "icon", "name", "roomId"]);
    assert.equal(request.homeId, "home-1");
    assert.equal(request.roomId, null);
    assert.equal(request.name, "Desk lamp");
    assert.equal(request.icon, "bulb-outline");
});

test("device create button and keyboard submission share one synchronous lock", async () => {
    const requests = [];
    let finish;
    const form = mountForm(
        async (values) => {
            requests.push(values);
            await new Promise((resolve) => (finish = resolve));
        },
        { edit: false, initName: undefined, initIcon: undefined, initRoomId: undefined },
    );
    const input = form.elements().find((node) => node.type === "Input");
    input.props.setValue("Desk lamp");
    form.render();
    const button = form
        .elements()
        .find((node) => node.type === "Button" && node.props.name === "Create device");

    const pending = button.props.onPress();
    const duplicate = input.props.onSubmitEditing();

    assert.equal(requests.length, 1);
    finish();
    await Promise.all([pending, duplicate]);
});

test("accepted device creation survives list refresh failure and cannot repeat POST", async () => {
    let posts = 0;
    let refreshes = 0;
    let backs = 0;
    const route = mountNativeComponent("src/app/(app)/device/add.tsx", {
        modules: {
            "@/components/device/DeviceForm": "DeviceForm",
            "@/contexts/custom/DeviceListProvider": {
                useDeviceList: () => ({
                    refresh: async () => {
                        refreshes++;
                        throw new Error("offline");
                    },
                }),
            },
            "@/contexts/HttpClientProvider": {
                useHttpClient: () => ({
                    post: async () => {
                        posts++;
                        return { isSuccess: true };
                    },
                }),
            },
            "@/contexts/ToastProvider": {
                useToast: () => ({ success() {}, error() {} }),
            },
            "expo-router": {
                useFocusEffect() {},
                useRouter: () => ({
                    canGoBack: () => true,
                    back: () => backs++,
                    replace() {},
                }),
            },
        },
    });
    const submit = route.elements().find((node) => node.type === "DeviceForm").props.onSubmit;

    await assert.doesNotReject(submit({ name: "Desk lamp" }));
    await assert.doesNotReject(submit({ name: "Desk lamp" }));

    assert.equal(posts, 1);
    assert.equal(refreshes, 1);
    assert.equal(backs, 1);
});

test("late accepted device creation waits for refocus and uses the brand back fallback", async () => {
    let focus;
    let finish;
    let posts = 0;
    let refreshes = 0;
    let backs = 0;
    const replacements = [];
    const route = mountNativeComponent("src/app/(app)/device/add.tsx", {
        modules: {
            "@/components/device/DeviceForm": "DeviceForm",
            "@/contexts/custom/DeviceListProvider": {
                useDeviceList: () => ({ refresh: async () => refreshes++ }),
            },
            "@/contexts/HttpClientProvider": {
                useHttpClient: () => ({
                    post: () => {
                        posts++;
                        return new Promise((resolve) => (finish = resolve));
                    },
                }),
            },
            "expo-router": {
                useFocusEffect: (callback) => (focus = callback),
                useRouter: () => ({
                    canGoBack: () => false,
                    back: () => backs++,
                    replace: (path) => replacements.push(path),
                }),
            },
        },
    });
    const blur = focus?.();
    const submit = route.elements().find((node) => node.type === "DeviceForm").props.onSubmit;
    const pending = submit({ name: "Desk lamp" });
    blur?.();
    finish({ isSuccess: true });
    await assert.doesNotReject(pending);

    assert.equal(refreshes, 1, "An accepted create must refresh the list even after blur");
    assert.equal(backs, 0, "A response after leaving the route must not navigate the new screen");
    assert.deepEqual(replacements, []);
    focus?.();
    assert.deepEqual(
        replacements,
        ["/"],
        "Refocus without history follows the brand Back fallback",
    );
    await submit({ name: "Desk lamp" });
    assert.equal(posts, 1, "A successful creation must never POST again");
    assert.equal(refreshes, 1, "Refocus must not repeat the completed refresh");
    assert.equal(backs, 0);
});

test("failed device creation reaches the form as an error without a legacy toast", async () => {
    let errors = 0;
    let refreshes = 0;
    const route = mountNativeComponent("src/app/(app)/device/add.tsx", {
        modules: {
            "@/components/device/DeviceForm": "DeviceForm",
            "@/contexts/custom/DeviceListProvider": {
                useDeviceList: () => ({ refresh: async () => refreshes++ }),
            },
            "@/contexts/HttpClientProvider": {
                useHttpClient: () => ({ post: async () => ({ isSuccess: false }) }),
            },
            "@/contexts/ToastProvider": {
                useToast: () => ({ success() {}, error: () => errors++ }),
            },
            "expo-router": { useFocusEffect() {}, useRouter: () => ({ back() {} }) },
        },
    });
    const submit = route.elements().find((node) => node.type === "DeviceForm").props.onSubmit;

    await assert.rejects(submit({ name: "Desk lamp" }), /Couldn't create this device/);

    assert.equal(errors, 0);
    assert.equal(refreshes, 0);
});

test("device details load failure shows retry and recovers on the same device route", async () => {
    let attempts = 0;
    let focusLifecycle;
    const route = mountNativeComponent("src/app/(app)/device/details.tsx", {
        modules: (React) => {
            focusLifecycle = makeFocusLifecycle(React);
            return {
                "@/components/common/ConfirmDialog": "ConfirmDialog",
                "@/components/common/ContentSection": "ContentSection",
                "@/components/common/ListRow": "ListRow",
                "@/components/common/Loading": "Loading",
                "@/components/common/Button": "Button",
                "@/components/device/DeviceForm": "DeviceForm",
                "@/contexts/custom/DeviceListProvider": {
                    useDeviceList: () => ({
                        devices: [
                            {
                                id: "device-1",
                                name: "Lamp",
                                icon: "bulb-outline",
                                tile: { type: "Default" },
                            },
                        ],
                        loading: false,
                        error: null,
                        refresh: async () => true,
                    }),
                },
                "@/contexts/domain/HomeProvider": {
                    useHomes: () => ({
                        loading: false,
                        current: { id: "home-1", isOwner: true, canManage: false },
                    }),
                },
                "@/contexts/HttpClientProvider": {
                    useHttpClient: () => ({
                        get: async () => {
                            attempts++;
                            if (attempts === 1) throw new Error("offline");
                            return {
                                isSuccess: true,
                                response: {
                                    json: async () => ({
                                        id: "device-1",
                                        name: "Lamp",
                                        icon: "bulb-outline",
                                        roomId: null,
                                        tile: { type: "Default" },
                                        presence: null,
                                    }),
                                },
                            };
                        },
                    }),
                },
                "@/contexts/ToastProvider": {
                    useToast: () => ({ success() {}, error() {}, httpError() {} }),
                },
                "expo-router": {
                    useFocusEffect: (callback) => focusLifecycle.useFocusEffect(callback),
                    useLocalSearchParams: () => ({ deviceId: "device-1" }),
                    useRouter: () => ({ back() {}, push() {} }),
                },
                "react-native": { View: "View" },
            };
        },
    });

    route.flushEffects();
    focusLifecycle.focus();
    await new Promise((resolve) => setImmediate(resolve));
    route.render();
    assert.equal(
        route.elements().some((node) => node.type === "Button" && node.props.name === "Retry"),
        true,
    );
    assert.match(route.text(), /Failed to load device details/);

    const retry = route
        .elements()
        .find((node) => node.type === "Button" && node.props.name === "Retry");
    retry.props.onPress();
    route.render();
    route.flushEffects();
    await new Promise((resolve) => setImmediate(resolve));
    route.render();
    assert.equal(attempts, 2);
    assert.ok(route.elements().some((node) => node.type === "DeviceForm"));
});

test("device delete Cancel and stale confirmation callbacks do not send a request", async () => {
    for (const invalidate of [
        (mounted) =>
            (mounted.state.homes.current = { ...mounted.state.homes.current, id: "home-2" }),
        (mounted) =>
            (mounted.state.homes.current = { ...mounted.state.homes.current, isOwner: false }),
        (mounted) => (mounted.state.params = { deviceId: "device-2" }),
        (mounted) => (mounted.state.devices = []),
        (mounted) => mounted.blur(),
    ]) {
        let deletes = 0;
        const mounted = mountDeviceDetails({
            delete: async () => (deletes++, { isSuccess: true }),
        });
        await mounted.ready();
        mounted.deleteButton().props.onPress();
        mounted.route.render();
        const staleConfirm = mounted.dialog().props.onConfirm;
        invalidate(mounted);
        mounted.route.render();
        mounted.route.flushEffects();
        mounted.route.render();
        assert.equal(mounted.dialog()?.props.visible ?? false, false);
        staleConfirm();
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(deletes, 0);
    }

    let deletes = 0;
    const mounted = mountDeviceDetails({ delete: async () => (deletes++, { isSuccess: true }) });
    await mounted.ready();
    mounted.deleteButton().props.onPress();
    mounted.route.render();
    mounted.dialog().props.onCancel();
    mounted.route.render();
    assert.equal(mounted.dialog().props.visible, false);
    assert.equal(deletes, 0);
});

test("device details require current-home catalog membership before management", async () => {
    const currentHomeDevice = {
        id: "device-2",
        name: "Other home device",
        icon: "bulb-outline",
        tile: { type: "Default" },
    };
    const mounted = mountDeviceDetails({
        homes: { loading: false, current: { id: "home-2", isOwner: true, canManage: false } },
        devices: [currentHomeDevice],
    });
    await mounted.ready();

    assert.equal(mounted.form(), undefined);
    assert.equal(mounted.deleteButton(), undefined);
    assert.match(mounted.route.text(), /isn't available in the current home/i);
});

test("device details wait for membership proof and retain form through same-home list errors", async () => {
    const mounted = mountDeviceDetails({ devices: [], devicesLoading: true });
    await mounted.ready();
    assert.equal(mounted.form(), undefined);
    assert.equal(mounted.deleteButton(), undefined);

    mounted.state.devices = [mounted.state.device];
    mounted.state.devicesLoading = false;
    mounted.route.render();
    const loadedForm = mounted.form();
    assert.ok(loadedForm);

    mounted.state.devicesError = "Couldn't load devices.";
    mounted.route.render();
    assert.ok(mounted.form(), "Same-home refresh failure keeps the mounted device form visible.");
    assert.equal(mounted.form().props.initName, loadedForm.props.initName);
});

test("pending device delete locks form and duplicate confirmation", async () => {
    let finishDelete;
    let deletes = 0;
    let refreshes = 0;
    let backs = 0;
    const mounted = mountDeviceDetails({
        delete: () => {
            deletes++;
            return new Promise((resolve) => (finishDelete = resolve));
        },
        refresh: async () => (refreshes++, true),
        router: { canGoBack: () => true, back: () => backs++, replace() {}, push() {} },
    });
    await mounted.ready();
    mounted.deleteButton().props.onPress();
    mounted.route.render();
    const confirm = mounted.dialog().props.onConfirm;
    confirm();
    confirm();
    mounted.route.render();
    assert.equal(deletes, 1);
    assert.equal(mounted.form().props.disabled, true);
    assert.equal(mounted.deleteButton().props.disabled, true);

    finishDelete({ isSuccess: true });
    await new Promise((resolve) => setImmediate(resolve));
    mounted.route.render();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(deletes, 1);
    assert.equal(refreshes, 1);
    assert.equal(backs, 1);
    assert.deepEqual(mounted.state.toasts, []);
});

test("failed device delete shows local Retry and repeats only the rejected request", async () => {
    let deletes = 0;
    let refreshes = 0;
    let backs = 0;
    const mounted = mountDeviceDetails({
        delete: async () => ({ isSuccess: ++deletes > 1 }),
        refresh: async () => (refreshes++, true),
        router: { canGoBack: () => true, back: () => backs++, replace() {}, push() {} },
    });
    await mounted.ready();
    mounted.deleteButton().props.onPress();
    mounted.route.render();
    await mounted.dialog().props.onConfirm();
    mounted.route.render();
    assert.match(mounted.route.text(), /Couldn't delete device/);
    assert.equal(mounted.retry().props.accessibilityLabel ?? mounted.retry().props.name, "Retry");
    await mounted.retry().props.onPress();
    mounted.route.render();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(deletes, 2);
    assert.equal(refreshes, 1);
    assert.equal(backs, 1);
    assert.deepEqual(mounted.state.toasts, []);
});

test("accepted device deletion retries return only", async () => {
    let deletes = 0;
    let refreshes = 0;
    let backs = 0;
    const mounted = mountDeviceDetails({
        delete: async () => (deletes++, { isSuccess: true }),
        refresh: async () => (refreshes++, true),
        router: {
            canGoBack: () => true,
            back: () => {
                backs++;
                if (backs === 1) throw new Error("navigation unavailable");
            },
            replace() {},
            push() {},
        },
    });
    await mounted.ready();
    mounted.deleteButton().props.onPress();
    mounted.route.render();
    await mounted.dialog().props.onConfirm();
    mounted.route.render();
    assert.match(mounted.route.text(), /Device deleted/);
    assert.equal(mounted.form().props.disabled, true);

    await mounted.retry().props.onPress();
    mounted.route.render();
    assert.equal(deletes, 1);
    assert.equal(refreshes, 1);
    assert.equal(backs, 2);
    assert.equal(mounted.state.toasts.length, 0);
});

test("device management rejects retained callbacks after context change or accepted delete", async () => {
    let staleContextPushes = 0;
    const stale = mountDeviceDetails({
        router: {
            canGoBack: () => true,
            back() {},
            replace() {},
            push: () => staleContextPushes++,
        },
    });
    await stale.ready();
    const staleManagement = stale.route
        .elements()
        .find(
            (node) =>
                node.type === "ListRow" && node.props.title === "Manage operations and widgets",
        );
    stale.state.homes.current = { ...stale.state.homes.current, id: "home-2" };
    stale.route.render();
    staleManagement.props.onPress();

    let deletes = 0;
    let acceptedContextPushes = 0;
    const accepted = mountDeviceDetails({
        delete: async () => (deletes++, { isSuccess: true }),
        refresh: async () => true,
        router: {
            canGoBack: () => true,
            back: () => {
                throw new Error("navigation unavailable");
            },
            replace() {},
            push: () => acceptedContextPushes++,
        },
    });
    await accepted.ready();
    const retainedManagement = accepted.route
        .elements()
        .find(
            (node) =>
                node.type === "ListRow" && node.props.title === "Manage operations and widgets",
        );
    accepted.deleteButton().props.onPress();
    accepted.route.render();
    await accepted.dialog().props.onConfirm();
    accepted.route.render();
    const acceptedRowDisabled = accepted.route
        .elements()
        .find(
            (node) =>
                node.type === "ListRow" && node.props.title === "Manage operations and widgets",
        ).props.disabled;
    retainedManagement.props.onPress();

    assert.deepEqual(
        { staleContextPushes, acceptedRowDisabled, acceptedContextPushes, deletes },
        { staleContextPushes: 0, acceptedRowDisabled: true, acceptedContextPushes: 0, deletes: 1 },
    );
});

test("accepted device deletion refresh Retry cannot repeat DELETE", async () => {
    let deletes = 0;
    let refreshes = 0;
    let backs = 0;
    const mounted = mountDeviceDetails({
        delete: async () => (deletes++, { isSuccess: true }),
        refresh: async () => {
            if (++refreshes === 1) throw new Error("offline");
            return true;
        },
        router: { canGoBack: () => true, back: () => backs++, replace() {}, push() {} },
    });
    await mounted.ready();
    mounted.deleteButton().props.onPress();
    mounted.route.render();
    await mounted.dialog().props.onConfirm();
    mounted.route.render();
    assert.match(mounted.route.text(), /Device deleted/);
    await mounted.retry().props.onPress();
    mounted.route.render();
    assert.equal(deletes, 1);
    assert.equal(refreshes, 2);
    assert.equal(backs, 1);
});

test("accepted device deletion after blur returns on refocus without repeating DELETE", async () => {
    let finishDelete;
    let deletes = 0;
    let refreshes = 0;
    let backs = 0;
    const mounted = mountDeviceDetails({
        delete: () => {
            deletes++;
            return new Promise((resolve) => (finishDelete = resolve));
        },
        refresh: async () => (refreshes++, true),
        router: {
            canGoBack: () => false,
            back() {},
            replace() {
                backs++;
            },
            push() {},
        },
    });
    await mounted.ready();
    mounted.deleteButton().props.onPress();
    mounted.route.render();
    const accepted = mounted.dialog().props.onConfirm();
    mounted.blur();
    finishDelete({ isSuccess: true });
    await accepted;
    assert.equal(deletes, 1);
    assert.equal(refreshes, 0);
    assert.equal(backs, 0);

    mounted.focus();
    await new Promise((resolve) => setImmediate(resolve));
    mounted.route.render();
    assert.equal(deletes, 1);
    assert.equal(refreshes, 1);
    assert.equal(backs, 1);
});

test("accepted device deletion resumes when route refocuses before DELETE acceptance", async () => {
    let finishDelete;
    let deletes = 0;
    let refreshes = 0;
    let backs = 0;
    const mounted = mountDeviceDetails({
        delete: () => {
            deletes++;
            return new Promise((resolve) => (finishDelete = resolve));
        },
        refresh: async () => (refreshes++, true),
        router: { canGoBack: () => true, back: () => backs++, replace() {}, push() {} },
    });
    await mounted.ready();
    mounted.deleteButton().props.onPress();
    mounted.route.render();
    const pendingDelete = mounted.dialog().props.onConfirm();

    mounted.blur();
    mounted.focus();
    finishDelete({ isSuccess: true });
    await pendingDelete;
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(deletes, 1);
    assert.equal(refreshes, 1);
    assert.equal(backs, 1);
});

test("accepted device deletion resumes after refresh settles in a newer focus generation", async () => {
    let finishRefresh;
    let deletes = 0;
    let refreshes = 0;
    let backs = 0;
    const mounted = mountDeviceDetails({
        delete: async () => (deletes++, { isSuccess: true }),
        refresh: () => {
            refreshes++;
            return new Promise((resolve) => (finishRefresh = resolve));
        },
        router: { canGoBack: () => true, back: () => backs++, replace() {}, push() {} },
    });
    await mounted.ready();
    mounted.deleteButton().props.onPress();
    mounted.route.render();
    const pendingDelete = mounted.dialog().props.onConfirm();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(refreshes, 1);

    mounted.blur();
    mounted.focus();
    mounted.state.devices = [];
    mounted.route.render();
    assert.ok(
        mounted.form(),
        "Accepted target stays available for return recovery after catalog refresh.",
    );
    finishRefresh(true);
    await pendingDelete;
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(deletes, 1);
    assert.equal(refreshes, 1);
    assert.equal(backs, 1);
});
