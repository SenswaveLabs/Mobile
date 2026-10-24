import React, { FC, useEffect, useRef } from "react";
import { StyleSheet, Text } from "react-native";
import { useTheme } from "@/contexts/ThemeProvider";
import { useWidgetDetails } from "@/contexts/custom/WidgetDetailsProvider";
import { OperationType } from "@/types/DeviceTypes";

export const ColorOperationTypes: OperationType[] = ["HexColor"];
export const DisplayOperationTypes = ColorOperationTypes;

interface Props {
    edit?: boolean;
    disabled?: boolean;
}

const ColorForm: FC<Props> = () => {
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
            Opens a color picker on the dashboard. The chosen color is sent to this operation.
        </Text>
    );
};

export default ColorForm;

const styles = StyleSheet.create({ helper: { fontSize: 14, lineHeight: 20 } });
