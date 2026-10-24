import BottomSheetSelect from "@/components/common/BottomSheetSelect";
import Button from "@/components/common/Button";
import Icon from "@/components/common/Icon";
import Loading from "@/components/common/Loading";
import SectionHeaderAction from "@/components/common/SectionHeaderAction";
import Text from "@/components/common/Text";
import DashboardView from "@/components/device/dashboards/DashboardView";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDevice } from "@/contexts/custom/DeviceProvider";
import { useDeviceList } from "@/contexts/custom/DeviceListProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CircleAlert } from "lucide-react-native";
import React, { FC, ReactNode, useEffect, useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";

const firstRouteValue = (value?: string | string[]) => {
    const first = Array.isArray(value) ? value[0] : value;
    return typeof first === "string" && first.trim().length > 0 ? first : undefined;
};

const Device: FC = () => {
    const { deviceId: deviceParam } = useLocalSearchParams<{ deviceId?: string | string[] }>();
    const deviceId = firstRouteValue(deviceParam);
    const dashboards = useDevice();
    const deviceList = useDeviceList();
    const home = useHomes();
    const router = useRouter();
    const { colors } = useTheme().current;
    const [refreshing, setRefreshing] = useState(false);
    const canManage = home.current?.isOwner === true || home.current?.canManage === true;
    const canManageRef = useRef(canManage);
    canManageRef.current = canManage;

    useEffect(() => {
        dashboards.setDeviceId(deviceId ?? "");
        // Bind to route identity, including when Expo reuses this screen.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deviceId]);

    const currentDevice = deviceList.devices.find((device) => device.id === deviceId);
    const selected = dashboards.dashboards.find(
        (dashboard) => dashboard.id === dashboards.currentDashboardId,
    );
    const selectorSelection = selected ?? dashboards.dashboards[0];
    const screenMatchesDevice = Boolean(deviceId) && dashboards.deviceId === deviceId;
    const hasLoadedSelection =
        screenMatchesDevice &&
        Boolean(selected) &&
        selected?.id === dashboards.currentDashboardId &&
        Boolean(dashboards.currentDashboard);

    const refresh = async () => {
        if (!deviceId || dashboards.deviceId !== deviceId) return;
        setRefreshing(true);
        try {
            await dashboards.refresh(false);
        } catch {
            // DeviceProvider keeps an inline error and settles its loading state.
        } finally {
            setRefreshing(false);
        }
    };

    const showFallback = (title: string, message: string, action?: ReactNode) => (
        <ScrollView
            contentContainerStyle={styles.fallbackScroll}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
            <View style={styles.fallback}>
                <Text size="large" color="onBackground" bold style={styles.fallbackTitle}>
                    {title}
                </Text>
                <Text size="medium" color="onBackground" style={styles.fallbackMessage}>
                    {message}
                </Text>
                {action}
            </View>
        </ScrollView>
    );

    const addDashboard = () => {
        if (!canManageRef.current || !deviceId || home.loading) return;
        router.push({ pathname: "device/dashboard/add", params: { deviceId } });
    };

    const openDeviceDetails = () => {
        if (!canManageRef.current || !deviceId || home.loading) return;
        router.push({ pathname: "device/details", params: { deviceId } });
    };

    const openDashboardDetails = () => {
        if (!canManageRef.current || !deviceId || !selected || home.loading) return;
        router.push({
            pathname: "device/dashboard/details",
            params: { deviceId, dashboardId: selected.id },
        });
    };

    if (!deviceId)
        return showFallback("Device not found", "Return to your home and choose a device.");
    if (home.loading || !screenMatchesDevice) return <Loading />;

    const managerActions = canManage ? (
        <View style={styles.managementActions}>
            <Button
                name="Device details"
                type="brand-outline"
                loading={false}
                onPress={openDeviceDetails}
                style={styles.secondaryAction}
            />
            {selected && (
                <Button
                    name="Dashboard details"
                    type="brand-outline"
                    loading={false}
                    onPress={openDashboardDetails}
                    style={styles.secondaryAction}
                />
            )}
        </View>
    ) : null;

    const dashboardContent = () => {
        if (currentDevice?.presence?.value === false)
            return showFallback(
                "Device offline.",
                "The live dashboard is unavailable until this device comes back online.",
            );
        if (dashboards.loadError && !hasLoadedSelection)
            return (
                <ScrollView
                    contentContainerStyle={styles.fallbackScroll}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
                    <View style={styles.fallback}>
                        <Alert
                            icon={CircleAlert}
                            variant="destructive"
                            accessibilityRole="alert"
                            accessibilityLiveRegion="polite">
                            <AlertDescription>{dashboards.loadError}</AlertDescription>
                        </Alert>
                        <Button
                            name="Retry"
                            type="auth"
                            loading={dashboards.loading || refreshing}
                            disabled={dashboards.loading || refreshing}
                            onPress={refresh}
                            style={styles.retryButton}
                        />
                    </View>
                </ScrollView>
            );
        if (dashboards.loading && !hasLoadedSelection) return <Loading />;
        if (dashboards.dashboards.length === 0)
            return showFallback(
                "No dashboards yet.",
                canManage
                    ? "Add a dashboard to organize this device's controls."
                    : "Ask a home manager to add a dashboard.",
                canManage ? (
                    <Button
                        name="Create dashboard"
                        type="auth"
                        loading={false}
                        onPress={addDashboard}
                        style={styles.retryButton}
                    />
                ) : undefined,
            );
        if (!hasLoadedSelection) return <Loading />;
        return (
            <DashboardView
                deviceId={deviceId}
                dashboardId={dashboards.currentDashboardId}
                canManage={canManage}
            />
        );
    };

    return (
        <View style={[styles.screen, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text accessibilityRole="header" size="large" color="onBackground" bold>
                    {currentDevice?.name || "Device dashboard"}
                </Text>
                <View style={styles.sectionHeader}>
                    <Text accessibilityRole="header" size="medium" color="onBackground" bold>
                        Dashboards
                    </Text>
                    {canManage && (
                        <SectionHeaderAction
                            label="Add"
                            accessibilityLabel="Add dashboard"
                            icon={<Icon icon="add-outline" size={20} color="complementary" />}
                            disabled={home.loading}
                            onPress={addDashboard}
                        />
                    )}
                </View>
                {dashboards.dashboards.length > 0 && (
                    <BottomSheetSelect
                        title="Dashboard"
                        sheetTitle="Choose dashboard"
                        value={selectorSelection?.name ?? "Choose dashboard"}
                        options={dashboards.dashboards.map((dashboard) => ({
                            label: dashboard.name,
                            selected: dashboard.id === selectorSelection?.id,
                            onPress: () => dashboards.setCurrentDashboardId(dashboard.id),
                        }))}
                        disabled={dashboards.loading || refreshing}
                    />
                )}
                {managerActions}
            </View>
            <View style={styles.dashboardContent}>{dashboardContent()}</View>
        </View>
    );
};

export default Device;

const styles = StyleSheet.create({
    screen: { flex: 1 },
    header: { gap: 12, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
    sectionHeader: {
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    managementActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    secondaryAction: { flexGrow: 1, flexBasis: 150 },
    dashboardContent: { flex: 1, minHeight: 0 },
    fallbackScroll: { flexGrow: 1 },
    fallback: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, gap: 12 },
    fallbackTitle: { textAlign: "center" },
    fallbackMessage: { textAlign: "center" },
    retryButton: { marginTop: 4, width: "100%" },
});
