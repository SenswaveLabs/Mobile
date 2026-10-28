import React, { FC } from "react";
import { StyleSheet, View } from "react-native";
import BottomSheetSelect from "@/components/common/BottomSheetSelect";
import InputNumber from "@/components/common/InputNumber";

interface NumericOperationFormProps {
    edit: boolean;
    disabled?: boolean;
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

const NumericOperationForm: FC<NumericOperationFormProps> = ({
    edit,
    disabled = false,
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
}) => (
    <View style={styles.fields}>
        {showSeparator && (
            <BottomSheetSelect
                title="Decimal separator"
                value={separator === "," ? "Comma (,)" : "Dot (.)"}
                disabled={edit || disabled}
                options={[
                    {
                        label: "Dot (.)",
                        selected: separator === ".",
                        onPress: () => onSeparatorChange("."),
                    },
                    {
                        label: "Comma (,)",
                        selected: separator === ",",
                        onPress: () => onSeparatorChange(","),
                    },
                ]}
            />
        )}
        {!edit && (
            <BottomSheetSelect
                title="Value range"
                value={typeCheck === "check" ? "Limited" : "Unlimited"}
                disabled={disabled}
                options={[
                    {
                        label: "Unlimited",
                        selected: typeCheck === "nocheck",
                        onPress: () => onTypeCheckChange("nocheck"),
                    },
                    {
                        label: "Limited",
                        selected: typeCheck === "check",
                        onPress: () => onTypeCheckChange("check"),
                    },
                ]}
            />
        )}
        {typeCheck === "check" && (
            <View style={styles.range}>
                <View style={styles.column}>
                    <InputNumber
                        variant="auth"
                        error={minValueError}
                        value={minValue}
                        title="Minimum"
                        placeholder="0"
                        onChange={onMinValueChange}
                        editable={!edit}
                        disabled={disabled}
                    />
                </View>
                <View style={styles.column}>
                    <InputNumber
                        variant="auth"
                        value={maxValue}
                        title="Maximum"
                        placeholder="100"
                        onChange={onMaxValueChange}
                        editable={!edit}
                        disabled={disabled}
                    />
                </View>
            </View>
        )}
    </View>
);
export default NumericOperationForm;
const styles = StyleSheet.create({
    fields: { gap: 24 },
    range: { flexDirection: "row", gap: 12 },
    column: { flex: 1, minWidth: 0 },
});
