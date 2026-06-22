import ImageButton from "@/components/common/ImageButton";
import WidgetList from "@/components/device/widgets/WidgetList";
import { useDevice } from "@/contexts/custom/DeviceProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useToast } from "@/contexts/ToastProvider";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";

const PlaceWidget = () => {
    const router = useRouter();
    const httpClient = useHttpClient();
    const device = useDevice();
    const toast = useToast();
    const { row, column, rowSpan, columnSpan } = useLocalSearchParams();

    const onWidgetSelected = async (widgetId: string) => {
        console.info("[PlaceWidget] Widget selected: " + widgetId);

        const values = {
            widgetId: widgetId,
            row: Number(row),
            column: Number(column),
            rowSpan: Number(rowSpan),
            columnSpan: Number(columnSpan),
        };

        console.info("[PlaceWidget] Placing widget with values: ", values);

        const response = await httpClient.put(
            `v1/devices/dashboards/${device.currentDashboardId}/widgets`,
            values,
        );

        if (response.isSuccess) {
            toast.success("Widget placed on dashboard successfully.");
            device.refresh(true);
        } else {
            toast.error("Failed to place widget: area is overlapping or out of bounds.");
            const data = await response.response?.text();
            console.error("[Dashboard Edit] Error: " + data);
        }

        router.back();
    };

    const addOperationClicked = async () => {
        console.info("[Widget List Page] Add Operation Clicked.");
        router.push({ pathname: "device/operation/add" });
    };

    return (
        <View style={{ flex: 1 }}>
            <WidgetList overrideOnClick={onWidgetSelected} />

            <View
                style={{
                    position: "absolute",
                    bottom: 0,
                    paddingHorizontal: 15,
                    marginBottom: 15,
                    alignItems: "center",
                    justifyContent: "flex-end",
                    width: "100%",
                    flexDirection: "row",
                    gap: 15,
                }}>
                <ImageButton icon="add-outline" size={40} onPress={addOperationClicked} />
            </View>
        </View>
    );
};

export default PlaceWidget;
