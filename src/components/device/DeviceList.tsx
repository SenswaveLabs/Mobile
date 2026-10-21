import React, { FC, ReactElement } from "react";
import DeviceTile from "./tile/DeviceTile";
import Button from "@/components/common/Button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    ActivityIndicator,
    FlatList,
    View,
    Text,
    StyleSheet,
    RefreshControl,
    useWindowDimensions,
} from "react-native";
import { Device, useDeviceList } from "@/contexts/custom/DeviceListProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { CircleAlert } from "lucide-react-native";
import { useRouter } from "expo-router";
import { DeviceLayout } from "@/hooks/useDeviceLayout";

interface DeviceListProps {
    header: ReactElement;
    footer: ReactElement;
    layout?: DeviceLayout;
}

const DeviceList: FC<DeviceListProps> = ({ header, footer, layout = "grid" }) => {
    const devices = useDeviceList();
    const router = useRouter();
    const home = useHomes().current;
    const { colors } = useTheme().current;
    const { width, fontScale } = useWindowDimensions();
    const columns =
        layout === "list" || width < 360 || fontScale >= 1.25 ? 1 : width >= 840 ? 3 : 2;
    const itemWidth = (Math.min(width, 960) - 32 - 8 * (columns - 1)) / columns;
    const filtered = devices.filter !== "all";
    const canManage = home?.isOwner || home?.canManage;
    const rows: Device[][] = [];
    let row: Device[] = [];
    for (const device of devices.filteredDevices) {
        if (device.tile.type === "Slider") {
            if (row.length) rows.push(row);
            rows.push([device]);
            row = [];
        } else {
            row.push(device);
            if (row.length === columns) {
                rows.push(row);
                row = [];
            }
        }
    }
    if (row.length) rows.push(row);

    return (
        <FlatList
            key={`${layout}:${columns}`}
            style={styles.list}
            data={rows}
            renderItem={({ item }) => (
                <View style={[styles.row, layout === "list" && styles.listRow]}>
                    {item.map((device) => (
                        <View
                            key={device.id}
                            style={[
                                {
                                    width:
                                        device.tile.type === "Slider"
                                            ? Math.min(width, 960) - 32
                                            : itemWidth,
                                },
                            ]}>
                            <DeviceTile
                                device={device}
                                layout={layout}
                                last={
                                    device.id ===
                                    devices.filteredDevices[devices.filteredDevices.length - 1]?.id
                                }
                            />
                        </View>
                    ))}
                </View>
            )}
            keyExtractor={(item) => item.map((device) => device.id).join(":")}
            numColumns={1}
            contentContainerStyle={styles.content}
            ListHeaderComponent={
                <View>
                    {header}
                    {devices.error && (
                        <View style={styles.feedback}>
                            <Alert icon={CircleAlert} variant="destructive">
                                <AlertDescription>{devices.error}</AlertDescription>
                            </Alert>
                            <Button
                                name="Retry"
                                type="brand-outline"
                                loading={devices.loading}
                                onPress={() => {
                                    void devices.refresh();
                                }}
                            />
                        </View>
                    )}
                </View>
            }
            ListFooterComponent={footer}
            ListEmptyComponent={
                devices.error ? null : devices.loading ? (
                    <View style={styles.empty} accessibilityLiveRegion="polite">
                        <ActivityIndicator color={colors.authForeground} />
                        <Text style={[styles.helper, { color: colors.authMuted }]}>
                            Loading devices…
                        </Text>
                    </View>
                ) : (
                    <View style={styles.empty}>
                        <Text
                            accessibilityRole="header"
                            style={[styles.emptyTitle, { color: colors.authForeground }]}>
                            {filtered ? "No devices in this room" : "No devices yet"}
                        </Text>
                        <Text style={[styles.helper, { color: colors.authMuted }]}>
                            {filtered
                                ? "Choose another room or view all devices."
                                : !home?.dataSource?.id
                                  ? "Connect a data source before adding devices."
                                  : canManage
                                    ? "Add your first device to start controlling this home."
                                    : "Devices added by a manager will appear here."}
                        </Text>
                        {filtered && (
                            <Button
                                name="View all devices"
                                type="brand-outline"
                                loading={false}
                                onPress={() => devices.setFilter("all")}
                            />
                        )}
                        {!filtered && canManage && home?.dataSource?.id && (
                            <Button
                                name="Add device"
                                type="auth"
                                loading={false}
                                onPress={() => router.navigate("device/add")}
                            />
                        )}
                    </View>
                )
            }
            refreshControl={
                <RefreshControl
                    refreshing={devices.loading}
                    onRefresh={() => {
                        void devices.refresh();
                    }}
                    tintColor={colors.authForeground}
                />
            }
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={false}
        />
    );
};
export default DeviceList;
const styles = StyleSheet.create({
    list: { flex: 1, width: "100%", maxWidth: 960, alignSelf: "center" },
    content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, flexGrow: 1 },
    row: { flexDirection: "row", gap: 8, marginBottom: 8 },
    listRow: { marginBottom: 0 },
    feedback: { gap: 12, marginBottom: 20 },
    empty: { minHeight: 180, gap: 12, justifyContent: "center", paddingVertical: 24 },
    emptyTitle: { fontSize: 20, lineHeight: 28, fontWeight: "600" },
    helper: { fontSize: 14, lineHeight: 20 },
});
