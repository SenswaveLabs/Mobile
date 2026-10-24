import { useTheme } from "@/contexts/ThemeProvider";
import { widgetRemovalAccessibility } from "../widgetAccessibility";
import type { CalculatedWidget } from "../../dashboards/DashboardView";
import React, { FC } from "react";
import { Pressable, Text } from "react-native";
import { widgetStyles } from "./widgetStyles";

interface DisplayWidgetProps {
    operations?: () => void;
    widget: CalculatedWidget;
    disabled: boolean;
}

const DisplayWidget: FC<DisplayWidgetProps> = ({ operations, widget, disabled }) => {
    const { colors } = useTheme().current;
    const value = widget.configuration?.runtime?.value;
    const unit = widget.configuration?.unit;
    const readout =
        value === undefined || value === null ? "—" : `${String(value)}${unit ? ` ${unit}` : ""}`;
    return (
        <Pressable
            accessibilityRole="text"
            accessibilityLabel={`${widget.name}: ${readout}`}
            {...widgetRemovalAccessibility(operations)}
            style={[
                widgetStyles.tile,
                { gap: 4 },
                {
                    backgroundColor: colors.deviceTileSurface,
                    borderColor: colors.deviceTileBorder,
                },
            ]}
            disabled={disabled}
            onLongPress={operations}>
            <Text numberOfLines={2} style={[widgetStyles.label, { color: colors.authMuted }]}>
                {widget.name}
            </Text>
            <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={[widgetStyles.readout, { color: colors.authForeground }]}>
                {readout}
            </Text>
        </Pressable>
    );
};

export default DisplayWidget;
