import React, { FC } from "react";
import { Pressable, Text } from "react-native";
import { CalculatedWidget } from "../../dashboards/DashboardView";
import { useTheme } from "@/contexts/ThemeProvider";
import { widgetRemovalAccessibility } from "../widgetAccessibility";
import { widgetStyles } from "./widgetStyles";

interface InvalidWidgetProps {
    widget: CalculatedWidget;
    operations?: () => void;
    disabled: boolean;
}

const InvalidWidget: FC<InvalidWidgetProps> = ({ operations, widget, disabled }) => {
    const { colors } = useTheme().current;

    return (
        <Pressable
            accessibilityRole={operations ? "button" : "text"}
            accessibilityLabel={`${widget.name || "Invalid widget"}: unavailable`}
            accessibilityState={{ disabled: disabled || !operations }}
            {...widgetRemovalAccessibility(operations)}
            style={[
                widgetStyles.tile,
                { gap: 4 },
                { backgroundColor: colors.deviceTileSurface, borderColor: colors.deviceTileBorder },
            ]}
            disabled={disabled || !operations}
            onLongPress={operations}>
            <Text numberOfLines={1} style={[widgetStyles.label, { color: colors.authForeground }]}>
                {widget.name}
            </Text>
            <Text numberOfLines={2} style={[widgetStyles.support, { color: colors.error }]}>
                Widget unavailable
            </Text>
        </Pressable>
    );
};

export default InvalidWidget;
