import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

function deferred() {
    let resolve;
    const promise = new Promise((done) => (resolve = done));
    return { promise, resolve };
}
function mountField(overrides = {}) {
    let closed = 0;
    const confirms = [];
    const props = {
        title: "Color to send",
        value: "#aBc",
        onConfirm: async (hex) => {
            confirms.push(hex);
            return true;
        },
        ...overrides,
    };
    const form = mountNativeComponent("src/components/common/ColorPickerField.tsx", {
        props,
        modules: {
            "@/components/common/BottomSheetSelect": "BottomSheetSelect",
            "@/components/common/Button": "Button",
            "@/components/common/Input": "Input",
            "reanimated-color-picker": {
                __esModule: true,
                default: "ColorPicker",
                Panel1: "Panel1",
                HueSlider: "HueSlider",
            },
            "@/components/ui/alert": { Alert: "Alert", AlertDescription: "AlertDescription" },
        },
    });
    const sheet = () => form.elements().find((node) => node.type === "BottomSheetSelect");
    const content = () =>
        sheet().props.renderOptions(() => {
            closed++;
            return true;
        });
    const node = (type, title) =>
        form
            .elements(content())
            .find(
                (item) =>
                    item.type === type &&
                    (!title || item.props.title === title || item.props.name === title),
            );
    return {
        ...form,
        props,
        sheet,
        node,
        confirms,
        closed: () => closed,
        render: () => form.render(props),
        change(value) {
            node("Input", "HEX").props.setValue(value);
            form.render(props);
        },
        picker(hex) {
            node("ColorPicker").props.onCompleteJS({ hex });
            form.render(props);
        },
        confirm() {
            return node("Button", "Confirm").props.onPress();
        },
        cancel() {
            node("Button", "Cancel").props.onPress();
            sheet().props.onClosed();
            form.render(props);
        },
    };
}

test("HEX drafts and picker gestures send nothing before confirmation or after cancellation", async () => {
    const field = mountField();
    field.change("#12AB34");
    field.picker("#Ab12Ef");
    assert.deepEqual(field.confirms, []);
    field.cancel();
    assert.equal(field.node("Input", "HEX").props.value, "#aBc");
    await field.confirm();
    assert.deepEqual(field.confirms, ["#aBc"]);
    assert.equal(field.closed(), 2);
});

test("short and full HEX preserve exact case, while invalid drafts never confirm", async () => {
    for (const value of ["#123", "#aBcDeF"]) {
        const field = mountField();
        field.change(value);
        await field.confirm();
        assert.deepEqual(field.confirms, [value]);
    }
    for (const value of ["", "#12", "abcdef", "#gggggg", "#1234567"]) {
        const field = mountField();
        field.change(value);
        await field.confirm();
        field.render();
        assert.deepEqual(field.confirms, []);
        assert.match(field.node("Input", "HEX").props.error, /hex/i);
    }
});

test("confirmation locks synchronously and a failed or thrown callback keeps the draft", async () => {
    const pending = deferred();
    const values = [];
    const field = mountField({
        onConfirm: (hex) => {
            values.push(hex);
            return pending.promise;
        },
    });
    field.change("#123456");
    const first = field.confirm();
    await field.confirm();
    assert.deepEqual(values, ["#123456"]);
    assert.equal(field.sheet().props.dismissDisabled(), true);
    pending.resolve(false);
    await first;
    field.render();
    assert.equal(field.closed(), 0);
    assert.equal(field.node("Input", "HEX").props.value, "#123456");
    assert.equal(field.sheet().props.dismissDisabled(), false);
    const thrown = mountField({
        onConfirm: async () => {
            throw new Error("network");
        },
    });
    await thrown.confirm();
    thrown.render();
    assert.equal(thrown.closed(), 0);
    assert.match(JSON.stringify(thrown.node("Alert")), /try again/i);
});

test("disabled, pending and read-only states cannot submit or change the draft", async () => {
    for (const overrides of [{ disabled: true }, { pending: true }]) {
        const field = mountField(overrides);
        assert.equal(field.sheet().props.disabled, true);
        field.change("#ffffff");
        await field.confirm();
        assert.deepEqual(field.confirms, []);
        assert.equal(field.node("Input", "HEX").props.value, "#aBc");
    }
    const field = mountField({ readOnly: true });
    assert.equal(
        field.elements().some((node) => node.type === "BottomSheetSelect"),
        false,
    );
    assert.match(field.text(), /#aBc/);
});

test("a reported color received while editing is restored on cancel", () => {
    const field = mountField();
    field.change("#123456");
    field.props.value = "#aabbcc";
    field.render();
    field.flushEffects();
    field.render();
    assert.equal(field.node("Input", "HEX").props.value, "#123456");
    field.cancel();
    assert.equal(field.node("Input", "HEX").props.value, "#aabbcc");
    assert.deepEqual(field.confirms, []);
});
