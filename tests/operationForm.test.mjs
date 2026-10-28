import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

function mountForm(overrides = {}) {
    const writes = [];
    let options = overrides.options ?? [];
    const ref = { current: null };
    const props = {
        ref,
        deviceId: "device-a",
        onSubmit: async (values) => writes.push(JSON.parse(JSON.stringify(values))),
        ...overrides,
    };
    const form = mountNativeComponent("src/components/device/operation/OperationForm.tsx", {
        exportName: "OperationFormInternal",
        props,
        modules: {
            "./OperationTile": "OperationTile",
            "@/components/common/Dropdown": "Dropdown",
            "@/components/common/SwitchDropdown": "SwitchDropdown",
            "@/components/common/Divider": "Divider",
            "@/contexts/custom/OperationFormProvider": {
                OperationFormProvider: "OperationFormProvider",
                useOperationForm: () => ({
                    getOptions: () => options,
                    setConfiguration: (value) => {
                        options = value?.options ?? [];
                    },
                }),
            },
            "@/components/common/BottomSheetSelect": "BottomSheetSelect",
            "@/components/common/FormSection": "FormSection",
            "@/components/common/Input": "Input",
            "@/components/common/Button": "Button",
            "@/components/common/JsonPathSelector": "JsonPathSelector",
            "./forms/Boolean/BooleanOperationForm": {
                __esModule: true,
                default: "BooleanOperationForm",
                defaultBoolValue: (type) =>
                    type === "boolean" ? false : type === "number" ? "0" : "",
                inferBoolValueType: (value) =>
                    typeof value === "boolean"
                        ? "boolean"
                        : typeof value === "number"
                          ? "number"
                          : "text",
                getBoolOverrideValue: (type, value) =>
                    type === "boolean" ? Boolean(value) : type === "number" ? Number(value) : value,
            },
            "./forms/Numeric/NumericOperationForm": "NumericOperationForm",
            "./forms/Options/OptionsOperationForm": "OptionOperationForm",
        },
    });
    const render = () => form.render(props);
    const field = (title) =>
        form.elements().find((node) => node.type === "Input" && node.props.title === title);
    const selector = (title) =>
        form
            .elements()
            .find((node) => node.type === "BottomSheetSelect" && node.props.title === title);
    const child = (type) => form.elements().find((node) => node.type === type);
    return {
        ...form,
        ref,
        props,
        writes,
        field,
        selector,
        child,
        change(title, value) {
            field(title).props.setValue(value);
            render();
        },
        select(title, label) {
            selector(title)
                .props.options.find((option) => option.label === label)
                .onPress();
            render();
        },
        update(type, callback, value) {
            child(type).props[callback](value);
            render();
        },
        async submit() {
            await ref.current.triggerSave();
            render();
        },
        render,
    };
}

test("name and topic boundaries validate inline and preserve the exact topic", async () => {
    for (const [name, topic, valid] of [
        ["ab", "abc", false],
        ["abc", "ab", false],
        ["a".repeat(64), "t".repeat(256), true],
        ["a".repeat(65), "abc", false],
        ["abc", "t".repeat(257), false],
        ["  abc  ", " home/topic ", true],
    ]) {
        const form = mountForm();
        form.change("Name", name);
        form.change("Topic", topic);
        await form.submit();
        assert.equal(form.writes.length, valid ? 1 : 0, JSON.stringify([name, topic]));
        if (valid) {
            assert.equal(form.writes[0].name, name.trim());
            assert.equal(form.writes[0].topic, topic);
        }
    }
});

test("only active numeric and JSON drafts participate in validation or payload", async () => {
    const form = mountForm();
    form.change("Name", "Lights");
    form.change("Topic", "home/light");
    form.select("Operation type", "Number");
    form.update("NumericOperationForm", "onTypeCheckChange", "check");
    form.update("NumericOperationForm", "onMinValueChange", undefined);
    await form.submit();
    assert.equal(form.writes.length, 0);
    form.select("Operation type", "Text");
    await form.submit();
    assert.deepEqual(form.writes[0].configuration, { isJson: false, saveOnUserAction: true });
    form.select("Data mapping", "JSON");
    form.update("JsonPathSelector", "setJsonNames", ["state", "value"]);
    form.update("JsonPathSelector", "onValidChange", false);
    await form.submit();
    assert.equal(form.writes.length, 1);
    form.update("JsonPathSelector", "onValidChange", true);
    await form.submit();
    assert.deepEqual(form.writes[1].configuration.jsonNames, ["state", "value"]);
    form.select("Data mapping", "Plain text");
    await form.submit();
    assert.equal("jsonNames" in form.writes[2].configuration, false);
});

