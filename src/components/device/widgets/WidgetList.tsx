import Button from "@/components/common/Button";
import Icon from "@/components/common/Icon";
import Loading from "@/components/common/Loading";
import Text from "@/components/common/Text";
import OperationTile from "@/components/device/operation/OperationTile";
import WidgetListTile from "@/components/device/widgets/WidgetListTile";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDevice } from "@/contexts/custom/DeviceProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import type { ListResponse } from "@/utils/httpClient";
import type { OperationGroup, WidgetListDto } from "@/types/DeviceTypes";
import { useFocusEffect, useRouter } from "expo-router";
import { CircleAlert } from "lucide-react-native";
import React, { FC, useCallback, useRef, useState } from "react";
import { Pressable, RefreshControl, SectionList, StyleSheet, View } from "react-native";

const EmptyWidget: WidgetListDto = {
    id: "",
    name: "",
    type: "Invalid",
    enabled: false,
    empty: true,
};

interface WidgetListProps {
    overrideOnClick?: (widgetId: string) => Promise<void>;
    hideAddButtons?: boolean;
    deviceId?: string;
    selectedWidgetId?: string;
    disabled?: boolean;
}

const isOperationGroupList = (value: unknown): value is OperationGroup[] =>
    Array.isArray(value) &&
    value.every((group) => {
        if (!group || typeof group !== "object") return false;
        const item = group as Partial<OperationGroup>;
        return (
            item.operation !== undefined &&
            typeof item.operation.id === "string" &&
            typeof item.operation.name === "string" &&
            typeof item.operation.type === "string" &&
            Array.isArray(item.widgets) &&
            item.widgets.every(
                (widget) =>
                    widget &&
                    typeof widget.id === "string" &&
                    typeof widget.name === "string" &&
                    typeof widget.type === "string" &&
                    typeof widget.enabled === "boolean",
            )
        );
    });

