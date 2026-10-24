import Button from "@/components/common/Button";
import Icon from "@/components/common/Icon";
import Loading from "@/components/common/Loading";
import WidgetView from "@/components/device/widgets/WidgetView";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Text } from "@/components/ui/text";
import { useDevice } from "@/contexts/custom/DeviceProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import {
    isPlacementAvailable,
    readGridConfiguration,
    unlinkDashboardWidget,
} from "@/utils/dashboardGrid";
import { PortalHost } from "@rn-primitives/portal";
import { useRouter } from "expo-router";
import { CircleAlert } from "lucide-react-native";
import React, { FC, ReactNode, useEffect, useId, useRef, useState } from "react";
import {
    Modal as NativeModal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
    useWindowDimensions,
} from "react-native";
import type { CalculatedWidget, PositionedWidget } from "../DashboardView";

const GAP = 8;
const MIN_CELL_WIDTH = 48;
const MIN_ROW_HEIGHT = 96;
const invalidWidget = (id: string): CalculatedWidget => ({
    id,
    name: "Unknown",
    type: "Invalid",
    configuration: {},
    updatedAtUtc: "",
    createdAtUtc: "",
});
const widgetPositionKey = (dashboardId: string, position: PositionedWidget) =>
    `${dashboardId}:${position.widgetId}:${position.row}:${position.column}`;

export interface GridDashboardViewProps {
    deviceId: string;
    dashboardId: string;
    canManage: boolean;
    header?: ReactNode;
}

interface UnlinkTarget {
    deviceId: string;
    dashboardId: string;
    widgetId: string;
    widgetName: string;
}

