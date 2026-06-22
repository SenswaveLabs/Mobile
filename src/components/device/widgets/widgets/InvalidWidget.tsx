import React from "react";
import { Pressable } from "react-native";
import Text from "@/components/common/Text";
import { CalculatedWidget } from "../../dashboards/DashboardView";
import { useTheme } from "@/contexts/ThemeProvider";
import { shadowStyles } from "@/styles/shadowStyles";

interface InvalidWidgetProps {
    widget: CalculatedWidget;
    operations: (id: string) => void;
    disabled: boolean;
}

export default function InvalidWidget({ operations, widget, disabled }: InvalidWidgetProps) {
    const theme = useTheme();

    return (
        <Pressable
            style={{
                backgroundColor: theme.current.colors.primary,
                borderRadius: 8,
                width: "100%",
                height: "100%",
                justifyContent: "center",
                alignItems: "center",
                ...shadowStyles.default,
            }}
            disabled={disabled}
            onPress={() => operations(widget.id)}>
            <Text size={"medium"} color={"error"} style={{ textAlign: "center" }}>
                Invalid Widget
            </Text>
        </Pressable>
    );
}
