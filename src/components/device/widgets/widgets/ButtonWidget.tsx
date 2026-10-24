import { useTheme } from "@/contexts/ThemeProvider";
import { widgetRemovalAccessibility } from "../widgetAccessibility";
import type { CalculatedWidget } from "../../dashboards/DashboardView";
import React, { FC } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";
import { widgetStyles } from "./widgetStyles";

interface ButtonWidgetProps {
    operations?: () => void;
    widget: CalculatedWidget;
    disabled: boolean;
    pending: boolean;
    onAction: (value: string | number | boolean) => Promise<boolean>;
}

const ButtonWidget: FC<ButtonWidgetProps> = ({
    operations,
    widget,
    disabled,
    pending,
    onAction,
}) => {
    const { colors } = useTheme().current;
    const isDisabled = disabled || pending;
    const foreground = disabled ? colors.authMuted : colors.authOnPrimary;
    return (
        <Pressable
            cssInterop={false}
            accessibilityRole="button"
            accessibilityLabel={widget.name}
            accessibilityState={{ disabled: isDisabled, busy: pending }}
            {...widgetRemovalAccessibility(operations)}
            android_ripple={{ color: colors.authBorder }}
            style={[
                widgetStyles.tile,
                {
                    backgroundColor: disabled ? colors.deviceTileSubtle : colors.authPrimary,
                    borderColor: disabled ? colors.deviceTileBorder : colors.authPrimary,
                },
            ]}
            disabled={isDisabled}
            onPress={() => void onAction("")}
            onLongPress={operations}>
            {pending && <ActivityIndicator size="small" color={foreground} accessible={false} />}
            <Text numberOfLines={2} style={[widgetStyles.label, { color: foreground }]}>
                {widget.name}
            </Text>
        </Pressable>
    );
};

export default ButtonWidget;
