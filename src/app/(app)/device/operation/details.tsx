import Button from "@/components/common/Button";
import ContentSection from "@/components/common/ContentSection";
import Loading from "@/components/common/Loading";
import Text from "@/components/common/Text";
import OperationForm from "@/components/device/operation/OperationForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeviceList } from "@/contexts/custom/DeviceListProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { PortalHost } from "@rn-primitives/portal";
import { CircleAlert } from "lucide-react-native";
import React, { FC, useCallback, useEffect, useId, useRef, useState } from "react";
import { Modal as NativeModal, ScrollView, StyleSheet, View } from "react-native";
import type { OperationListDto } from "@/contexts/custom/DeviceListProvider";
import type { OperationDto, OperationType } from "@/types/DeviceTypes";

interface OperationRead {
    operationId: string;
    operation?: OperationDto;
    loading: boolean;
    error?: string;
}

interface OperationCatalogRead {
    key: string;
    operations?: OperationListDto[];
    loading: boolean;
    error?: string;
}

type HomeRole = "Owner" | "Manage" | "Display" | "Unknown";

interface DeleteTarget {
    operationId: string;
    deviceId: string;
    homeId: string;
    role: Exclude<HomeRole, "Display" | "Unknown">;
}

const operationTypes: OperationType[] = [
    "Boolean",
    "Number",
    "Integer",
    "Text",
    "HexColor",
    "Options",
];
const conflictMessage =
    "Remove this operation from its widgets and device tiles before deleting it.";

