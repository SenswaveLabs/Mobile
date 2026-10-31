import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const home = (id = "home-1") => ({
    id,
    name: "Home",
    icon: "home-outline",
    isOwner: true,
    canManage: true,
    rooms: [{ id: "room-1", name: "Living room" }],
    dataSource: { id: "source-1", name: "Broker", state: "Working" },
});
const device = (id = "device-1", value = false) => ({
    id,
    name: "Desk lamp",
    icon: "opaque-device-key",
    roomId: "room-1",
    tile: { type: "Switch", value },
    presence: { type: "BooleanOperation", value: true },
    display: true,
    createdAtUtc: "",
    updatedAtUtc: "",
});
const response = (items) => ({
    isSuccess: true,
    statusCode: 200,
    response: { json: async () => ({ items }) },
});
const settle = async (component) => {
    await new Promise((resolve) => setImmediate(resolve));
    component.render();
    component.flushEffects();
    component.render();
};
const deferred = () => {
    let resolve;
    const promise = new Promise((done) => {
        resolve = done;
    });
    return { promise, resolve };
};

test("view toggle retains one selected layout and marks keyboard focus", () => {
    const changes = [];
    const colors = { authBorder: "outline", authFocus: "focus" };
    const component = mountNativeComponent("src/components/device/DeviceLayoutToggle.tsx", {
        props: { layout: "list", onChange: (layout) => changes.push(layout) },
        modules: {
            "@/components/ui/toggle-group": {
                ToggleGroup: "ToggleGroup",
                ToggleGroupItem: "ToggleGroupItem",
            },
            "lucide-react-native": { List: "List", LayoutGrid: "LayoutGrid" },
            "@/contexts/ThemeProvider": { useTheme: () => ({ current: { colors } }) },
        },
    });
    const buttons = () => component.elements().filter((node) => node.type === "ToggleGroupItem");
    const group = () => component.elements().find((node) => node.type === "ToggleGroup");
    assert.equal(group().props.type, "single");
    assert.equal(group().props.value, "list");
    assert.equal(buttons()[0].props.accessibilityState.selected, true);
    assert.equal(buttons()[1].props.accessibilityState.selected, false);
    group().props.onValueChange("");
    group().props.onValueChange("list");
    assert.deepEqual(changes, []);
    group().props.onValueChange("grid");
    assert.deepEqual(changes, ["grid"]);
    buttons()[1].props.onFocus();
    component.render();
    const indicator = () => component.elements(buttons()[1]).find((node) => node.type === "View");
    assert.equal(Object.assign({}, ...indicator().props.style).backgroundColor, colors.authFocus);
    buttons()[1].props.onBlur();
    component.render();
    assert.equal(Object.assign({}, ...indicator().props.style).backgroundColor, "transparent");
});

function mountDevices(get, homes = { current: home() }) {
    const component = mountNativeComponent("src/contexts/custom/DeviceListProvider.tsx", {
        exportName: "DeviceListProvider",
        modules: {
            "../domain/HomeProvider": { useHomes: () => homes },
            "../HttpClientProvider": { useHttpClient: () => ({ get }) },
        },
    });
    component.flushEffects();
    return { component, homes, value: () => component.elements()[0].props.value };
}

test("room filters include devices beyond the API's default first ten results", async () => {
    const items = Array.from({ length: 30 }, (_, index) => ({
        ...device(`device-${index}`),
        roomId: index === 29 ? "room-2" : "room-1",
    }));
    const current = home();
    current.rooms.push({ id: "room-2", name: "Last room" });
    const { component, value } = mountDevices(
        async (path) => {
            const size = Number(
                new URL(path, "https://senswave.test").searchParams.get("size") ?? 10,
            );
            return response(items.slice(0, size));
        },
        { current },
    );
    await settle(component);
    assert.equal(value().devices.length, 30);
    value().setFilter("room-2");
    component.render();
    assert.deepEqual(
        value().filteredDevices.map((item) => item.id),
        ["device-29"],
    );
});

test("device refresh preserves room selection and failed reads preserve data with inline recovery", async () => {
    let result = response([device(), { ...device("device-2"), roomId: "room-2" }]);
    const { component, homes, value } = mountDevices(async () => result);
    await settle(component);
    value().setFilter("room-1");
    component.render();
    assert.equal(value().filteredDevices.length, 1);
    result = { isSuccess: false, statusCode: 503 };
    await value().refresh();
    component.render();
    component.flushEffects();
    await settle(component);
    assert.equal(value().filter, "room-1");
    assert.equal(value().devices.length, 2);
    assert.ok(value().error);
    assert.equal(value().loading, false);
    result = response([device()]);
    await value().refresh();
    component.render();
    component.flushEffects();
    await settle(component);
    assert.equal(value().error, null);
    assert.equal(value().filter, "room-1");
    assert.equal(value().devices.length, 1);
    homes.current = { ...homes.current, rooms: [] };
    component.render();
    assert.equal(value().filter, "all");
    assert.equal(value().filteredDevices.length, value().devices.length);
});

test("late device reads cannot replace the current home's devices", async () => {
    const old = deferred();
    const { component, homes, value } = mountDevices((path) =>
        path.endsWith("home-1") ? old.promise : Promise.resolve(response([device("new-device")])),
    );
    homes.current = home("home-2");
    component.render();
    component.flushEffects();
    await settle(component);
    assert.equal(value().devices[0].id, "new-device");
    old.resolve(response([device("old-device")]));
    await settle(component);
    assert.equal(value().devices[0].id, "new-device");
});

test("device reads distinguish unavailable, malformed, empty and missing-home states", async () => {
    for (const result of [
        { isSuccess: false, statusCode: 500 },
        { isSuccess: true, statusCode: 200, response: { json: async () => ({}) } },
    ]) {
        const { component, value } = mountDevices(async () => result);
        await settle(component);
        assert.ok(value().error);
        assert.equal(value().loading, false);
        assert.equal(value().devices.length, 0);
    }
    const empty = mountDevices(async () => ({ isSuccess: false, statusCode: 404 }));
    await settle(empty.component);
    assert.equal(empty.value().error, null);
    assert.equal(empty.value().devices.length, 0);
    const missing = mountDevices(() => assert.fail("No request without a home"), {
        current: undefined,
    });
    await settle(missing.component);
    assert.equal(missing.value().loading, false);
});

