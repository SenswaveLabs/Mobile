import { View, StyleSheet } from "react-native";
import React from "react";
import Text from "@/components/common/Text";
import Loading from "@/components/common/Loading";
import GridDashboardView from "./Grid/GridDashboardView";
import { useDevice } from "@/contexts/custom/DeviceProvider";
import { WidgetType } from "@/types/DeviceTypes";

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
    calculatedWidgets: any[];
    positionedWidgets: PositionedWidget[];
};

export interface DashboardViewProps {
    dashboardId: string;
}

function DashboardView() {
    const device = useDevice();

    if (device.loading) {
        return <Loading />;
    }

    if (device.currentDashboardId === "" || device.currentDashboard === undefined) {
        return (
            <View style={styles.container}>
                <Text size={"medium"} color={"onPrimary"}>
                    Failed to fetch dashboard please refresh.
                </Text>
            </View>
        );
    }

    if (device.currentDashboard!.type === "grid") {
        return <GridDashboardView />;
    }

    return (
        <View style={{ ...styles.container, alignContent: "center", justifyContent: "center" }}>
            <Text size={"medium"} color={"onPrimary"}>
                Dashboard type not supported. {device.currentDashboard!.type}
            </Text>
        </View>
    );
}

export default DashboardView;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
