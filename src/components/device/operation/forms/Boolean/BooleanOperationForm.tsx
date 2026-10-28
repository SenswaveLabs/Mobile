import React, { FC } from "react";
import { StyleSheet, View } from "react-native";
import BottomSheetSelect from "@/components/common/BottomSheetSelect";
import Input from "@/components/common/Input";

export type BoolValueType = "boolean" | "number" | "text";
export function inferBoolValueType(value: any): BoolValueType {
    if (typeof value === "boolean") return "boolean";
    if (typeof value === "number") return "number";
    return "text";
}
export function defaultBoolValue(type: BoolValueType): string | boolean {
    if (type === "boolean") return false;
    return type === "number" ? "0" : "";
}
export function getBoolOverrideValue(
    type: BoolValueType,
    value: string | boolean,
): string | number | boolean {
    if (type === "boolean") return Boolean(value);
    return type === "number" ? Number(value) : String(value);
}

interface BoolValueInputProps {
    label: string;
    type: BoolValueType;
    value: string | boolean;
    disabled: boolean;
    onTypeChange: (type: BoolValueType) => void;
    onValueChange: (value: string | boolean) => void;
}
const valueTypes: { label: string; value: BoolValueType }[] = [
    { label: "Boolean", value: "boolean" },
    { label: "Number", value: "number" },
    { label: "Text", value: "text" },
];
const BoolValueInput: FC<BoolValueInputProps> = ({
    label,
    type,
    value,
    disabled,
    onTypeChange,
    onValueChange,
}) => (
    <View style={styles.fields}>
        <BottomSheetSelect
            title={`${label} type`}
            value={valueTypes.find((item) => item.value === type)?.label ?? type}
            disabled={disabled}
            options={valueTypes.map((item) => ({
                label: item.label,
                selected: type === item.value,
                onPress: () => onTypeChange(item.value),
            }))}
        />
        {type === "boolean" ? (
            <BottomSheetSelect
                title={label}
                value={value ? "True" : "False"}
                disabled={disabled}
                options={[
                    { label: "True", selected: value === true, onPress: () => onValueChange(true) },
                    {
                        label: "False",
                        selected: value === false,
                        onPress: () => onValueChange(false),
                    },
                ]}
            />
        ) : (
            <Input
                variant="auth"
                title={label}
                value={String(value)}
                placeholder={type === "number" ? "For example, 1" : "For example, on"}
                error=""
                keyboardType={type === "number" ? "numeric" : "default"}
                setValue={(next) => {
                    if (!disabled) onValueChange(next);
                }}
                accessibilityState={{ busy: disabled }}
            />
        )}
    </View>
);
interface BooleanOperationFormProps {
    edit: boolean;
    disabled?: boolean;
    override: string;
    trueType: BoolValueType;
    trueValue: string | boolean;
    falseType: BoolValueType;
    falseValue: string | boolean;
    onOverrideChange: (value: string) => void;
    onTrueTypeChange: (type: BoolValueType) => void;
    onTrueValueChange: (value: string | boolean) => void;
    onFalseTypeChange: (type: BoolValueType) => void;
    onFalseValueChange: (value: string | boolean) => void;
}
const BooleanOperationForm: FC<BooleanOperationFormProps> = ({
    edit,
    disabled = false,
    override,
    trueType,
    trueValue,
    falseType,
    falseValue,
    onOverrideChange,
    onTrueTypeChange,
    onTrueValueChange,
    onFalseTypeChange,
    onFalseValueChange,
}) => {
    if (edit) {
        if (override === "default") return null;
        return (
            <View style={styles.fields}>
                <Input
                    variant="auth"
                    title="True value"
                    placeholder=""
                    error=""
                    value={override === "inversed" ? "false" : String(trueValue)}
                    setValue={() => {}}
                    editable={false}
                />
                <Input
                    variant="auth"
                    title="False value"
                    placeholder=""
                    error=""
                    value={override === "inversed" ? "true" : String(falseValue)}
                    setValue={() => {}}
                    editable={false}
                />
            </View>
        );
    }
    const overrides = [
        { label: "Default (true / false)", value: "default" },
        { label: "Inversed (false / true)", value: "inversed" },
        { label: "Custom", value: "custom" },
    ];
    return (
        <View style={styles.fields}>
            <BottomSheetSelect
                title="Value override"
                value={overrides.find((item) => item.value === override)?.label ?? override}
                disabled={disabled}
                options={overrides.map((item) => ({
                    label: item.label,
                    selected: item.value === override,
                    onPress: () => onOverrideChange(item.value),
                }))}
            />
            {override === "custom" && (
                <>
                    <BoolValueInput
                        label="True value"
                        type={trueType}
                        value={trueValue}
                        disabled={disabled}
                        onTypeChange={onTrueTypeChange}
                        onValueChange={onTrueValueChange}
                    />
                    <BoolValueInput
                        label="False value"
                        type={falseType}
                        value={falseValue}
                        disabled={disabled}
                        onTypeChange={onFalseTypeChange}
                        onValueChange={onFalseValueChange}
                    />
                </>
            )}
        </View>
    );
};
export default BooleanOperationForm;
const styles = StyleSheet.create({ fields: { gap: 24 } });