test("Boolean custom values preserve false, numeric zero and text zero", async () => {
    const form = mountForm();
    form.change("Name", "Power");
    form.change("Topic", "home/power");
    form.update("BooleanOperationForm", "onOverrideChange", "custom");
    form.update("BooleanOperationForm", "onTrueTypeChange", "number");
    form.update("BooleanOperationForm", "onTrueValueChange", "0");
    form.update("BooleanOperationForm", "onFalseTypeChange", "text");
    form.update("BooleanOperationForm", "onFalseValueChange", "0");
    await form.submit();
    assert.equal(form.writes[0].configuration.trueValue, 0);
    assert.equal(form.writes[0].configuration.falseValue, "0");
    form.update("BooleanOperationForm", "onTrueTypeChange", "boolean");
    await form.submit();
    assert.equal(form.writes[1].configuration.trueValue, false);
});

test("read-only operation details never submit or mutate configuration", async () => {
    const form = mountForm({
        edit: true,
        initName: "Existing",
        initTopic: "home/existing",
        initType: "Text",
    });
    assert.equal(form.child("Button"), undefined);
    assert.equal(form.field("Name").props.editable, false);
    form.field("Name").props.setValue("Changed");
    await form.submit();
    assert.deepEqual(form.writes, []);
    assert.equal(form.field("Name").props.value, "Existing");
});

test("JSON path preserves order, rejects invalid drafts and caps segments at five", () => {
    let names = [];
    let valid = true;
    const props = {
        jsonNames: names,
        setJsonNames: (value) => {
            names = Array.from(value);
        },
        onValidChange: (value) => {
            valid = value;
        },
    };
    const form = mountNativeComponent("src/components/common/JsonPathSelector.tsx", {
        props,
        modules: {
            "@/components/common/Input": "Input",
            "./Input": "Input",
            "./Icon": "Icon",
            "react-native-gesture-handler": { ScrollView: "ScrollView" },
            "@/components/common/SectionHeaderAction": "SectionHeaderAction",
        },
    });
    const render = () => form.render({ ...props, jsonNames: names });
    const input = (title) =>
        form.elements().find((node) => node.type === "Input" && node.props.title === title);
    const add = () =>
        form
            .elements()
            .find((node) => node.type === "SectionHeaderAction")
            .props.onPress();
    for (const invalid of ["x".repeat(64), 'bad"key', "bad\\key", "bad\u0001key"]) {
        input("New segment").props.setValue(invalid);
        render();
        add();
        render();
        assert.deepEqual(names, []);
        assert.equal(valid, false);
    }
    for (const name of ["x".repeat(63), "second", "third", "fourth", "fifth"]) {
        input("New segment").props.setValue(name);
        render();
        add();
        render();
    }
    assert.deepEqual(names, ["x".repeat(63), "second", "third", "fourth", "fifth"]);
    assert.equal(valid, true);
    assert.equal(input("New segment"), undefined);
    input("Segment 2").props.setValue('bad"key');
    render();
    assert.equal(valid, false);
    assert.equal(names[1], "second", "Invalid input cannot silently replace the saved path");
});

