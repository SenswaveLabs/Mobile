import React, { FC, ReactNode, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { CircleAlert } from "lucide-react-native";
import Slider from "@/components/common/Slider";
import BottomSheetSelect from "@/components/common/BottomSheetSelect";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Device } from "@/contexts/custom/DeviceListProvider";
import { useDeviceTileAction } from "@/hooks/useDeviceTileAction";
import { useTheme } from "@/contexts/ThemeProvider";
import { DeviceLayout } from "@/hooks/useDeviceLayout";

interface ControlDeviceTileProps {
    name: string;
    tile: Device["tile"];
    action: ReturnType<typeof useDeviceTileAction>;
    disablePress: boolean;
    inactive?: boolean;
    heading?: ReactNode;
    layout?: DeviceLayout;
}

const ControlDeviceTile: FC<ControlDeviceTileProps> = ({
    name,
    tile,
    action,
    disablePress,
    inactive = false,
    heading,
    layout = "grid",
}) => {
    const { colors } = useTheme().current;
    const [draft, setDraft] = useState<number | null>(null);
    useEffect(() => setDraft(null), [action.value]);
    const slider = tile.type === "Slider";
    const { range, step, unit = "", options } = tile.configuration ?? {};
    const choices: string[] = Array.isArray(options)
        ? options.filter((option): option is string => typeof option === "string")
        : [];
    const validChoices =
        choices.length >= 2 &&
        choices.length <= 10 &&
        choices.length === options?.length &&
        choices.every((choice) => choice.trim().length > 0) &&
        new Set(choices).size === choices.length;
    const value = draft ?? action.value;
    return (
        <View style={styles.content}>
            {slider ? (
                <>
                    <View style={styles.sliderHeader}>
                        {heading}
                        <View style={[styles.readoutRow, layout === "list" && styles.listReadout]}>
                            <View style={styles.progress} accessibilityLiveRegion="polite">
                                {action.feedback === "spinner" && (
                                    <ActivityIndicator
                                        size="small"
                                        color={colors.authForeground}
                                        accessible
                                        accessibilityRole="progressbar"
                                        accessibilityLabel={`Saving change to ${name}`}
                                    />
                                )}
                            </View>
                            <Text
                                style={[
                                    styles.readout,
                                    { color: inactive ? colors.authMuted : colors.authForeground },
                                ]}>
                                {inactive || typeof value !== "number" || !Number.isFinite(value)
                                    ? `—${unit ? ` ${unit}` : ""}`
                                    : `${Number(value.toPrecision(10))}${unit}`}
                            </Text>
                        </View>
                    </View>
                    {inactive ? null : disablePress && !range ? (
                        <Text
                            style={[
                                styles.feedback,
                                styles.sliderFeedback,
                                { color: colors.authMuted },
                            ]}>
                            Select an available operation to preview this control.
                        </Text>
                    ) : (
                        <View style={[styles.slider, layout === "list" && styles.listSlider]}>
                            <Slider
                                min={range?.min}
                                max={range?.max}
                                step={step}
                                initialValue={action.value}
                                accessibilityLabel={name}
                                disabled={disablePress || action.pending}
                                onValueChange={setDraft}
                                onValueSlided={(next) => {
                                    setDraft(null);
                                    return action.send(next);
                                }}
                            />
                        </View>
                    )}
                </>
            ) : inactive ? (
                <View style={styles.unavailable}>
                    <Text style={[styles.readout, { color: colors.authMuted }]}>—</Text>
                </View>
            ) : disablePress && !validChoices ? (
                <Text style={[styles.feedback, { color: colors.authMuted }]}>
                    Select an available operation to preview this control.
                </Text>
            ) : validChoices ? (
                <BottomSheetSelect
                    variant="tile"
                    title={name}
                    value={typeof action.value === "string" ? action.value : "Choose option"}
                    options={choices.map((choice) => ({
                        label: choice,
                        selected: choice === action.value,
                        onPress: () => action.send(choice),
                    }))}
                    disabled={disablePress || action.pending}
                    busy={action.feedback === "spinner"}
                />
            ) : (
                <Text accessibilityRole="alert" style={[styles.feedback, { color: colors.error }]}>
                    Options unavailable. Check this device's operation.
                </Text>
            )}
            {!!action.error && (
                <Alert
                    icon={CircleAlert}
                    variant="destructive"
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite">
                    <AlertDescription>{action.error}</AlertDescription>
                </Alert>
            )}
        </View>
    );
};
export default ControlDeviceTile;
const styles = StyleSheet.create({
    content: { gap: 0 },
    sliderHeader: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
    slider: { minWidth: 48, paddingHorizontal: 22 },
    listSlider: { paddingLeft: 32, paddingRight: 8 },
    sliderFeedback: { paddingHorizontal: 12, paddingVertical: 12 },
    unavailable: {
        minHeight: 48,
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    readout: {
        minWidth: 0,
        flexShrink: 1,
        textAlign: "right",
        fontSize: 24,
        lineHeight: 32,
        fontWeight: "500",
        fontVariant: ["tabular-nums"],
    },
    readoutRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        gap: 8,
        paddingRight: 12,
        maxWidth: "48%",
    },
    listReadout: { paddingRight: 0 },
    progress: { width: 20, height: 20, alignItems: "center", justifyContent: "center" },
    feedback: { flexShrink: 1, fontSize: 14, lineHeight: 20 },
});
