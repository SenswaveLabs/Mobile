import { View, StyleSheet, Text } from "react-native";
import React, { FC, useEffect, useState } from "react";
import { LockKeyhole } from "lucide-react-native";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useLiveUpdate } from "@/contexts/domain/LiveUpdateProvider";
import { Device, useDeviceList } from "@/contexts/custom/DeviceListProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { DeviceLayout } from "@/hooks/useDeviceLayout";
import { getDeviceReadings, formatReadingValue } from "@/utils/deviceReadings";

interface DisplayDeviceTileProps {
    deviceId: string;
    tile: Device["tile"];
    inactive?: boolean;
    layout?: DeviceLayout;
}

const DisplayDeviceTile: FC<DisplayDeviceTileProps> = ({
    deviceId,
    tile,
    inactive = false,
    layout = "grid",
}) => {
    const homes = useHomes();
    const devices = useDeviceList();
    const httpClient = useHttpClient();
    const liveUpdate = useLiveUpdate();
    const { colors } = useTheme().current;
    const [reported, setReported] = useState(tile);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setReported(tile);
        setError(null);
    }, [tile]);
    useEffect(() => {
        if (!deviceId) return;
        let active = true;
        liveUpdate.addDeviceTileCallback(deviceId, async () => {
            if (!active) return;
            try {
                const result = await httpClient.get("v1/devices/" + deviceId + "/display");
                if (!result.isSuccess || !result.response) throw new Error("Device update failed");
                const response = (await result.response.json()) as Device;
                if (!active) return;
                setReported(response.tile);
                devices.updateDeviceOperation(response);
                setError(null);
            } catch {
                if (active) setError("Couldn't update these readings. Pull to refresh.");
            }
        });
        return () => {
            active = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [homes.current?.id, deviceId]);

    const readings = getDeviceReadings(reported, inactive);
    const multiple = readings.length > 1;
    const pair =
        readings.length === 2 &&
        !!readings[0].label &&
        readings[0].label === readings[1].label &&
        readings[0].unit !== readings[1].unit;
    const boolean =
        reported.configuration?.operationType === "Boolean" || typeof reported.value === "boolean";
    return (
        <View style={styles.content}>
            <View style={[styles.readings, pair && layout !== "list" && styles.pair]}>
                {readings.map((reading, index) => (
                    <View
                        key={reading.operationId ?? index}
                        style={[
                            styles.reading,
                            multiple && !pair && styles.metric,
                            layout === "list" && styles.listReading,
                        ]}>
                        {multiple && !pair && !!reading.label && (
                            <Text style={[styles.label, { color: colors.authMuted }]}>
                                {reading.label}
                            </Text>
                        )}
                        <Text
                            accessibilityLabel={formatReadingValue(reading.value, reading.unit)}
                            style={[
                                styles.value,
                                multiple && !pair && styles.metricValue,
                                pair && styles.pairValue,
                                pair && index === 1 && styles.secondaryValue,
                                boolean && !multiple && styles.booleanValue,
                                boolean &&
                                    !multiple &&
                                    layout === "list" &&
                                    styles.listBooleanValue,
                                {
                                    color:
                                        inactive || (pair && index === 1)
                                            ? colors.authMuted
                                            : colors.authForeground,
                                },
                            ]}>
                            {formatReadingValue(reading.value, "")}
                            {!!reading.unit && (
                                <Text
                                    style={[
                                        styles.unit,
                                        { color: colors.authMuted },
                                    ]}>{` ${reading.unit}`}</Text>
                            )}
                        </Text>
                    </View>
                ))}
            </View>
            {boolean && (
                <View style={[styles.lock, layout === "list" && styles.listLock]}>
                    <LockKeyhole size={13} color={colors.authMuted} accessible={false} />
                    <Text style={[styles.label, { color: colors.authMuted }]}>Read only</Text>
                </View>
            )}
            {error && (
                <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>
                    {error}
                </Text>
            )}
        </View>
    );
};
export default DisplayDeviceTile;
const styles = StyleSheet.create({
    content: { gap: 3 },
    readings: { gap: 3 },
    pair: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "baseline",
        justifyContent: "flex-end",
        columnGap: 16,
        rowGap: 3,
    },
    reading: { minWidth: 0, alignItems: "flex-end" },
    metric: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "baseline",
        justifyContent: "space-between",
        columnGap: 8,
    },
    listReading: { alignItems: "flex-end" },
    label: { flexShrink: 1, fontSize: 12, lineHeight: 18 },
    unit: { fontSize: 12, fontWeight: "400" },
    value: { fontSize: 26, lineHeight: 32, fontWeight: "500", fontVariant: ["tabular-nums"] },
    metricValue: { fontSize: 18, lineHeight: 24 },
    pairValue: { fontSize: 24, lineHeight: 30 },
    secondaryValue: { fontSize: 18, lineHeight: 26 },
    booleanValue: { fontSize: 22, lineHeight: 28 },
    listBooleanValue: { fontSize: 17, lineHeight: 24 },
    lock: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 4,
        marginTop: 1,
    },
    listLock: { justifyContent: "flex-end" },
    error: { fontSize: 14, lineHeight: 20 },
});
