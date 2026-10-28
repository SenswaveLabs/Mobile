import React, { FC, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import BottomSheetSelect from "@/components/common/BottomSheetSelect";
import Button from "@/components/common/Button";
import FormSection from "@/components/common/FormSection";
import Input from "@/components/common/Input";
import InputNumber from "@/components/common/InputNumber";
import { useOperationForm } from "@/contexts/custom/OperationFormProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { keyboardOffset } from "@/styles/defaultStyles";

type ValueType = "Boolean" | "Number" | "Text";
interface OptionsOperationFormModalProps {
    onClose: () => void;
    disabled?: boolean;
    onChange?: () => void;
}
const OptionsOperationFormModal: FC<OptionsOperationFormModalProps> = ({
    onClose,
    disabled = false,
    onChange,
}) => {
    const operationForm = useOperationForm();
    const { colors } = useTheme().current;
    const formRef = useRef(operationForm);
    formRef.current = operationForm;
    const [name, setName] = useState("");
    const [type, setType] = useState<ValueType>("Number");
    const [value, setValue] = useState<string | number | boolean | undefined>(0);
    const [nameError, setNameError] = useState("");
    const [valueError, setValueError] = useState("");
    const draft = useRef({ name, type, value });
    const locked = useRef(disabled);
    locked.current = disabled;
    const accepted = useRef(false);

    const update = (next: Partial<typeof draft.current>) => {
        if (locked.current || accepted.current) return;
        draft.current = { ...draft.current, ...next };
        if (next.name !== undefined) {
            setName(next.name);
            setNameError("");
        }
        if (next.type !== undefined) setType(next.type);
        if ("value" in next) {
            setValue(next.value);
            setValueError("");
        }
        onChange?.();
    };
    const selectType = (next: ValueType) =>
        update({ type: next, value: next === "Boolean" ? false : next === "Number" ? 0 : "" });
    const add = () => {
        if (locked.current || accepted.current) return;
        const current = draft.current;
        const options = formRef.current.getOptions();
        const nameIssue = !current.name.trim()
            ? "Name is required."
            : current.name.length > 12
              ? "Use at most 12 characters."
              : options.some((item) => item.name === current.name)
                ? "Option name already used."
                : "";
        const valueIssue =
            current.type === "Number" &&
            (typeof current.value !== "number" || !Number.isFinite(current.value))
                ? "Enter a valid number."
                : current.type === "Text" &&
                    (typeof current.value !== "string" ||
                        !current.value.trim() ||
                        current.value.length > 127)
                  ? "Use 1–127 characters."
                  : options.some((item) => item.value === current.value)
                    ? "Option value already used."
                    : options.length >= 10
                      ? "Use at most 10 options."
                      : "";
        setNameError(nameIssue);
        setValueError(valueIssue);
        if (nameIssue || valueIssue || current.value === undefined) return;
        accepted.current = true;
        formRef.current.addOption(current.name, current.value);
        onClose();
    };
    return (
        <KeyboardAwareScrollView
            bottomOffset={keyboardOffset}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}>
            <FormSection
                title="Option details"
                helper="Choose a name and the value sent for this option.">
                <Input
                    variant="auth"
                    title="Option name"
                    placeholder="For example, On"
                    value={name}
                    setValue={(next) => update({ name: next })}
                    error={nameError}
                    accessibilityState={{ busy: disabled }}
                />
                <BottomSheetSelect
                    title="Value type"
                    value={type}
                    disabled={disabled}
                    options={(["Boolean", "Number", "Text"] as ValueType[]).map((item) => ({
                        label: item,
                        selected: type === item,
                        onPress: () => selectType(item),
                    }))}
                />
                {type === "Boolean" ? (
                    <View style={styles.field}>
                        <BottomSheetSelect
                            title="Value"
                            value={value ? "True" : "False"}
                            disabled={disabled}
                            options={[
                                {
                                    label: "True",
                                    selected: value === true,
                                    onPress: () => update({ value: true }),
                                },
                                {
                                    label: "False",
                                    selected: value === false,
                                    onPress: () => update({ value: false }),
                                },
                            ]}
                        />
                        {!!valueError && (
                            <Text
                                accessibilityLiveRegion="polite"
                                style={[styles.error, { color: colors.error }]}>
                                {valueError}
                            </Text>
                        )}
                    </View>
                ) : type === "Number" ? (
                    <InputNumber
                        variant="auth"
                        title="Value"
                        placeholder="Enter a number"
                        value={typeof value === "number" ? value : undefined}
                        onChange={(next) => update({ value: next })}
                        error={valueError}
                        disabled={disabled}
                    />
                ) : (
                    <Input
                        variant="auth"
                        title="Value"
                        placeholder="Enter text"
                        value={typeof value === "string" ? value : ""}
                        setValue={(next) => update({ value: next })}
                        error={valueError}
                        accessibilityState={{ busy: disabled }}
                        onSubmitEditing={add}
                    />
                )}
            </FormSection>
            <View style={styles.actions}>
                <Button
                    name="Add option"
                    type="auth"
                    loading={false}
                    disabled={disabled || accepted.current}
                    onPress={add}
                />
            </View>
        </KeyboardAwareScrollView>
    );
};
export default OptionsOperationFormModal;
const styles = StyleSheet.create({
    content: {
        flexGrow: 1,
        width: "100%",
        maxWidth: 448,
        alignSelf: "center",
        paddingTop: 24,
        paddingBottom: 24,
    },
    actions: { marginTop: "auto", paddingTop: 32 },
    field: { gap: 6 },
    error: { fontSize: 14, lineHeight: 20 },
});
