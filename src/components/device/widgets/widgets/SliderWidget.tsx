import Slider from "@/components/common/Slider";
import { useTheme } from "@/contexts/ThemeProvider";
import { widgetRemovalAccessibility } from "../widgetAccessibility";
import type { CalculatedWidget } from "../../dashboards/DashboardView";
import React, { FC, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

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
            accessibilityRole="adjustable"
            accessibilityLabel={`${widget.name}, ${displayValue}`}
            accessibilityState={{ disabled: isDisabled, busy: pending }}
            {...widgetRemovalAccessibility(operations)}
            onLongPress={operations}
            disabled={isDisabled}
            style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.name, { color: colors.authForeground }]}>{widget.name}</Text>
                <View style={styles.value} accessibilityLiveRegion="polite">
                    {pending && <ActivityIndicator size="small" color={colors.authForeground} />}
                    <Text style={[styles.readout, { color: colors.authForeground }]}>
                        {pending ? "Sending…" : String(displayValue)}
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
    container: { width: "100%", height: "100%", justifyContent: "center", paddingHorizontal: 3 },
    header: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
        paddingVertical: 6,
    },
    name: { flex: 1, fontSize: 16, lineHeight: 24 },
    value: { flexDirection: "row", alignItems: "center", gap: 8 },
    readout: { fontSize: 14, lineHeight: 20, fontWeight: "600", fontVariant: ["tabular-nums"] },
});