test("compact device tiles preserve navigation, permissions, exact icons and separate controls", () => {
    for (const kind of ["Default", "Display", "Switch", "Slider", "Options"]) {
        for (const manager of [true, false]) {
            const navigation = [];
            const props = { device: { ...device(), tile: { type: kind, value: true } } };
            const component = mountNativeComponent("src/components/device/tile/DeviceTile.tsx", {
                props,
                modules: {
                    "expo-router": {
                        useRouter: () => ({ push: (route) => navigation.push(route) }),
                    },
                    "./DisplayDeviceTile": "DisplayDeviceTile",
                    "./SwitchDeviceTile": "SwitchDeviceTile",
                    "./ControlDeviceTile": "ControlDeviceTile",
                    "@/hooks/useDeviceTileAction": {
                        useDeviceTileAction: ({ tile }) => ({
                            value: tile.value,
                            pending: false,
                            feedback: "none",
                            error: "",
                            send() {},
                        }),
                    },
                    "lucide-react-native": { ChevronRight: "ChevronRight" },
                    "@/contexts/domain/HomeProvider": {
                        useHomes: () => ({
                            current: { ...home(), isOwner: manager, canManage: manager },
                        }),
                    },
                    "@/contexts/ThemeProvider": {
                        useTheme: () => ({
                            current: {
                                colors: {
                                    authPrimary: "#F7B817",
                                    authFieldBackground: "#F9F7F1",
                                    deviceTileSurface: "#FFFEFA",
                                    deviceTileBorder: "#D8D2C7",
                                    dataSourceStatus: { positive: {}, critical: {} },
                                },
                            },
                        }),
                    },
                },
            });
            const target = () => component.elements().find((node) => node.type === "Pressable");
            target().props.onPress();
            assert.equal(navigation[0].pathname, "device/device");
            assert.equal(navigation[0].params.deviceId, props.device.id);
            assert.equal(Boolean(target().props.onLongPress), manager);
            if (manager) {
                target().props.onLongPress();
                assert.equal(navigation[1].pathname, "device/details");
            }
            const icon = component.elements().find((node) => node.type === "Icon");
            assert.equal(icon.props.icon, "opaque-device-key");
            assert.equal(icon.props.size, 20);
            assert.equal(Object.assign({}, ...component.elements()[0].props.style).minHeight, 112);
            assert.equal(
                Object.assign({}, ...component.elements()[0].props.style).backgroundColor,
                "#FFFEFA",
            );
            assert.equal(
                component
                    .elements(target())
                    .some((node) => ["SwitchDeviceTile", "ControlDeviceTile"].includes(node.type)),
                false,
            );
            assert.ok(component.text().includes("Living room"));
            assert.equal(component.text().includes("Open dashboard"), false);
            assert.equal(component.text().includes("Active"), false);
            props.disablePress = true;
            component.render();
            target().props.onPress();
            assert.equal(target().props.disabled, true);
            assert.equal(target().props.onLongPress, undefined);
            assert.equal(navigation.length, manager ? 2 : 1);
        }
    }
});

test("native slider keeps a 48 dp target and sends only changed releases", () => {
    const changes = [];
    const releases = [];
    const props = {
        min: -10,
        max: 100,
        step: 0.5,
        initialValue: 0,
        accessibilityLabel: "Speaker volume",
        onValueChange: (value) => changes.push(value),
        onValueSlided: (value) => releases.push(value),
    };
    const component = mountNativeComponent("src/components/common/Slider.tsx", {
        props,
        modules: {
            "@react-native-community/slider": "NativeSlider",
            "@/contexts/ThemeProvider": {
                useTheme: () => ({
                    current: { colors: { authForeground: "foreground", authBorder: "border" } },
                }),
            },
        },
    });
    component.flushEffects();
    const control = () => component.elements().find((node) => node.type === "NativeSlider");
    assert.equal(control().props.style.minHeight, 48);
    assert.equal(control().props.accessibilityLabel, "Speaker volume");
    assert.equal(control().props.value, 0);
    assert.equal(control().props.thumbTintColor, "foreground");
    assert.equal(control().props.minimumTrackTintColor, "foreground");
    assert.equal(control().props.maximumTrackTintColor, "transparent");
    const rail = component.elements().find((node) => node.props.pointerEvents === "none");
    assert.equal(rail.props.style[1].backgroundColor, "border");
    const nativeStyles = [];
    control().props.ref.current = { setNativeProps: (props) => nativeStyles.push(props.style) };
    control().props.onLayout();
    assert.equal(nativeStyles[0].height, 48, "The internal native control also gets 48 dp");
    control().props.onSlidingStart(0);
    control().props.onValueChange(25.5);
    assert.deepEqual(changes, [25.5]);
    assert.deepEqual(releases, []);
    control().props.onSlidingComplete(25.5);
    control().props.onSlidingComplete(25.5);
    assert.deepEqual(releases, [25.5]);
    control().props.onValueChange(26);
    control().props.onValueChange(26);
    control().props.onSlidingComplete(26);
    assert.deepEqual(releases, [25.5, 26], "Non-touch adjustments commit once without a drag");
    control().props.onValueChange(Number.NaN);
    assert.deepEqual(releases, [25.5, 26]);
    props.disabled = true;
    component.render();
    control().props.onSlidingComplete(30);
    control().props.onValueChange(30);
    assert.deepEqual(releases, [25.5, 26]);
    assert.deepEqual(changes, [25.5, 26, 26]);
    component.flushEffects();
    component.render();
    assert.equal(control().props.value, 0, "Pending control keeps the reported value");
    props.disabled = false;
    props.initialValue = 500;
    component.render();
    component.flushEffects();
    component.render();
    assert.equal(control().props.value, 100);
});

test("Inactive keeps a distinct icon chip beside the room and does not show an Active tag", () => {
    const props = { device: { ...device(), presence: { type: "BooleanOperation", value: false } } };
    const component = mountNativeComponent("src/components/device/tile/DeviceTile.tsx", {
        props,
        modules: {
            "expo-router": { useRouter: () => ({ push() {} }) },
            "./DisplayDeviceTile": "DisplayDeviceTile",
            "./SwitchDeviceTile": "SwitchDeviceTile",
            "./ControlDeviceTile": "ControlDeviceTile",
            "@/hooks/useDeviceTileAction": { useDeviceTileAction: () => ({}) },
            "@/contexts/domain/HomeProvider": { useHomes: () => ({ current: home() }) },
        },
    });
    assert.equal(component.elements().filter((n) => n.type === "Unplug").length, 1);
    const text = component
        .elements()
        .find((n) => n.type === "Text" && n.props.children.includes("Inactive"));
    const status = component
        .elements()
        .find((n) => n.type === "View" && n.props.children.includes(text));
    assert.match(JSON.stringify(status), /Inactive/);
    assert.equal(JSON.stringify(status).includes("Living room"), false);
    const metadata = component
        .elements()
        .find((n) => n.type === "View" && n.props.children.includes(status));
    assert.match(JSON.stringify(metadata), /Living room/);
    assert.ok(component.elements().find((n) => n.type === "SwitchDeviceTile").props.inactive);
    props.device.presence.value = true;
    component.render();
    assert.equal(component.text().includes("Active"), false);
    assert.equal(component.text().includes("Inactive"), false);
    props.device.presence.value = null;
    component.render();
    assert.match(component.text(), /Status unavailable/);
    assert.equal(
        component.elements().find((n) => n.type === "SwitchDeviceTile").props.inactive,
        false,
    );
});

