import React, { FC, useEffect, useRef } from "react";
import { StyleSheet, Text } from "react-native";
import { useTheme } from "@/contexts/ThemeProvider";
import { useWidgetDetails } from "@/contexts/custom/WidgetDetailsProvider";
import { OperationType } from "@/types/DeviceTypes";

export const SwitchOperationTypes: OperationType[] = ["Boolean"];

interface Props {
    edit?: boolean;
    disabled?: boolean;
}

const SwitchForm: FC<Props> = () => {
    const { colors } = useTheme().current;
    const widgetDetails = useWidgetDetails();
    const detailsRef = useRef(widgetDetails);
    detailsRef.current = widgetDetails;

    useEffect(() => {
        const details = detailsRef.current;
        details.setAdditionalValidation(() => true);
        details.validateDto();
        return () => details.setAdditionalValidation(null);
    }, [widgetDetails.operation?.id, widgetDetails.widget?.id]);

    return (
        <Text style={[styles.helper, { color: colors.authMuted }]}>
            Sends True when switched on and False when switched off. No additional configuration is
            needed.
        </Text>
    );
};

export default SwitchForm;

const styles = StyleSheet.create({ helper: { fontSize: 14, lineHeight: 20 } });
