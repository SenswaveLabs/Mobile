import React, { FC, ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { CircleAlert } from "lucide-react-native";
import Button from "@/components/common/Button";
import Loading from "@/components/common/Loading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Text } from "@/components/ui/text";
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
    header?: ReactNode;
}

const DashboardView: FC<DashboardViewProps> = ({ deviceId, dashboardId, canManage, header }) => {
    const device = useDevice();
    const { colors } = useTheme().current;
    const matchingSelection =
        device.deviceId === deviceId && device.currentDashboardId === dashboardId;
    const currentDashboard = matchingSelection ? device.currentDashboard : undefined;

    if (device.loading && !currentDashboard)
        return (
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {header}
                <Loading activityColor="textOnBackground" />
            </ScrollView>
        );

    if (!currentDashboard) {
        return (
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {header}
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
            </ScrollView>
        );
    }

    const contentHeader = (
        <View style={styles.header}>
            {header}
            {device.loadError ? (
                <View style={styles.feedback}>
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
                </View>
            ) : null}
        </View>
    );

    return (
        <View style={styles.container}>
            {currentDashboard.type === "grid" ? (
                <GridDashboardView
                    deviceId={deviceId}
                    dashboardId={dashboardId}
                    canManage={canManage}
                    header={contentHeader}
                />
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {contentHeader}
                    <View style={styles.unsupported}>
                        <Text style={[styles.helper, { color: colors.authMuted }]}>
                            Dashboard type not supported. {currentDashboard.type}
                        </Text>
                    </View>
                </ScrollView>
            )}
        </View>
    );
};

export default DashboardView;

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { flexGrow: 1, padding: 16, gap: 24 },
    header: { gap: 16 },
    feedback: { gap: 8 },
    helper: { fontSize: 14, lineHeight: 20 },
    recovery: { flexGrow: 1, justifyContent: "center", gap: 16 },
    unsupported: { flexGrow: 1, justifyContent: "center" },
});
