import Button from "@/components/common/Button";
import Loading from "@/components/common/Loading";
import WidgetList from "@/components/device/widgets/WidgetList";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Text } from "@/components/ui/text";
import { useDevice } from "@/contexts/custom/DeviceProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import {
    isPlacementAvailable,
    parseDashboardPlacement,
    readGridConfiguration,
} from "@/utils/dashboardGrid";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { CircleAlert } from "lucide-react-native";
import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

const firstRouteValue = (value?: string | string[]) => {
    const first = Array.isArray(value) ? value[0] : value;
    return typeof first === "string" && first.trim().length > 0 ? first : undefined;
};

type DashboardReadState =
    | { key: string; status: "loading" }
    | { key: string; status: "failed" }
    | { key: string; status: "ready"; grid: NonNullable<ReturnType<typeof readGridConfiguration>> };

const PlaceWidget: FC = () => {
    const {
        deviceId: deviceParam,
        dashboardId: dashboardParam,
        row,
        column,
        rowSpan,
        columnSpan,
    } = useLocalSearchParams<{
        deviceId?: string | string[];
        dashboardId?: string | string[];
        row?: string | string[];
        column?: string | string[];
        rowSpan?: string | string[];
        columnSpan?: string | string[];
    }>();
    const device = useDevice();
    const home = useHomes();
    const httpClient = useHttpClient();
    const router = useRouter();
    const { colors } = useTheme().current;
    const dashboardId = firstRouteValue(dashboardParam);
    const routeDeviceId = firstRouteValue(deviceParam);
    const placementRow = firstRouteValue(row);
    const placementColumn = firstRouteValue(column);
    const placementRowSpan = firstRouteValue(rowSpan);
    const placementColumnSpan = firstRouteValue(columnSpan);
    const deviceId =
        routeDeviceId ??
        (device.currentDashboardId === dashboardId ? firstRouteValue(device.deviceId) : undefined);
    const placement = useMemo(
        () =>
            parseDashboardPlacement({
                row: placementRow,
                column: placementColumn,
                rowSpan: placementRowSpan,
                columnSpan: placementColumnSpan,
            }),
        [placementColumn, placementColumnSpan, placementRow, placementRowSpan],
    );
    const resourceKey = JSON.stringify([deviceId ?? null, dashboardId ?? null]);
    const resourceRef = useRef(resourceKey);
    const canManage = home.current?.isOwner === true || home.current?.canManage === true;
    const canManageRef = useRef(canManage);
    const deviceRef = useRef(device);
    const focusedRef = useRef(false);
    const requestRef = useRef(0);
    const submitPendingRef = useRef(false);
    const acceptedRef = useRef(false);
    const acceptedResourceRef = useRef<string | undefined>(undefined);
    const returnPendingRef = useRef(false);
    const [dashboardRead, setDashboardRead] = useState<DashboardReadState>({
        key: "",
        status: "loading",
    });
    const [selectedWidgetId, setSelectedWidgetId] = useState<string>();
    const [submitting, setSubmitting] = useState(false);
    const [actionError, setActionError] = useState("");
    const [returnError, setReturnError] = useState(false);
    const [retryRead, setRetryRead] = useState(0);

    resourceRef.current = resourceKey;
    canManageRef.current = canManage;
    deviceRef.current = device;

    useEffect(() => {
        setSelectedWidgetId(undefined);
        setActionError("");
        setReturnError(false);
        if (acceptedResourceRef.current !== resourceKey) {
            acceptedRef.current = false;
            returnPendingRef.current = false;
        }
    }, [resourceKey]);

    useEffect(() => {
        if (!canManage) {
            setSelectedWidgetId(undefined);
            setActionError("");
        }
    }, [canManage]);

    useEffect(() => {
        const request = ++requestRef.current;
        if (!canManage || !dashboardId || !deviceId || !placement) return;
        setDashboardRead({ key: resourceKey, status: "loading" });
        let active = true;
        const isCurrent = () =>
            active && request === requestRef.current && resourceRef.current === resourceKey;

        void (async () => {
            try {
                const response = await httpClient.get(
                    `v1/devices/dashboards/${dashboardId}/display`,
                );
                if (!response.isSuccess || !response.response)
                    throw new Error("Dashboard read failed");
                const content: unknown = await response.response.json();
                const grid =
                    content && typeof content === "object" && "configuration" in content
                        ? readGridConfiguration(content.configuration)
                        : undefined;
                if (!grid) throw new Error("Dashboard configuration is invalid");
                if (isCurrent()) setDashboardRead({ key: resourceKey, status: "ready", grid });
            } catch {
                if (isCurrent()) setDashboardRead({ key: resourceKey, status: "failed" });
            }
        })();

        return () => {
            active = false;
        };
    }, [canManage, dashboardId, deviceId, httpClient, placement, resourceKey, retryRead]);

    const returnToDashboard = useCallback(() => {
        try {
            if (router.canGoBack()) {
                router.back();
                return true;
            }
            if (deviceId) {
                router.replace({ pathname: "/device/device", params: { deviceId } });
                return true;
            }
            router.replace("/");
            return true;
        } catch {
            return false;
        }
    }, [deviceId, router]);

    const returnAfterAcceptedPlacement = useCallback(() => {
        if (
            !focusedRef.current ||
            !returnPendingRef.current ||
            acceptedResourceRef.current !== resourceRef.current
        )
            return;
        returnPendingRef.current = false;
        setReturnError(false);
        if (!returnToDashboard()) setReturnError(true);
    }, [returnToDashboard]);

    useFocusEffect(
        useCallback(() => {
            focusedRef.current = true;
            returnAfterAcceptedPlacement();
            return () => {
                focusedRef.current = false;
            };
        }, [returnAfterAcceptedPlacement]),
    );

    const readIsCurrent = dashboardRead.key === resourceKey;
    const readReady = readIsCurrent && dashboardRead.status === "ready";
    const areaAvailable =
        readReady && Boolean(placement && isPlacementAvailable(dashboardRead.grid, placement));

    const selectWidget = async (widgetId: string) => {
        if (!canManageRef.current || submitPendingRef.current || acceptedRef.current) return;
        setSelectedWidgetId(widgetId);
        setActionError("");
    };

    const addOperation = () => {
        if (!canManageRef.current || submitPendingRef.current || acceptedRef.current || !deviceId)
            return;
        router.push({ pathname: "device/operation/add", params: { deviceId } });
    };

    const placeSelectedWidget = async () => {
        if (
            submitPendingRef.current ||
            acceptedRef.current ||
            !canManageRef.current ||
            !deviceId ||
            !dashboardId ||
            !placement ||
            !selectedWidgetId ||
            !areaAvailable
        )
            return;

        submitPendingRef.current = true;
        setSubmitting(true);
        setActionError("");
        const capturedResource = resourceKey;
        const values = {
            widgetId: selectedWidgetId,
            row: placement.row,
            column: placement.column,
            rowSpan: placement.rowSpan,
            columnSpan: placement.columnSpan,
        };

        try {
            const response = await httpClient.put(
                `v1/devices/dashboards/${dashboardId}/widgets`,
                values,
            );
            if (!response.isSuccess) throw new Error("Widget placement failed");
            acceptedRef.current = true;
            acceptedResourceRef.current = capturedResource;
            returnPendingRef.current = true;
            if (deviceRef.current.deviceId === deviceId)
                void deviceRef.current.refresh(false).catch(() => {});
            if (resourceRef.current === capturedResource) returnAfterAcceptedPlacement();
        } catch {
            if (resourceRef.current === capturedResource && canManageRef.current)
                setActionError("Couldn't place this widget. Try again.");
        } finally {
            submitPendingRef.current = false;
            if (resourceRef.current === capturedResource) setSubmitting(false);
        }
    };

    const hasRouteIdentity = Boolean(deviceId && dashboardId);
    const routeUnavailable = !hasRouteIdentity || !placement;

    const screenMessage = (message: string, actionLabel = "Return to dashboard") => (
        <View style={[styles.recovery, { backgroundColor: colors.background }]}>
            <Alert
                icon={CircleAlert}
                variant="destructive"
                accessibilityRole="alert"
                accessibilityLiveRegion="polite">
                <AlertDescription>{message}</AlertDescription>
            </Alert>
            <Button
                name={actionLabel}
                type="brand-outline"
                loading={false}
                onPress={() => {
                    if (!returnToDashboard()) setReturnError(true);
                }}
            />
            {returnError && (
                <Text style={[styles.helper, { color: colors.error }]}>
                    Couldn't return to the dashboard. Try again.
                </Text>
            )}
        </View>
    );

    if (home.loading) return <Loading />;
    if (!canManage) return screenMessage("You don't have permission to manage this device.");
    if (routeUnavailable)
        return screenMessage(
            "Placement unavailable. Return to the dashboard and choose an area again.",
            deviceId ? "Return to dashboard" : "Return",
        );
    if (!readIsCurrent || dashboardRead.status === "loading") return <Loading />;
    if (dashboardRead.status === "failed")
        return (
            <View style={[styles.recovery, { backgroundColor: colors.background }]}>
                <Alert
                    icon={CircleAlert}
                    variant="destructive"
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite">
                    <AlertDescription>Couldn't load this dashboard. Try again.</AlertDescription>
                </Alert>
                <Button
                    name="Retry"
                    type="brand-outline"
                    loading={false}
                    onPress={() => setRetryRead((value) => value + 1)}
                />
                <Button
                    name="Return to dashboard"
                    type="brand-ghost"
                    loading={false}
                    onPress={() => {
                        if (!returnToDashboard()) setReturnError(true);
                    }}
                />
            </View>
        );
    if (!areaAvailable)
        return screenMessage(
            "This area is no longer available. Return to the dashboard and choose another area.",
        );

    return (
        <View style={[styles.screen, { backgroundColor: colors.background }]}>
            <View style={styles.heading}>
                <Text
                    accessibilityRole="header"
                    style={[styles.title, { color: colors.authForeground }]}>
                    Choose widget
                </Text>
                <Text style={[styles.helper, { color: colors.authMuted }]}>
                    Choose a widget for the selected dashboard area.
                </Text>
                <Text style={[styles.helper, { color: colors.authMuted }]}>
                    Row {placement.row + 1} · Column {placement.column + 1} · {placement.rowSpan}{" "}
                    {placement.rowSpan === 1 ? "row" : "rows"} × {placement.columnSpan}{" "}
                    {placement.columnSpan === 1 ? "column" : "columns"}
                </Text>
                <Button
                    name="Add operation"
                    type="brand-outline"
                    loading={false}
                    disabled={submitting || acceptedRef.current}
                    onPress={addOperation}
                />
            </View>

            <WidgetList
                deviceId={deviceId}
                overrideOnClick={selectWidget}
                selectedWidgetId={selectedWidgetId}
                disabled={submitting || acceptedRef.current}
            />

            <View style={styles.footer}>
                {!!actionError && (
                    <Alert
                        icon={CircleAlert}
                        compact
                        variant="destructive"
                        accessibilityRole="alert"
                        accessibilityLiveRegion="polite">
                        <AlertDescription compact>{actionError}</AlertDescription>
                    </Alert>
                )}
                {returnError && (
                    <Alert
                        icon={CircleAlert}
                        compact
                        variant="destructive"
                        accessibilityRole="alert"
                        accessibilityLiveRegion="polite">
                        <AlertDescription compact>
                            Widget placed. Return to the dashboard to continue.
                        </AlertDescription>
                    </Alert>
                )}
                <Button
                    name="Place widget"
                    type="auth"
                    loading={submitting}
                    disabled={!selectedWidgetId || submitting || acceptedRef.current}
                    onPress={() => void placeSelectedWidget()}
                />
                {returnError && (
                    <Button
                        name="Return to dashboard"
                        type="brand-outline"
                        loading={false}
                        onPress={() => {
                            if (!returnToDashboard()) setReturnError(true);
                        }}
                    />
                )}
            </View>
        </View>
    );
};

export default PlaceWidget;

const styles = StyleSheet.create({
    screen: { flex: 1, minHeight: 0 },
    title: { fontSize: 24, lineHeight: 32, fontWeight: "600" },
    helper: { fontSize: 14, lineHeight: 20 },
    heading: { gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
    footer: { gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
    recovery: { flex: 1, justifyContent: "center", gap: 16, padding: 16 },
});
