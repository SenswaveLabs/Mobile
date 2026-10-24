import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

test("numeric widget fields keep the visible draft stable while pending or read-only", () => {
    const changes = [];
    const props = {
        variant: "auth",
        title: "Step",
        value: 1,
        disabled: true,
        onChange: (value) => changes.push(value),
    };
    const field = mountNativeComponent("src/components/common/InputNumber.tsx", {
        props,
        modules: { "./Input": "Input" },
    });
    const input = () => field.elements().find((node) => node.type === "Input");
    input().props.setValue("2");
    field.render();
    assert.equal(input().props.value, "1");
    assert.deepEqual(changes, []);
    field.render({ ...props, disabled: false, editable: false });
    input().props.setValue("3");
    assert.deepEqual(changes, []);
    field.render({ ...props, disabled: false });
    input().props.setValue("2");
    assert.deepEqual(changes, [2]);
});

function mountForm(file, { operation, configuration = {}, props = {} } = {}) {
    let widget = { name: "Test widget", configuration };
    let additionalValidation = null;
    let isValid = false;
    const writes = [];
    const toasts = [];
    const details = {
        operation,
        get widget() {
            return widget;
        },
        setWidget(value) {
            writes.push(value);
            widget = value;
        },
        setAdditionalValidation(callback) {
            additionalValidation = callback;
        },
        setIsValid(value) {
            isValid = value;
        },
        validateDto() {
            isValid = additionalValidation?.() ?? true;
            return isValid;
        },
    };
    const form = mountNativeComponent(`src/components/device/widgets/forms/${file}.tsx`, {
        props,
        modules: {
            "expo-router": { useFocusEffect: (callback) => callback() },
            "@/contexts/custom/WidgetDetailsProvider": { useWidgetDetails: () => details },
            "@/contexts/ToastProvider": {
                useToast: () => ({ error: (value) => toasts.push(value) }),
            },
            ...Object.fromEntries(
                [
                    "InputNumber",
                    "BottomSheetSelect",
                    "Dropdown",
                    "SwitchDropdown",
                    "UserNote",
                    "IconSelector",
                    "SenswaveModal",
                    "ListRow",
                    "SectionHeaderAction",
                    "FormSection",
                    "ImageButton",
                ].map((name) => [`@/components/common/${name}`, name]),
            ),
            "reanimated-color-picker": {
                __esModule: true,
                default: "ColorPicker",
                RedSlider: "RedSlider",
                GreenSlider: "GreenSlider",
                BlueSlider: "BlueSlider",
                PreviewText: "PreviewText",
            },
        },
    });
    const render = (nextProps = props) => {
        props = nextProps;
        form.render(props);
        form.flushEffects();
        form.render(props);
    };
    render();
    const field = (title) => form.elements().find((node) => node.props.title === title);
    return {
        ...form,
        render,
        field,
        details,
        writes,
        toasts,
        widget: () => widget,
        validate: () => details.validateDto(),
        validator: () => additionalValidation,
        isValid: () => isValid,
        change(title, value) {
            const input = field(title);
            assert.ok(input, `${title} exists`);
            (input.props.onChange ?? input.props.setValue)(value);
            render();
        },
    };
}

test("Button numeric invalid draft immediately clears its payload and validity", () => {
    const form = mountForm("ButtonForm", {
        operation: { type: "Integer", configuration: { min: 0, max: 10 } },
        configuration: { value: 5 },
    });
    assert.equal(form.validate(), true);
    form.field("Value to send").props.onChange(undefined);
    assert.equal(form.widget().configuration.value, undefined);
    assert.equal(form.validate(), false);
    form.change("Value to send", 0);
    assert.equal(form.widget().configuration.value, 0);
    assert.equal(form.validate(), true);
});

test("Button rejects numeric values outside bounds or integer precision", () => {
    for (const value of [-1, 11, 1.5, Infinity, NaN]) {
        const form = mountForm("ButtonForm", {
            operation: { type: "Integer", configuration: { min: 0, max: 10 } },
            configuration: { value },
        });
        assert.equal(form.validate(), false, String(value));
    }
});

test("Button Boolean and Options selectors preserve exact primitive keys", () => {
    const boolean = mountForm("ButtonForm", {
        operation: { type: "Boolean", configuration: {} },
        configuration: { value: false },
    });
    const selector = boolean.field("Value to send");
    assert.equal(selector.type, "BottomSheetSelect");
    const on = selector.props.options.find((option) => option.label === "True");
    assert.ok(on, "Boolean uses existing bottom sheet with True/False labels");
    on.onPress();
    boolean.render();
    assert.equal(boolean.widget().configuration.value, true);
    assert.equal(boolean.validate(), true);

    const options = mountForm("ButtonForm", {
        operation: { type: "Options", configuration: { options: [{ name: "key-a", value: 42 }] } },
    });
    assert.equal(options.widget().configuration.value, "key-a");
    assert.equal(options.validate(), true);
    const stale = mountForm("ButtonForm", {
        operation: { type: "Options", configuration: { options: [{ name: "key-a", value: 42 }] } },
        configuration: { value: "gone" },
    });
    assert.equal(stale.validate(), false);
});