test("Boolean Display shows locked On/Off without an interactive switch, including missing data", () => {
    for (const value of [true, false, null]) {
        const component = mountNativeComponent("src/components/device/tile/DisplayDeviceTile.tsx", {
            props: {
                deviceId: "",
                tile: { type: "Display", value, configuration: { operationType: "Boolean" } },
            },
            modules: {
                "@/contexts/domain/HomeProvider": { useHomes: () => ({ current: home() }) },
                "@/contexts/HttpClientProvider": { useHttpClient: () => ({}) },
                "@/contexts/domain/LiveUpdateProvider": { useLiveUpdate: () => ({}) },
                "@/contexts/custom/DeviceListProvider": { useDeviceList: () => ({}) },
            },
        });
        assert.match(component.text(), /Read only/);
        assert.ok(component.elements().some((n) => n.type === "LockKeyhole"));
        assert.equal(
            component.elements().some((n) => n.type === "Switch"),
            false,
        );
        assert.match(component.text(), value === null ? /—/ : value ? /On/ : /Off/);
    }
});

test("No data appears beside the room only when every configured reading is missing", () => {
    for (const [value, extra, missing] of [
        [null, null, true],
        [0, null, false],
        [false, null, false],
        [null, 0, false],
    ]) {
        const component = mountNativeComponent("src/components/device/tile/DeviceTile.tsx", {
            props: {
                device: {
                    ...device(),
                    presence: undefined,
                    tile: {
                        type: "Display",
                        value,
                        configuration: {
                            readings: [
                                { operationId: "extra", label: "Second", unit: "", value: extra },
                            ],
                        },
                    },
                },
            },
            modules: {
                "expo-router": { useRouter: () => ({ push() {} }) },
                "./DisplayDeviceTile": "DisplayDeviceTile",
                "./SwitchDeviceTile": "SwitchDeviceTile",
                "./ControlDeviceTile": "ControlDeviceTile",
                "@/hooks/useDeviceTileAction": { useDeviceTileAction: () => ({}) },
                "@/contexts/domain/HomeProvider": { useHomes: () => ({ current: home() }) },
            },
        });
        const statusText = component
            .elements()
            .find((n) => n.type === "Text" && n.props.children.includes("No data"));
        assert.equal(Boolean(statusText), missing);
        if (missing) {
            const chip = component
                .elements()
                .find((n) => n.type === "View" && n.props.children.includes(statusText));
            const metadata = component
                .elements()
                .find((n) => n.type === "View" && n.props.children.includes(chip));
            assert.match(JSON.stringify(metadata), /Living room/);
            assert.ok(component.elements(chip).some((n) => n.type === "Clock3"));
        }
    }
});

test("native slider rejects invalid or excessive ranges before creating native controls", () => {
    for (const range of [
        { min: 10, max: 10, step: 1 },
        { min: 10, max: 0, step: 1 },
        { min: 0, max: Infinity, step: 1 },
        { min: 0, max: 100, step: -1 },
        { min: 0, max: 100, step: 0.0001 },
    ]) {
        const component = mountNativeComponent("src/components/common/Slider.tsx", {
            props: { ...range, initialValue: 0 },
            modules: { "@react-native-community/slider": "NativeSlider" },
        });
        assert.equal(
            component.elements().some((node) => node.type === "NativeSlider"),
            false,
        );
        assert.ok(component.elements().some((node) => node.props.accessibilityRole === "alert"));
    }
});

test("shared switch uses explicit tile colors and preserves other callers' defaults", () => {
    for (const on of [true, false]) {
        for (const branded of [true, false]) {
            const component = mountNativeComponent("src/components/common/Switch.tsx", {
                exportName: "Switch",
                props: {
                    value: { value: on },
                    onPress() {},
                    orientation: "horizontal",
                    ...(branded
                        ? { trackColors: { on: "amber", off: "neutral" }, thumbColor: "thumb" }
                        : {}),
                },
                modules: {
                    "@/contexts/ThemeProvider": {
                        useTheme: () => ({
                            current: {
                                colors: {
                                    error: "red",
                                    success: "green",
                                    secondary: "legacy-thumb",
                                },
                            },
                        }),
                    },
                    "react-native-reanimated": {
                        View: "AnimatedView",
                        useSharedValue: (value) => ({ value }),
                        useAnimatedStyle: (style) => style(),
                        interpolate: (value, _input, output) => output[value ? 1 : 0],
                        interpolateColor: (value, _input, output) => output[value ? 1 : 0],
                        withTiming: (value) => value,
                    },
                },
            });
            const animated = component.elements().filter((node) => node.type === "AnimatedView");
            assert.equal(
                Object.assign({}, ...animated[0].props.style).backgroundColor,
                branded ? (on ? "amber" : "neutral") : on ? "green" : "red",
            );
            assert.equal(
                Object.assign({}, ...animated[1].props.style).backgroundColor,
                branded ? "thumb" : "legacy-thumb",
            );
        }
    }
});

test("slider widget preserves zero and rolls back to the last accepted value when action is rejected", async () => {
    const actions = [];
    let accepted = true;
    const props = {
        widget: {
            id: "volume",
            name: "Speaker",
            configuration: { range: { min: -10, max: 100 }, step: 1, runtime: { value: 0 } },
        },
        disabled: false,
        pending: false,
        onAction: async (value) => (actions.push(value), accepted),
        operations() {},
    };
    const component = mountNativeComponent(
        "src/components/device/widgets/widgets/SliderWidget.tsx",
        {
            props,
            modules: {
                "@/components/common/Slider": "Slider",
            },
        },
    );
    component.flushEffects();
    const control = () => component.elements().find((node) => node.type === "Slider");
    assert.equal(control().props.initialValue, 0);
    const submit = control().props.onValueSlided;
    await submit(25);
    component.render();
    assert.deepEqual(actions, [25]);
    assert.equal(
        component.elements().find((node) => node.type === "Pressable").props.accessibilityLabel,
        "Speaker, 25",
    );

    accepted = false;
    await control().props.onValueSlided(30);
    component.render();
    assert.deepEqual(actions, [25, 30]);
    assert.equal(
        component.elements().find((node) => node.type === "Pressable").props.accessibilityLabel,
        "Speaker, 25",
    );

    props.pending = true;
    component.render();
    assert.equal(control().props.disabled, true);
    await control().props.onValueSlided(50);
    assert.deepEqual(actions, [25, 30]);
});

test("room filtering keeps opaque room IDs and only managers receive edit navigation", () => {
    for (const manager of [true, false]) {
        let filter;
        const navigation = [];
        const component = mountNativeComponent("src/components/room/tiles/RoomTile.tsx", {
            props: { id: "opaque-room-id", name: "Living room" },
            modules: {
                "@/contexts/custom/DeviceListProvider": {
                    useDeviceList: () => ({
                        filter: "all",
                        setFilter: (id) => {
                            filter = id;
                        },
                    }),
                },
                "@/contexts/domain/HomeProvider": {
                    useHomes: () => ({
                        current: { ...home(), isOwner: false, canManage: manager },
                    }),
                },
                "expo-router": { useRouter: () => ({ push: (route) => navigation.push(route) }) },
            },
        });
        const control = component.elements()[0];
        const targetStyle = Object.assign({}, ...control.props.style({ pressed: false }));
        assert.equal(targetStyle.minHeight, 48);
        assert.equal(targetStyle.minWidth, 48);
        const chip = component.elements().find((node) => node.type === "View");
        assert.equal(Object.assign({}, ...chip.props.style).minHeight, 32);
        assert.equal(chip.props.pointerEvents, "none");
        control.props.onPress();
        assert.equal(filter, "opaque-room-id");
        if (manager) {
            control.props.onLongPress();
            assert.equal(navigation[0].params.id, "opaque-room-id");
        } else assert.equal(control.props.onLongPress, undefined);
    }
});

