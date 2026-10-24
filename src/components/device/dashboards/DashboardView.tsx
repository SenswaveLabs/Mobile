import React, { FC } from "react";
import { StyleSheet, View } from "react-native";
import { CircleAlert } from "lucide-react-native";
import Button from "@/components/common/Button";
import Loading from "@/components/common/Loading";
import Text from "@/components/common/Text";
import { Alert, AlertDescription } from "@/components/ui/alert";
import GridDashboardView from "./Grid/GridDashboardView";
import { useDevice } from "@/contexts/custom/DeviceProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import type { WidgetType } from "@/types/DeviceTypes";

export type DashboardDto = {
    id: string;
    name: string;
    icon: string;
    type: "grid";
    configuration: any;
};

export type CalculatedWidget = {
    id: string;
    name: string;
    type: WidgetType;
    configuration: any;
    updatedAtUtc: string;
    createdAtUtc: string;
};

export type PositionedWidget = {
    widgetId: string;
    row: number;
    rowSpan: number;
    column: number;
    columnSpan: number;
};

export type GridDashboardConfiguration = {
    columns: number;
    rows: number;
    calculatedWidgets: CalculatedWidget[];
    positionedWidgets: PositionedWidget[];
};

export interface DashboardViewProps {
    deviceId: string;
    dashboardId: string;
    canManage: boolean;
}

const DashboardView: FC<DashboardViewProps> = ({ deviceId, dashboardId, canManage }) => {
    const device = useDevice();
    const { colors } = useTheme().current;
    const matchingSelection =
        device.deviceId === deviceId && device.currentDashboardId === dashboardId;
    const currentDashboard = matchingSelection ? device.currentDashboard : undefined;

    if (device.loading && !currentDashboard) return <Loading activityColor="textOnBackground" />;

    if (!currentDashboard) {
        return (
            <View style={styles.recovery}>
                <Alert
                    icon={CircleAlert}
                    variant="destructive"
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite">
                    <AlertDescription>
                        {device.loadError ?? "Couldn't load this dashboard. Try again."}
                    </AlertDescription>
                </Alert>
                <Button
                    name="Retry"
                    type="auth"
                    loading={device.loading}
                    disabled={device.loading}
                    onPress={() => void device.refresh(false)}
                />
            </View>
        );
    }

    return (
        <View style={device.loadError ? styles.withError : styles.container}>
            <View>
                {device.loadError ? (
                    <>
                        <Alert
                            icon={CircleAlert}
                            compact
                            variant="destructive"
                            accessibilityRole="alert"
                            accessibilityLiveRegion="polite">
                            <AlertDescription compact>{device.loadError}</AlertDescription>
                        </Alert>
                        <Button
                            name="Retry"
                            type="brand-ghost"
                            loading={device.loading}
                            disabled={device.loading}
                            onPress={() => void device.refresh(false)}
                        />
                    </>
                ) : null}
            </View>
            {currentDashboard.type === "grid" ? (
                <GridDashboardView
                    deviceId={deviceId}
                    dashboardId={dashboardId}
                    canManage={canManage}
                />
            ) : (
                <View style={styles.unsupported}>
                    <Text
                        size="medium"
                        color="onBackground"
                        style={{ color: colors.authForeground }}>
                        Dashboard type not supported. {currentDashboard.type}
                    </Text>
                </View>
            )}
        </View>
    );
};

export default DashboardView;

const styles = StyleSheet.create({
    container: { flex: 1 },
    recovery: { flex: 1, justifyContent: "center", padding: 16, gap: 16 },
    withError: { flex: 1, minHeight: 0, gap: 8 },
    unsupported: { flex: 1, justifyContent: "center", padding: 16 },
});
