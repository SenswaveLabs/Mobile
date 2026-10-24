import Loading from "@/components/common/Loading";
import Text from "@/components/common/Text";
import { useTheme } from "@/contexts/ThemeProvider";
import { shadowStyles } from "@/styles/shadowStyles";
import { widgetRemovalAccessibility } from "../widgetAccessibility";
import type { CalculatedWidget } from "../../dashboards/DashboardView";
import React, { FC } from "react";
import { Pressable } from "react-native";

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
    const theme = useTheme();
    const isDisabled = disabled || pending;
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={widget.name}
            accessibilityState={{ disabled: isDisabled, busy: pending }}
            {...widgetRemovalAccessibility(operations)}
            style={({ pressed }) => [
                {
                    backgroundColor: pressed
                        ? theme.current.colors.secondary
                        : theme.current.colors.primary,
                    borderRadius: 8,
                    width: "100%",
                    height: "100%",
                    justifyContent: "center",
                    alignItems: "center",
                    ...shadowStyles.default,
                },
            ]}
            disabled={isDisabled}
            onPress={() => void onAction("")}
            onLongPress={operations}>
            {pending ? (
                <Loading size={32} useBackgroundColor={false} />
            ) : (
                <Text size="medium" color="onPrimary">
                    {widget.name}
                </Text>
            )}
        </Pressable>
    );
};

export default ButtonWidget;
