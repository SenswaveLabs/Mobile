import ConfirmDialog from "@/components/common/ConfirmDialog";
import ContentSection from "@/components/common/ContentSection";
import ListRow from "@/components/common/ListRow";
import Loading from "@/components/common/Loading";
import Button from "@/components/common/Button";
import DeviceForm, { DeviceFormRef } from "@/components/device/DeviceForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Device, useDeviceList } from "@/contexts/custom/DeviceListProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useToast } from "@/contexts/ToastProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { CircleAlert } from "lucide-react-native";

function Details() {
    const toast = useToast();
    const router = useRouter();
    const httpClient = useHttpClient();
    const { deviceId: deviceParam } = useLocalSearchParams<{ deviceId?: string | string[] }>();
    const requestedDeviceId = Array.isArray(deviceParam) ? deviceParam[0] : deviceParam;
    const deviceId =
        typeof requestedDeviceId === "string" && requestedDeviceId.trim()
            ? requestedDeviceId
            : undefined;
    const home = useHomes();
    const canManage = home.current?.isOwner === true || home.current?.canManage === true;
    const canManageRef = useRef(canManage);
    canManageRef.current = canManage;
    const formRef = useRef<DeviceFormRef>(null);
    const pending = useRef(false);
    const active = useRef(true);
    const openingManagement = useRef(false);
    const [mutationPending, setMutationPending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [device, setDevice] = useState<Device>();
    const [loadedDeviceId, setLoadedDeviceId] = useState<string>();
    const [failedDeviceId, setFailedDeviceId] = useState<string>();
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const devices = useDeviceList();

    const editClicked = async (values: any): Promise<boolean> => {
        if (pending.current || !active.current || !canManageRef.current || !deviceId) return false;
        pending.current = true;
        setMutationPending(true);
        try {
            const response = await httpClient.patch(`v1/devices/${deviceId}`, values);
            if (!response.isSuccess) throw new Error("Failed to update device. Try again.");
            if (active.current) {
                setDevice((current) =>
                    current
                        ? ({
                              ...current,
                              ...values,
                              icon: values.icon ?? current.icon,
                              name: values.name ?? current.name,
                          } as Device)
                        : current,
                );
                toast.success("Device updated successfully.");
            }
            try {
                await devices.refresh();
            } catch {
                /* Device save already succeeded. */
            }
            return true;
        } finally {
            pending.current = false;
            setMutationPending(false);
        }
    };

    const deleteDevice = async () => {
        if (pending.current || !active.current || !canManageRef.current || !deviceId) return;
        pending.current = true;
        setMutationPending(true);
        try {
            const response = await httpClient.delete(`v1/devices/${deviceId}`);
            if (response.isSuccess) {
                toast.success("Device removed successfully.");
                try {
                    await devices.refresh();
                } catch {
                    /* Deletion already succeeded. */
                }
                if (active.current) router.back();
            } else toast.httpError(response);
        } catch {
            if (active.current) toast.error("Failed to remove device. Try again.");
        } finally {
            pending.current = false;
            setMutationPending(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            active.current = true;
            openingManagement.current = false;
            return () => {
                active.current = false;
            };
        }, []),
    );

    useEffect(() => {
        let current = true;
        const load = async () => {
            if (!deviceId || home.loading || !canManageRef.current) {
                if (!home.loading) setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const response = await httpClient.get(`v1/devices/${deviceId}`);
                if (!response.isSuccess || !response.response) throw new Error();
                const content = (await response.response.json()) as Device;
                if (current) {
                    setDevice(content);
                    setLoadedDeviceId(requestedDeviceId);
                    setFailedDeviceId(undefined);
                }
            } catch {
                if (current) setFailedDeviceId(requestedDeviceId);
            } finally {
                if (current) setLoading(false);
            }
        };
        void load();
        return () => {
            current = false;
        };
        // Load when route id changes; the HTTP hook changes identity on renders.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deviceId, loadAttempt, home.loading, canManage]);

    if (home.loading) return <Loading />;
    if (!canManage) {
        return (
            <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 16 }}>
                <Alert icon={CircleAlert} variant="destructive" accessibilityRole="alert">
                    <AlertDescription>
                        You don't have permission to manage this device.
                    </AlertDescription>
                </Alert>
                <Button
                    name="Return to device"
                    type="auth"
                    loading={false}
                    onPress={() =>
                        deviceId
                            ? router.replace({ pathname: "/device/device", params: { deviceId } })
                            : router.replace("/")
                    }
                />
            </View>
        );
    }
    if (!deviceId) {
        return (
            <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 16 }}>
                <Alert icon={CircleAlert} variant="destructive" accessibilityRole="alert">
                    <AlertDescription>Device not found.</AlertDescription>
                </Alert>
                <Button
                    name="Return to home"
                    type="auth"
                    loading={false}
                    onPress={() => router.replace("/")}
                />
            </View>
        );
    }
    if (loading) return <Loading />;
    if (!device || loadedDeviceId !== requestedDeviceId) {
        if (failedDeviceId !== requestedDeviceId) return <Loading />;
        return (
            <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 16 }}>
                <Alert
                    icon={CircleAlert}
                    variant="destructive"
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite">
                    <AlertDescription>Failed to load device details.</AlertDescription>
                </Alert>
                <Button
                    name="Retry"
                    type="auth"
                    loading={false}
                    onPress={() => setLoadAttempt((attempt) => attempt + 1)}
                />
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <ConfirmDialog
                visible={showDeleteDialog}
                title="Delete Device"
                content="The device and all its dashboards, widgets, and operations will be permanently deleted. This action cannot be undone."
                confirmLabel="Delete"
                onConfirm={() => {
                    setShowDeleteDialog(false);
                    void deleteDevice();
                }}
                onCancel={() => setShowDeleteDialog(false)}
            />
            <DeviceForm
                ref={formRef}
                deviceId={deviceId as string}
                edit
                onSubmit={editClicked}
                onHasChanges={setHasChanges}
                initName={device.name}
                initIcon={device.icon}
                initRoomId={device.roomId ?? undefined}
                initTileType={device.tile.type}
                initTileOperationId={device.tile.operationId}
                initTileDisplayableOperationId={device.tile.displayableOperationId}
                initTileUnit={device.tile.configuration?.unit}
                initTileStep={device.tile.configuration?.step}
                initTileLabel={device.tile.configuration?.label}
                initTileReadings={device.tile.configuration?.readings}
                initPresenceType={device.presence?.type}
                initPresenceOperationId={device.presence?.operationId}>
                <ContentSection title="Operations & Widgets" separated>
                    <ListRow
                        title="Manage operations and widgets"
                        description="Configure device functions and dashboard controls."
                        onPress={() => {
                            if (
                                !canManageRef.current ||
                                pending.current ||
                                hasChanges ||
                                openingManagement.current
                            )
                                return;
                            openingManagement.current = true;
                            router.push({ pathname: "device/widget/list", params: { deviceId } });
                        }}
                        disabled={!canManage || mutationPending || hasChanges}
                    />
                </ContentSection>
                <ContentSection title="Delete device" separated>
                    <Button
                        name="Delete device"
                        type="brand-destructive"
                        loading={false}
                        disabled={!canManage || mutationPending || hasChanges}
                        onPress={() => {
                            if (canManageRef.current) setShowDeleteDialog(true);
                        }}
                    />
                </ContentSection>
            </DeviceForm>
        </View>
    );
}

export default Details;
