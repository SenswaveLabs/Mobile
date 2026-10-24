import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

function mountSliderForm() {
    let widget = { name: "Slider widget", type: "Slider", configuration: {} };
    let isValid = false;
    let validateAdditional = () => false;
    const widgetDetails = {
        get operation() {
            return { type: "Integer", configuration: { min: 0, max: 10 } };
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
            isValid = widget.name.length >= 3 && validateAdditional();
            return isValid;
        },
    };
    const form = mountNativeComponent("src/components/device/widgets/forms/SliderForm.tsx", {
        modules: {
            "expo-router": { useFocusEffect: (callback) => callback() },
            "@/components/common/InputNumber": "InputNumber",
            "@/components/common/UserNote": "UserNote",
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
