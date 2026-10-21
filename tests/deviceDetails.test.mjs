import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

function mountForm(onSubmit, props = {}) {
    const form = mountNativeComponent("src/components/device/DeviceForm.tsx", {
        props: {
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
        },
        modules: {
            "../common/ImageButton": "ImageButton",
            "../common/Input": "Input",
            "../common/IconSelector": "IconSelector",
            "../common/Dropdown": "Dropdown",
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
    return form;
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
            const select = () =>
                form
                    .elements()
                    .find((node) => node.type === "Dropdown" && node.props.title === "Tile Type");
            assert.deepEqual(
                Array.from(
                    form.elements().find((node) => node.type === "OperationSelector").props
                        .filterTypes,
                ),
                filterTypes,
            );
            assert.ok(select().props.options.some((option) => option.value === type));
            select().props.onSelected("Default");
            form.render();
            await form
                .elements()
                .find((node) => node.type === "Button" && node.props.name === "Save changes")
                .props.onPress();
            form.render();
            select().props.onSelected(type);
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
    const type = () =>
        form
            .elements()
            .find((node) => node.type === "Dropdown" && node.props.title === "Presence Type");
    const save = () =>
        form
            .elements()
            .find((node) => node.type === "Button" && node.props.name === "Save changes");
    type().props.onSelected("Default");
    form.render();
    await save().props.onPress();
    form.render();
    type().props.onSelected("BooleanOperation");
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
    const tileType = () =>
        form
            .elements()
            .find((node) => node.type === "Dropdown" && node.props.title === "Tile Type");
    const unit = () =>
        form.elements().find((node) => node.type === "Input" && node.props.title === "Unit");
    const save = () =>
        form
            .elements()
            .find((node) => node.type === "Button" && node.props.name === "Save changes");

    unit().props.setValue("°F");
    tileType().props.onSelected("Default");
    form.render();
    await save().props.onPress();
    form.render();
    assert.deepEqual(JSON.parse(JSON.stringify(requests[0])), { type: "Default" });

    tileType().props.onSelected("Display");
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
    const tileType = () =>
        form
            .elements()
            .find((node) => node.type === "Dropdown" && node.props.title === "Tile Type");
    const save = () =>
        form
            .elements()
            .find((node) => node.type === "Button" && node.props.name === "Save changes");

    tileType().props.onSelected("Default");
    form.render();
    await save().props.onPress();
    form.render();
    assert.deepEqual(JSON.parse(JSON.stringify(requests[0])), { type: "Default" });

    tileType().props.onSelected("Switch");
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
        .find((node) => node.type === "Button" && node.props.name === "Add Device");
    await add.props.onPress();
    assert.deepEqual(Object.keys(request).sort(), ["homeId", "icon", "name", "roomId"]);
    assert.equal(request.homeId, "home-1");
    assert.equal(request.roomId, null);
    assert.equal(request.name, "Desk lamp");
    assert.equal(request.icon, "bulb-outline");
    assert.ok(
        form.elements().some((node) => node.type === "DeviceTile"),
        "Create form previews tile",
    );
});

test("device details load failure shows retry and recovers on the same device route", async () => {
    let attempts = 0;
    const route = mountNativeComponent("src/app/(app)/device/details.tsx", {
        modules: {
            "@/components/common/ConfirmDialog": "ConfirmDialog",
            "@/components/common/ContentSection": "ContentSection",
            "@/components/common/ListRow": "ListRow",
            "@/components/common/Loading": "Loading",
            "@/components/common/Button": "Button",
            "@/components/device/DeviceForm": "DeviceForm",
            "@/contexts/custom/DeviceListProvider": {
                useDeviceList: () => ({ refresh: async () => true }),
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
                useFocusEffect: (callback) => callback(),
                useLocalSearchParams: () => ({ deviceId: "device-1" }),
                useRouter: () => ({ back() {}, push() {} }),
            },
            "react-native": { View: "View" },
        },
    });

    route.flushEffects();
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
