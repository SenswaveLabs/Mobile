import React from "react";
import { Pressable } from "react-native";
import Text from "@/components/common/Text";
import { CalculatedWidget } from "../../dashboards/DashboardView";
import { useTheme } from "@/contexts/ThemeProvider";
import { shadowStyles } from "@/styles/shadowStyles";
import { widgetRemovalAccessibility } from "../widgetAccessibility";

interface InvalidWidgetProps {
    widget: CalculatedWidget;
    operations?: () => void;
    disabled: boolean;
}

export default function InvalidWidget({ operations, widget, disabled }: InvalidWidgetProps) {
    const theme = useTheme();

    return (
        <Pressable
            accessibilityRole={operations ? "button" : "text"}
            accessibilityLabel={widget.name || "Invalid widget"}
            accessibilityState={{ disabled: disabled || !operations }}
            {...widgetRemovalAccessibility(operations)}
            style={{
                backgroundColor: theme.current.colors.primary,
                borderRadius: 8,
                width: "100%",
                height: "100%",
                justifyContent: "center",
                alignItems: "center",
                ...shadowStyles.default,
            }}
            disabled={disabled || !operations}
            onLongPress={operations}>
            <Text size={"medium"} color={"error"} style={{ textAlign: "center" }}>
                Invalid Widget
            </Text>
        </Pressable>
    );
}
