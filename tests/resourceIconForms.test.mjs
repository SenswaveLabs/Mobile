import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const resources = [
    {
        resource: "homes",
        file: "src/components/home/HomeForm.tsx",
        key: "building",
        defaultKey: "home-outline",
    },
    {
        resource: "devices",
        file: "src/components/device/DeviceForm.tsx",
        key: "plug-outline",
        defaultKey: "bulb-outline",
    },
];

function mountForm(config, props = {}, catalogOverrides = {}) {
    const submissions = [];
    const ref = { current: null };
    const catalog = {
        keys: [config.defaultKey, config.key],
        entries: [config.defaultKey, config.key].map((key) => ({
            key,
            labelKey: `icons.${config.resource}.${key}`,
        })),
        loading: false,
        error: "",
        retry() {},
        ...catalogOverrides,
    };
    const form = mountNativeComponent(config.file, {
        props: {
            initName: "My resource",
            onSubmit: async (values) => submissions.push(values),
            ...props,
            ref,
        },
        modules: {
            "expo-router": { useFocusEffect: (callback) => callback() },
            "@/hooks/useIconCatalog": {
                useIconCatalog: (resource) => {
                    assert.equal(resource, config.resource);
                    return catalog;
                },
            },
            "@/contexts/domain/HomeProvider": {
                useHomes: () => ({ current: { id: "home", rooms: [] } }),
            },
            "../common/IconSelector": "IconSelector",
            "../common/LocalizationSelector": "LocalizationSelector",
            "./lists/CurrentHome": "CurrentHome",
            "./tile/DeviceTile": "DeviceTile",
            "../common/Divider": "Divider",
            "../common/Dropdown": "Dropdown",
            "../common/Expander": "Expander",
            "../common/ImageButton": "ImageButton",
            "./operation/OperationSelector": "OperationSelector",
            "../room/RoomSelector": "RoomSelector",
        },
    });
    const selector = () => form.elements().find((node) => node.type === "IconSelector");
    const nameInput = () =>
        form.elements().find((node) => node.type === "Input" && node.props.title === "Name");
    const save = () =>
        config.resource === "homes"
            ? form
                  .elements()
                  .find((node) => node.type === "Button")
                  .props.onPress()
            : (ref.current.triggerSave ?? ref.current.save)();
    const reset = () => (ref.current.triggerReset ?? ref.current.reset)();
    return {
        ...form,
        catalog,
        submissions,
        selector,
        nameInput,
        save,
        reset,
        updateProps: (nextProps) =>
            form.render({ initName: "My resource", ...props, ...nextProps, ref }),
    };
}

test("Device details updates the saved icon baseline before list refresh, preserving unrelated edits after catalog failure", async () => {
    const patches = [];
    const details = mountNativeComponent("src/app/(app)/device/details.tsx", {
        modules: {
            "@/components/device/DeviceForm": "DeviceForm",
            "@/components/common/ConfirmDialog": "ConfirmDialog",
            "@/components/common/FAB": "FAB",
            "@/contexts/custom/DeviceListProvider": {
                useDeviceList: () => ({ refresh: async () => false }),
            },
            "@/contexts/HttpClientProvider": {
                useHttpClient: () => ({
                    get: async () => ({
                        isSuccess: true,
                        statusCode: 200,
                        response: {
                            json: async () => ({
                                id: "device",
                                name: "My device",
                                icon: "bulb-outline",
                                roomId: null,
                                tile: { type: "Default" },
                                presence: null,
                                createdAtUtc: "2026-10-14T00:00:00Z",
                                updatedAtUtc: "2026-10-14T00:00:00Z",
                            }),
                        },
                    }),
                    patch: async (path, body) => {
                        assert.equal(path, "v1/devices/device");
                        patches.push(body);
                        return { isSuccess: true, statusCode: 204, response: null };
                    },
                }),
            },
            "@/contexts/ToastProvider": { useToast: () => ({ success() {}, error() {} }) },
            "expo-router": {
                useLocalSearchParams: () => ({ deviceId: "device" }),
                useRouter: () => ({}),
            },
        },
    });
    details.flushEffects();
    await new Promise((resolve) => setImmediate(resolve));
    details.render();
    const formProps = () => details.elements().find((node) => node.type === "DeviceForm").props;
    const form = mountForm(resources[1], formProps());
    form.selector().props.onIconSelected("plug-outline");
    form.render();
    await form.save();
    details.render();
    assert.equal(formProps().initIcon, "plug-outline");
    form.updateProps(formProps());
    form.catalog.keys = [];
    form.catalog.error = "Could not load icons.";
    form.nameInput().props.setValue("Renamed device");
    form.render();
    await form.save();
    assert.equal(patches.length, 2);
    assert.equal(patches[1].name, "Renamed device");
    assert.equal(Object.hasOwn(patches[1], "icon"), false);
    form.reset();
    form.render();
    assert.equal(form.selector().props.defaultIcon, "plug-outline");
});

