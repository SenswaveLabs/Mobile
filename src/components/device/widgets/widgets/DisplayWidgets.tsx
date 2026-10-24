import { useTheme } from "@/contexts/ThemeProvider";
import { shadowStyles } from "@/styles/shadowStyles";
import { widgetRemovalAccessibility } from "../widgetAccessibility";
import type { CalculatedWidget } from "../../dashboards/DashboardView";
import React, { FC } from "react";
import { Pressable } from "react-native";
import Text from "@/components/common/Text";

interface DisplayWidgetProps {
    operations?: () => void;
    widget: CalculatedWidget;
    disabled: boolean;
}

const DisplayWidget: FC<DisplayWidgetProps> = ({ operations, widget, disabled }) => {
    const theme = useTheme();
    return (
        <Pressable
            accessibilityRole="text"
            accessibilityLabel={`${widget.name}: ${widget.configuration?.runtime?.value ?? "—"} ${widget.configuration?.unit ?? ""}`}
            {...widgetRemovalAccessibility(operations)}
            style={[
                {
                    backgroundColor: theme.current.colors.primary,
                    borderRadius: 8,
                    width: "100%",
                    height: "100%",
                    justifyContent: "center",
                    alignItems: "center",
                    ...shadowStyles.default,
                },
            ]}
            disabled={disabled}
            onLongPress={operations}>
            <Text size="medium" color="onPrimary">
                {widget.name}: {widget.configuration?.runtime?.value}{" "}
                {widget.configuration?.unit ?? ""}
            </Text>
        </Pressable>
    );
};

export default DisplayWidget;