test("Button color picker saves selected hex without one-change delay", () => {
    const form = mountForm("ButtonForm", {
        operation: { type: "HexColor", configuration: {} },
        configuration: { value: "#000000" },
    });
    form.elements()
        .find((node) => node.type === "ColorPicker")
        .props.onCompleteJS({ hex: "#12AB34" });
    assert.equal(form.widget().configuration.value, "#12AB34");
    assert.equal(form.validate(), true);
});

test("Button text validates new draft before render and clears corrected feedback", () => {
    const form = mountForm("ButtonForm", {
        operation: { type: "Text", configuration: {} },
        configuration: { value: "hello" },
    });
    form.field("Value to send").props.setValue("x".repeat(65));
    assert.equal(form.validate(), false);
    form.render();
    assert.match(form.field("Value to send").props.error, /64/);
    form.change("Value to send", "fixed");
    assert.equal(form.validate(), true);
    form.render();
    assert.equal(form.field("Value to send").props.error, "");
});

test("Type fields block disabled/read-only handlers and release their validator", () => {
    for (const file of ["ButtonForm", "DisplayForms", "SliderForm"]) {
        const operation = {
            type: file === "ButtonForm" ? "Text" : "Number",
            configuration: { min: 0, max: 10 },
        };
        const configuration = { value: "hello", unit: "°C", step: 1 };
        for (const props of [{ disabled: true }, { edit: true }]) {
            const form = mountForm(file, { operation, configuration, props });
            const input = form
                .elements()
                .find((node) => node.type === "Input" || node.type === "InputNumber");
            const before = form.writes.length;
            (input.props.onChange ?? input.props.setValue)(file === "SliderForm" ? 2 : "changed");
            assert.equal(form.writes.length, before, `${file} ${JSON.stringify(props)}`);
            form.unmount();
            assert.equal(form.validator(), null, `${file} cleans up validation`);
        }
    }
});

test("Display unit accepts empty unit and clears invalid-character feedback", () => {
    const form = mountForm("DisplayForms", { operation: { type: "Number", configuration: {} } });
    form.change("Unit", "bad/unit");
    assert.equal(form.validate(), false);
    form.render();
    assert.ok(form.field("Unit").props.error);
    form.change("Unit", "°C");
    assert.equal(form.validate(), true);
    form.render();
    assert.equal(form.field("Unit").props.error, "");
    form.change("Unit", "");
    assert.equal(form.widget().configuration.unit, "");
    assert.equal(form.validate(), true);
});

const radioOptions = [
    { optionName: "on", displayName: "On", icon: "power-outline" },
    { optionName: "off", displayName: "Off", icon: "moon-outline" },
];
const radioOperation = {
    type: "Options",
    configuration: {
        options: [
            { name: "on", value: true },
            { name: "off", value: false },
        ],
    },
};

test("Radio requires two unique valid operation options without toast feedback", () => {
    const invalid = [
        [],
        [radioOptions[0]],
        [radioOptions[0], radioOptions[0]],
        [radioOptions[0], { ...radioOptions[1], optionName: "gone" }],
        [radioOptions[0], { ...radioOptions[1], displayName: " ".repeat(3) }],
        [radioOptions[0], { ...radioOptions[1], displayName: "x".repeat(13) }],
        [radioOptions[0], { ...radioOptions[1], displayName: "Off!" }],
    ];
    for (const options of invalid) {
        const form = mountForm("Radio/RadioForm", {
            operation: radioOperation,
            configuration: { options },
        });
        assert.equal(form.validate(), false, JSON.stringify(options));
        assert.deepEqual(form.toasts, []);
        form.render();
        assert.match(form.text(), /option|name/i);
    }
    const valid = mountForm("Radio/RadioForm", {
        operation: radioOperation,
        configuration: { options: radioOptions },
    });
    assert.equal(valid.validate(), true);
});

test("Radio modal rejects missing operation membership, then adds one normalized option once", () => {
    const added = [];
    let closed = 0;
    const form = mountForm("Radio/RadioOptionFormModal", {
        operation: { type: "Options", configuration: { options: [] } },
        props: {
            currentRadioOptions: [],
            onAddOption: (option) => added.push(option),
            onClose: () => closed++,
        },
    });
    form.change("Display name", "Fan");
    form.elements()
        .find((node) => node.type === "Button")
        .props.onPress();
    assert.equal(added.length, 0);
    assert.equal(closed, 0);
    form.render();
    assert.match(form.text(), /option/i);

    const valid = mountForm("Radio/RadioOptionFormModal", {
        operation: radioOperation,
        props: {
            currentRadioOptions: [],
            onAddOption: (option) => added.push(option),
            onClose: () => closed++,
        },
    });
    valid.change("Display name", "  Fan  ");
    const press = valid.elements().find((node) => node.type === "Button").props.onPress;
    press();
    press();
    assert.equal(added.length, 1);
    assert.equal(closed, 1);
    assert.equal(added[0].optionName, "on");
    assert.equal(added[0].displayName, "Fan");
    assert.equal(added[0].icon, "bulb-outline");
});
