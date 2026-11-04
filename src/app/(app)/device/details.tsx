import ConfirmDialog from "@/components/common/ConfirmDialog";
import ContentSection from "@/components/common/ContentSection";
import ListRow from "@/components/common/ListRow";
import Loading from "@/components/common/Loading";
import Button from "@/components/common/Button";
import DeviceForm, { DeviceFormRef } from "@/components/device/DeviceForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Device, useDeviceList } from "@/contexts/custom/DeviceListProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { CircleAlert } from "lucide-react-native";

interface DeleteTarget {
    deviceId: string;
    homeId: string;
}

function Details() {
    const router = useRouter();
    const httpClient = useHttpClient();
    const { deviceId: deviceParam } = useLocalSearchParams<{ deviceId?: string | string[] }>();
    const requestedDeviceId = Array.isArray(deviceParam) ? deviceParam[0] : deviceParam;
    const deviceId =
        typeof requestedDeviceId === "string" && requestedDeviceId.trim()
            ? requestedDeviceId
            : undefined;
    const home = useHomes();
    const homeId = home.current?.id;
    const canManage = home.current?.isOwner === true || home.current?.canManage === true;
    const formRef = useRef<DeviceFormRef>(null);
    const pending = useRef(false);
    const active = useRef(false);
    const focusGeneration = useRef(0);
    const openingManagement = useRef(false);
    const acceptedDelete = useRef<DeleteTarget | null>(null);
    const recoveryPending = useRef(false);
    const refreshedAfterDelete = useRef(false);
    const returnedAfterDelete = useRef(false);
    const [mutationPending, setMutationPending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [device, setDevice] = useState<Device>();
    const [loadedDeviceId, setLoadedDeviceId] = useState<string>();
    const [loadedHomeId, setLoadedHomeId] = useState<string>();
    const [failedDeviceId, setFailedDeviceId] = useState<string>();
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteTarget | null>(null);
    const [deleteError, setDeleteError] = useState("");
    const [deleteRetryTarget, setDeleteRetryTarget] = useState<DeleteTarget | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const devices = useDeviceList();
    const currentHomeDevicesRef = useRef(devices.devices);
    currentHomeDevicesRef.current = devices.devices;
    const hasChangesRef = useRef(hasChanges);
    hasChangesRef.current = hasChanges;
    const canManageRef = useRef(canManage);
    canManageRef.current = canManage;
    const routeDeviceIdRef = useRef(deviceId);
    routeDeviceIdRef.current = deviceId;
    const homeIdRef = useRef(homeId);
    homeIdRef.current = homeId;
    const loadedDeviceIdRef = useRef(loadedDeviceId);
    loadedDeviceIdRef.current = loadedDeviceId;
    const loadedHomeIdRef = useRef(loadedHomeId);
    loadedHomeIdRef.current = loadedHomeId;
    const deviceRef = useRef(device);
    deviceRef.current = device;
    const confirmationRef = useRef(deleteConfirmation);
    confirmationRef.current = deleteConfirmation;

    const matchesLoadedTarget = (target: DeleteTarget) => {
        const current = deviceRef.current;
        return (
            routeDeviceIdRef.current === target.deviceId &&
            loadedDeviceIdRef.current === target.deviceId &&
            loadedHomeIdRef.current === target.homeId &&
            homeIdRef.current === target.homeId &&
            current?.id === target.deviceId
        );
    };
    const isCurrentHomeMember = (target: DeleteTarget) =>
        matchesLoadedTarget(target) &&
        currentHomeDevicesRef.current.some((current) => current.id === target.deviceId);
    const hasTarget = (target: DeleteTarget) =>
        isCurrentHomeMember(target) ||
        (acceptedDelete.current?.deviceId === target.deviceId &&
            acceptedDelete.current.homeId === target.homeId &&
            matchesLoadedTarget(target));
    const sameFocus = (generation: number) =>
        active.current && focusGeneration.current === generation;
    const openDeleteConfirmation = () => {
        if (
            !deviceId ||
            !homeId ||
            !canManageRef.current ||
            !active.current ||
            pending.current ||
            hasChangesRef.current ||
            !isCurrentHomeMember({ deviceId, homeId }) ||
            (acceptedDelete.current?.deviceId === deviceId &&
                acceptedDelete.current.homeId === homeId)
        )
            return;
        setDeleteError("");
        setDeleteRetryTarget(null);
        setDeleteConfirmation({ deviceId, homeId });
    };

    const editClicked = async (values: any): Promise<boolean> => {
        const target = deviceId && homeId ? { deviceId, homeId } : undefined;
        if (
            pending.current ||
            !active.current ||
            !canManageRef.current ||
            !target ||
            !isCurrentHomeMember(target)
        )
            return false;
        pending.current = true;
        setMutationPending(true);
        try {
            const response = await httpClient.patch(`v1/devices/${deviceId}`, values);
            if (!response.isSuccess) throw new Error("Failed to update device. Try again.");
            if (active.current && deviceRef.current?.id === deviceId) {
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

    const recoverAcceptedDelete = async (target: DeleteTarget, generation: number) => {
        if (
            recoveryPending.current ||
            returnedAfterDelete.current ||
            !sameFocus(generation) ||
            acceptedDelete.current !== target ||
            !hasTarget(target)
        )
            return;
        const ownsLock = !pending.current;
        recoveryPending.current = true;
        if (ownsLock) {
            pending.current = true;
            setMutationPending(true);
        }
        try {
            if (!refreshedAfterDelete.current) {
                if (!(await devices.refresh())) throw new Error("Device list refresh failed.");
                refreshedAfterDelete.current = true;
            }
            if (!sameFocus(generation) || !hasTarget(target) || !canManageRef.current) return;
            if (router.canGoBack()) router.back();
            else router.replace("/");
            returnedAfterDelete.current = true;
        } catch {
            if (sameFocus(generation) && hasTarget(target))
                setDeleteError(
                    "Device deleted, but couldn't return to the device list. Try again.",
                );
        } finally {
            recoveryPending.current = false;
            if (ownsLock) {
                pending.current = false;
                setMutationPending(false);
            }
            resumeAfterFocusChanged(generation);
        }
    };
    const recoverAcceptedDeleteRef = useRef(recoverAcceptedDelete);
    recoverAcceptedDeleteRef.current = recoverAcceptedDelete;

    const resumeAfterFocusChanged = (attemptedGeneration: number) => {
        const target = acceptedDelete.current;
        const generation = focusGeneration.current;
        if (
            generation === attemptedGeneration ||
            !target ||
            !sameFocus(generation) ||
            pending.current ||
            recoveryPending.current ||
            returnedAfterDelete.current ||
            !canManageRef.current ||
            !hasTarget(target)
        )
            return;
        void recoverAcceptedDeleteRef.current(target, generation);
    };

    const deleteDevice = async (target: DeleteTarget, generation: number) => {
        if (
            pending.current ||
            !sameFocus(generation) ||
            !canManageRef.current ||
            hasChangesRef.current ||
            !isCurrentHomeMember(target) ||
            (acceptedDelete.current?.deviceId === target.deviceId &&
                acceptedDelete.current.homeId === target.homeId)
        )
            return;
        pending.current = true;
        setMutationPending(true);
        setDeleteError("");
        try {
            const response = await httpClient.delete(`v1/devices/${target.deviceId}`);
            if (!response.isSuccess) throw new Error("Couldn't delete device. Try again.");
            acceptedDelete.current = target;
            refreshedAfterDelete.current = false;
            returnedAfterDelete.current = false;
            setDeleteRetryTarget(null);
            await recoverAcceptedDelete(target, generation);
        } catch {
            if (sameFocus(generation) && hasTarget(target)) {
                setDeleteError("Couldn't delete device. Try again.");
                setDeleteRetryTarget(target);
            }
        } finally {
            pending.current = false;
            setMutationPending(false);
            resumeAfterFocusChanged(generation);
        }
    };

    const confirmDelete = (target: DeleteTarget | null) => {
        if (
            !target ||
            confirmationRef.current !== target ||
            pending.current ||
            !sameFocus(focusGeneration.current) ||
            !canManageRef.current ||
            hasChangesRef.current ||
            !isCurrentHomeMember(target)
        )
            return;
        setDeleteConfirmation(null);
        return deleteDevice(target, focusGeneration.current);
    };

    const retryDelete = () => {
        if (pending.current || !active.current) return;
        const accepted = acceptedDelete.current;
        if (accepted && hasTarget(accepted))
            return recoverAcceptedDeleteRef.current(accepted, focusGeneration.current);
        if (
            !deleteRetryTarget ||
            !canManageRef.current ||
            hasChangesRef.current ||
            !isCurrentHomeMember(deleteRetryTarget)
        )
            return;
        return deleteDevice(deleteRetryTarget, focusGeneration.current);
    };

    useFocusEffect(
        useCallback(() => {
            active.current = true;
            const generation = ++focusGeneration.current;
            openingManagement.current = false;
            setDeleteConfirmation(null);
            if (acceptedDelete.current)
                void recoverAcceptedDeleteRef.current(acceptedDelete.current, generation);
            return () => {
                active.current = false;
                focusGeneration.current++;
                setDeleteConfirmation(null);
            };
        }, []),
    );

    useEffect(() => {
        let current = true;
        const load = async () => {
            if (!deviceId || !homeId || home.loading || !canManageRef.current) {
                if (!home.loading) {
                    setDevice(undefined);
                    setLoadedDeviceId(undefined);
                    setLoadedHomeId(undefined);
                    setLoading(false);
                }
                return;
            }
            setLoading(true);
            setDevice(undefined);
            setLoadedDeviceId(undefined);
            setLoadedHomeId(undefined);
            setFailedDeviceId(undefined);
            try {
                const response = await httpClient.get(`v1/devices/${deviceId}`);
                if (!response.isSuccess || !response.response) throw new Error();
                const content = (await response.response.json()) as Device;
                if (
                    !content ||
                    content.id !== deviceId ||
                    routeDeviceIdRef.current !== deviceId ||
                    homeIdRef.current !== homeId
                )
                    throw new Error();
                if (current) {
                    setDevice(content);
                    setLoadedDeviceId(deviceId);
                    setLoadedHomeId(homeId);
                    setFailedDeviceId(undefined);
                }
            } catch {
                if (
                    current &&
                    routeDeviceIdRef.current === deviceId &&
                    homeIdRef.current === homeId
                )
                    setFailedDeviceId(deviceId);
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
    }, [deviceId, loadAttempt, home.loading, homeId, canManage]);

    useEffect(() => {
        setDeleteConfirmation(null);
        setDeleteError("");
        setDeleteRetryTarget(null);
    }, [deviceId, homeId, canManage, loadedDeviceId, loadedHomeId]);

    const deleteAcceptedForCurrentDevice =
        acceptedDelete.current?.deviceId === deviceId && acceptedDelete.current?.homeId === homeId;
    const currentHomeMembership =
        !!device &&
        device.id === deviceId &&
        loadedDeviceId === deviceId &&
        loadedHomeId === homeId &&
        devices.devices.some((current) => current.id === deviceId);
    const acceptedDeleteMatchesCurrentDevice =
        acceptedDelete.current?.deviceId === deviceId && acceptedDelete.current?.homeId === homeId;

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
    if (!device || loadedDeviceId !== requestedDeviceId || loadedHomeId !== homeId) {
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
    if (!currentHomeMembership && !acceptedDeleteMatchesCurrentDevice) {
        if (devices.loading) return <Loading />;
        const catalogFailed = !!devices.error;
        return (
            <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 16 }}>
                <Alert
                    icon={CircleAlert}
                    variant="destructive"
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite">
                    <AlertDescription>
                        {catalogFailed
                            ? "Couldn't verify that this device belongs to the current home."
                            : "This device isn't available in the current home."}
                    </AlertDescription>
                </Alert>
                <Button
                    name={catalogFailed ? "Retry" : "Return to home"}
                    type={catalogFailed ? "brand-outline" : "auth"}
                    loading={catalogFailed && devices.loading}
                    disabled={!active.current || pending.current || devices.loading}
                    onPress={() => {
                        if (
                            !active.current ||
                            pending.current ||
                            routeDeviceIdRef.current !== deviceId ||
                            homeIdRef.current !== homeId
                        )
                            return;
                        if (catalogFailed) void devices.refresh();
                        else router.replace("/");
                    }}
                />
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <ConfirmDialog
                visible={!!deleteConfirmation}
                title="Delete Device"
                content="The device and all its dashboards, widgets, and operations will be permanently deleted. This action cannot be undone."
                confirmLabel="Delete"
                onConfirm={() => confirmDelete(deleteConfirmation)}
                onCancel={() => setDeleteConfirmation(null)}
            />
            <DeviceForm
                ref={formRef}
                deviceId={deviceId as string}
                edit
                disabled={mutationPending || deleteAcceptedForCurrentDevice}
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
                            const target = deviceId && homeId ? { deviceId, homeId } : undefined;
                            if (
                                !active.current ||
                                !canManageRef.current ||
                                pending.current ||
                                hasChangesRef.current ||
                                openingManagement.current ||
                                !target ||
                                !isCurrentHomeMember(target) ||
                                (acceptedDelete.current?.deviceId === target.deviceId &&
                                    acceptedDelete.current.homeId === target.homeId)
                            )
                                return;
                            openingManagement.current = true;
                            router.push({ pathname: "device/widget/list", params: { deviceId } });
                        }}
                        disabled={
                            !canManage ||
                            mutationPending ||
                            hasChanges ||
                            deleteAcceptedForCurrentDevice
                        }
                    />
                </ContentSection>
                <ContentSection title="Delete device" separated>
                    {!!deleteError && (
                        <>
                            <Alert
                                icon={CircleAlert}
                                variant="destructive"
                                accessibilityRole="alert"
                                accessibilityLiveRegion="polite">
                                <AlertDescription>{deleteError}</AlertDescription>
                            </Alert>
                            <Button
                                name="Retry"
                                type="brand-outline"
                                loading={mutationPending}
                                disabled={
                                    !canManage ||
                                    mutationPending ||
                                    hasChanges ||
                                    (!deleteAcceptedForCurrentDevice && !deleteRetryTarget)
                                }
                                onPress={retryDelete}
                            />
                        </>
                    )}
                    <Button
                        name="Delete device"
                        type="brand-destructive"
                        loading={mutationPending}
                        disabled={
                            !canManage ||
                            mutationPending ||
                            hasChanges ||
                            deleteAcceptedForCurrentDevice
                        }
                        onPress={openDeleteConfirmation}
                    />
                </ContentSection>
            </DeviceForm>
        </View>
    );
}

export default Details;
