import React, { FC, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import InputNumber from "@/components/common/InputNumber";
import { OperationType } from "@/types/DeviceTypes";
import { useWidgetDetails } from "@/contexts/custom/WidgetDetailsProvider";
import { useTheme } from "@/contexts/ThemeProvider";

const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;

interface Props {
    edit?: boolean;
    disabled?: boolean;
}

export const SliderOperationTypes: OperationType[] = ["Number", "Integer"];

const SliderForm: FC<Props> = ({ edit = false, disabled = false }) => {
    const widgetDetails = useWidgetDetails();
    const { colors } = useTheme().current;
    const { min, max } = widgetDetails.operation?.configuration ?? {};
    const integer = widgetDetails.operation?.type === "Integer";
    const span = max - min;
    const rangeValid =
        (integer || widgetDetails.operation?.type === "Number") &&
        typeof min === "number" &&
        typeof max === "number" &&
        Number.isFinite(min) &&
        Number.isFinite(max) &&
        Number.isFinite(span) &&
        min < max &&
        (integer
            ? Number.isInteger(min) &&
              Number.isInteger(max) &&
              min !== INT32_MIN &&
              max !== INT32_MAX
            : min !== -Number.MAX_VALUE && max !== Number.MAX_VALUE);
    const [step, setStep] = useState<number | undefined>(widgetDetails.widget?.configuration?.step);
    const [stepError, setStepError] = useState("");
    const stepRef = useRef(step);
    const lockedRef = useRef(edit || disabled);
    lockedRef.current = edit || disabled;
    const detailsRef = useRef(widgetDetails);
    detailsRef.current = widgetDetails;

    const validate = () => {
        const value = stepRef.current;
        let error = "";
        if (!rangeValid)
            error = "Set a finite minimum and maximum in the operation before using a Slider.";
        else if (
            typeof value !== "number" ||
            !Number.isFinite(value) ||
            value < (integer ? 1 : 0.0001) ||
            value > span ||
            (integer && !Number.isInteger(value))
        ) {
            error = integer
                ? `Enter a whole step between 1 and ${span}.`
                : `Enter a step between 0.0001 and ${span}.`;
        } else if (span / value > 10000) {
            error = `Use a step of at least ${integer ? Math.ceil(span / 10000) : Math.max(0.0001, span / 10000)} to keep the Slider within 10,000 steps.`;
        }
        setStepError(error);
        return error === "";
    };
    const validateRef = useRef(validate);
    validateRef.current = validate;

    useEffect(() => {
        const details = detailsRef.current;
        stepRef.current = details.widget?.configuration?.step;
        setStep(stepRef.current);
        details.setAdditionalValidation(() => validateRef.current());
        details.validateDto();
        return () => details.setAdditionalValidation(null);
    }, [widgetDetails.operation?.id, widgetDetails.operation?.type, widgetDetails.widget?.id]);

    useEffect(() => {
        detailsRef.current.validateDto();
    }, [min, max]);

    const onStepChange = (value: number | undefined) => {
        if (lockedRef.current) return;
        stepRef.current = value;
        setStep(value);
        const details = detailsRef.current;
        details.setWidget({
            ...details.widget!,
            configuration: { ...details.widget?.configuration, step: value },
        });
        details.validateDto();
    };

    return (
        <View style={styles.fields}>
            <View style={styles.range}>
                <Text style={[styles.label, { color: colors.authForeground }]}>
                    Operation range
                </Text>
                <Text
                    style={[
                        styles.support,
                        { color: rangeValid ? colors.authMuted : colors.error },
                    ]}
                    accessibilityLiveRegion="polite">
                    {rangeValid
                        ? `${min} to ${max}. The range is set in the operation configuration.`
                        : "Set a finite minimum and maximum in the operation before using a Slider."}
                </Text>
            </View>
            <InputNumber
                variant="auth"
                title="Slider Step"
                value={step}
                onChange={onStepChange}
                integer={integer}
                min={integer ? 1 : 0.0001}
                max={rangeValid ? span : undefined}
                error={rangeValid ? stepError : ""}
                required
                disabled={disabled}
                editable={!edit && rangeValid}
                placeholder={integer ? "For example, 1" : "For example, 0.1"}
            />
        </View>
    );
};

export default SliderForm;

const styles = StyleSheet.create({
    fields: { gap: 24 },
    range: { gap: 8 },
    label: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
    support: { fontSize: 14, lineHeight: 20 },
});