test("rooms show full-width filters or a manager-only first-room prompt", () => {
    for (const [current, prompt] of [
        [home(), false],
        [{ ...home(), rooms: [] }, true],
        [{ ...home(), isOwner: false, canManage: true, rooms: [] }, true],
        [{ ...home(), isOwner: false, canManage: false, rooms: [] }, false],
        [undefined, false],
    ]) {
        const component = mountNativeComponent("src/components/room/RoomsView.tsx", {
            modules: {
                "@/contexts/domain/HomeProvider": { useHomes: () => ({ current }) },
                "./tiles/RoomTile": "RoomTile",
                "./tiles/AddRoomTile": "AddRoomTile",
            },
        });
        const elements = component.elements();
        assert.equal(
            elements.some((node) => node.type === "AddRoomTile"),
            prompt,
        );
        const filters = elements.filter((node) => node.type === "RoomTile");
        if (current?.rooms.length) {
            assert.equal(filters.length, current.rooms.length + 1);
            assert.equal(filters[0].props.id, "all");
            assert.equal(elements[0].type, "ScrollView");
        } else {
            assert.equal(filters.length, 0);
            assert.equal(
                elements.some((node) => node.type === "ScrollView"),
                false,
            );
            if (prompt) assert.match(component.text(), /Organize your devices into rooms/);
            else assert.equal(component.output(), null);
        }
    }
});

const mountHomeSourcePresentation = (homes, navigation) => {
    const colors = {
        background: "background",
        authForeground: "foreground",
        authMuted: "muted",
        authBorder: "border",
        authBackground: "auth-background",
        authPrimary: "auth-primary",
        authOnPrimary: "auth-on-primary",
        textOnPrimary: "text-on-primary",
        primary: "primary",
        secondary: "secondary",
        textOnSecondary: "text-on-secondary",
        error: "error",
    };
    const commonModules = {
        "@/contexts/domain/HomeProvider": { useHomes: () => homes },
        "@/contexts/ThemeProvider": { useTheme: () => ({ current: { colors } }) },
        "expo-router": { useRouter: () => ({ push: (route) => navigation.push(route) }) },
    };
    const header = mountNativeComponent("src/components/headers/ProfileHeader.tsx", {
        modules: {
            ...commonModules,
            "../common/Icon": "Icon",
            "../user/UserProfileImage": "UserProfileImage",
        },
    });
    const widget = mountNativeComponent("src/components/home/widgets/HomeStateWidget.tsx", {
        modules: { ...commonModules, "@/components/common/Icon": "Icon" },
    });
    return { header, widget };
};

const alertCopy = (base, role) =>
    role === "Owner" ||
    (!base.startsWith("Data source disconnected.") && !base.startsWith("Data source error."))
        ? base
        : `${base} Contact the home owner if this continues.`;