function mountOptionModal(existing = [], extraProps = {}) {
    const added = [];
    let closed = 0;
    const form = mountNativeComponent(
        "src/components/device/operation/forms/Options/OptionsOperationFormModal.tsx",
        {
            props: { onClose: () => closed++, ...extraProps },
            modules: {
                "@/contexts/custom/OperationFormProvider": {
                    useOperationForm: () => ({
                        getOptions: () => existing,
                        addOption: (name, value) => added.push({ name, value }),
                    }),
                },
                "@/components/common/Input": "Input",
                "@/components/common/InputNumber": "InputNumber",
                "@/components/common/BottomSheetSelect": "BottomSheetSelect",
                "@/components/common/Button": "Button",
                "@/components/common/FormSection": "FormSection",
                "@/components/common/Dropdown": "Dropdown",
                "@/components/common/SwitchDropdown": "SwitchDropdown",
            },
        },
    );
    const node = (type, title) =>
        form
            .elements()
            .find((item) => item.type === type && (!title || item.props.title === title));
    return {
        ...form,
        added,
        closed: () => closed,
        node,
        name(value) {
            node("Input", "Option name").props.setValue(value);
            form.render();
        },
        type(label) {
            node("BottomSheetSelect", "Value type")
                .props.options.find((option) => option.label === label)
                .onPress();
            form.render();
        },
        value(value) {
            const input = node("InputNumber", "Value") ?? node("Input", "Value");
            (input.props.onChange ?? input.props.setValue)(value);
            form.render();
        },
        press() {
            node("Button").props.onPress();
            form.render();
        },
    };
}

test("option modal preserves distinct primitive values and accepts a choice once", () => {
    for (const [type, value] of [
        ["Boolean", false],
        ["Number", 0],
        ["Text", "0"],
    ]) {
        const form = mountOptionModal([{ name: "existing", value: type === "Number" ? "0" : 0 }]);
        form.name("choice");
        form.type(type);
        if (type === "Text") form.value(value);
        const press = form.node("Button").props.onPress;
        press();
        press();
        assert.deepEqual(form.added, [{ name: "choice", value }]);
        assert.equal(form.closed(), 1);
    }
});

test("option modal blocks duplicate, overlong, empty and non-finite drafts", () => {
    for (const [name, type, value] of [
        ["", "Text", "valid"],
        ["x".repeat(13), "Text", "valid"],
        ["same", "Text", "valid"],
        ["new", "Text", ""],
        ["new", "Text", "x".repeat(128)],
        ["new", "Number", undefined],
        ["new", "Number", Infinity],
    ]) {
        const form = mountOptionModal([{ name: "same", value: "other" }]);
        form.name(name);
        form.type(type);
        form.value(value);
        form.press();
        assert.deepEqual(form.added, []);
        assert.equal(form.closed(), 0);
    }
    const full = mountOptionModal(
        Array.from({ length: 10 }, (_, index) => ({ name: `n${index}`, value: index })),
    );
    full.name("next");
    full.type("Text");
    full.value("value");
    full.press();
    assert.deepEqual(full.added, []);
});

test("option list is read-only in details and ignores retained removal after pending", () => {
    let options = [
        { name: "on", value: true },
        { name: "off", value: false },
    ];
    const changes = [];
    let props = { edit: false, disabled: false };
    const form = mountNativeComponent(
        "src/components/device/operation/forms/Options/OptionsOperationForm.tsx",
        {
            props,
            modules: {
                "@/contexts/custom/OperationFormProvider": {
                    useOperationForm: () => ({
                        getOptions: () => options,
                        removeOption: (name) => {
                            changes.push(name);
                            options = options.filter((item) => item.name !== name);
                        },
                    }),
                },
                "@/components/common/SenswaveModal": "SenswaveModal",
                "@/components/common/ListRow": "ListRow",
                "@/components/common/SectionHeaderAction": "SectionHeaderAction",
                "@/components/common/Icon": "Icon",
                "@/components/common/ImageButton": "ImageButton",
                "./OptionsOperationFormModal": "OptionsOperationFormModal",
            },
        },
    );
    const remove = form.elements().find((node) => node.props?.accessibilityLabel === "Remove on")
        .props.onPress;
    props = { ...props, disabled: true };
    form.render(props);
    remove();
    assert.deepEqual(changes, []);
    props = { edit: true, disabled: false };
    form.render(props);
    assert.equal(
        form.elements().some((node) => node.type === "SectionHeaderAction"),
        false,
    );
    assert.equal(
        form.elements().some((node) => node.props?.accessibilityLabel === "Remove on"),
        false,
    );
});

