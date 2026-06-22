import React from "react";
import { View } from "react-native";
import Dropdown, { Option } from "@/components/common/Dropdown";
import SwitchDropdown from "@/components/common/SwitchDropdown";
import Input from "@/components/common/Input";
import Text from "@/components/common/Text";

export type BoolValueType = "boolean" | "number" | "text";

const BooleanOverrideOptions: Option[] = [
    { name: "Default (true / false)", value: "default" },
    { name: "Inversed (false / true)", value: "inversed" },
    { name: "Custom", value: "custom" },
];

const ValueTypeOptions: Option[] = [
    { name: "Boolean", value: "boolean" },
    { name: "Number", value: "number" },
    { name: "Text", value: "text" },
];

export function inferBoolValueType(val: any): BoolValueType {
    if (typeof val === "boolean") return "boolean";
    if (typeof val === "number") return "number";
    return "text";
}

export function defaultBoolValue(type: BoolValueType): string | boolean {
    if (type === "boolean") return false;
    if (type === "number") return "0";
    return "";
}

export function getBoolOverrideValue(
    type: BoolValueType,
    value: string | boolean,
): string | number | boolean {
    if (type === "boolean") return Boolean(value);
    if (type === "number") return Number(value as string);
    return value as string;
}

interface BoolValueInputProps {
    label: string;
    type: BoolValueType;
    value: string | boolean;
    editable: boolean;
    onTypeChange: (type: BoolValueType) => void;
    onValueChange: (value: string | boolean) => void;
}

const BoolValueInput: React.FC<BoolValueInputProps> = ({
    label,
    type,
    value,
    editable,
    onTypeChange,
    onValueChange,
}) => {
    return (
        <View style={{ marginBottom: 10 }}>
            <Text size="medium" color="onBackground" bold style={{ marginBottom: 5 }}>
                {label}
            </Text>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                <View style={{ flex: 1 }}>
                    <Dropdown
                        title=""
                        options={ValueTypeOptions}
                        selectedValue={type}
                        onSelected={(v) => onTypeChange(v as BoolValueType)}
                        disablePress={!editable}
                    />
                </View>
                <View style={{ flex: 1 }}>
                    {type === "boolean" ? (
                        <SwitchDropdown
                            value={value as boolean}
                            onSelected={onValueChange}
                            disablePress={!editable}
                        />
                    ) : (
                        <Input
                            error=""
                            value={value.toString()}
                            title=""
                            placeholder={type === "number" ? "e.g. 1" : "e.g. on"}
                            keyboardType={type === "number" ? "numeric" : "default"}
                            setValue={(v) => onValueChange(v)}
                            editable={editable}
                        />
                    )}
                </View>
            </View>
        </View>
    );
};

interface BooleanOperationFormProps {
    edit: boolean;
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

const BooleanOperationForm = ({
    edit,
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
}: BooleanOperationFormProps) => {
    if (edit) {
        if (override === "default") return null;

        if (override === "inversed") {
            return (
                <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                    <View style={{ width: "50%" }}>
                        <Input
                            error=""
                            value="false"
                            title="True Value"
                            placeholder=""
                            setValue={() => {}}
                            editable={false}
                        />
                    </View>
                    <View style={{ width: "50%" }}>
                        <Input
                            error=""
                            value="true"
                            title="False Value"
                            placeholder=""
                            setValue={() => {}}
                            editable={false}
                        />
                    </View>
                </View>
            );
        }

        return (
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                <View style={{ width: "50%" }}>
                    <Input
                        error=""
                        value={trueValue.toString()}
                        title="True Value"
                        placeholder=""
                        setValue={() => {}}
                        editable={false}
                    />
                </View>
                <View style={{ width: "50%" }}>
                    <Input
                        error=""
                        value={falseValue.toString()}
                        title="False Value"
                        placeholder=""
                        setValue={() => {}}
                        editable={false}
                    />
                </View>
            </View>
        );
    }

    return (
        <>
            <Dropdown
                title="Value Override"
                options={BooleanOverrideOptions}
                selectedValue={override}
                onSelected={onOverrideChange}
                style={{ marginBottom: 10 }}
            />
            {override === "custom" && (
                <>
                    <BoolValueInput
                        label="True Value"
                        type={trueType}
                        value={trueValue}
                        editable={true}
                        onTypeChange={onTrueTypeChange}
                        onValueChange={onTrueValueChange}
                    />
                    <BoolValueInput
                        label="False Value"
                        type={falseType}
                        value={falseValue}
                        editable={true}
                        onTypeChange={onFalseTypeChange}
                        onValueChange={onFalseValueChange}
                    />
                </>
            )}
        </>
    );
};

export default BooleanOperationForm;
