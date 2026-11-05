import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const globalIcons = JSON.parse(
    readFileSync("src/components/common/Icon.tsx", "utf8")
        .match(/export const AllIcons = (\[[\s\S]*?\]);/)[1]
        .replace(/,\s*\]/, "]"),
);
const readyCatalog = {
    entries: [
        { key: "building", labelKey: "icons.homes.building" },
        { key: "home-outline", labelKey: "icons.homes.home-outline" },
        { key: "factory", labelKey: "icons.homes.factory" },
    ],
    keys: ["building", "home-outline", "factory"],
    loading: false,
    error: "",
    retry() {},
};
function mountSelector(props = {}) {
    return mountNativeComponent("src/components/common/IconSelector.tsx", {
        props,
        modules: {
            "./Icon": { __esModule: true, default: "Icon", AllIcons: globalIcons },
            "./BottomSheetSelect": "BottomSheetSelect",
            "./Button": "Button",
        },
    });
}
const sheet = (form) => form.elements().find((node) => node.type === "BottomSheetSelect");
const cells = (form, close = () => true) =>
    form
        .elements(sheet(form).props.renderOptions(close))
        .filter((node) => node.type === "TouchableOpacity");

test("resource sheet offers exactly the backend keys and rejects stale catalog callbacks", () => {
    const selected = [];
    const props = {
        resource: "homes",
        catalog: readyCatalog,
        onIconSelected: (key) => selected.push(key),
    };
    const form = mountSelector(props);
    assert.deepEqual(
        cells(form).map((node) => node.props.accessibilityLabel),
        ["Building icon", "Home icon", "Factory icon"],
    );
    const factory = cells(form)[2];
    factory.props.onPress();
    assert.deepEqual(selected, ["factory"]);
    form.render({ ...props, catalog: { ...readyCatalog, keys: ["building"] } });
    factory.props.onPress();
    assert.deepEqual(selected, ["factory"], "Retained cells cannot submit a former catalog key");
});

test("resource labels use server metadata, with safe unknown label fallbacks", () => {
    for (const [labelKey, expected] of [
        ["icons.homes.factory", "Factory"],
        ["unknown.key", "home-outline"],
        ["constructor", "home-outline"],
        ["__proto__", "home-outline"],
    ]) {
        const form = mountSelector({
            resource: "homes",
            catalog: {
                ...readyCatalog,
                keys: ["home-outline"],
                entries: [{ key: "home-outline", labelKey }],
            },
        });
        assert.equal(cells(form)[0].props.accessibilityLabel, `${expected} icon`);
    }
});

test("catalog loading and failure preserve historical selection and expose local recovery", () => {
    for (const loading of [true, false]) {
        let retries = 0;
        const form = mountSelector({
            defaultIcon: "historical-key",
            resource: "homes",
            catalog: {
                keys: [],
                loading,
                error: loading ? "" : "Could not load icons.",
                retry: () => retries++,
            },
        });
        assert.equal(sheet(form).props.disabled, true);
        assert.equal(
            form.elements().find((node) => node.type === "Icon").props.icon,
            "historical-key",
        );
        assert.deepEqual(cells(form), []);
        if (!loading) {
            form.elements()
                .find((node) => node.props.name === "Retry icons")
                .props.onPress();
            assert.equal(retries, 1);
        }
    }
});

test("default sheet virtualizes the complete 318-key Automation palette without nested scrolling", () => {
    const selected = [];
    const form = mountSelector({
        defaultIcon: "historical-key",
        onIconSelected: (key) => selected.push(key),
    });
    const picker = sheet(form);
    const list = form
        .elements(picker.props.renderOptions(() => true))
        .find((node) => node.type === "FlatList");
    assert.equal(globalIcons.length, 318);
    assert.equal(new Set(globalIcons).size, 318);
    assert.deepEqual(Array.from(list.props.data), globalIcons);
    assert.equal(list.props.numColumns, 4);
    assert.equal(picker.props.scrollable, false);
    assert.ok(list.props.initialNumToRender < 318);
    list.props.renderItem({ item: "airplane-outline" }).props.onPress();
    assert.deepEqual(selected, ["airplane-outline"]);
    assert.equal(
        form.elements().some((node) => node.type === "SenswaveModal"),
        false,
    );
});

test("contextual sheet retains its palette and cancellation never changes stored keys", () => {
    const selected = [];
    const form = mountSelector({
        defaultIcon: "stored:historical",
        iconList: ["grid-outline", "pie-chart-outline"],
        onIconSelected: (key) => selected.push(key),
    });
    assert.equal(sheet(form).props.value, "Stored:historical");
    assert.deepEqual(
        cells(form).map((node) => node.props.accessibilityLabel),
        ["Grid icon", "Pie chart icon"],
    );
    cells(form, () => false)[1].props.onPress();
    assert.deepEqual(selected, []);
    assert.equal(sheet(form).props.value, "Stored:historical");
    cells(form)[1].props.onPress();
    assert.deepEqual(selected, ["pie-chart-outline"]);
});

test("disabled and changed catalogs invalidate retained sheet choices", () => {
    const selected = [];
    const props = { catalog: readyCatalog, onIconSelected: (key) => selected.push(key) };
    const form = mountSelector(props);
    const oldCell = cells(form)[0];
    form.render({ ...props, disabled: true });
    oldCell.props.onPress();
    assert.deepEqual(selected, []);
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