const GridDashboardView: FC<GridDashboardViewProps> = ({
    deviceId,
    dashboardId,
    canManage,
    header,
}) => {
    const { colors } = useTheme().current;
    const { width: windowWidth } = useWindowDimensions();
    const device = useDevice();
    const httpClient = useHttpClient();
    const router = useRouter();
    const identity = `${deviceId}:${dashboardId}`;
    const identityRef = useRef(identity);
    const canManageRef = useRef(canManage);
    const deviceRef = useRef(device);
    identityRef.current = identity;
    canManageRef.current = canManage;
    deviceRef.current = device;

    const [measuredLayout, setMeasuredLayout] = useState<
        { windowWidth: number; width: number } | undefined
    >();
    const layoutWidth =
        measuredLayout?.windowWidth === windowWidth
            ? measuredLayout.width
            : Math.max(0, windowWidth - 32);
    const [refreshing, setRefreshing] = useState(false);
    const [unlinkTarget, setUnlinkTarget] = useState<UnlinkTarget>();
    const [failedUnlink, setFailedUnlink] = useState<UnlinkTarget>();
    const [unlinking, setUnlinking] = useState(false);
    const [positionOverride, setPositionOverride] = useState<{
        grid: NonNullable<ReturnType<typeof readGridConfiguration>>;
        positions: PositionedWidget[];
    }>();
    const [feedbackHeights, setFeedbackHeights] = useState<Record<string, number>>({});
    const unlinkPendingRef = useRef(false);
    const dialogHost = useId();

    const selectedDashboard =
        device.deviceId === deviceId && device.currentDashboardId === dashboardId
            ? device.currentDashboard
            : undefined;
    const grid = selectedDashboard
        ? readGridConfiguration(selectedDashboard.configuration)
        : undefined;
    const positions =
        positionOverride?.grid === grid
            ? (positionOverride?.positions ?? [])
            : (grid?.positionedWidgets ?? []);

    useEffect(() => {
        setUnlinkTarget(undefined);
        setFailedUnlink(undefined);
        setUnlinking(false);
        setPositionOverride(undefined);
        setFeedbackHeights({});
    }, [identity]);

    useEffect(() => {
        if (!canManage) {
            setUnlinkTarget(undefined);
            setFailedUnlink(undefined);
        }
    }, [canManage]);

    if (!selectedDashboard) return <Loading />;

    const refresh = async () => {
        setRefreshing(true);
        try {
            await device.refresh(false);
        } finally {
            setRefreshing(false);
        }
    };

    const columns = grid?.columns ?? 1;
    const rows = grid?.rows ?? 1;
    const cellWidth = layoutWidth
        ? Math.max(MIN_CELL_WIDTH, (layoutWidth - GAP * (columns - 1)) / columns)
        : MIN_CELL_WIDTH;
    const gridWidth = columns * cellWidth + GAP * (columns - 1);
    const rowHeight = Math.max(
        MIN_ROW_HEIGHT,
        ...positions.map(
            (position) =>
                MIN_ROW_HEIGHT +
                (feedbackHeights[widgetPositionKey(dashboardId, position)] ?? 0) /
                    Math.max(1, position.rowSpan),
        ),
    );
    const gridHeight = rows * rowHeight + GAP * (rows - 1);
    const placedWidgets = positions.map((position) => ({
        position,
        widget:
            grid?.calculatedWidgets.find((candidate) => candidate.id === position.widgetId) ??
            invalidWidget(position.widgetId),
    }));

    const chooseCell = (row: number, column: number) => {
        if (
            !canManageRef.current ||
            unlinkPendingRef.current ||
            identityRef.current !== identity ||
            deviceRef.current.deviceId !== deviceId ||
            deviceRef.current.currentDashboardId !== dashboardId ||
            !grid
        )
            return;
        const placement = { row, column, rowSpan: 1, columnSpan: 1 };
        if (!isPlacementAvailable({ ...grid, positionedWidgets: positions }, placement)) return;
        router.push({
            pathname: "device/dashboard/placeWidget",
            params: {
                deviceId,
                dashboardId,
                row: String(row),
                column: String(column),
                rowSpan: "1",
                columnSpan: "1",
            },
        });
    };

    const isCurrentUnlink = (target: UnlinkTarget) =>
        identityRef.current === `${target.deviceId}:${target.dashboardId}` &&
        canManageRef.current &&
        deviceRef.current.deviceId === target.deviceId &&
        deviceRef.current.currentDashboardId === target.dashboardId;

    const attemptUnlink = async (target: UnlinkTarget) => {
        if (unlinkPendingRef.current || !isCurrentUnlink(target)) return;
        unlinkPendingRef.current = true;
        setUnlinking(true);
        setFailedUnlink(undefined);
        setUnlinkTarget(undefined);

        const accepted = await unlinkDashboardWidget({
            dashboardId: target.dashboardId,
            widgetId: target.widgetId,
            deleteWidget: (path) => httpClient.delete(path),
            onRemoved: () => {
                if (grid && isCurrentUnlink(target))
                    setPositionOverride({
                        grid,
                        positions: positions.filter(
                            (position) => position.widgetId !== target.widgetId,
                        ),
                    });
            },
        });

        if (!accepted) {
            if (isCurrentUnlink(target)) setFailedUnlink(target);
        } else if (isCurrentUnlink(target)) {
            try {
                await deviceRef.current.refresh(false);
            } catch {
                // The accepted unlink is already reflected locally. Provider retry recovers reads.
            }
        }

        unlinkPendingRef.current = false;
        if (identityRef.current === `${target.deviceId}:${target.dashboardId}`) setUnlinking(false);
    };

    const openUnlinkConfirmation = (widget: CalculatedWidget) => {
        if (!canManageRef.current || unlinkPendingRef.current) return;
        setFailedUnlink(undefined);
        setUnlinkTarget({ deviceId, dashboardId, widgetId: widget.id, widgetName: widget.name });
    };

    const horizontalOverflow = gridWidth > layoutWidth;
    if (!grid)
        return (
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {header}
                <View style={styles.recovery}>
                    <Alert
                        icon={CircleAlert}
                        variant="destructive"
                        accessibilityRole="alert"
                        accessibilityLiveRegion="polite">
                        <AlertDescription>
                            Grid unavailable. Refresh this dashboard and try again.
                        </AlertDescription>
                    </Alert>
                    <Button
                        name="Retry"
                        type="brand-outline"
                        loading={device.loading}
                        disabled={device.loading}
                        onPress={() => void refresh()}
                    />
                </View>
            </ScrollView>
        );

    return (
        <AlertDialog
            open={Boolean(unlinkTarget && isCurrentUnlink(unlinkTarget))}
            onOpenChange={(open) => {
                if (!open && !unlinkPendingRef.current) setUnlinkTarget(undefined);
            }}
            asChild>
            <View style={[styles.root, { backgroundColor: colors.background }]}>
                <NativeModal
                    visible={Boolean(unlinkTarget && isCurrentUnlink(unlinkTarget))}
                    transparent
                    statusBarTranslucent
                    navigationBarTranslucent
                    accessibilityViewIsModal
                    onRequestClose={() => setUnlinkTarget(undefined)}>
                    <PortalHost name={dialogHost} />
                </NativeModal>
                <AlertDialogContent
                    portalHost={dialogHost}
                    accessibilityViewIsModal
                    className="max-w-md"
                    style={styles.dialogContent}>
                    <ScrollView style={styles.dialogBody}>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Remove widget from dashboard?</AlertDialogTitle>
                            <AlertDialogDescription>
                                {unlinkTarget?.widgetName ? `${unlinkTarget.widgetName}. ` : ""}
                                The widget definition stays available.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                    </ScrollView>
                    <AlertDialogFooter className="flex-col">
                        <AlertDialogCancel asChild>
                            <Button
                                name="Cancel"
                                type="brand-outline"
                                loading={false}
                                onPress={() => setUnlinkTarget(undefined)}
                            />
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <Button
                                name="Remove widget"
                                type="brand-destructive"
                                loading={false}
                                disabled={!unlinkTarget || unlinkPendingRef.current}
                                onPress={() => {
                                    if (unlinkTarget) void attemptUnlink(unlinkTarget);
                                }}
                            />
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => void refresh()}
                            tintColor={colors.authForeground}
                        />
                    }>
                    {header}
                    <View style={styles.heading}>
                        <Text
                            accessibilityRole="header"
                            style={[styles.title, { color: colors.authForeground }]}>
                            Widgets
                        </Text>
                        <Text style={[styles.helper, { color: colors.authMuted }]}>
                            {canManage
                                ? "Tap a free cell to add a widget. Hold a widget to remove it."
                                : positions.length > 0
                                  ? "Visible values are informational."
                                  : "No widgets yet. A home manager can add them."}
                        </Text>
                    </View>
                    {!!failedUnlink && isCurrentUnlink(failedUnlink) && (
                        <View style={styles.unlinkError}>
                            <Alert
                                icon={CircleAlert}
                                compact
                                variant="destructive"
                                accessibilityRole="alert"
                                accessibilityLiveRegion="polite">
                                <AlertDescription compact>
                                    Couldn't remove this widget. Try again.
                                </AlertDescription>
                            </Alert>
                            <Button
                                name="Retry"
                                type="brand-outline"
                                loading={unlinking}
                                disabled={unlinking}
                                onPress={() => void attemptUnlink(failedUnlink)}
                            />
                        </View>
                    )}
                    <View
                        style={styles.gridSection}
                        onLayout={({ nativeEvent }) => {
                            if (nativeEvent.layout.width > 0) {
                                setMeasuredLayout((current) =>
                                    current?.windowWidth === windowWidth &&
                                    current.width === nativeEvent.layout.width
                                        ? current
                                        : { windowWidth, width: nativeEvent.layout.width },
                                );
                            }
                        }}>
                        <ScrollView
                            horizontal
                            style={styles.horizontalViewport}
                            scrollEnabled={horizontalOverflow}
                            showsHorizontalScrollIndicator={horizontalOverflow}
                            contentContainerStyle={styles.horizontalGrid}>
                            <View style={[styles.grid, { width: gridWidth, height: gridHeight }]}>
                                {Array.from({ length: rows }, (_, row) =>
                                    Array.from({ length: columns }, (_, column) => {
                                        const available = isPlacementAvailable(
                                            { ...grid, positionedWidgets: positions },
                                            { row, column, rowSpan: 1, columnSpan: 1 },
                                        );
                                        return available ? (
                                            <Pressable
                                                key={`${row}:${column}`}
                                                cssInterop={false}
                                                accessibilityRole={canManage ? "button" : "text"}
                                                accessibilityLabel={`Row ${row + 1}, column ${column + 1}, empty`}
                                                accessibilityHint={
                                                    canManage
                                                        ? "Choose a widget for this cell"
                                                        : undefined
                                                }
                                                disabled={!canManage || unlinking}
                                                android_ripple={{ color: colors.deviceTileSubtle }}
                                                onPress={() => chooseCell(row, column)}
                                                style={[
                                                    styles.emptyCell,
                                                    {
                                                        left: column * (cellWidth + GAP),
                                                        top: row * (rowHeight + GAP),
                                                        width: cellWidth,
                                                        height: rowHeight,
                                                        borderColor: colors.deviceTileBorder,
                                                    },
                                                ]}>
                                                {canManage && (
                                                    <Icon
                                                        icon="add-outline"
                                                        size={20}
                                                        color="brand"
                                                    />
                                                )}
                                            </Pressable>
                                        ) : null;
                                    }),
                                )}
                                {placedWidgets.map(({ position, widget }) => (
                                    <WidgetView
                                        key={widgetPositionKey(dashboardId, position)}
                                        calculatedWidget={widget}
                                        positionedWidget={position}
                                        itemHeight={rowHeight}
                                        itemWidth={cellWidth}
                                        gap={GAP}
                                        disabled={unlinking}
                                        onRemove={
                                            canManage
                                                ? () => openUnlinkConfirmation(widget)
                                                : undefined
                                        }
                                        onFeedbackHeightChange={(height) => {
                                            const key = widgetPositionKey(dashboardId, position);
                                            setFeedbackHeights((current) => {
                                                const previous = current[key] ?? 0;
                                                if (previous === height) return current;
                                                if (height <= 0) {
                                                    if (!(key in current)) return current;
                                                    const next = { ...current };
                                                    delete next[key];
                                                    return next;
                                                }
                                                return { ...current, [key]: height };
                                            });
                                        }}
                                    />
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                </ScrollView>
            </View>
        </AlertDialog>
    );
};

export default GridDashboardView;

const styles = StyleSheet.create({
    root: { flex: 1 },
    scroll: { flex: 1 },
    title: { fontSize: 20, lineHeight: 28, fontWeight: "600" },
    helper: { fontSize: 14, lineHeight: 20 },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 16,
        gap: 16,
    },
    heading: { gap: 4 },
    recovery: { flexGrow: 1, justifyContent: "center", gap: 16 },
    unlinkError: { gap: 8 },
    gridSection: { width: "100%" },
    horizontalGrid: { flexGrow: 1 },
    grid: { position: "relative", alignSelf: "flex-start", gap: GAP },
    horizontalViewport: { width: "100%" },
    emptyCell: {
        position: "absolute",
        borderWidth: 1,
        borderStyle: "dashed",
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    dialogContent: { width: "100%", maxHeight: "90%" },
    dialogBody: { flexShrink: 1 },
});
