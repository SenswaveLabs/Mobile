import React, { FC, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Input from "@/components/common/Input";
import InputNumber from "@/components/common/InputNumber";
import BottomSheetSelect from "@/components/common/BottomSheetSelect";
import { useWidgetDetails } from "@/contexts/custom/WidgetDetailsProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { OperationType } from "@/types/DeviceTypes";
import ColorPicker, {
    BlueSlider,
    ColorFormatsObject,
    GreenSlider,
    RedSlider,
} from "reanimated-color-picker";

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
        const hexColor = typeof value === "string" ? value : "";
        const validHex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hexColor);
        return (
            <View style={styles.colorField}>
                <View style={styles.colorValue}>
                    <View
                        accessible={false}
                        style={[
                            styles.swatch,
                            {
                                backgroundColor: validHex ? hexColor : "transparent",
                                borderColor: colors.authBorder,
                            },
                        ]}
                    />
                    <View style={styles.colorLabel}>
                        <Text style={[styles.label, { color: colors.authForeground }]}>
                            Color to send
                        </Text>
                        <Text selectable style={[styles.support, { color: colors.authMuted }]}>
                            {hexColor || "No color selected"}
                        </Text>
                    </View>
                </View>
                {!edit && (
                    <View
                        pointerEvents={disabled ? "none" : "auto"}
                        accessibilityState={{ disabled, busy: disabled }}
                        style={disabled && styles.disabled}>
                        <ColorPicker
                            value={validHex ? hexColor : "#000000"}
                            onCompleteJS={(color: ColorFormatsObject) => changeValue(color.hex)}
                            sliderThickness={32}
                            thumbSize={32}
                            thumbShape="circle"
                            thumbAnimationDuration={100}
                            adaptSpectrum
                            boundedThumb
                            style={styles.colorField}>
                            <View style={styles.colorChannel}>
                                <Text style={[styles.label, { color: colors.authForeground }]}>
                                    Red
                                </Text>
                                <RedSlider style={styles.colorSlider} />
                            </View>
                            <View style={styles.colorChannel}>
                                <Text style={[styles.label, { color: colors.authForeground }]}>
                                    Green
                                </Text>
                                <GreenSlider style={styles.colorSlider} />
                            </View>
                            <View style={styles.colorChannel}>
                                <Text style={[styles.label, { color: colors.authForeground }]}>
                                    Blue
                                </Text>
                                <BlueSlider style={styles.colorSlider} />
                            </View>
                        </ColorPicker>
                    </View>
                )}
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

    return <Text style={[styles.support, { color: colors.error }]}>{valueError}</Text>;
};

export default ButtonForm;

const styles = StyleSheet.create({
    field: { gap: 6 },
    label: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
    support: { fontSize: 14, lineHeight: 20 },
    colorField: { gap: 24 },
    colorValue: { flexDirection: "row", alignItems: "center", gap: 12 },
    colorLabel: { flex: 1, gap: 4 },
    swatch: { width: 48, height: 48, borderWidth: 1, borderRadius: 8 },
    colorChannel: { gap: 8 },
    colorSlider: { borderRadius: 8 },
    disabled: { opacity: 0.55 },
});
