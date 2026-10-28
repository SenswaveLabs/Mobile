import { Switch } from "@/components/common/Switch";
import { useTheme } from "@/contexts/ThemeProvider";
import { widgetRemovalAccessibility } from "../widgetAccessibility";
import type { CalculatedWidget } from "../../dashboards/DashboardView";
import React, { FC, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { widgetStyles } from "./widgetStyles";

interface SwitchWidgetProps {
    operations?: () => void;
    widget: CalculatedWidget;
    disabled: boolean;
    pending: boolean;
    onAction: (value: string | number | boolean) => Promise<boolean>;
}

const SwitchWidget: FC<SwitchWidgetProps> = ({
    operations,
    widget,
    disabled,
    pending,
    onAction,
}) => {
    const { colors } = useTheme().current;
    const [isChecked, setIsChecked] = useState(widget.configuration?.runtime?.value ?? false);
    const [narrow, setNarrow] = useState(false);
    const isDisabled = disabled || pending;

    const handleToggle = async () => {
        if (isDisabled) return;
        const nextValue = !isChecked;
        if (await onAction(nextValue)) setIsChecked(nextValue);
    };

    useEffect(() => {
        setIsChecked(widget.configuration?.runtime?.value ?? false);
    }, [widget.id, widget.configuration?.runtime?.value]);

    return (
        <Pressable
            onLayout={({ nativeEvent }) => setNarrow(nativeEvent.layout.width < 80)}
            accessibilityRole="switch"
            accessibilityLabel={widget.name}
            accessibilityState={{ checked: isChecked, disabled: isDisabled, busy: pending }}
            {...widgetRemovalAccessibility(operations)}
            style={[
                widgetStyles.tile,
                narrow && widgetStyles.compactInsets,
                {
                    backgroundColor: colors.deviceTileSurface,
                    borderColor: colors.deviceTileBorder,
                },
            ]}
            disabled={isDisabled}
            onPress={() => void handleToggle()}
            onLongPress={operations}>
            <Text
                numberOfLines={2}
                style={[
                    widgetStyles.label,
                    { color: disabled ? colors.authMuted : colors.authForeground },
                ]}>
                {widget.name}
            </Text>
            <View
                pointerEvents="none"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={styles.indicator}>
                {pending ? (
                    <ActivityIndicator size="small" color={colors.authForeground} />
                ) : (
                    <Switch
                        value={{ value: isChecked }}
                        onPress={() => void handleToggle()}
                        orientation="horizontal"
                        disabled={isDisabled}
                        style={styles.switch}
                        trackColors={{ on: colors.authPrimary, off: colors.authBorder }}
                        thumbColor={isChecked ? colors.authOnPrimary : colors.authFieldBackground}
                    />
                )}
            </View>
        </Pressable>
    );
};

export default SwitchWidget;

const styles = StyleSheet.create({
    indicator: { width: 48, height: 24, alignItems: "center", justifyContent: "center" },
    switch: { width: 40, height: 24, padding: 3 },
});
