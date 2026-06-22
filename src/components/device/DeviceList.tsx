import React, { useCallback } from "react";
import DeviceTile from "./tile/DeviceTile";
import { FlatList, View, StyleSheet, RefreshControl } from "react-native";
import { useDeviceList } from "@/contexts/custom/DeviceListProvider";
import { useToast } from "@/contexts/ToastProvider";

const numColumns = 2;
const edgePadding = 15;
const innerSpacing = 20;

export default function DeviceList() {
    const devices = useDeviceList();
    const toast = useToast();

    const onRefresh = useCallback(() => {
        const refresh = async () => {
            const result = await devices.refresh();

            if (!result) {
                toast.error("Failed to load devices.");
            }
        };

        refresh();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <FlatList
            data={devices.filteredDevices}
            renderItem={({ item }) => (
                <View style={styles.itemContainer}>
                    <DeviceTile device={item} />
                </View>
            )}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            columnWrapperStyle={{ justifyContent: "space-between" }}
            contentContainerStyle={{
                paddingHorizontal: edgePadding,
                paddingTop: edgePadding,
                paddingBottom: 120,
            }}
            refreshControl={<RefreshControl refreshing={devices.loading} onRefresh={onRefresh} />}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={false}
        />
    );
}

const styles = StyleSheet.create({
    itemContainer: {
        marginBottom: innerSpacing,
    },
    itemText: {
        fontSize: 16,
    },
});