for (const config of resources) {
    test(`${config.resource} creation sends the exact catalog key and uses the matching selector catalog`, async () => {
        const form = mountForm(config);
        assert.equal(form.selector().props.resource, config.resource);
        assert.equal(form.selector().props.catalog, form.catalog);
        form.selector().props.onIconSelected(config.key);
        form.render();
        await form.save();
        assert.equal(form.submissions.length, 1);
        assert.equal(form.submissions[0].icon, config.key);
    });

    test(`${config.resource} creation waits for the catalog and preserves the name after failure`, async () => {
        for (const loading of [true, false]) {
            const form = mountForm(
                config,
                {},
                { keys: [], loading, error: loading ? "" : "Could not load icons." },
            );
            await form.save();
            assert.equal(form.submissions.length, 0);
            form.render();
            assert.equal(form.nameInput().props.value, "My resource");
            form.catalog.keys = [config.defaultKey];
            form.catalog.loading = false;
            form.catalog.error = "";
            form.render();
            await form.save();
            assert.equal(form.submissions[0].icon, config.defaultKey);
        }
    });

    test(`${config.resource} rejects a missing default, wrong-resource key and changed letter case`, async () => {
        const form = mountForm(config, {}, { keys: [config.key] });
        await form.save();
        assert.equal(
            form.submissions.length,
            0,
            "Never assume that the default belongs to this server's catalog",
        );
        for (const key of [
            config.resource === "homes" ? "bulb-outline" : "home-outline",
            config.key.toUpperCase(),
        ]) {
            form.selector().props.onIconSelected(key);
            form.render();
            await form.save();
            assert.equal(form.submissions.length, 0);
        }
        form.selector().props.onIconSelected(config.key);
        form.render();
        await form.save();
        assert.equal(form.submissions[0].icon, config.key);
    });

    test(`${config.resource} historical icons stay selected and are omitted from unrelated PATCH edits even after catalog failure`, async () => {
        const form = mountForm(
            config,
            { edit: true, initIcon: "retired-key" },
            { keys: [], error: "Could not load icons." },
        );
        assert.equal(form.selector().props.defaultIcon, "retired-key");
        form.nameInput().props.setValue("Renamed resource");
        form.render();
        await form.save();
        assert.equal(form.submissions.length, 1);
        assert.equal(form.submissions[0].name, "Renamed resource");
        assert.equal(Object.hasOwn(form.submissions[0], "icon"), false);
    });

    if (config.resource === "devices") {
        test(`${config.resource} edits submit changed keys exactly and reset to the stored historical key`, async () => {
            const form = mountForm(config, { edit: true, initIcon: "retired-key" });
            form.selector().props.onIconSelected(config.key);
            form.render();
            await form.save();
            assert.equal(form.submissions[0].icon, config.key);
            form.reset();
            form.render();
            assert.equal(form.selector().props.defaultIcon, "retired-key");
            await form.save();
            assert.equal(Object.hasOwn(form.submissions[1], "icon"), false);
        });

        test(`${config.resource} changed selections become invalid while a new server catalog loads`, async () => {
            const form = mountForm(config, { edit: true, initIcon: config.defaultKey });
            form.selector().props.onIconSelected(config.key);
            form.nameInput().props.setValue("Preserved draft");
            form.catalog.keys = [];
            form.catalog.loading = true;
            form.render();
            await form.save();
            assert.equal(form.submissions.length, 0);
            assert.equal(form.nameInput().props.value, "Preserved draft");
            form.reset();
            form.render();
            await form.save();
            assert.equal(Object.hasOwn(form.submissions[0], "icon"), false);
        });
    }
}

test("native home saves advance the icon baseline before unrelated edits during catalog failure", async () => {
    const form = mountForm(resources[0], { edit: true, initIcon: "retired-key" });
    form.selector().props.onIconSelected(resources[0].key);
    form.render();
    await form.save();
    assert.equal(form.submissions[0].icon, resources[0].key);
    form.render();
    form.catalog.keys = [];
    form.catalog.error = "Could not load icons.";
    form.nameInput().props.setValue("Renamed home");
    form.render();
    await form.save();
    assert.equal(form.submissions.length, 2);
    assert.equal(form.submissions[1].name, "Renamed home");
    assert.equal(Object.hasOwn(form.submissions[1], "icon"), false);
});

test("native home changed selections wait for a new server catalog without losing the draft", async () => {
    const form = mountForm(resources[0], { edit: true, initIcon: resources[0].defaultKey });
    form.selector().props.onIconSelected(resources[0].key);
    form.nameInput().props.setValue("Preserved draft");
    form.catalog.keys = [];
    form.catalog.loading = true;
    form.render();
    await form.save();
    assert.equal(form.submissions.length, 0);
    assert.equal(form.nameInput().props.value, "Preserved draft");
    form.catalog.keys = [resources[0].key];
    form.catalog.loading = false;
    form.render();
    await form.save();
    assert.equal(form.submissions.length, 1);
    assert.equal(form.submissions[0].name, "Preserved draft");
    assert.equal(form.submissions[0].icon, resources[0].key);
});