const normalizeId = (value?: string | string[]) => {
    const id = Array.isArray(value) ? value[0] : value;
    return typeof id === "string" && id.trim() ? id : undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === "object" && !Array.isArray(value);

const isOperationConfiguration = (value: unknown, type: OperationType) => {
    if (value == null) return true;
    if (!isRecord(value)) return false;

    const isScalar = (item: unknown) =>
        typeof item === "string" ||
        typeof item === "boolean" ||
        (typeof item === "number" && Number.isFinite(item));
    if (
        (value.isJson !== undefined && typeof value.isJson !== "boolean") ||
        (value.saveOnUserAction !== undefined && typeof value.saveOnUserAction !== "boolean") ||
        (value.jsonNames !== undefined &&
            (!Array.isArray(value.jsonNames) ||
                !value.jsonNames.every((name) => typeof name === "string")))
    )
        return false;

    if (type === "Number" || type === "Integer") {
        if (
            (value.min !== undefined &&
                (typeof value.min !== "number" || !Number.isFinite(value.min))) ||
            (value.max !== undefined &&
                (typeof value.max !== "number" || !Number.isFinite(value.max)))
        )
            return false;
    }
    if (type === "Number" && value.decimalSeparator !== undefined) {
        if (typeof value.decimalSeparator !== "string") return false;
    }
    if (type === "Boolean") {
        if (
            (value.trueValue !== undefined && !isScalar(value.trueValue)) ||
            (value.falseValue !== undefined && !isScalar(value.falseValue))
        )
            return false;
    }
    if (
        type === "Options" &&
        value.options !== undefined &&
        (!Array.isArray(value.options) ||
            !value.options.every(
                (option) =>
                    isRecord(option) && typeof option.name === "string" && isScalar(option.value),
            ))
    )
        return false;

    return true;
};

const isOperationDto = (value: unknown, operationId: string): value is OperationDto => {
    if (!isRecord(value)) return false;
    const type = value.type as OperationType;
    return (
        value.id === operationId &&
        typeof value.name === "string" &&
        typeof value.topic === "string" &&
        operationTypes.includes(type) &&
        isOperationConfiguration(value.configuration, type)
    );
};

const isOperationListDto = (value: unknown): value is OperationListDto =>
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    operationTypes.includes(value.type as OperationType);

const catalogKey = (deviceId: string, homeId: string, role: HomeRole) =>
    JSON.stringify([deviceId, homeId, role]);

const Details: FC = () => {
    const router = useRouter();
    const httpClient = useHttpClient();
    const { operationId: operationParam, deviceId: deviceParam } = useLocalSearchParams<{
        operationId?: string | string[];
        deviceId?: string | string[];
    }>();
    const operationId = normalizeId(operationParam);
    const deviceId = normalizeId(deviceParam);
    const home = useHomes();
    const devices = useDeviceList();
    const homeId = home.current?.id;
    const role: HomeRole =
        home.current?.isOwner === true
            ? "Owner"
            : home.current?.canManage === true
              ? "Manage"
              : home.current
                ? "Display"
                : "Unknown";
    const canManage = role === "Owner" || role === "Manage";
    const deviceIsCurrentHomeMember =
        !!deviceId && devices.devices.some((device) => device.id === deviceId);
    const canReadOperationCatalog =
        !!deviceId &&
        !!homeId &&
        !home.loading &&
        canManage &&
        !devices.loading &&
        !devices.error &&
        deviceIsCurrentHomeMember;
    const currentCatalogKey =
        canManage && deviceId && homeId ? catalogKey(deviceId, homeId, role) : undefined;
    const dialogHost = `operation-delete-${useId()}`;

    const active = useRef(false);
    const focusGeneration = useRef(0);
    const pending = useRef(false);
    const recoveryPending = useRef(false);
    const returnPending = useRef(false);
    const acceptedDelete = useRef<DeleteTarget | null>(null);
    const refreshedAfterDelete = useRef(false);
    const returnedAfterDelete = useRef(false);
    const operationReadRef = useRef<OperationRead | undefined>(undefined);
    const catalogReadRef = useRef<OperationCatalogRead | undefined>(undefined);
    const confirmationRef = useRef<DeleteTarget | null>(null);
    const routeContextRef = useRef({
        operationId,
        deviceId,
        homeId,
        role,
        homeLoading: home.loading,
    });
    const devicesRef = useRef(devices);
    const [operationRead, setOperationRead] = useState<OperationRead>();
    const [catalogRead, setCatalogRead] = useState<OperationCatalogRead>();
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [catalogAttempt, setCatalogAttempt] = useState(0);
    const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteTarget | null>(null);
    const [mutationPending, setMutationPending] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const [deleteRetryTarget, setDeleteRetryTarget] = useState<DeleteTarget | null>(null);
    const [returnError, setReturnError] = useState("");

    operationReadRef.current = operationRead;
    catalogReadRef.current = catalogRead;
    confirmationRef.current = deleteConfirmation;
    routeContextRef.current = { operationId, deviceId, homeId, role, homeLoading: home.loading };
    devicesRef.current = devices;

    const detail = operationRead?.operationId === operationId ? operationRead : undefined;
    const currentCatalog = catalogRead?.key === currentCatalogKey ? catalogRead : undefined;
    const operationIsOnDevice =
        currentCatalog?.loading === false &&
        !currentCatalog.error &&
        currentCatalog.operations?.some((item) => item.id === operationId) === true;
    const sameFocus = (generation: number) =>
        active.current && focusGeneration.current === generation;
    const sameRoute = (target: DeleteTarget) => {
        const current = routeContextRef.current;
        return (
            current.operationId === target.operationId &&
            current.deviceId === target.deviceId &&
            current.homeId === target.homeId &&
            current.role === target.role &&
            !current.homeLoading
        );
    };
    const hasTarget = (target: DeleteTarget, accepted = false) => {
        const currentDetail = operationReadRef.current;
        const currentCatalogRead = catalogReadRef.current;
        const devicesNow = devicesRef.current;
        return (
            sameRoute(target) &&
            currentDetail?.operationId === target.operationId &&
            currentDetail.operation?.id === target.operationId &&
            !devicesNow.loading &&
            !devicesNow.error &&
            devicesNow.devices.some((device) => device.id === target.deviceId) &&
            (accepted ||
                (currentCatalogRead?.key ===
                    catalogKey(target.deviceId, target.homeId, target.role) &&
                    !currentCatalogRead.loading &&
                    !currentCatalogRead.error &&
                    currentCatalogRead.operations?.some(
                        (item) => item.id === target.operationId,
                    ) === true))
        );
    };
    const captureTarget = (): DeleteTarget | undefined =>
        operationId && deviceId && homeId && (role === "Owner" || role === "Manage")
            ? { operationId, deviceId, homeId, role }
            : undefined;

    const loadOperation = async (requestedId: string, generation: number) => {
        const previous = operationReadRef.current;
        setOperationRead({
            operationId: requestedId,
            operation: previous?.operationId === requestedId ? previous.operation : undefined,
            loading: true,
        });
        try {
            const response = await httpClient.get(
                `v1/devices/operations/${encodeURIComponent(requestedId)}`,
            );
            if (!response.isSuccess || !response.response)
                throw new Error("Operation request failed");
            const body: unknown = await response.response.json();
            if (!isOperationDto(body, requestedId)) throw new Error("Invalid operation response");
            if (!sameFocus(generation) || routeContextRef.current.operationId !== requestedId)
                return;
            setOperationRead({ operationId: requestedId, operation: body, loading: false });
        } catch {
            if (!sameFocus(generation) || routeContextRef.current.operationId !== requestedId)
                return;
            setOperationRead({
                operationId: requestedId,
                operation: previous?.operationId === requestedId ? previous.operation : undefined,
                loading: false,
                error: "Failed to load operation details. Try again.",
            });
        }
    };

    const loadOperationCatalog = async (
        targetDeviceId: string,
        targetHomeId: string,
        targetRole: Exclude<HomeRole, "Display" | "Unknown">,
        generation: number,
    ) => {
        const key = catalogKey(targetDeviceId, targetHomeId, targetRole);
        const previous = catalogReadRef.current;
        setCatalogRead({
            key,
            operations: previous?.key === key ? previous.operations : undefined,
            loading: true,
        });
        try {
            const response = await httpClient.get(
                `v1/devices/operations/display?deviceId=${encodeURIComponent(targetDeviceId)}&size=2147483647`,
            );
            let items: OperationListDto[];
            if (response.statusCode === 404) items = [];
            else {
                if (!response.isSuccess || !response.response)
                    throw new Error("Operation catalog request failed");
                const body: unknown = await response.response.json();
                if (
                    !isRecord(body) ||
                    !Array.isArray(body.items) ||
                    !body.items.every(isOperationListDto)
                )
                    throw new Error("Invalid operation catalog response");
                items = body.items;
            }
            if (
                !sameFocus(generation) ||
                routeContextRef.current.deviceId !== targetDeviceId ||
                routeContextRef.current.homeId !== targetHomeId ||
                routeContextRef.current.role !== targetRole
            )
                return;
            setCatalogRead({ key, operations: items, loading: false });
        } catch {
            if (
                !sameFocus(generation) ||
                routeContextRef.current.deviceId !== targetDeviceId ||
                routeContextRef.current.homeId !== targetHomeId ||
                routeContextRef.current.role !== targetRole
            )
                return;
            setCatalogRead({
                key,
                operations: previous?.key === key ? previous.operations : undefined,
                loading: false,
                error: "Couldn't verify the operation on this device. Try again.",
            });
        }
    };

    const returnAfterDelete = async (target: DeleteTarget, generation: number) => {
        if (
            acceptedDelete.current !== target ||
            returnedAfterDelete.current ||
            returnPending.current ||
            !sameFocus(generation) ||
            !hasTarget(target, true)
        )
            return;
        returnPending.current = true;
        setReturnError("");
        try {
            if (router.canGoBack()) router.back();
            else
                router.replace({
                    pathname: "/device/widget/list",
                    params: { deviceId: target.deviceId },
                });
            returnedAfterDelete.current = true;
        } catch {
            if (sameFocus(generation) && hasTarget(target, true))
                setReturnError("Operation deleted. Couldn't return to operations. Try again.");
        } finally {
            returnPending.current = false;
        }
    };

    const recoverAcceptedDelete = async (target: DeleteTarget, generation: number) => {
        if (
            acceptedDelete.current !== target ||
            returnedAfterDelete.current ||
            recoveryPending.current ||
            !sameFocus(generation) ||
            !hasTarget(target, true)
        )
            return;
        recoveryPending.current = true;
        try {
            if (!refreshedAfterDelete.current) {
                refreshedAfterDelete.current = true;
                try {
                    await devicesRef.current.refreshDevice(target.deviceId);
                } catch {
                    // Deletion was accepted; refresh failure cannot reopen it.
                }
            }
            if (sameFocus(generation) && hasTarget(target, true))
                await returnAfterDelete(target, generation);
        } finally {
            recoveryPending.current = false;
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
            !hasTarget(target, true)
        )
            return;
        void recoverAcceptedDeleteRef.current(target, generation);
    };

    const deleteOperation = async (target: DeleteTarget, generation: number) => {
        if (
            pending.current ||
            !sameFocus(generation) ||
            acceptedDelete.current === target ||
            !hasTarget(target)
        )
            return;
        pending.current = true;
        setMutationPending(true);
        setDeleteError("");
        setDeleteRetryTarget(null);
        let accepted = false;
        try {
            const response = await httpClient.delete(
                `v1/devices/operations/${encodeURIComponent(target.operationId)}`,
            );
            if (!response.isSuccess)
                throw new Error(response.statusCode === 409 ? "conflict" : "delete");
            acceptedDelete.current = target;
            accepted = true;
            refreshedAfterDelete.current = false;
            returnedAfterDelete.current = false;
            const key = catalogKey(target.deviceId, target.homeId, target.role);
            setCatalogRead((previous) =>
                previous?.key === key
                    ? {
                          ...previous,
                          operations: previous.operations?.filter(
                              (item) => item.id !== target.operationId,
                          ),
                      }
                    : previous,
            );
            setReturnError("");
        } catch (error) {
            if (sameFocus(generation) && hasTarget(target)) {
                setDeleteError(
                    error instanceof Error && error.message === "conflict"
                        ? conflictMessage
                        : "Couldn't delete this operation. Try again.",
                );
                setDeleteRetryTarget(target);
            }
        } finally {
            pending.current = false;
            setMutationPending(false);
            resumeAfterFocusChanged(generation);
        }
        if (accepted) await recoverAcceptedDelete(target, generation);
    };

    const openDeleteConfirmation = () => {
        const target = captureTarget();
        if (
            !target ||
            !active.current ||
            pending.current ||
            acceptedDelete.current ||
            !hasTarget(target)
        )
            return;
        setDeleteError("");
        setDeleteRetryTarget(null);
        setDeleteConfirmation(target);
    };

    const confirmDelete = (target: DeleteTarget | null) => {
        if (
            !target ||
            confirmationRef.current !== target ||
            pending.current ||
            !sameFocus(focusGeneration.current) ||
            !hasTarget(target)
        )
            return;
        setDeleteConfirmation(null);
        return deleteOperation(target, focusGeneration.current);
    };

    const retryDelete = () => {
        if (pending.current || !active.current) return;
        const accepted = acceptedDelete.current;
        if (accepted && sameRoute(accepted) && hasTarget(accepted, true))
            return void returnAfterDelete(accepted, focusGeneration.current);
        if (deleteRetryTarget && hasTarget(deleteRetryTarget))
            void deleteOperation(deleteRetryTarget, focusGeneration.current);
    };

    useFocusEffect(
        useCallback(() => {
            active.current = true;
            const generation = ++focusGeneration.current;
            setDeleteConfirmation(null);
            const accepted = acceptedDelete.current;
            if (accepted && sameRoute(accepted)) {
                void recoverAcceptedDeleteRef.current(accepted, generation);
            } else if (operationId) {
                void loadOperation(operationId, generation);
                if (canReadOperationCatalog && currentCatalogKey && deviceId && homeId)
                    void loadOperationCatalog(
                        deviceId,
                        homeId,
                        role as Exclude<HomeRole, "Display" | "Unknown">,
                        generation,
                    );
            }
            return () => {
                active.current = false;
                focusGeneration.current++;
                setDeleteConfirmation(null);
            };
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [
            operationId,
            deviceId,
            homeId,
            role,
            home.loading,
            canReadOperationCatalog,
            currentCatalogKey,
            loadAttempt,
            catalogAttempt,
        ]),
    );

    useEffect(() => {
        setDeleteConfirmation(null);
        setDeleteError("");
        setDeleteRetryTarget(null);
        setReturnError("");
    }, [
        operationId,
        deviceId,
        homeId,
        role,
        home.loading,
        devices.loading,
        devices.error,
        deviceIsCurrentHomeMember,
        operationIsOnDevice,
    ]);

    if (!operationId) {
        return (
            <View style={styles.recovery}>
                <Alert icon={CircleAlert} variant="destructive" accessibilityRole="alert">
                    <AlertDescription>Operation not found.</AlertDescription>
                </Alert>
            </View>
        );
    }

    if (!detail || (detail.loading && !detail.operation)) return <Loading />;
    if (!detail.operation) {
        return (
            <View style={styles.recovery}>
                <Alert icon={CircleAlert} variant="destructive" accessibilityRole="alert">
                    <AlertDescription>Failed to load operation details.</AlertDescription>
                </Alert>
                <Button
                    name="Retry"
                    type="brand-outline"
                    loading={detail.loading}
                    disabled={!active.current}
                    onPress={() => {
                        if (active.current && routeContextRef.current.operationId === operationId)
                            setLoadAttempt((attempt) => attempt + 1);
                    }}
                />
            </View>
        );
    }

    const operation = detail.operation;
    const acceptedTarget = acceptedDelete.current;
    const acceptedForCurrentRoute =
        acceptedTarget?.operationId === operationId &&
        acceptedTarget.deviceId === deviceId &&
        acceptedTarget.homeId === homeId &&
        acceptedTarget.role === role &&
        hasTarget(acceptedTarget, true);
    const returnLabel = "Return to operations";

    const readRecovery = detail.error ? (
        <View style={styles.actionSlot}>
            <Alert icon={CircleAlert} variant="destructive" accessibilityRole="alert">
                <AlertDescription>
                    Couldn't refresh operation details. Showing the saved details.
                </AlertDescription>
            </Alert>
            <Button
                name="Retry"
                type="brand-outline"
                loading={detail.loading}
                disabled={!active.current}
                onPress={() => {
                    if (active.current && routeContextRef.current.operationId === operationId)
                        setLoadAttempt((attempt) => attempt + 1);
                }}
            />
        </View>
    ) : null;

    const managementContent =
        canManage && deviceId ? (
            <ContentSection
                title="Delete operation"
                helper="Remove this operation from widgets and device tiles before deleting it. Automations that use it may stop working."
                separated
                actions={
                    <View style={styles.actionSlot}>
                        {acceptedForCurrentRoute ? (
                            <>
                                <Text size="small" color="onBackground">
                                    Operation deleted.
                                </Text>
                                {returnError ? (
                                    <Alert
                                        icon={CircleAlert}
                                        variant="destructive"
                                        accessibilityRole="alert">
                                        <AlertDescription>{returnError}</AlertDescription>
                                    </Alert>
                                ) : null}
                                <Button
                                    name={returnLabel}
                                    type="brand-outline"
                                    loading={returnPending.current}
                                    disabled={returnPending.current || !active.current}
                                    onPress={() =>
                                        void returnAfterDelete(
                                            acceptedTarget!,
                                            focusGeneration.current,
                                        )
                                    }
                                />
                            </>
                        ) : devices.loading || home.loading ? (
                            <Text size="small" color="onBackground">
                                Checking that this device belongs to the current home.
                            </Text>
                        ) : devices.error ? (
                            <>
                                <Alert
                                    icon={CircleAlert}
                                    variant="destructive"
                                    accessibilityRole="alert">
                                    <AlertDescription>
                                        Couldn't verify that this device belongs to the current
                                        home.
                                    </AlertDescription>
                                </Alert>
                                <Button
                                    name="Retry"
                                    type="brand-outline"
                                    loading={devices.loading}
                                    disabled={pending.current || !active.current || devices.loading}
                                    onPress={() => {
                                        if (active.current && !pending.current)
                                            void devices.refresh();
                                    }}
                                />
                            </>
                        ) : !deviceIsCurrentHomeMember ? (
                            <Alert
                                icon={CircleAlert}
                                variant="destructive"
                                accessibilityRole="alert">
                                <AlertDescription>
                                    This device isn't available in the current home.
                                </AlertDescription>
                            </Alert>
                        ) : currentCatalog?.loading || !currentCatalog ? (
                            <Text size="small" color="onBackground">
                                Checking this device's operations.
                            </Text>
                        ) : currentCatalog.error ? (
                            <>
                                <Alert
                                    icon={CircleAlert}
                                    variant="destructive"
                                    accessibilityRole="alert">
                                    <AlertDescription>
                                        Couldn't verify this operation on the device.
                                    </AlertDescription>
                                </Alert>
                                <Button
                                    name="Retry"
                                    type="brand-outline"
                                    loading={currentCatalog.loading}
                                    disabled={
                                        pending.current || !active.current || currentCatalog.loading
                                    }
                                    onPress={() => {
                                        if (active.current && !pending.current)
                                            setCatalogAttempt((attempt) => attempt + 1);
                                    }}
                                />
                            </>
                        ) : !operationIsOnDevice ? (
                            <Alert
                                icon={CircleAlert}
                                variant="destructive"
                                accessibilityRole="alert">
                                <AlertDescription>
                                    This operation isn't available on the bound device.
                                </AlertDescription>
                            </Alert>
                        ) : deleteError ? (
                            <>
                                <Alert
                                    icon={CircleAlert}
                                    variant="destructive"
                                    accessibilityRole="alert">
                                    <AlertDescription>{deleteError}</AlertDescription>
                                </Alert>
                                <Button
                                    name="Retry"
                                    type="brand-outline"
                                    loading={mutationPending}
                                    disabled={mutationPending || !active.current}
                                    onPress={retryDelete}
                                />
                            </>
                        ) : (
                            <Button
                                name="Delete operation"
                                type="brand-destructive"
                                loading={mutationPending}
                                disabled={mutationPending || !active.current}
                                onPress={openDeleteConfirmation}
                            />
                        )}
                    </View>
                }
            />
        ) : null;

    const target = captureTarget();
    const isConfirming = !!deleteConfirmation;
    const closeConfirmation = () => setDeleteConfirmation(null);

    return (
        <AlertDialog
            open={isConfirming}
            onOpenChange={(open) => {
                if (!open) closeConfirmation();
                else openDeleteConfirmation();
            }}
            asChild>
            <View collapsable={false} style={styles.screen}>
                <NativeModal
                    visible={isConfirming}
                    transparent
                    statusBarTranslucent
                    navigationBarTranslucent
                    accessibilityViewIsModal
                    onRequestClose={closeConfirmation}>
                    <PortalHost name={dialogHost} />
                </NativeModal>
                <AlertDialogContent
                    portalHost={dialogHost}
                    accessibilityViewIsModal
                    className="max-w-md"
                    style={styles.dialogContent}>
                    <ScrollView style={styles.dialogBody}>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete “{operation.name}”?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Remove this operation from its widgets and device tiles first.
                                Automations that use it may stop working. Deletion is permanent.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                    </ScrollView>
                    <AlertDialogFooter className="flex-col sm:flex-col">
                        <AlertDialogCancel asChild>
                            <Button
                                name="Cancel"
                                type="brand-outline"
                                loading={false}
                                disabled={mutationPending}
                                onPress={closeConfirmation}
                            />
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <Button
                                name="Delete operation"
                                type="brand-destructive"
                                loading={mutationPending}
                                disabled={mutationPending || !target}
                                onPress={() => confirmDelete(deleteConfirmation)}
                            />
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                <OperationForm
                    key={operationId}
                    deviceId={deviceId}
                    edit
                    disabled={mutationPending || acceptedForCurrentRoute}
                    onSubmit={async () => {}}
                    initName={operation.name}
                    initTopic={operation.topic}
                    initType={operation.type}
                    initConfiguration={operation.configuration}
                    children={
                        <View>
                            {readRecovery}
                            {managementContent}
                        </View>
                    }
                />
            </View>
        </AlertDialog>
    );
};

export default Details;

const styles = StyleSheet.create({
    screen: { flex: 1 },
    recovery: {
        flex: 1,
        justifyContent: "center",
        gap: 16,
        padding: 24,
        maxWidth: 448,
        width: "100%",
        alignSelf: "center",
    },
    actionSlot: { gap: 12 },
    dialogContent: { maxHeight: "90%" },
    dialogBody: { flexShrink: 1 },
});