test("home source presentation covers exact backend states and owner permissions", () => {
    const roles = [
        { name: "Owner", isOwner: true, canManage: false },
        { name: "Manage", isOwner: false, canManage: true },
        { name: "Display", isOwner: false, canManage: false },
    ];
    const source = (state) => ({ id: "source-1", name: "Broker", state });
    const cases = [
        { name: "Working", dataSource: source("Working"), healthy: true },
        { name: "Connected", dataSource: source("Connected"), healthy: true },
        {
            name: "Connecting",
            dataSource: source("Connecting"),
            pending: "Connecting to data source…",
        },
        {
            name: "Restarting",
            dataSource: source("Restarting"),
            pending: "Restarting data source…",
        },
        {
            name: "NotStarted",
            dataSource: source("NotStarted"),
            copy: "Data source disconnected. Device values may be out of date.",
            icon: "Unplug",
            action: "Connection details",
            route: { pathname: "dataSource/details", params: { id: "source-1" } },
        },
        {
            name: "Stopped",
            dataSource: source("Stopped"),
            copy: "Data source disconnected. Device values may be out of date.",
            icon: "Unplug",
            action: "Connection details",
            route: { pathname: "dataSource/details", params: { id: "source-1" } },
        },
        {
            name: "Disconnected",
            dataSource: source("Disconnected"),
            copy: "Data source disconnected. Device values may be out of date.",
            icon: "Unplug",
            action: "Connection details",
            route: { pathname: "dataSource/details", params: { id: "source-1" } },
        },
        {
            name: "Error",
            dataSource: source("Error"),
            copy: "Data source error. Device values may be out of date.",
            icon: "CircleAlert",
            action: "Connection details",
            route: { pathname: "dataSource/details", params: { id: "source-1" } },
            destructive: true,
        },
        {
            name: "unknown string",
            dataSource: source("BrokerStartingSoon"),
            copy: "Connection status unavailable. Device values may be out of date.",
            icon: "Info",
        },
        {
            name: "empty string",
            dataSource: source(""),
            copy: "Connection status unavailable. Device values may be out of date.",
            icon: "Info",
        },
        {
            name: "null state",
            dataSource: source(null),
            copy: "Connection status unavailable. Device values may be out of date.",
            icon: "Info",
        },
        {
            name: "omitted state",
            dataSource: { id: "source-1", name: "Broker" },
            copy: "Connection status unavailable. Device values may be out of date.",
            icon: "Info",
        },
        {
            name: "missing source",
            dataSource: null,
            copy: "No data source connected.",
            setup: {
                Owner: "Connect a data source to add devices.",
                Manage: "Ask the home owner to connect a data source.",
                Display: "Ask the home owner to connect a data source.",
            },
            icon: "Info",
            action: "Connect data source",
            route: { pathname: "home/dataSource/select", params: { homeId: "home-1" } },
        },
        {
            name: "empty source ID with stale Working",
            dataSource: { id: "", name: "Broker", state: "Working" },
            copy: "No data source connected.",
            setup: {
                Owner: "Connect a data source to add devices.",
                Manage: "Ask the home owner to connect a data source.",
                Display: "Ask the home owner to connect a data source.",
            },
            icon: "Info",
            action: "Connect data source",
            route: { pathname: "home/dataSource/select", params: { homeId: "home-1" } },
        },
        ...["Error", "NotStarted", "Stopped", "Disconnected"].map((state) => ({
            name: `empty source ID with stale ${state}`,
            dataSource: { id: "", name: "Broker", state },
            copy: "No data source connected.",
            setup: {
                Owner: "Connect a data source to add devices.",
                Manage: "Ask the home owner to connect a data source.",
                Display: "Ask the home owner to connect a data source.",
            },
            icon: "Info",
            action: "Connect data source",
            route: { pathname: "home/dataSource/select", params: { homeId: "home-1" } },
        })),
        {
            name: "omitted source ID with stale Error",
            dataSource: { name: "Broker", state: "Error" },
            copy: "No data source connected.",
            setup: {
                Owner: "Connect a data source to add devices.",
                Manage: "Ask the home owner to connect a data source.",
                Display: "Ask the home owner to connect a data source.",
            },
            icon: "Info",
            action: "Connect data source",
            route: { pathname: "home/dataSource/select", params: { homeId: "home-1" } },
        },
    ];

    for (const role of roles)
        for (const stateCase of cases) {
            const homes = {
                loading: false,
                current: { ...home(), ...role, dataSource: stateCase.dataSource },
            };
            const navigation = [];
            const { header, widget } = mountHomeSourcePresentation(homes, navigation);
            const healthy = Boolean(stateCase.healthy);
            assert.equal(
                header.text().includes("Data source connected"),
                !homes.loading && healthy,
                `${role.name}/${stateCase.name}: header status`,
            );
            assert.equal(
                widget.output() === null,
                healthy,
                `${role.name}/${stateCase.name}: null widget`,
            );
            const alerts = widget.elements().filter((node) => node.type === "Alert");
            assert.equal(
                alerts.length,
                stateCase.copy ? 1 : 0,
                `${role.name}/${stateCase.name}: alert count`,
            );
            assert.equal(
                widget.elements().some((node) => node.type === "Pressable"),
                false,
                `${role.name}/${stateCase.name}: no tappable notice`,
            );
            const expectedAction = Boolean(role.isOwner && stateCase.action);
            const buttons = widget.elements().filter((node) => node.type === "Button");
            assert.equal(
                buttons.length,
                expectedAction ? 1 : 0,
                `${role.name}/${stateCase.name}: action count`,
            );
            assert.equal(
                widget.text().includes("Broker"),
                false,
                `${role.name}/${stateCase.name}: no source name`,
            );
            if (
                !healthy &&
                !stateCase.pending &&
                typeof stateCase.dataSource?.state === "string" &&
                stateCase.dataSource.state
            )
                assert.equal(
                    widget.text().includes(stateCase.dataSource.state),
                    false,
                    `${role.name}/${stateCase.name}: no raw state`,
                );

            if (stateCase.pending) {
                const pendingText = widget.elements().find((node) => node.type === "Text");
                assert.deepEqual(pendingText.props.children, [stateCase.pending]);
                assert.equal(alerts.length, 0);
                assert.equal(buttons.length, 0);
            }
            if (stateCase.copy) {
                const alert = alerts[0];
                const description = widget
                    .elements(alert)
                    .find((node) => node.type === "AlertDescription");
                const expectedCopy = stateCase.setup
                    ? `${stateCase.copy} ${stateCase.setup[role.name]}`
                    : alertCopy(stateCase.copy, role.name);
                assert.equal(description.props.children.join(""), expectedCopy);
                assert.equal(alert.props.accessibilityRole, "alert");
                assert.equal(alert.props.accessibilityLiveRegion, "polite");
                assert.equal(
                    alert.props.variant,
                    stateCase.destructive ? "destructive" : undefined,
                );
                assert.equal(Object.hasOwn(alert.props, "compact"), false);
                assert.equal(
                    widget
                        .elements(alert)
                        .some((node) => ["Button", "Pressable"].includes(node.type)),
                    false,
                );
                assert.equal(
                    widget
                        .elements(alert)
                        .some((node) => node.props?.accessibilityRole === "button"),
                    false,
                );
                assert.equal(alert.props.icon, stateCase.icon);
                assert.equal(navigation.length, 0);
            }
            if (expectedAction) {
                assert.equal(buttons[0].props.name, stateCase.action);
                assert.equal(buttons[0].props.type, "brand-outline");
                assert.equal(buttons[0].props.loading, false);
                buttons[0].props.onPress();
                assert.deepEqual(JSON.parse(JSON.stringify(navigation)), [stateCase.route]);
            }
        }

    const homes = { loading: false, current: undefined };
    const { header, widget } = mountHomeSourcePresentation(homes, []);
    assert.equal(header.text().includes("Data source connected"), false);
    assert.equal(widget.output(), null);
    homes.current = { ...home(), dataSource: source("Working") };
    homes.loading = true;
    header.render();
    widget.render();
    assert.equal(header.text().includes("Data source connected"), false);
    assert.equal(widget.output(), null);
});

test("home source presentation drops stale state and actions across home and role changes", () => {
    const homes = { loading: false, current: home() };
    const navigation = [];
    const { header, widget } = mountHomeSourcePresentation(homes, navigation);
    const alerts = () => widget.elements().filter((node) => node.type === "Alert");
    const buttons = () => widget.elements().filter((node) => node.type === "Button");
    const copy = () =>
        widget
            .elements()
            .find((node) => node.type === "AlertDescription")
            ?.props.children.join("");
    const render = () => {
        header.render();
        widget.render();
    };

    assert.equal(widget.output(), null);
    homes.current.dataSource.state = "Connecting";
    render();
    assert.equal(widget.text().includes("Connecting to data source…"), true);
    assert.equal(alerts().length, 0);
    assert.equal(buttons().length, 0);
    homes.current.dataSource.state = "Error";
    render();
    assert.equal(copy(), "Data source error. Device values may be out of date.");
    assert.equal(buttons()[0].props.name, "Connection details");
    homes.current.dataSource.state = "Working";
    render();
    assert.equal(header.text().includes("Data source connected"), true);
    assert.equal(widget.output(), null);
    homes.current.dataSource = null;
    render();
    assert.equal(copy(), "No data source connected. Connect a data source to add devices.");
    assert.equal(buttons()[0].props.name, "Connect data source");
    homes.current.dataSource = { id: "source-1", name: "Broker", state: "UnknownNow" };
    render();
    assert.equal(copy(), "Connection status unavailable. Device values may be out of date.");
    assert.equal(buttons().length, 0);

    homes.current = {
        ...home("home-2"),
        name: "Second home",
        isOwner: true,
        canManage: false,
        dataSource: { id: "source-2", name: "Other broker", state: "Error" },
    };
    render();
    assert.equal(copy(), "Data source error. Device values may be out of date.");
    buttons()[0].props.onPress();
    assert.deepEqual(JSON.parse(JSON.stringify(navigation)), [
        { pathname: "dataSource/details", params: { id: "source-2" } },
    ]);

    homes.current.isOwner = false;
    homes.current.canManage = true;
    render();
    assert.equal(
        copy(),
        "Data source error. Device values may be out of date. Contact the home owner if this continues.",
    );
    assert.equal(buttons().length, 0);
    homes.current.canManage = false;
    render();
    assert.equal(
        copy(),
        "Data source error. Device values may be out of date. Contact the home owner if this continues.",
    );
    assert.equal(buttons().length, 0);
    homes.current.dataSource.state = "Working";
    render();
    assert.equal(header.text().includes("Data source connected"), true);
    assert.equal(widget.output(), null);
    homes.current.dataSource.state = "Error";
    render();
    const persistentCopy = copy();
    render();
    assert.equal(copy(), persistentCopy);
    assert.equal(buttons().length, 0);

    homes.current.isOwner = true;
    homes.current.canManage = false;
    homes.current.dataSource = null;
    render();
    buttons()[0].props.onPress();
    assert.deepEqual(JSON.parse(JSON.stringify(navigation.at(-1))), {
        pathname: "home/dataSource/select",
        params: { homeId: "home-2" },
    });
});

