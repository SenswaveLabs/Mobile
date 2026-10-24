import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

function mountSliderForm({ operation, configuration = {} } = {}) {
    let widget = { name: "Slider widget", type: "Slider", configuration };
    let isValid = false;
    let validateAdditional = () => false;
    const widgetDetails = {
        get operation() {
            return operation ?? { type: "Integer", configuration: { min: 0, max: 10 } };
        },
        get widget() {
            return widget;
        },
        setWidget(value) {
            widget = value;
        },
        setAdditionalValidation(callback) {
            validateAdditional = callback;
        },
        setIsValid(value) {
            isValid = value;
        },
        validateDto() {
            isValid = widget.name.length >= 3 && (validateAdditional?.() ?? true);
            return isValid;
        },
    };
    const form = mountNativeComponent("src/components/device/widgets/forms/SliderForm.tsx", {
        modules: {
            "expo-router": { useFocusEffect: (callback) => callback() },
            "@/components/common/InputNumber": "InputNumber",
            "@/components/common/UserNote": "UserNote",
            "@/components/common/Input": "Input",
            "@/contexts/custom/WidgetDetailsProvider": {
                useWidgetDetails: () => widgetDetails,
            },
        },
    });

    return {
        form,
        isValid: () => isValid,
        stepInput: () =>
            form
                .elements()
                .find((node) => node.type === "InputNumber" && node.props.title === "Slider Step"),
        widget: () => widget,
        validate: () => widgetDetails.validateDto(),
    };
}

test("Slider add form recalculates validity after entering a valid step", () => {
    const slider = mountSliderForm();
    slider.form.flushEffects();
    assert.equal(slider.isValid(), false);

    slider.stepInput().props.onChange(1);
    slider.form.render();
    slider.form.flushEffects();

    assert.equal(slider.widget().configuration.step, 1);
    assert.equal(slider.isValid(), true);
});

test("Slider creation rejects missing, invalid and unbounded operation ranges", () => {
    const ranges = [
        {},
        { min: 0 },
        { min: 10, max: 0 },
        { min: 5, max: 5 },
        { min: NaN, max: 10 },
        { min: 0, max: Infinity },
        { min: -2147483648, max: 2147483647 },
    ];
    for (const range of ranges) {
        const slider = mountSliderForm({
            operation: { type: "Integer", configuration: range },
            configuration: { step: 1 },
        });
        slider.form.flushEffects();
        assert.equal(slider.validate(), false, JSON.stringify(range));
    }
    const unboundedNumber = mountSliderForm({
        operation: {
            type: "Number",
            configuration: { min: -Number.MAX_VALUE, max: Number.MAX_VALUE },
        },
        configuration: { step: 1 },
    });
    unboundedNumber.form.flushEffects();
    assert.equal(unboundedNumber.validate(), false);
});

test("Slider rejects invalid steps and clears stale step payload synchronously", () => {
    for (const step of [0, -1, 11, 1.5, Infinity, NaN]) {
        const slider = mountSliderForm({ configuration: { step } });
        slider.form.flushEffects();
        assert.equal(slider.validate(), false, String(step));
    }
    const slider = mountSliderForm({ configuration: { step: 1 } });
    slider.form.flushEffects();
    slider.stepInput().props.onChange(undefined);
    assert.equal(slider.widget().configuration.step, undefined);
    assert.equal(slider.validate(), false);
});

test("Slider configuration rejects step counts the native control cannot render", () => {
    const slider = mountSliderForm({
        operation: { type: "Number", configuration: { min: 0, max: 10 } },
        configuration: { step: 0.0001 },
    });
    slider.form.flushEffects();
    assert.equal(slider.validate(), false);
});
