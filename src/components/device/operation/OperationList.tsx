import Loading from "@/components/common/Loading";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useToast } from "@/contexts/ToastProvider";
import { ListResponse } from "@/utils/httpClient";
import React, { FC, useCallback, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import Text from "@/components/common/Text";
import { useFocusEffect } from "expo-router";
import { useDevice } from "@/contexts/custom/DeviceProvider";
import { OperationListDto } from "@/contexts/custom/DeviceListProvider";
import OperationTile from "./OperationTile";

const OperationList: FC = () => {
    const device = useDevice();
    const toast = useToast();
    const httpClient = useHttpClient();
    const [loading, setLoading] = useState(true);
    const [oprations, setOperations] = useState<OperationListDto[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        const refresh = async () => {
            const result = await httpClient.get(
                `v1/devices/operations/display?deviceId=${device.deviceId}`,
            );

            if (result.isSuccess) {
                const data = (await result.response!.json()) as ListResponse<OperationListDto>;
                setOperations(data.items);
                setRefreshing(false);
            } else {
                toast.error("Failed to refresh operations.");
                setRefreshing(false);
            }
        };

        refresh();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const getOperations = async () => {
        const result = await httpClient.get(
            `v1/devices/operations/display?deviceId=${device.deviceId}`,
        );

        if (result.isSuccess) {
            const data = (await result.response!.json()) as ListResponse<OperationListDto>;
            setOperations(data.items);
            setLoading(false);
        } else if (result.statusCode === 404) {
            setOperations([]);
            setLoading(false);
            toast.info("Create some operations!");
        } else {
            toast.error("Failed to load operations.");
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            getOperations();

            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []),
    );

    if (loading) {
        return <Loading />;
    }

    return (
        <View style={{ paddingTop: 15, flex: 1 }}>
            <FlatList
                data={oprations}
                keyExtractor={(item, index) => index.toString()}
                style={{ flex: 1, width: "100%" }}
                renderItem={({ item, index }) => (
                    <OperationTile
                        id={item.id}
                        name={item.name}
                        type={item.type}
                        variant="list"
                        separator={index < oprations.length - 1}
                    />
                )}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={
                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                        <Text size={"medium"} color={"onBackground"}>
                            No available operations.
                        </Text>
                    </View>
                }
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 150 }}
                removeClippedSubviews={false}
            />
        </View>
    );
};

export default OperationList;
