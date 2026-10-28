import React, { FC, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import ColorPickerField from "@/components/common/ColorPickerField";
import { useTheme } from "@/contexts/ThemeProvider";
import { widgetRemovalAccessibility } from "../widgetAccessibility";
import type { CalculatedWidget } from "../../dashboards/DashboardView";
import { widgetStyles } from "./widgetStyles";

interface ColorWidgetProps {
    operations?: () => void;
    widget: CalculatedWidget;
    disabled: boolean;
    pending: boolean;
    onAction: (value: string | number | boolean) => Promise<boolean>;
    error?: string;
}

const ColorWidget: FC<ColorWidgetProps> = ({
    widget,
    operations,
    disabled,
    pending,
    onAction,
    error,
}) => {
    const { colors } = useTheme().current;
    const reported = widget.configuration?.runtime?.value;
    const reportedColor = typeof reported === "string" ? reported : "#000000";
    const [color, setColor] = useState(reportedColor);
    const current = useRef({ id: widget.id, disabled, pending });
    current.current = { id: widget.id, disabled, pending };
    const sending = useRef(false);
    useEffect(() => {
        setColor(reportedColor);
    }, [widget.id, reportedColor]);
    const confirm = async (hex: string) => {
        const id = widget.id;
        if (
            current.current.id !== id ||
            current.current.disabled ||
            current.current.pending ||
            sending.current
        )
            return false;
        sending.current = true;
        try {
            const accepted = await onAction(hex);
            if (!accepted || current.current.id !== id || current.current.disabled) return false;
            setColor(hex);
            return true;
        } finally {
            sending.current = false;
        }
    };
    return (
        <View
            style={[
                widgetStyles.tile,
                styles.container,
                { backgroundColor: colors.deviceTileSurface, borderColor: colors.deviceTileBorder },
            ]}>
            <Text
                numberOfLines={1}
                style={[
                    widgetStyles.label,
                    { color: disabled ? colors.authMuted : colors.authForeground },
                ]}>
                {widget.name}
            </Text>
            <ColorPickerField
                title={widget.name}
                variant="tile"
                value={color}
                onConfirm={confirm}
                disabled={disabled}
                pending={pending}
                error={error}
                triggerProps={{
                    onLongPress: operations,
                    ...widgetRemovalAccessibility(operations),
                }}
            />
        </View>
    );
};
export default ColorWidget;
const styles = StyleSheet.create({ container: { gap: 4, paddingHorizontal: 0 } });