test("home header keeps accessible navigation beside a wrapping connected subtitle", () => {
    const homes = { loading: false, current: home() };
    const navigation = [];
    const { header } = mountHomeSourcePresentation(homes, navigation);
    const status = () =>
        header
            .elements()
            .find(
                (node) =>
                    node.type === "View" &&
                    node.props.accessibilityLabel === "Data source connected",
            );
    const homePicker = () =>
        header
            .elements()
            .find((node) => node.type === "Pressable" && node.props.accessibilityRole === "button");
    const homeDetails = () =>
        header
            .elements()
            .find(
                (node) =>
                    node.type === "Pressable" && node.props.accessibilityLabel === "Home details",
            );
    const flatten = (style) => Object.assign({}, ...(Array.isArray(style) ? style : [style]));

    assert.ok(status());
    assert.equal(status().props.accessible, true);
    assert.equal(status().props.accessibilityRole, "text");
    assert.equal(status().props.accessibilityLiveRegion, "polite");
    assert.equal(
        header
            .elements(status())
            .filter((node) => node.type === "Text")[0]
            .props.children.join(""),
        "Data source connected",
    );
    const statusIcon = header.elements(status()).find((node) => node.type === "Icon");
    assert.equal(statusIcon.props.icon, "checkmark-circle-outline");
    assert.equal(statusIcon.props.color, "brand");
    const decorativeIcon = header
        .elements(status())
        .find((node) => node.type === "View" && node.props.accessible === false);
    assert.equal(decorativeIcon.props.accessibilityElementsHidden, true);
    assert.equal(decorativeIcon.props.importantForAccessibility, "no-hide-descendants");
    assert.equal(
        header
            .elements()
            .filter((node) => node.props?.accessibilityLabel === "Data source connected").length,
        1,
    );
    assert.equal(
        header.elements().filter((node) => node.props?.accessibilityRole === "button").length,
        2,
    );

    const identity = header
        .elements()
        .find(
            (node) =>
                node.type === "View" &&
                Array.isArray(node.props.children) &&
                node.props.children.includes(status()),
        );
    assert.ok(identity);
    assert.equal(
        identity.props.children[0].props.accessibilityLabel,
        "Switch home, current home: Home",
    );
    assert.equal(
        identity.props.children.indexOf(status()) >
            identity.props.children.indexOf(identity.props.children[0]),
        true,
    );
    assert.equal(identity.props.style.flex, 1);
    assert.equal(identity.props.style.minWidth, 0);

    const pickerStyle = flatten(homePicker().props.style({ pressed: false }));
    const detailsStyle = flatten(homeDetails().props.style({ pressed: false }));
    assert.equal(pickerStyle.minHeight, 48);
    assert.equal(detailsStyle.minHeight, 48);
    assert.equal(detailsStyle.minWidth, 48);
    homePicker().props.onPress();
    homeDetails().props.onPress();
    assert.deepEqual(navigation, ["home/list", "home/details"]);
    const avatar = header.elements().find((node) => node.type === "UserProfileImage");
    assert.equal(avatar.props.size, 48);
    assert.equal(avatar.props.enableNavigation, true);

    homes.current.name = "A very long home name that needs room to shrink and wrap";
    header.render();
    const title = header
        .elements()
        .find(
            (node) => node.type === "Text" && node.props.children.join("") === homes.current.name,
        );
    assert.ok(title);
    assert.equal(flatten(title.props.style).flexShrink, 1);
    assert.equal(title.props.numberOfLines, undefined);
    assert.notEqual(title.props.allowFontScaling, false);
    const subtitleText = header
        .elements(status())
        .find(
            (node) =>
                node.type === "Text" && node.props.children.join("") === "Data source connected",
        );
    assert.ok(subtitleText);
    assert.equal(flatten(subtitleText.props.style).flexShrink, 1);
    assert.equal(subtitleText.props.numberOfLines, undefined);
    assert.notEqual(subtitleText.props.allowFontScaling, false);
    assert.equal(Object.hasOwn(flatten(subtitleText.props.style), "height"), false);
});

test("device readouts preserve zero and false and update on refreshed props", () => {
    for (const value of [0, false, null]) {
        const props = {
            deviceId: "",
            tile: { ...device().tile, type: "Display", value, configuration: { unit: "W" } },
        };
        const component = mountNativeComponent("src/components/device/tile/DisplayDeviceTile.tsx", {
            props,
            modules: {
                "@/contexts/domain/HomeProvider": { useHomes: () => ({ current: home() }) },
                "@/contexts/HttpClientProvider": { useHttpClient: () => ({}) },
                "@/contexts/domain/LiveUpdateProvider": { useLiveUpdate: () => ({}) },
                "@/contexts/custom/DeviceListProvider": { useDeviceList: () => ({}) },
            },
        });
        component.flushEffects();
        const label = () =>
            component.elements().find((node) => node.type === "Text").props.accessibilityLabel;
        assert.equal(
            label(),
            (value === null ? "—" : value === false ? "Off" : String(value)) + " W",
        );
        props.tile = { ...props.tile, value: 12 };
        component.render();
        component.flushEffects();
        component.render();
        assert.equal(label(), "12 W");
    }
});

test("Display shows all labeled readings and masks values only for explicit inactivity", () => {
    const props = {
        deviceId: "",
        inactive: false,
        tile: {
            type: "Display",
            value: 0,
            configuration: {
                label: "Temperature",
                unit: "°C",
                readings: [
                    { operationId: "fahrenheit", label: "Temperature", unit: "°F", value: 32 },
                    { operationId: "humidity", label: "Humidity", unit: "%", value: null },
                ],
            },
        },
    };
    const component = mountNativeComponent("src/components/device/tile/DisplayDeviceTile.tsx", {
        props,
        modules: {
            "@/contexts/domain/HomeProvider": { useHomes: () => ({ current: home() }) },
            "@/contexts/HttpClientProvider": { useHttpClient: () => ({}) },
            "@/contexts/domain/LiveUpdateProvider": { useLiveUpdate: () => ({}) },
            "@/contexts/custom/DeviceListProvider": { useDeviceList: () => ({}) },
        },
    });
    component.flushEffects();
    assert.match(component.text(), /0 °C/);
    assert.match(component.text(), /32 °F/);
    assert.match(component.text(), /Humidity/);
    assert.match(component.text(), /— %/);
    props.inactive = true;
    component.render();
    assert.equal(component.text().includes("32 °F"), false);
    assert.match(component.text(), /— °C/);
    assert.match(component.text(), /— °F/);
    assert.match(component.text(), /Humidity/);
});