test("each operation type sends only its active configuration with finite ranges", async () => {
    for (const [label, type] of [
        ["Text", "Text"],
        ["Hex color", "HexColor"],
        ["Integer", "Integer"],
        ["Number", "Number"],
    ]) {
        const form = mountForm();
        form.change("Name", "Example");
        form.change("Topic", "home/example");
        form.select("Operation type", label);
        if (type === "Integer" || type === "Number") {
            form.update("NumericOperationForm", "onTypeCheckChange", "check");
            form.update("NumericOperationForm", "onMinValueChange", 0);
            form.update("NumericOperationForm", "onMaxValueChange", Infinity);
            await form.submit();
            assert.equal(form.writes.length, 0);
            form.update("NumericOperationForm", "onMaxValueChange", 10);
        }
        await form.submit();
        assert.equal(form.writes[0].type, type);
        if (type === "Integer" || type === "Number")
            assert.deepEqual(
                [form.writes[0].configuration.min, form.writes[0].configuration.max],
                [0, 10],
            );
        if (type === "Number") assert.equal(form.writes[0].configuration.decimalSeparator, ".");
        else assert.equal("decimalSeparator" in form.writes[0].configuration, false);
    }
});

test("options require unique names and values and keep primitive payloads intact", async () => {
    for (const [options, valid] of [
        [[], false],
        [[{ name: "on", value: true }], false],
        [
            [
                { name: "on", value: 0 },
                { name: "off", value: "0" },
            ],
            true,
        ],
        [
            [
                { name: "on", value: 0 },
                { name: "on", value: 1 },
            ],
            false,
        ],
        [
            [
                { name: "on", value: 0 },
                { name: "off", value: 0 },
            ],
            false,
        ],
    ]) {
        const form = mountForm({ options });
        form.change("Name", "Mode");
        form.change("Topic", "home/mode");
        form.select("Operation type", "Options");
        await form.submit();
        assert.equal(form.writes.length, valid ? 1 : 0);
        if (valid) assert.deepEqual(form.writes[0].configuration.options, options);
    }
});

test("same-tick submit and retained setters respect pending and read-only locks", async () => {
    let resolve;
    const requests = [];
    const pending = new Promise((done) => {
        resolve = done;
    });
    const form = mountForm({
        onSubmit: (value) => {
            requests.push(value);
            return pending;
        },
    });
    form.change("Name", "Power");
    form.change("Topic", "home/power");
    const setter = form.field("Name").props.setValue;
    const submit = form.ref.current.triggerSave;
    const first = submit();
    submit();
    setter("Changed");
    assert.equal(requests.length, 1);
    form.render();
    assert.equal(form.field("Name").props.value, "Power");
    resolve();
    await first;
    form.props.disabled = true;
    form.render();
    setter("Changed");
    await form.ref.current.triggerSave();
    form.render();
    assert.equal(requests.length, 1);
    assert.equal(form.field("Name").props.value, "Power");
});

test("an invalid JSON edit blocks an immediately retained submit callback", async () => {
    const form = mountForm({
        initName: "Mapped",
        initTopic: "home/mapped",
        initType: "Text",
        initConfiguration: { isJson: true, jsonNames: ["valid"] },
    });
    const submit = form.ref.current.triggerSave;
    form.child("JsonPathSelector").props.onValidChange(false);
    await submit();
    assert.equal(form.writes.length, 0);
});

test("Boolean inverse and option length boundaries preserve the submitted values", async () => {
    const form = mountForm();
    form.change("Name", "Power");
    form.change("Topic", "home/power");
    form.update("BooleanOperationForm", "onOverrideChange", "inversed");
    await form.submit();
    assert.equal(form.writes[0].configuration.trueValue, false);
    assert.equal(form.writes[0].configuration.falseValue, true);
    const option = mountOptionModal();
    option.name("x".repeat(12));
    option.type("Text");
    option.value("y".repeat(127));
    option.press();
    assert.deepEqual(option.added, [{ name: "x".repeat(12), value: "y".repeat(127) }]);
});
