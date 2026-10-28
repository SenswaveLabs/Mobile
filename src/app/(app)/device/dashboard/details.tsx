import Button from "@/components/common/Button";
import ContentSection from "@/components/common/ContentSection";
import Loading from "@/components/common/Loading";
import DashboardForm, {
    type DashboardFormValues,
} from "@/components/device/dashboards/DashboardForm";
import type { DashboardDto } from "@/components/device/dashboards/DashboardView";
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
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDevice } from "@/contexts/custom/DeviceProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { CircleAlert } from "lucide-react-native";
import React, { FC, useCallback, useEffect, useId, useRef, useState } from "react";
import { Modal as NativeModal, ScrollView, StyleSheet, View } from "react-native";
import { PortalHost } from "@rn-primitives/portal";

interface DashboardReadState {
    key: string;
    dashboard?: DashboardDto;
}

const normalizeId = (value?: string | string[]) => {
    const id = Array.isArray(value) ? value[0] : value;
    return typeof id === "string" && id.trim() ? id : undefined;
};

const isDashboardDto = (value: unknown, dashboardId: string): value is DashboardDto => {
    if (!value || typeof value !== "object") return false;
    const dashboard = value as Partial<DashboardDto>;
    const nameLength = typeof dashboard.name === "string" ? dashboard.name.trim().length : 0;
    return (
        dashboard.id === dashboardId &&
        nameLength >= 3 &&
        nameLength <= 64 &&
        typeof dashboard.icon === "string" &&
        dashboard.icon.trim().length > 0
    );
};

