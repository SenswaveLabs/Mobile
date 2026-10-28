import React, { FC, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Input from "@/components/common/Input";
import { useWidgetDetails } from "@/contexts/custom/WidgetDetailsProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { OperationType } from "@/types/DeviceTypes";

interface Props {
    edit?: boolean;
    disabled?: boolean;
}

export const DisplayOperationTypes: OperationType[] = ["Text", "Number", "Integer"];

const DisplayForm: FC<Props> = ({ edit = false, disabled = false }) => {
    const widgetDetails = useWidgetDetails();
    const { colors } = useTheme().current;
    const [unit, setUnit] = useState<string>(widgetDetails.widget?.configuration?.unit ?? "");
    const [unitError, setUnitError] = useState("");
    const unitRef = useRef(unit);
    const lockedRef = useRef(edit || disabled);
    lockedRef.current = edit || disabled;
    const detailsRef = useRef(widgetDetails);
    detailsRef.current = widgetDetails;

    const validate = () => {
        const value = unitRef.current;
        const error =
            typeof value !== "string" || value.length > 10
                ? "Use at most 10 characters."
                : !/^([a-zA-Z0-9°µΩ‰%±+\-?℃℉]{1,10})?$/.test(value)
                  ? "Use letters, numbers or unit symbols such as °C and %."
                  : "";
        setUnitError(error);
        return error === "";
    };
    const validateRef = useRef(validate);
    validateRef.current = validate;

    useEffect(() => {
        const details = detailsRef.current;
        const value = details.widget?.configuration?.unit ?? "";
        unitRef.current = value;
        setUnit(value);
        if (!lockedRef.current && details.widget?.configuration?.unit === undefined) {
            details.setWidget({
                ...details.widget!,
                configuration: { ...details.widget?.configuration, unit: value },
            });
        }
        details.setAdditionalValidation(() => validateRef.current());
        details.validateDto();
        return () => details.setAdditionalValidation(null);
    }, [widgetDetails.operation?.id, widgetDetails.widget?.id]);

    const onUnitValueChange = (value: string) => {
        if (lockedRef.current) return;
        unitRef.current = value;
        setUnit(value);
        const details = detailsRef.current;
        details.setWidget({
            ...details.widget!,
            configuration: { ...details.widget?.configuration, unit: value },
        });
        details.validateDto();
    };

    return (
        <View style={styles.field}>
            <Input
                variant="auth"
                error={unitError}
                value={unit}
                title="Unit"
                placeholder="No unit"
                setValue={onUnitValueChange}
                editable={!edit}
                accessibilityState={{ busy: disabled }}
                autoCapitalize="none"
                autoCorrect={false}
            />
            <Text style={[styles.helper, { color: colors.authMuted }]}>
                Optional. Shown beside the reading, for example °C or %.
            </Text>
        </View>
    );
};

export default DisplayForm;

const styles = StyleSheet.create({
    field: { gap: 8 },
    helper: { fontSize: 14, lineHeight: 20 },
});
