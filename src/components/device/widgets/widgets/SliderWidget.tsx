import React, { FC, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Slider from "@/components/common/Slider";
import { CalculatedWidget } from "../../dashboards/DashboardView";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useToast } from "@/contexts/ToastProvider";
import { useTheme } from "@/contexts/ThemeProvider";

interface SliderWidgetProps {
    operations: () => void;
    widget: CalculatedWidget;
    disabled: boolean;
}

const SliderWidget: FC<SliderWidgetProps> = ({ operations, widget, disabled = false }) => {
    const { min = 0, max = 100 } = widget?.configuration?.range || {};
    const { step = 1 } = widget?.configuration || {};
    const reportedValue = widget?.configuration?.runtime?.value ?? min;
    const [displayValue, setDisplayValue] = useState(reportedValue);
    const [loading, setLoading] = useState(false);
    const submitting = useRef(false);
    const httpClient = useHttpClient();
    const toast = useToast();
    const { colors } = useTheme().current;

    const handleValueChange = async (val: number) => {
        if (disabled || submitting.current) return;
        submitting.current = true;
        setLoading(true);
        try {
            const result = await httpClient.post("v1/devices/widgets/" + widget.id + "/action", {
                value: val,
            });
            if (!result.isSuccess) toast.httpError(result);
        } catch {
            toast.error("Couldn't change this value. Try again.");
        } finally {
            submitting.current = false;
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!loading) setDisplayValue(reportedValue);
    }, [reportedValue, loading]);

    return (
        <Pressable onLongPress={operations} style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.name, { color: colors.authForeground }]}>{widget.name}</Text>
                <View style={styles.value} accessibilityLiveRegion="polite">
                    {loading && <ActivityIndicator size="small" color={colors.authForeground} />}
                    <Text style={[styles.readout, { color: colors.authForeground }]}>
                        {loading ? "Sending…" : String(displayValue)}
                    </Text>
                </View>
            </View>
            <Slider
                min={min}
                max={max}
                step={step}
                initialValue={reportedValue}
                onValueSlided={handleValueChange}
                onValueChange={setDisplayValue}
                accessibilityLabel={widget.name}
                disabled={disabled || loading}
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
