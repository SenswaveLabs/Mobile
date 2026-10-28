import React, { FC, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Input from "@/components/common/Input";
import InputNumber from "@/components/common/InputNumber";
import BottomSheetSelect from "@/components/common/BottomSheetSelect";
import ColorPickerField from "@/components/common/ColorPickerField";
import { useWidgetDetails } from "@/contexts/custom/WidgetDetailsProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { OperationType } from "@/types/DeviceTypes";

export const ButtonOperationTypes: OperationType[] = [
    "Text",
    "Number",
    "Integer",
    "Boolean",
    "Options",
    "HexColor",
];

interface Props {
    edit?: boolean;
    disabled?: boolean;
}

const ButtonForm: FC<Props> = ({ edit = false, disabled = false }) => {
    const widgetDetails = useWidgetDetails();
    const { colors } = useTheme().current;
    const operationType = widgetDetails.operation?.type;
    const configurationValue = widgetDetails.widget?.configuration?.value;
    const options = Array.isArray(widgetDetails.operation?.configuration?.options)
        ? (widgetDetails.operation.configuration.options as { name: string }[])
        : [];
    const initialValue =
        configurationValue ??
        (operationType === "Boolean"
            ? false
            : operationType === "Number" || operationType === "Integer"
              ? 0
              : operationType === "HexColor"
                ? "#000000"
                : operationType === "Options"
                  ? (options[0]?.name ?? "")
                  : "");
    const [value, setValue] = useState<string | number | boolean | undefined>(initialValue);
    const valueRef = useRef(value);
    const [valueError, setValueError] = useState("");
    const lockedRef = useRef(edit || disabled);
    lockedRef.current = edit || disabled;
    const detailsRef = useRef(widgetDetails);
    detailsRef.current = widgetDetails;
    const initialValueRef = useRef(initialValue);
    initialValueRef.current = initialValue;

    const validate = () => {
        const current = valueRef.current;
        const operation = detailsRef.current.operation;
        let error = "";
        if (operation?.type === "Boolean") {
            if (typeof current !== "boolean") error = "Choose True or False.";
        } else if (operation?.type === "Text") {
            if (typeof current !== "string" || current.length < 1 || current.length > 64) {
                error = "Enter between 1 and 64 characters.";
            }
        } else if (operation?.type === "Options") {
            const availableOptions = operation.configuration?.options;
            if (
                !Array.isArray(availableOptions) ||
                !availableOptions.some((option: { name: string }) => option.name === current)
            ) {
                error = "Choose an available operation option.";
            }
        } else if (operation?.type === "HexColor") {
            if (
                typeof current !== "string" ||
                !/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(current)
            ) {
                error = "Choose a valid hex color.";
            }
        } else if (operation?.type === "Number" || operation?.type === "Integer") {
            const { min, max } = operation.configuration ?? {};
            if (typeof current !== "number" || !Number.isFinite(current)) {
                error = "Enter a valid number.";
            } else if (operation.type === "Integer" && !Number.isInteger(current)) {
                error = "Enter a whole number.";
            } else if (
                (min !== undefined && (!Number.isFinite(min) || current < min)) ||
                (max !== undefined && (!Number.isFinite(max) || current > max))
            ) {
                error = "Enter a value within the operation range.";
            }
        } else {
            error = "This operation does not support a Button widget.";
        }
        setValueError(error);
        return error === "";
    };
    const validateRef = useRef(validate);
    validateRef.current = validate;

    useEffect(() => {
        const details = detailsRef.current;
        valueRef.current = initialValueRef.current;
        setValue(initialValueRef.current);
        if (!lockedRef.current && details.widget?.configuration?.value === undefined) {
            details.setWidget({
                ...details.widget!,
                configuration: { ...details.widget?.configuration, value: initialValueRef.current },
            });
        }
        details.setAdditionalValidation(() => validateRef.current());
        details.validateDto();
        return () => details.setAdditionalValidation(null);
    }, [operationType, widgetDetails.operation?.id, widgetDetails.widget?.id]);

    const changeValue = (nextValue: string | number | boolean | undefined) => {
        if (lockedRef.current) return;
        valueRef.current = nextValue;
        setValue(nextValue);
        const details = detailsRef.current;
        details.setWidget({
            ...details.widget!,
            configuration: { ...details.widget?.configuration, value: nextValue },
        });
        details.validateDto();
    };

    if (operationType === "Text") {
        return (
            <Input
                variant="auth"
                title="Value to send"
                placeholder="Enter a value"
                value={typeof value === "string" ? value : ""}
                setValue={changeValue}
                error={valueError}
                editable={!edit}
                accessibilityState={{ busy: disabled }}
                autoCapitalize="none"
            />
        );
    }

    if (operationType === "Number" || operationType === "Integer") {
        return (
            <InputNumber
                variant="auth"
                title="Value to send"
                placeholder="Enter a number"
                value={typeof value === "number" ? value : undefined}
                onChange={changeValue}
                error={valueError}
                integer={operationType === "Integer"}
                min={widgetDetails.operation?.configuration?.min}
                max={widgetDetails.operation?.configuration?.max}
                required
                editable={!edit}
                disabled={disabled}
            />
        );
    }

    if (operationType === "Boolean" || operationType === "Options") {
        const choices =
            operationType === "Boolean"
                ? [
                      { label: "True", value: true },
                      { label: "False", value: false },
                  ]
                : options.map((option) => ({ label: option.name, value: option.name }));
        const selected = choices.find((option) => option.value === value);
        return (
            <View style={styles.field}>
                <BottomSheetSelect
                    title="Value to send"
                    value={selected?.label ?? String(value || "Choose an option")}
                    disabled={edit || disabled || choices.length === 0}
                    busy={disabled}
                    options={choices.map((option) => ({
                        label: option.label,
                        selected: option.value === value,
                        onPress: () => changeValue(option.value),
                    }))}
                />
                {!!valueError && (
                    <Text
                        accessibilityLiveRegion="polite"
                        style={[styles.support, { color: colors.error }]}>
                        {valueError}
                    </Text>
                )}
            </View>
        );
    }

    if (operationType === "HexColor") {
        return (
            <ColorPickerField
                title="Color to send"
                value={typeof value === "string" ? value : ""}
                disabled={disabled}
                readOnly={edit}
                error={valueError}
                onConfirm={(hex) => {
                    if (lockedRef.current) return false;
                    changeValue(hex);
                    return true;
                }}
            />
        );
    }

    return <Text style={[styles.support, { color: colors.error }]}>{valueError}</Text>;
};

export default ButtonForm;

const styles = StyleSheet.create({
    field: { gap: 6 },
    support: { fontSize: 14, lineHeight: 20 },
});
