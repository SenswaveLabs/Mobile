import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const globalIcons = ["home-outline", "airplane-outline", "bulb-outline"];
const readyCatalog = {
    entries: [
        { key: "building", labelKey: "icons.homes.building" },
        { key: "home-outline", labelKey: "icons.homes.home-outline" },
        { key: "building-2", labelKey: "icons.homes.building" },
        { key: "factory", labelKey: "icons.homes.factory" },
        { key: "store", labelKey: "icons.homes.store" },
    ],
    keys: ["building", "home-outline", "building-2", "factory", "store"],
    loading: false,
    error: "",
    retry() {},
};

function mountSelector(props = {}) {
    return mountNativeComponent("src/components/common/IconSelector.tsx", {
        props,
        modules: {
            "./Icon": { __esModule: true, default: "Icon", AllIcons: globalIcons },
            "./SenswaveModal": "SenswaveModal",
        },
    });
}

test("resource catalog exposes every choice in the quick strip and full browser", () => {
    const selected = [];
    const form = mountSelector({
        resource: "homes",
        catalog: readyCatalog,
        onIconSelected: (key) => selected.push(key),
    });
    const lists = () => form.elements().filter((node) => node.type === "FlatList");
    assert.deepEqual(Array.from(lists()[0].props.data), [
        "building",
        "building-2",
        "factory",
        "store",
    ]);
    assert.deepEqual(Array.from(lists()[1].props.data), [
        "building",
        "home-outline",
        "building-2",
        "factory",
        "store",
    ]);
    assert.equal(lists()[0].props.horizontal, true, "Every quick choice remains scrollable");
    const search = form.elements().find((node) => node.type === "TextInput");
    search.props.onChangeText("airplane");
    form.render();
    assert.deepEqual(Array.from(lists()[1].props.data), []);
    search.props.onChangeText("BUILDING");
    form.render();
    assert.deepEqual(Array.from(lists()[1].props.data), ["building", "building-2"]);
    const grid = lists()[1];
    const cell = grid.props.renderItem({ item: "building" });
    cell.props.onPress();
    assert.deepEqual(selected, ["building"], "Submit the opaque backend key unchanged");
    grid.props.renderItem({ item: "airplane-outline" }).props.onPress();
    assert.deepEqual(
        selected,
        ["building"],
        "A stale or invalid selection cannot escape the catalog",
    );
});

test("resource picker search and accessibility labels use server labelKey values", () => {
    const form = mountSelector({
        defaultIcon: "historical-key",
        resource: "homes",
        catalog: {
            entries: [{ key: "home-outline", labelKey: "icons.homes.factory" }],
            keys: ["home-outline"],
            loading: false,
            error: "",
            retry() {},
        },
    });
    const quick = form.elements().find((node) => node.type === "FlatList");
    assert.equal(
        quick.props.renderItem({ item: "home-outline" }).props.accessibilityLabel,
        "Factory icon",
    );
    form.elements()
        .find((node) => node.props?.accessibilityLabel === "Browse all icons")
        .props.onPress();
    form.render();
    const search = form
        .elements()
        .find((node) => node.props?.accessibilityLabel === "Search icons");
    search.props.onChangeText("factory");
    form.render();
    const grid = form.elements().filter((node) => node.type === "FlatList")[1];
    assert.deepEqual(Array.from(grid.props.data), ["home-outline"]);
    const cell = grid.props.renderItem({ item: "home-outline" });
    assert.equal(cell.props.accessibilityLabel, "Factory icon");
    assert.ok(
        form
            .elements(cell)
            .some((node) => node.type?.name === "Text" && node.props.children?.includes("Factory")),
        "The Home catalog browser must show the server-provided English label",
    );
});

test("unknown and prototype-shaped label keys fall back to the unchanged icon key", () => {
    for (const labelKey of ["unknown.key", "constructor", "__proto__"]) {
        const form = mountSelector({
            resource: "homes",
            catalog: {
                entries: [{ key: "home-outline", labelKey }],
                keys: ["home-outline"],
                loading: false,
                error: "",
                retry() {},
            },
        });
        const quick = form.elements().find((node) => node.type === "FlatList");
        assert.equal(
            quick.props.renderItem({ item: "home-outline" }).props.accessibilityLabel,
            "home-outline icon",
        );
    }
});

test("catalog loading and failure block new choices and expose retry without replacing the current icon", () => {
    for (const loading of [true, false]) {
        let retries = 0;
        const selected = [];
        const form = mountSelector({
            defaultIcon: "historical-key",
            resource: "homes",
            catalog: {
                keys: [],
                loading,
                error: loading ? "" : "Could not load icons.",
                retry: () => retries++,
            },
            onIconSelected: (key) => selected.push(key),
        });
        const lists = form.elements().filter((node) => node.type === "FlatList");
        for (const list of lists) assert.deepEqual(Array.from(list.props.data), []);
        assert.equal(
            form.elements().find((node) => node.type === "Icon").props.icon,
            "historical-key",
        );
        lists[1].props.renderItem({ item: "home-outline" }).props.onPress();
        assert.deepEqual(selected, []);
        if (!loading) {
            const retry = form.elements().find((node) => node.props?.name === "Retry icons");
            assert.ok(retry, "Failure must offer a visible retry action");
            retry.props.onPress();
            assert.equal(retries, 1);
        }
    }
});

test("legacy Dashboard, Radio and Automation selectors retain the global full browser", () => {
    const form = mountSelector({ iconList: ["bulb-outline"] });
    const lists = form.elements().filter((node) => node.type === "FlatList");
    assert.deepEqual(Array.from(lists[0].props.data), ["bulb-outline"]);
    assert.deepEqual(Array.from(lists[1].props.data), globalIcons);
});

test("the selected preview follows the parent's restored or reset key", () => {
    const props = { defaultIcon: "building", resource: "homes", catalog: readyCatalog };
    const form = mountSelector(props);
    form.flushEffects();
    form.render({ ...props, defaultIcon: "historical-key" });
    form.flushEffects();
    form.render();
    assert.equal(form.elements().find((node) => node.type === "Icon").props.icon, "historical-key");
});
