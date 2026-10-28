import Button from "@/components/common/Button";
import Loading from "@/components/common/Loading";
import Icon from "@/components/common/Icon";
import SectionHeaderAction from "@/components/common/SectionHeaderAction";
import WidgetPlacementCanvas from "@/components/device/dashboards/Grid/WidgetPlacementCanvas";
import type { WidgetListDto } from "@/types/DeviceTypes";
import type { DashboardPlacement } from "@/utils/dashboardGrid";
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
    const initialPlacement = useMemo(
        () =>
            parseDashboardPlacement({
                row: placementRow,
                column: placementColumn,
                rowSpan: placementRowSpan,
                columnSpan: placementColumnSpan,
            }),
        [placementColumn, placementColumnSpan, placementRow, placementRowSpan],
    );
    const resourceKey = JSON.stringify([
        deviceId ?? null,
        dashboardId ?? null,
        placementRow,
        placementColumn,
        placementRowSpan,
        placementColumnSpan,
    ]);
    const resourceRef = useRef(resourceKey);
    const canManage =
        !home.loading && (home.current?.isOwner === true || home.current?.canManage === true);
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
    const [selectedWidget, setSelectedWidget] = useState<WidgetListDto>();
    const [placement, setPlacement] = useState(initialPlacement);
    const draftRef = useRef({
        resourceKey,
        placement: initialPlacement,
        widgetId: undefined as string | undefined,
    });
    const [submitting, setSubmitting] = useState(false);
    const [actionError, setActionError] = useState("");
    const [returnError, setReturnError] = useState(false);
    const [retryRead, setRetryRead] = useState(0);

    resourceRef.current = resourceKey;
    canManageRef.current = canManage;
    deviceRef.current = device;

    useEffect(() => {
        setSelectedWidgetId(undefined);
        setSelectedWidget(undefined);
        setPlacement(initialPlacement);
        draftRef.current = { resourceKey, placement: initialPlacement, widgetId: undefined };
        setActionError("");
        setReturnError(false);
        if (acceptedResourceRef.current !== resourceKey) {
            acceptedRef.current = false;
            returnPendingRef.current = false;
        }
    }, [resourceKey, initialPlacement]);

    useEffect(() => {
        if (!canManage) {
            setSelectedWidgetId(undefined);
            setSelectedWidget(undefined);
            draftRef.current.widgetId = undefined;
            setActionError("");
        }
    }, [canManage]);

    useEffect(() => {
        const request = ++requestRef.current;
        if (!canManage || !dashboardId || !deviceId || !initialPlacement) return;
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
    }, [canManage, dashboardId, deviceId, httpClient, initialPlacement, resourceKey, retryRead]);

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

    const selectWidget = async (widgetId: string, widget?: WidgetListDto) => {
        if (
            !canManageRef.current ||
            !focusedRef.current ||
            submitPendingRef.current ||
            acceptedRef.current ||
            resourceRef.current !== resourceKey ||
            !readReady ||
            dashboardRead.grid.positionedWidgets.some((item) => item.widgetId === widgetId)
        )
            return;
        setSelectedWidgetId(widgetId);
        setSelectedWidget(
            widget ?? { id: widgetId, name: "Selected widget", type: "Invalid", enabled: true },
        );
        draftRef.current = { resourceKey, placement, widgetId };
        setActionError("");
    };

    const changePlacement = (next: DashboardPlacement) => {
        if (
            !canManageRef.current ||
            !focusedRef.current ||
            submitPendingRef.current ||
            acceptedRef.current ||
            resourceRef.current !== resourceKey ||
            !readReady ||
            !isPlacementAvailable(dashboardRead.grid, next)
        )
            return;
        draftRef.current.placement = next;
        setPlacement(next);
        setActionError("");
    };

    const addOperation = () => {
        if (
            !canManageRef.current ||
            !focusedRef.current ||
            submitPendingRef.current ||
            acceptedRef.current ||
            !deviceId
        )
            return;
        router.push({ pathname: "device/operation/add", params: { deviceId } });
    };

    const placeSelectedWidget = async () => {
        const draft = draftRef.current;
        if (
            submitPendingRef.current ||
            acceptedRef.current ||
            !canManageRef.current ||
            !focusedRef.current ||
            !deviceId ||
            !dashboardId ||
            !draft.placement ||
            !draft.widgetId ||
            draft.resourceKey !== resourceKey ||
            resourceRef.current !== resourceKey ||
            !readReady ||
            !isPlacementAvailable(dashboardRead.grid, draft.placement) ||
            dashboardRead.grid.positionedWidgets.some((item) => item.widgetId === draft.widgetId)
        )
            return;

        submitPendingRef.current = true;
        setSubmitting(true);
        setActionError("");
        const capturedResource = resourceKey;
        const values = {
            widgetId: draft.widgetId,
            row: draft.placement.row,
            column: draft.placement.column,
            rowSpan: draft.placement.rowSpan,
            columnSpan: draft.placement.columnSpan,
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
                <View style={styles.headingRow}>
                    <Text
                        accessibilityRole="header"
                        style={[styles.title, { color: colors.authForeground }]}>
                        {selectedWidget ? "Position widget" : "Choose widget"}
                    </Text>
                    {selectedWidget && !acceptedRef.current ? (
                        <SectionHeaderAction
                            label="Change"
                            accessibilityLabel="Choose another widget"
                            icon={<Icon icon="swap-horizontal-outline" size={20} color="brand" />}
                            disabled={submitting}
                            onPress={() => {
                                if (submitPendingRef.current || acceptedRef.current) return;
                                setSelectedWidgetId(undefined);
                                setSelectedWidget(undefined);
                                draftRef.current.widgetId = undefined;
                                setActionError("");
                            }}
                        />
                    ) : !selectedWidget ? (
                        <SectionHeaderAction
                            label="Add operation"
                            accessibilityLabel="Add operation"
                            icon={<Icon icon="add-outline" size={20} color="brand" />}
                            disabled={submitting || acceptedRef.current}
                            onPress={addOperation}
                        />
                    ) : null}
                </View>
                {selectedWidget && (
                    <Text style={[styles.widgetName, { color: colors.authForeground }]}>
                        {selectedWidget.name}
                    </Text>
                )}
                <Text style={[styles.helper, { color: colors.authMuted }]}>
                    {selectedWidget
                        ? "Drag to move or tap a free cell. Drag the corner to resize."
                        : "Choose a widget, then place and resize it on the grid."}
                </Text>
            </View>
            {selectedWidget ? (
                <WidgetPlacementCanvas
                    key={selectedWidget.id}
                    grid={dashboardRead.grid}
                    widget={selectedWidget}
                    placement={placement}
                    onChange={changePlacement}
                    disabled={submitting || acceptedRef.current}
                />
            ) : (
                <WidgetList
                    deviceId={deviceId}
                    overrideOnClick={selectWidget}
                    excludedWidgetIds={dashboardRead.grid.positionedWidgets.map(
                        (item) => item.widgetId,
                    )}
                    disabled={submitting || acceptedRef.current}
                />
            )}

            {selectedWidgetId && (
                <View style={styles.footer}>
                    <Text
                        style={[styles.helper, { color: colors.authMuted }]}
                        accessibilityLiveRegion="polite">
                        {placement.columnSpan} {placement.columnSpan === 1 ? "column" : "columns"} ×{" "}
                        {placement.rowSpan} {placement.rowSpan === 1 ? "row" : "rows"}
                    </Text>
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
                        name="Add widget"
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
            )}
        </View>
    );
};

export default PlaceWidget;

const styles = StyleSheet.create({
    screen: { flex: 1, minHeight: 0 },
    title: { flexShrink: 1, fontSize: 24, lineHeight: 32, fontWeight: "600" },
    helper: { fontSize: 14, lineHeight: 20 },
    widgetName: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
    heading: { gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
    headingRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    footer: { gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
    recovery: { flex: 1, justifyContent: "center", gap: 16, padding: 16 },
});