const Details: FC = () => {
    const { dashboardId: dashboardParam, deviceId: deviceParam } = useLocalSearchParams<{
        dashboardId?: string | string[];
        deviceId?: string | string[];
    }>();
    const dashboardId = normalizeId(dashboardParam);
    const deviceId = normalizeId(deviceParam);
    const resourceKey = dashboardId ?? "missing-dashboard";
    const router = useRouter();
    const httpClient = useHttpClient();
    const device = useDevice();
    const home = useHomes();
    const canManage = home.current?.isOwner === true || home.current?.canManage === true;
    const canManageRef = useRef(canManage);
    canManageRef.current = canManage;
    const deviceRef = useRef(device);
    deviceRef.current = device;
    const resourceRef = useRef(resourceKey);
    resourceRef.current = resourceKey;
    const origin = useRef<{ key: string; deviceId?: string }>({ key: "", deviceId: undefined });
    if (origin.current.key !== resourceKey) {
        origin.current = {
            key: resourceKey,
            deviceId:
                deviceId ??
                (device.currentDashboardId === dashboardId
                    ? normalizeId(device.deviceId)
                    : undefined),
        };
    }

    const active = useRef(true);
    const pending = useRef(new Set<string>());
    const completed = useRef(new Set<string>());
    const returning = useRef(new Set<string>());
    const returned = useRef(new Set<string>());
    const [details, setDetails] = useState<DashboardReadState>();
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [busy, setBusy] = useState<{ key: string; kind: "save" | "delete" } | null>(null);
    const [deletedKey, setDeletedKey] = useState<string>();
    const [deleteError, setDeleteError] = useState("");
    const [navigationError, setNavigationError] = useState("");
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const dialogHost = useId();

    const returnAfterDelete = useCallback(
        async (key: string, originDeviceId?: string) => {
            if (
                !active.current ||
                !completed.current.has(key) ||
                returned.current.has(key) ||
                returning.current.has(key)
            )
                return;
            returning.current.add(key);
            try {
                if (router.canGoBack()) await router.back();
                else if (originDeviceId)
                    await router.replace({
                        pathname: "/device/device",
                        params: { deviceId: originDeviceId },
                    });
                else await router.replace("/");
                returned.current.add(key);
                if (resourceRef.current === key) setNavigationError("");
            } catch {
                if (active.current && resourceRef.current === key)
                    setNavigationError(
                        originDeviceId
                            ? "Dashboard deleted. Return to the device to continue."
                            : "Dashboard deleted. Return home to continue.",
                    );
            } finally {
                returning.current.delete(key);
            }
        },
        [router],
    );

    useFocusEffect(
        useCallback(() => {
            active.current = true;
            if (dashboardId && completed.current.has(resourceKey))
                void returnAfterDelete(resourceKey, origin.current.deviceId);
            return () => {
                active.current = false;
            };
        }, [dashboardId, resourceKey, returnAfterDelete]),
    );

    useEffect(() => {
        let current = true;
        setShowDeleteDialog(false);
        setDeleteError("");
        setNavigationError("");
        setDetails(undefined);
        if (!dashboardId || home.loading || !canManageRef.current)
            return () => {
                current = false;
            };

        const load = async () => {
            try {
                const response = await httpClient.get(`v1/devices/dashboards/${dashboardId}`);
                if (!response.isSuccess || !response.response) throw new Error();
                const value: unknown = await response.response.json();
                if (!isDashboardDto(value, dashboardId)) throw new Error();
                if (current && resourceRef.current === resourceKey)
                    setDetails({ key: resourceKey, dashboard: value });
            } catch {
                if (current && resourceRef.current === resourceKey)
                    setDetails({ key: resourceKey });
            }
        };
        void load();
        return () => {
            current = false;
        };
        // Reload only for route identity or explicit Retry.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dashboardId, resourceKey, loadAttempt, home.loading, canManage]);

    const refreshOriginDevice = (key: string, originDeviceId?: string) => {
        if (
            !originDeviceId ||
            resourceRef.current !== key ||
            deviceRef.current.deviceId !== originDeviceId
        )
            return;
        try {
            void deviceRef.current.refresh(false).catch(() => {});
        } catch {
            // The accepted dashboard mutation stays accepted if refresh cannot start.
        }
    };

    const mutate = async (values?: DashboardFormValues) => {
        const key = resourceKey;
        const saveError = "Couldn't save this dashboard. Try again.";
        const removeError = "Couldn't delete this dashboard. Try again.";
        if (
            !dashboardId ||
            details?.key !== key ||
            !details.dashboard ||
            pending.current.has(key) ||
            completed.current.has(key) ||
            resourceRef.current !== key ||
            !active.current ||
            !canManageRef.current
        ) {
            if (values) throw new Error(saveError);
            return;
        }

        const originDeviceId = origin.current.deviceId;
        pending.current.add(key);
        setBusy({ key, kind: values ? "save" : "delete" });
        setDeleteError("");
        setNavigationError("");
        setShowDeleteDialog(false);
        try {
            const path = `v1/devices/dashboards/${dashboardId}`;
            const response = values
                ? await httpClient.patch(path, values)
                : await httpClient.delete(path);
            if (!response.isSuccess) throw new Error();

            if (values) {
                if (resourceRef.current === key)
                    setDetails((current) =>
                        current?.key === key && current.dashboard
                            ? {
                                  ...current,
                                  dashboard: {
                                      ...current.dashboard,
                                      name: values.name ?? current.dashboard.name,
                                      icon: values.icon ?? current.dashboard.icon,
                                  },
                              }
                            : current,
                    );
                refreshOriginDevice(key, originDeviceId);
            } else {
                completed.current.add(key);
                if (resourceRef.current === key) setDeletedKey(key);
                refreshOriginDevice(key, originDeviceId);
                if (active.current && resourceRef.current === key)
                    await returnAfterDelete(key, originDeviceId);
            }
        } catch {
            if (values) throw new Error(saveError);
            if (active.current && resourceRef.current === key) setDeleteError(removeError);
        } finally {
            pending.current.delete(key);
            setBusy((current) => (current?.key === key ? null : current));
        }
    };

    const openDeleteConfirmation = () => {
        if (
            !dashboardId ||
            !active.current ||
            resourceRef.current !== resourceKey ||
            pending.current.has(resourceKey) ||
            completed.current.has(resourceKey) ||
            !canManageRef.current
        )
            return;
        setDeleteError("");
        setNavigationError("");
        setShowDeleteDialog(true);
    };

    if (!dashboardId) {
        return (
            <View style={styles.loadContent}>
                <Alert
                    icon={CircleAlert}
                    variant="destructive"
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite">
                    <AlertDescription>Dashboard not found.</AlertDescription>
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

    if (home.loading) return <Loading activityColor="textOnBackground" />;
    if (!canManage) {
        return (
            <View style={styles.loadContent}>
                <Alert
                    icon={CircleAlert}
                    variant="destructive"
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite">
                    <AlertDescription>
                        You don't have permission to manage this device.
                    </AlertDescription>
                </Alert>
                <Button
                    name="Return to device"
                    type="auth"
                    loading={false}
                    onPress={() =>
                        origin.current.deviceId
                            ? router.replace({
                                  pathname: "/device/device",
                                  params: { deviceId: origin.current.deviceId },
                              })
                            : router.replace("/")
                    }
                />
            </View>
        );
    }

    if (details?.key !== resourceKey) return <Loading activityColor="textOnBackground" />;
    if (!details.dashboard) {
        return (
            <View style={styles.loadContent}>
                <Alert
                    icon={CircleAlert}
                    variant="destructive"
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite">
                    <AlertDescription>Couldn't load this dashboard. Try again.</AlertDescription>
                </Alert>
                <Button
                    name="Retry"
                    type="auth"
                    loading={false}
                    onPress={() => {
                        setDetails(undefined);
                        setLoadAttempt((attempt) => attempt + 1);
                    }}
                />
            </View>
        );
    }

    const dashboard = details.dashboard;
    const isBusy = busy?.key === resourceKey;
    const isDeleted = deletedKey === resourceKey;
    const canDelete = !isBusy && !isDeleted;
    const returnLabel = origin.current.deviceId ? "Return to device" : "Return home";

    return (
        <AlertDialog
            open={showDeleteDialog}
            onOpenChange={(open) => {
                if (!open) setShowDeleteDialog(false);
                else openDeleteConfirmation();
            }}
            asChild>
            <View style={styles.screen}>
                <NativeModal
                    visible={showDeleteDialog}
                    transparent
                    statusBarTranslucent
                    navigationBarTranslucent
                    accessibilityViewIsModal
                    onRequestClose={() => setShowDeleteDialog(false)}>
                    <PortalHost name={dialogHost} />
                </NativeModal>
                <AlertDialogContent
                    portalHost={dialogHost}
                    accessibilityViewIsModal
                    className="max-w-md"
                    style={styles.dialogContent}>
                    <ScrollView style={styles.dialogBody}>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete “{dashboard.name}”?</AlertDialogTitle>
                            <AlertDialogDescription>
                                The dashboard layout will be permanently deleted. Widgets themselves
                                are not removed. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                    </ScrollView>
                    <AlertDialogFooter className="flex-col">
                        <AlertDialogCancel asChild>
                            <Button
                                name="Cancel"
                                type="brand-outline"
                                loading={false}
                                disabled={isBusy}
                                onPress={() => setShowDeleteDialog(false)}
                            />
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <Button
                                name="Delete dashboard"
                                type="brand-destructive"
                                loading={busy?.key === resourceKey && busy.kind === "delete"}
                                disabled={!canDelete}
                                onPress={() => mutate()}
                            />
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                <DashboardForm
                    key={dashboardId}
                    dashboard={dashboard}
                    disabled={(isBusy && busy?.kind === "delete") || isDeleted}
                    onSubmit={mutate}>
                    <ContentSection
                        title="Delete dashboard"
                        helper="Remove this layout. Your widgets will stay available."
                        separated
                        actions={
                            <View style={styles.actionSlot}>
                                {navigationError ? (
                                    <Button
                                        name={returnLabel}
                                        type="brand-outline"
                                        loading={false}
                                        onPress={() =>
                                            void returnAfterDelete(
                                                resourceKey,
                                                origin.current.deviceId,
                                            )
                                        }
                                    />
                                ) : (
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            name="Delete dashboard"
                                            type="brand-destructive"
                                            loading={
                                                busy?.key === resourceKey && busy.kind === "delete"
                                            }
                                            disabled={!canDelete}
                                            onPress={openDeleteConfirmation}
                                        />
                                    </AlertDialogTrigger>
                                )}
                            </View>
                        }>
                        {!!deleteError && (
                            <Alert
                                icon={CircleAlert}
                                variant="destructive"
                                accessibilityRole="alert"
                                accessibilityLiveRegion="polite">
                                <AlertDescription>{deleteError}</AlertDescription>
                            </Alert>
                        )}
                        {!!navigationError && (
                            <Alert
                                icon={CircleAlert}
                                variant="destructive"
                                accessibilityRole="alert"
                                accessibilityLiveRegion="polite">
                                <AlertDescription>{navigationError}</AlertDescription>
                            </Alert>
                        )}
                    </ContentSection>
                </DashboardForm>
            </View>
        </AlertDialog>
    );
};

export default Details;

const styles = StyleSheet.create({
    screen: { flex: 1 },
    loadContent: { width: "100%", maxWidth: 448, alignSelf: "center", padding: 24, gap: 24 },
    actionSlot: { minHeight: 72, justifyContent: "center" },
    dialogContent: { maxHeight: "90%" },
    dialogBody: { flexShrink: 1 },
});
