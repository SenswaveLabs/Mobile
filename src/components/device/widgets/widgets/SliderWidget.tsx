import Slider from "@/components/common/Slider";
import { useTheme } from "@/contexts/ThemeProvider";
import { widgetRemovalAccessibility } from "../widgetAccessibility";
import type { CalculatedWidget } from "../../dashboards/DashboardView";
import React, { FC, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { widgetStyles } from "./widgetStyles";

interface SliderWidgetProps {
    operations?: () => void;
    widget: CalculatedWidget;
    disabled: boolean;
    pending: boolean;
    onAction: (value: string | number | boolean) => Promise<boolean>;
}

const SliderWidget: FC<SliderWidgetProps> = ({
    operations,
    widget,
    disabled,
    pending,
    onAction,
}) => {
    const { min = 0, max = 100 } = widget.configuration?.range || {};
    const { step = 1 } = widget.configuration || {};
    const reportedValue = widget.configuration?.runtime?.value ?? min;
    const [displayValue, setDisplayValue] = useState(reportedValue);
    const [committedValue, setCommittedValue] = useState(reportedValue);
    const [compact, setCompact] = useState(false);
    const committedValueRef = useRef(reportedValue);
    const { colors } = useTheme().current;
    const isDisabled = disabled || pending;

    const handleValueChange = async (value: number) => {
        if (isDisabled) return;
        const accepted = await onAction(value);
        if (accepted) {
            committedValueRef.current = value;
            setCommittedValue(value);
            setDisplayValue(value);
        } else {
            setDisplayValue(committedValueRef.current);
        }
    };

    useEffect(() => {
        committedValueRef.current = reportedValue;
        setDisplayValue(reportedValue);
        setCommittedValue(reportedValue);
    }, [widget.id, reportedValue]);

    return (
        <Pressable
            onLayout={({ nativeEvent }) => setCompact(nativeEvent.layout.width < 140)}
            accessibilityRole="adjustable"
            accessibilityLabel={`${widget.name}, ${displayValue}`}
            accessibilityState={{ disabled: isDisabled, busy: pending }}
            {...widgetRemovalAccessibility(operations)}
            onLongPress={operations}
            disabled={isDisabled}
            style={[
                widgetStyles.tile,
                styles.container,
                compact && widgetStyles.compactInsets,
                { backgroundColor: colors.deviceTileSurface, borderColor: colors.deviceTileBorder },
            ]}>
            <View style={[styles.header, compact && styles.compactHeader]}>
                <Text
                    numberOfLines={1}
                    style={[
                        styles.name,
                        compact && styles.compactName,
                        { color: colors.authForeground },
                    ]}>
                    {widget.name}
                </Text>
                <View style={styles.value} accessibilityLiveRegion="polite">
                    {pending && <ActivityIndicator size="small" color={colors.authForeground} />}
                    <Text style={[styles.readout, { color: colors.authForeground }]}>
                        {String(displayValue)}
                    </Text>
                </View>
            </View>
            <Slider
                min={min}
                max={max}
                step={step}
                initialValue={committedValue}
                value={displayValue}
                onValueSlided={handleValueChange}
                onValueChange={setDisplayValue}
                accessibilityLabel={widget.name}
                disabled={isDisabled}
            />
        </Pressable>
    );
};

export default SliderWidget;

const styles = StyleSheet.create({
    container: { paddingVertical: 0, gap: 0 },
    header: {
        width: "100%",
        minWidth: 0,
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
    },
    name: { flex: 1, minWidth: 0, fontSize: 14, lineHeight: 20, fontWeight: "600" },
    compactHeader: { flexDirection: "column", gap: 2 },
    compactName: { flex: 0, width: "100%", textAlign: "center" },
    value: { flexDirection: "row", alignItems: "center", gap: 8 },
    readout: { fontSize: 14, lineHeight: 20, fontWeight: "600", fontVariant: ["tabular-nums"] },
});
