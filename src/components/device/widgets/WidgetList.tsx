import React, { FC, useCallback, useState } from "react";
import { View, Pressable, RefreshControl, SectionList } from "react-native";
import { useFocusEffect } from "expo-router";
import { useToast } from "@/contexts/ToastProvider";
import Loading from "@/components/common/Loading";
import { ListResponse } from "@/utils/httpClient";
import { useDevice } from "@/contexts/custom/DeviceProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import Text from "@/components/common/Text";
import WidgetListTile from "@/components/device/widgets/WidgetListTile";
import Icon from "@/components/common/Icon";
import { useRouter } from "expo-router";
import { WidgetListDto, OperationGroup, OperationGroupListDto } from "@/types/DeviceTypes";
import OperationTile from "../operation/OperationTile";

const EmptyWidget: WidgetListDto = {
    id: "",
    name: "",
    type: "Invalid",
    enabled: false,
    empty: true,
};

interface WidgetListProps {
    overrideOnClick?: (operationId: string) => Promise<void>;
    hideAddButtons?: boolean;
}

const WidgetList: FC<WidgetListProps> = ({ overrideOnClick, hideAddButtons = false }) => {
    const httpClient = useHttpClient();
    const device = useDevice();
    const toast = useToast();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [groups, setGroups] = useState<OperationGroup[]>([]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        const refresh = async () => {
            const result = await httpClient.get(
                `v1/devices/widgets/display?deviceId=${device.deviceId}`,
            );

            if (result.isSuccess) {
                const data = (await result.response!.json()) as ListResponse<OperationGroup>;
                setGroups(data.items);
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
            `v1/devices/widgets/display?deviceId=${device.deviceId}`,
        );

        if (result.isSuccess) {
            const data = (await result.response!.json()) as ListResponse<OperationGroup>;
            setGroups(data.items);
            setLoading(false);
        } else if (result.statusCode === 404) {
            setGroups([]);
            setLoading(false);
            toast.info("Create some operations!");
        } else {
            toast.error("Failed to load operations.");
            setLoading(false);
        }
    };

    const addWidgetClicked = async (operationId: string) => {
        console.info("[WidgetList] Add Widget Clicked.");
        router.push({ pathname: "device/widget/add", params: { operationId: operationId } });
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

    const displayWidget = (item: WidgetListDto, separator: boolean) => {
        if (item.empty) {
            return (
                <View>
                    <Text size="medium" color="onBackground">
                        Operation has no widgets!
                    </Text>
                </View>
            );
        }

        return (
            <WidgetListTile
                id={item.id}
                name={item.name}
                type={item.type}
                enabled={item.enabled}
                overrideOnClick={overrideOnClick}
                variant="list"
                separator={separator}
            />
        );
    };

    return (
        <SectionList
            sections={groups.map((x) => ({
                title: JSON.stringify(x.operation),
                data: x.widgets.length > 0 ? x.widgets : [EmptyWidget],
            }))}
            keyExtractor={(item, index) => item.id + index}
            renderItem={({ item, index, section }) =>
                displayWidget(item, index < section.data.length - 1)
            }
            renderSectionHeader={({ section }) => (
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        alignContent: "center",
                        marginTop: 20,
                        marginBottom: 8,
                    }}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                        <OperationTile
                            id={(JSON.parse(section.title) as OperationGroupListDto).id}
                            name={(JSON.parse(section.title) as OperationGroupListDto).name}
                            type={(JSON.parse(section.title) as OperationGroupListDto).type}
                            variant="list"
                            separator={false}
                        />
                    </View>

                    {!hideAddButtons && (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Add widget"
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                            onPress={() => {
                                addWidgetClicked(
                                    (JSON.parse(section.title) as OperationGroupListDto).id,
                                );
                            }}>
                            <Icon icon="add-outline" size={24} color="brand" />
                        </Pressable>
                    )}
                </View>
            )}
            contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: 15,
                paddingBottom: 120,
            }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            showsVerticalScrollIndicator={false}
        />
    );
};

export default WidgetList;
