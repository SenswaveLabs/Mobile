import React from "react";
import { View } from "react-native";
import Dropdown, { Option } from "@/components/common/Dropdown";
import InputNumber from "@/components/common/InputNumber";

const NumericTypeCheckOptions: Option[] = [
    { name: "Enable Range Check", value: "check" },
    { name: "Disable Range Check", value: "nocheck" },
];

const SeparatorOptions: Option[] = [
    { name: "Dot (.)", value: "." },
    { name: "Comma (,)", value: "," },
];

interface NumericOperationFormProps {
    edit: boolean;
    showSeparator: boolean;
    separator: string;
    typeCheck: string;
    minValue: number | undefined;
    maxValue: number | undefined;
    minValueError: string;
    onSeparatorChange: (value: string) => void;
    onTypeCheckChange: (value: string) => void;
    onMinValueChange: (value: number | undefined) => void;
    onMaxValueChange: (value: number | undefined) => void;
}

const NumericOperationForm = ({
    edit,
    showSeparator,
    separator,
    typeCheck,
    minValue,
    maxValue,
    minValueError,
    onSeparatorChange,
    onTypeCheckChange,
    onMinValueChange,
    onMaxValueChange,
}: NumericOperationFormProps) => {
    return (
        <>
            {showSeparator && (
                <Dropdown
                    title={"Separator Type"}
                    options={SeparatorOptions}
                    selectedValue={separator}
                    onSelected={onSeparatorChange}
                    disablePress={edit}
                    style={{ marginBottom: 10 }}
                />
            )}

            {!edit && (
                <Dropdown
                    title={"Numeric Value Check"}
                    options={NumericTypeCheckOptions}
                    selectedValue={typeCheck}
                    onSelected={onTypeCheckChange}
                    style={{ marginBottom: 10 }}
                />
            )}

            {typeCheck === "check" && (
                <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                    <View style={{ width: "50%" }}>
                        <InputNumber
                            error={minValueError}
                            value={minValue}
                            title="Min Value"
                            placeholder="0"
                            onChange={onMinValueChange}
                            editable={!edit}
                        />
                    </View>
                    <View style={{ width: "50%" }}>
                        <InputNumber
                            value={maxValue}
                            title="Max Value"
                            placeholder="100"
                            onChange={onMaxValueChange}
                            editable={!edit}
                        />
                    </View>
                </View>
            )}
        </>
    );
};

export default NumericOperationForm;