test("device layout preference survives restarts without late hydration undoing a choice", async () => {
    const read = deferred();
    const writes = [];
    const component = mountNativeComponent("src/hooks/useDeviceLayout.ts", {
        exportName: "useDeviceLayout",
        modules: {
            "@react-native-async-storage/async-storage": {
                getItem: () => read.promise,
                setItem: async (...args) => writes.push(args),
            },
        },
    });
    component.flushEffects();
    assert.equal(component.output().layout, "grid");
    component.output().setLayout("list");
    component.render();
    read.resolve("grid");
    await settle(component);
    assert.equal(component.output().layout, "list");
    assert.equal(writes.at(-1)[1], "list");
    const restored = mountNativeComponent("src/hooks/useDeviceLayout.ts", {
        exportName: "useDeviceLayout",
        modules: {
            "@react-native-async-storage/async-storage": {
                getItem: async () => writes.at(-1)[1],
                setItem: async () => {},
            },
        },
    });
    restored.flushEffects();
    await settle(restored);
    assert.equal(restored.output().layout, "list");
});

test("list layout retains every device and room filter without grid row packing", () => {
    const filteredDevices = [device("first"), device("second")];
    const component = mountNativeComponent("src/components/device/DeviceList.tsx", {
        props: { layout: "list", header: null, footer: null },
        modules: {
            "./tile/DeviceTile": "DeviceTile",
            "expo-router": { useRouter: () => ({}) },
            "@/contexts/domain/HomeProvider": { useHomes: () => ({ current: home() }) },
            "@/contexts/custom/DeviceListProvider": {
                useDeviceList: () => ({ filteredDevices, filter: "room-1" }),
            },
        },
    });
    const list = component.output();
    assert.deepEqual(
        Array.from(list.props.data, (row) => Array.from(row, (d) => d.id)),
        [["first"], ["second"]],
    );
    const row = component.elements(list.props.renderItem({ item: list.props.data[0] }));
    assert.equal(row.find((n) => n.type === "DeviceTile").props.layout, "list");
});

test("a slower previous layout write cannot replace the latest selection", async () => {
    const first = deferred();
    const writes = [];
    const component = mountNativeComponent("src/hooks/useDeviceLayout.ts", {
        exportName: "useDeviceLayout",
        modules: {
            "@react-native-async-storage/async-storage": {
                getItem: async () => {
                    throw new Error("Storage unavailable");
                },
                setItem: async (_key, value) => {
                    writes.push(value);
                    if (writes.length === 1) await first.promise;
                },
            },
        },
    });
    component.flushEffects();
    component.output().setLayout("list");
    await settle(component);
    component.output().setLayout("grid");
    await settle(component);
    assert.deepEqual(writes, ["list"]);
    assert.equal(component.output().layout, "grid");
    first.resolve();
    await settle(component);
    assert.deepEqual(writes, ["list", "grid"]);
});

test("the same measurement in two units uses a primary and secondary value without repeated labels", () => {
    const component = mountNativeComponent("src/components/device/tile/DisplayDeviceTile.tsx", {
        props: {
            deviceId: "",
            tile: {
                type: "Display",
                value: 0,
                configuration: {
                    label: "Temperature",
                    unit: "°C",
                    readings: [{ operationId: "f", label: "Temperature", unit: "°F", value: 32 }],
                },
            },
        },
        modules: {
            "@/contexts/domain/HomeProvider": { useHomes: () => ({ current: home() }) },
            "@/contexts/HttpClientProvider": { useHttpClient: () => ({}) },
            "@/contexts/domain/LiveUpdateProvider": { useLiveUpdate: () => ({}) },
            "@/contexts/custom/DeviceListProvider": { useDeviceList: () => ({}) },
        },
    });
    const values = component
        .elements()
        .filter((n) => n.type === "Text" && n.props.accessibilityLabel);
    assert.deepEqual(
        values.map((n) => n.props.accessibilityLabel),
        ["0 °C", "32 °F"],
    );
    assert.equal(
        component
            .elements()
            .filter((n) => n.type === "Text")
            .some((n) => n.props.children.includes("Temperature")),
        false,
    );
    const primary = Object.assign({}, ...values[0].props.style);
    const secondary = Object.assign({}, ...values[1].props.style);
    assert.ok(primary.fontSize > secondary.fontSize);
});

test("retained live-update handlers still refresh the current home after initialization", async () => {
    const mounted = mountDevices(
        async (path) =>
            new URL(path, "https://senswave.test").pathname === "/v1/devices/display"
                ? response([device()])
                : { isSuccess: true, response: { json: async () => device("device-1", true) } },
        { current: undefined },
    );
    const retained = mounted.value().refreshDevice;
    await settle(mounted.component);
    mounted.homes.current = home();
    mounted.component.render();
    mounted.component.flushEffects();
    await settle(mounted.component);
    await retained("device-1");
    mounted.component.render();
    assert.equal(mounted.value().devices[0].tile.value, true);
});

test("Android fractional large-text scale uses one readable device column", () => {
    const component = mountNativeComponent("src/components/device/DeviceList.tsx", {
        props: { header: null, footer: null },
        modules: {
            "react-native": {
                View: "View",
                Text: "Text",
                FlatList: "FlatList",
                ActivityIndicator: "ActivityIndicator",
                RefreshControl: "RefreshControl",
                StyleSheet: { create: (value) => value },
                useWindowDimensions: () => ({ width: 448, fontScale: 1.2999999523162842 }),
            },
            "./tile/DeviceTile": "DeviceTile",
            "expo-router": { useRouter: () => ({ navigate() {} }) },
            "@/contexts/custom/DeviceListProvider": {
                useDeviceList: () => ({
                    devices: [device()],
                    filteredDevices: [device()],
                    filter: "all",
                    loading: false,
                    error: null,
                }),
            },
            "@/contexts/domain/HomeProvider": { useHomes: () => ({ current: home() }) },
        },
    });
    const list = component.elements()[0];
    assert.equal(list.props.numColumns, 1);
    assert.equal(list.props.columnWrapperStyle, undefined);
    const row = list.props.renderItem({ item: list.props.data[0] });
    const item = component.elements(row).find((node) => node.type === "DeviceTile");
    assert.equal(Object.assign({}, ...component.elements(row)[1].props.style).width, 416);
    assert.equal(item.props.device.id, "device-1");
});

