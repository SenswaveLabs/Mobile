import React, { FC, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import NativeSlider from "@react-native-community/slider";
import { useTheme } from "@/contexts/ThemeProvider";

// Version 5.0.1 types a web-only ref, but Android forwards the native control.
const NativeSliderControl = NativeSlider as unknown as React.ForwardRefExoticComponent<
    Omit<React.ComponentProps<typeof NativeSlider>, "ref"> & React.RefAttributes<NativeSlider>
>;

interface SliderProps {
    min: number;
    max: number;
    step: number;
    initialValue: number;
    onValueSlided?: (value: number) => void;
    onValueChange?: (value: number) => void;
    accessibilityLabel?: string;
    disabled?: boolean;
}

const Slider: FC<SliderProps> = ({
    min,
    max,
    step,
    initialValue,
    onValueSlided,
    onValueChange,
    accessibilityLabel = "Value",
    disabled = false,
}) => {
    const { colors } = useTheme().current;
    // shortcut: slider 5.0.1 allocates an entry per step; revisit this cap after upgrading it.
    const validRange =
        [min, max, step, max - min].every(Number.isFinite) &&
        max > min &&
        step >= 0 &&
        step <= max - min &&
        (step === 0 || (max - min) / step <= 10000);
    const reportedValue = validRange
        ? Math.max(min, Math.min(max, Number.isFinite(initialValue) ? initialValue : min))
        : 0;
    const [value, setValue] = useState(reportedValue);
    const previousValue = useRef(reportedValue);
    const dragging = useRef(false);
    const control = useRef<NativeSlider>(null);

    useEffect(() => {
        setValue(reportedValue);
        previousValue.current = reportedValue;
        if (disabled) dragging.current = false;
    }, [reportedValue, disabled, min, max, step]);

    const commit = (next: number) => {
        if (disabled || !Number.isFinite(next)) return;
        const bounded = Math.max(min, Math.min(max, next));
        if (previousValue.current === bounded) return;
        previousValue.current = bounded;
        setValue(bounded);
        onValueSlided?.(bounded);
    };

    if (!validRange) {
        return (
            <Text accessibilityRole="alert" style={[styles.unavailable, { color: colors.error }]}>
                Slider unavailable. Check its range and step.
            </Text>
        );
    }

    return (
        <View style={styles.control}>
            {/* Android dims its native rail, so render the themed rail at full contrast. */}
            <View
                pointerEvents="none"
                style={[styles.rail, { backgroundColor: colors.authBorder }]}
            />
            <NativeSliderControl
                ref={control}
                style={styles.control}
                onLayout={() => {
                    // The dependency applies style to its wrapper, not the native SeekBar.
                    control.current?.setNativeProps({ style: { height: 48 } });
                }}
                minimumValue={min}
                maximumValue={max}
                step={step}
                value={value}
                disabled={disabled}
                accessibilityLabel={accessibilityLabel}
                accessibilityRole="adjustable"
                minimumTrackTintColor={colors.authForeground}
                maximumTrackTintColor="transparent"
                thumbTintColor={colors.authForeground}
                onSlidingStart={() => {
                    dragging.current = true;
                }}
                onValueChange={(next) => {
                    if (disabled || !Number.isFinite(next)) return;
                    onValueChange?.(next);
                    if (!dragging.current) commit(next);
                }}
                onSlidingComplete={(next) => {
                    dragging.current = false;
                    commit(next);
                }}
            />
        </View>
    );
};

export default Slider;

const styles = StyleSheet.create({
    control: { width: "100%", minWidth: 48, minHeight: 48 },
    rail: {
        position: "absolute",
        top: "50%",
        marginTop: -2,
        left: 16,
        right: 16,
        height: 4,
        borderRadius: 2,
    },
    unavailable: { minHeight: 48, fontSize: 14, lineHeight: 20 },
});
