import Text from "@/components/common/Text";
import FAB, { FABAction } from "@/components/common/FAB";
import EnhancedHorizontalSelector, { Option } from "@/components/common/EnhancedHorizontalSelector";
import Loading from "@/components/common/Loading";
import DashboardView from "@/components/device/dashboards/DashboardView";
import { useDevice } from "@/contexts/custom/DeviceProvider";
import { useDeviceList } from "@/contexts/custom/DeviceListProvider";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl } from "react-native";

function Device() {
    const { deviceId } = useLocalSearchParams();
    const dashboards = useDevice();
    const deviceList = useDeviceList();
    const router = useRouter();

    const currentDevice = deviceList.devices.find((d) => d.id === deviceId);
    const isNotPresent = currentDevice?.presence?.value === false;
    const [refreshing, setRefreshing] = useState(false);
    const onRefresh = async () => {
        setRefreshing(true);
        await dashboards.refresh(false);
        setRefreshing(false);
    };
    const setCurrentDashboard = (dashboard: Option) => {
        dashboards.setCurrentDashboardId(dashboard.id);
    };

    const addDashboardClicked = () => {
        console.info("[Device Page] Add Dashboard Clicked.");
        router.push({ pathname: "device/dashboard/add", params: { deviceId: deviceId } });
    };

    const deviceDetailsClicked = () => {
        console.info("[Device Page] Device Details Clicked.");
        router.push({ pathname: "device/details", params: { deviceId: deviceId } });
    };

    useEffect(() => {
        const fetchDeviceData = async () => {
            const id = deviceId as string;
            dashboards.setDeviceId(id);
        };

        fetchDeviceData();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (dashboards.loading) {
        return <Loading />;
    }

    const baseFabActions: FABAction[] = [
        { icon: "add-circle-outline", label: "Add Dashboard", onPress: addDashboardClicked },
        { icon: "hardware-chip-outline", label: "Device Details", onPress: deviceDetailsClicked },
    ];

    if (isNotPresent) {
        return (
            <ScrollView
                contentContainerStyle={{ flex: 1 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                <View
                    style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 8,
                    }}>
                    <Text
                        size="title"
                        color="onBackground"
                        bold
                        style={{ textAlign: "center", marginBottom: 16 }}>
                        Device Offline
                    </Text>
                    <Text
                        size="medium"
                        color="onBackground"
                        style={{ textAlign: "center", opacity: 0.7 }}>
                        This device is currently not present. Dashboard is unavailable until it
                        comes back online.
                    </Text>
                </View>
                <FAB actions={baseFabActions} />
            </ScrollView>
        );
    }

    if (dashboards.dashboards.length === 0) {
        return (
            <ScrollView
                contentContainerStyle={{ flex: 1 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                <View
                    style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 8,
                    }}>
                    <Text
                        size="title"
                        color="onBackground"
                        bold
                        style={{ textAlign: "center", marginBottom: 16 }}>
                        No Dashboard
                    </Text>
                    <Text
                        size="medium"
                        color="onBackground"
                        style={{ textAlign: "center", opacity: 0.7 }}>
                        No dashboard created yet. Add one to organize and display your device data.
                    </Text>
                </View>
                <FAB actions={baseFabActions} />
            </ScrollView>
        );
    }

    const options = dashboards.dashboards.map((d) => ({ id: d.id, name: d.name }));

    return (
        <View style={styles.container}>
            <EnhancedHorizontalSelector
                options={options}
                selected={options.find((o) => o.id === dashboards.currentDashboardId)!}
                onSelect={setCurrentDashboard}
                margin={{ top: 0, left: 15, right: 15, bottom: 15 }}
            />

            <View style={{ flex: 1 }}>
                <DashboardView />
            </View>
        </View>
    );
}

export default Device;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "transparernt",
        display: "flex",
        flexDirection: "column",
    },
});