test("mixed-width device rows preserve order with full-row sliders at every column count", () => {
    for (const [width, fontScale, expected] of [
        [448, 1, [["0", "1"], ["2"], ["3", "4"], ["5"], ["6"]]],
        [900, 1, [["0", "1"], ["2"], ["3", "4"], ["5"], ["6"]]],
        [448, 2, [["0"], ["1"], ["2"], ["3"], ["4"], ["5"], ["6"]]],
    ]) {
        const data = Array.from({ length: 7 }, (_, i) => ({
            ...device(),
            id: String(i),
            tile: { type: [2, 5].includes(i) ? "Slider" : "Switch" },
        }));
        const component = mountNativeComponent("src/components/device/DeviceList.tsx", {
            props: { header: null, footer: null },
            modules: {
                "react-native": {
                    FlatList: "FlatList",
                    View: "View",
                    RefreshControl: "RefreshControl",
                    StyleSheet: { create: (styles) => styles },
                    useWindowDimensions: () => ({ width, fontScale }),
                },
                "./tile/DeviceTile": "DeviceTile",
                "expo-router": { useRouter: () => ({}) },
                "@/contexts/domain/HomeProvider": { useHomes: () => ({ current: home() }) },
                "@/contexts/custom/DeviceListProvider": {
                    useDeviceList: () => ({ filteredDevices: data, filter: "all" }),
                },
            },
        });
        const list = component.elements()[0];
        assert.deepEqual(
            JSON.parse(JSON.stringify(list.props.data.map((row) => row.map((d) => d.id)))),
            expected,
        );
        const sliderRow = list.props.data.find((row) => row[0].id === "2");
        const rendered = component.elements(list.props.renderItem({ item: sliderRow }));
        assert.equal(
            Object.assign({}, ...rendered[1].props.style).width,
            Math.min(width, 960) - 32,
        );
    }
});

test("empty dashboard offers primary creation only to managers with a data source", () => {
    for (const [manager, source, filter, expected] of [
        [true, true, "all", true],
        [false, true, "all", false],
        [true, false, "all", false],
        [true, true, "room-1", false],
    ]) {
        const navigation = [];
        const component = mountNativeComponent("src/components/device/DeviceList.tsx", {
            props: { header: null, footer: null },
            modules: {
                "expo-router": {
                    useRouter: () => ({ navigate: (route) => navigation.push(route) }),
                },
                "./tile/DeviceTile": "DeviceTile",
                "@/contexts/custom/DeviceListProvider": {
                    useDeviceList: () => ({
                        devices: [],
                        filteredDevices: [],
                        loading: false,
                        error: null,
                        filter,
                    }),
                },
                "@/contexts/domain/HomeProvider": {
                    useHomes: () => ({
                        current: {
                            ...home(),
                            isOwner: false,
                            canManage: manager,
                            rooms: [],
                            dataSource: source ? home().dataSource : null,
                        },
                    }),
                },
            },
        });
        const empty = component.elements()[0].props.ListEmptyComponent;
        const add = component
            .elements(empty)
            .find((node) => node.type === "Button" && node.props.name === "Add device");
        assert.equal(Boolean(add), expected);
        if (add) {
            assert.equal(add.props.type, "auth");
            add.props.onPress();
            assert.deepEqual(navigation, ["device/add"]);
        }
    }
});

test("home entry exists for Display without a source", () => {
    const navigation = [];
    const homes = {
        loading: false,
        current: {
            id: "home-display",
            name: "Shared home",
            icon: "home-outline",
            isOwner: false,
            canManage: false,
            dataSource: undefined,
            rooms: [],
        },
    };
    const component = mountNativeComponent("src/app/(app)/index.tsx", {
        modules: {
            "expo-router": {
                useFocusEffect() {},
                useRouter: () => ({
                    navigate: (route) => navigation.push(route),
                    push: (route) => navigation.push(route),
                }),
            },
            "react-native": {
                View: "View",
                Text: "Text",
                Modal: "Modal",
                StyleSheet: { create: (value) => value },
                BackHandler: {
                    addEventListener() {
                        return { remove() {} };
                    },
                },
            },
            "@rn-primitives/portal": { PortalHost: "PortalHost" },
            "@/contexts/domain/HomeProvider": { useHomes: () => homes },
            "@/contexts/custom/DeviceListProvider": {
                useDeviceList: () => ({ loading: false, error: null, devices: [] }),
            },
            "@/contexts/ThemeProvider": {
                useTheme: () => ({
                    current: { colors: { background: "background", authMuted: "muted" } },
                }),
            },
            "@/hooks/useDeviceLayout": {
                useDeviceLayout: () => ({ layout: "list", setLayout() {} }),
            },
            "@/components/common/Button": "Button",
            "@/components/common/ContentSection": "ContentSection",
            "@/components/common/Icon": "Icon",
            "@/components/common/Loading": "Loading",
            "@/components/common/SectionHeaderAction": "SectionHeaderAction",
            "@/components/common/WhatsNewModal": { WhatsNewModal: "WhatsNewModal" },
            "@/components/device/DeviceList": "DeviceList",
            "@/components/device/DeviceLayoutToggle": "DeviceLayoutToggle",
            "@/components/home/NoHomeScreen": "NoHomeScreen",
            "@/components/home/widgets/HomeStateWidget": "HomeStateWidget",
            "@/components/room/RoomsView": "RoomsView",
            "@/components/ui/alert-dialog": {
                AlertDialog: "AlertDialog",
                AlertDialogAction: "AlertDialogAction",
                AlertDialogCancel: "AlertDialogCancel",
                AlertDialogContent: "AlertDialogContent",
                AlertDialogDescription: "AlertDialogDescription",
                AlertDialogFooter: "AlertDialogFooter",
                AlertDialogHeader: "AlertDialogHeader",
                AlertDialogTitle: "AlertDialogTitle",
            },
        },
    });

    const action = component
        .elements()
        .find((node) => node.type === "SectionHeaderAction" && node.props.label === "Automations");
    assert.ok(action);
    assert.equal(action.props.accessibilityLabel, "Automations");
    action.props.onPress();
    assert.deepEqual(navigation, ["automation/list"]);
    assert.equal(component.text().includes("Add device"), false);
});

for (const kind of ["Display"]) {
    test(
        kind + " tile clears recovery feedback after successful same-value refresh only",
        async () => {
            const callbacks = [];
            const props = {
                deviceId: "device-1",
                name: "Desk lamp",
                disablePress: false,
                tile: { ...device().tile, type: kind, value: kind === "Switch" ? false : 0 },
            };
            const component = mountNativeComponent(
                "src/components/device/tile/" + kind + "DeviceTile.tsx",
                {
                    props,
                    modules: {
                        "@/contexts/domain/HomeProvider": { useHomes: () => ({ current: home() }) },
                        "@/contexts/HttpClientProvider": {
                            useHttpClient: () => ({
                                get: async () => ({ isSuccess: false, statusCode: 503 }),
                            }),
                        },
                        "@/contexts/domain/LiveUpdateProvider": {
                            useLiveUpdate: () => ({
                                addDeviceTileCallback: (_id, callback) => callbacks.push(callback),
                            }),
                        },
                        "@/contexts/custom/DeviceListProvider": { useDeviceList: () => ({}) },
                        "@/components/common/Switch": { Switch: "Switch" },
                    },
                },
            );
            component.flushEffects();
            await callbacks[0]();
            component.render();
            const hasError = () =>
                component.elements().some((node) => node.props.accessibilityRole === "alert");
            assert.equal(hasError(), true);
            component.render();
            component.flushEffects();
            component.render();
            assert.equal(
                hasError(),
                true,
                "A failed list refresh retains old data and must retain its error",
            );
            props.tile = { ...props.tile };
            component.render();
            component.flushEffects();
            component.render();
            assert.equal(
                hasError(),
                false,
                "A successful read clears recovery feedback even if the value stays unchanged",
            );
        },
    );
}
