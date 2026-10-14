import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const globalIcons = ["home-outline", "airplane-outline", "bulb-outline"];
const readyCatalog = { keys: ["building", "home-outline"], loading: false, error: "", retry() {} };

function mountSelector(props = {}) {
    return mountNativeComponent("src/components/common/IconSelector.tsx", {
        props,
        modules: {
            "./Icon": { __esModule: true, default: "Icon", AllIcons: globalIcons },
            "./SenswaveModal": "SenswaveModal",
        },
    });
}

test("resource catalog constrains the quick strip and the full searchable browser", () => {
    const selected = [];
    const form = mountSelector({
        resource: "homes",
        catalog: readyCatalog,
        onIconSelected: (key) => selected.push(key),
    });
    const lists = () => form.elements().filter((node) => node.type === "FlatList");
    assert.deepEqual(Array.from(lists()[0].props.data), ["building", "home-outline"]);
    assert.deepEqual(Array.from(lists()[1].props.data), ["building", "home-outline"]);
    const search = form.elements().find((node) => node.type === "TextInput");
    search.props.onChangeText("airplane");
    form.render();
    assert.deepEqual(Array.from(lists()[1].props.data), []);
    search.props.onChangeText("BUILDING");
    form.render();
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