const WidgetList: FC<WidgetListProps> = ({
    overrideOnClick,
    hideAddButtons = false,
    deviceId: explicitDeviceId,
    selectedWidgetId,
    disabled = false,
}) => {
    const httpClient = useHttpClient();
    const device = useDevice();
    const home = useHomes();
    const router = useRouter();
    const { colors } = useTheme().current;
    const canManage = home.current?.isOwner === true || home.current?.canManage === true;
    const canManageRef = useRef(canManage);
    canManageRef.current = canManage;
    const disabledRef = useRef(disabled);
    disabledRef.current = disabled;
    const deviceId = explicitDeviceId || device.deviceId;
    const deviceIdRef = useRef(deviceId);
    deviceIdRef.current = deviceId;
    const requestRef = useRef(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [groupsDeviceId, setGroupsDeviceId] = useState("");
    const [groups, setGroups] = useState<OperationGroup[]>([]);
    const [loadError, setLoadError] = useState("");

    const loadGroups = useCallback(
        async (showLoading = true) => {
            const targetDeviceId = deviceId;
            const request = ++requestRef.current;
            const isCurrent = () =>
                request === requestRef.current && targetDeviceId === deviceIdRef.current;

            if (!targetDeviceId) {
                if (isCurrent()) {
                    setGroups([]);
                    setGroupsDeviceId("");
                    setLoadError("Choose a device to load its widgets.");
                    setLoading(false);
                }
                return;
            }

            if (showLoading) setLoading(true);
            setLoadError("");
            try {
                const result = await httpClient.get(
                    `v1/devices/widgets/display?deviceId=${targetDeviceId}`,
                );
                if (result.statusCode === 404 && !result.isSuccess) {
                    if (isCurrent()) {
                        setGroups([]);
                        setGroupsDeviceId(targetDeviceId);
                    }
                } else {
                    if (!result.isSuccess || !result.response)
                        throw new Error("Widget list read failed");
                    const content: unknown = await result.response.json();
                    const items =
                        content && typeof content === "object" && "items" in content
                            ? (content as ListResponse<OperationGroup>).items
                            : undefined;
                    if (!isOperationGroupList(items)) throw new Error("Widget list is invalid");
                    if (isCurrent()) {
                        setGroups(items);
                        setGroupsDeviceId(targetDeviceId);
                    }
                }
            } catch {
                if (isCurrent()) setLoadError("Couldn't load widgets. Try again.");
            } finally {
                if (isCurrent()) setLoading(false);
            }
        },
        [deviceId, httpClient],
    );

    useFocusEffect(
        useCallback(() => {
            void loadGroups();
            return () => {
                ++requestRef.current;
            };
        }, [loadGroups]),
    );

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await loadGroups(false);
        } finally {
            setRefreshing(false);
        }
    };

    const addWidgetClicked = (operationId: string) => {
        if (
            !canManageRef.current ||
            disabledRef.current ||
            !deviceId ||
            deviceIdRef.current !== deviceId
        )
            return;
        router.push({
            pathname: "device/widget/add",
            params: { operationId, deviceId },
        });
    };

    const dataMatchesDevice = groupsDeviceId === deviceId;
    if (loading || (!dataMatchesDevice && !loadError))
        return (
            <View style={styles.state}>
                <Loading />
            </View>
        );

    if (loadError)
        return (
            <View style={styles.state}>
                <Alert
                    icon={CircleAlert}
                    variant="destructive"
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite">
                    <AlertDescription>{loadError}</AlertDescription>
                </Alert>
                <Button
                    name="Retry"
                    type="brand-outline"
                    loading={refreshing}
                    disabled={refreshing || disabled}
                    onPress={() => void onRefresh()}
                />
            </View>
        );

    if (groups.length === 0)
        return (
            <View style={styles.state}>
                <Text size="medium" color="onBackground" bold>
                    No widgets available.
                </Text>
                <Text size="small" color="onBackground">
                    {canManage
                        ? "Add an operation and widget to this device, then return here."
                        : "Ask a home manager to add widgets to this device."}
                </Text>
            </View>
        );

    const displayWidget = (item: WidgetListDto, separator: boolean) => {
        if (item.empty) {
            return (
                <View style={styles.emptyOperation}>
                    <Text size="small" color="onBackground">
                        Operation has no widgets yet.
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
                deviceId={deviceId}
                canManage={canManage}
                overrideOnClick={overrideOnClick}
                selected={item.id === selectedWidgetId}
                disablePress={disabled}
                separator={separator}
            />
        );
    };

    return (
        <SectionList
            style={styles.list}
            stickySectionHeadersEnabled={false}
            sections={groups.map((group) => ({
                operation: group.operation,
                data: group.widgets.length > 0 ? group.widgets : [EmptyWidget],
            }))}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            renderItem={({ item, index, section }) =>
                displayWidget(item, index < section.data.length - 1)
            }
            renderSectionHeader={({ section }) => (
                <View style={styles.sectionHeader}>
                    <View style={styles.operation}>
                        <OperationTile
                            id={section.operation.id}
                            name={section.operation.name}
                            type={section.operation.type}
                            variant="list"
                            disablePress={Boolean(overrideOnClick) || disabled || !canManage}
                            separator={false}
                        />
                    </View>
                    {canManage && !hideAddButtons && (
                        <Pressable
                            cssInterop={false}
                            accessibilityRole="button"
                            accessibilityLabel={`Add widget to ${section.operation.name}`}
                            accessibilityState={{ disabled }}
                            disabled={disabled}
                            android_ripple={{ color: colors.deviceTileSubtle }}
                            style={[styles.addWidgetButton, disabled && styles.pressed]}
                            onPress={() => addWidgetClicked(section.operation.id)}>
                            <Icon icon="add-outline" size={24} color="brand" />
                        </Pressable>
                    )}
                </View>
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            showsVerticalScrollIndicator={false}
        />
    );
};

export default WidgetList;

const styles = StyleSheet.create({
    list: { flex: 1, minHeight: 0 },
    listContent: { paddingHorizontal: 16, paddingBottom: 16 },
    state: { flex: 1, justifyContent: "center", gap: 12, padding: 16 },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        marginTop: 12,
        marginBottom: 8,
    },
    operation: { flex: 1, minWidth: 0 },
    addWidgetButton: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    pressed: { opacity: 0.72 },
    emptyOperation: { minHeight: 56, justifyContent: "center", paddingHorizontal: 12 },
});
