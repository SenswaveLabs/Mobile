import Button from "@/components/common/Button";
import Icon from "@/components/common/Icon";
import Loading from "@/components/common/Loading";
import SectionHeaderAction from "@/components/common/SectionHeaderAction";
import Text from "@/components/common/Text";
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
import { useDevice } from "@/contexts/custom/DeviceProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import {
    isPlacementAvailable,
    readGridConfiguration,
    unlinkDashboardWidget,
} from "@/utils/dashboardGrid";
import { PortalHost } from "@rn-primitives/portal";
import { useFocusEffect, useRouter } from "expo-router";
import { CircleAlert, Minus, Plus } from "lucide-react-native";
import React, { FC, useCallback, useEffect, useId, useRef, useState } from "react";
import {
    BackHandler,
    Modal as NativeModal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
    useWindowDimensions,
} from "react-native";
import type { CalculatedWidget, PositionedWidget } from "../DashboardView";
import type { DashboardPlacement } from "@/utils/dashboardGrid";

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
}

interface UnlinkTarget {
    deviceId: string;
    dashboardId: string;
    widgetId: string;
    widgetName: string;
}

interface SizeControlProps {
    label: string;
    value: number;
    decreaseDisabled: boolean;
    increaseDisabled: boolean;
    onDecrease: () => void;
    onIncrease: () => void;
}

const SizeControl: FC<SizeControlProps> = ({
    label,
    value,
    decreaseDisabled,
    increaseDisabled,
    onDecrease,
    onIncrease,
}) => {
    const { colors } = useTheme().current;
    return (
        <View style={styles.sizeControl}>
            <Text size="medium" color="onBackground" bold>
                {label}
            </Text>
            <View style={styles.sizeActions}>
                <View
                    style={[
                        styles.sizeButtonSlot,
                        {
                            backgroundColor: colors.authFieldBackground,
                            borderColor: colors.authBorder,
                            opacity: decreaseDisabled ? 0.5 : 1,
                        },
                    ]}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Decrease ${label.toLowerCase()}`}
                        accessibilityState={{ disabled: decreaseDisabled }}
                        disabled={decreaseDisabled}
                        android_ripple={{ color: colors.authBorder }}
                        onPress={onDecrease}
                        style={[StyleSheet.absoluteFillObject, styles.sizeButton]}>
                        <Minus size={20} color={colors.authForeground} accessible={false} />
                    </Pressable>
                </View>
                <Text
                    accessibilityLiveRegion="polite"
                    size="medium"
                    color="onBackground"
                    style={styles.sizeValue}>
                    {value}
                </Text>
                <View
                    style={[
                        styles.sizeButtonSlot,
                        {
                            backgroundColor: colors.authFieldBackground,
                            borderColor: colors.authBorder,
                            opacity: increaseDisabled ? 0.5 : 1,
                        },
                    ]}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Increase ${label.toLowerCase()}`}
                        accessibilityState={{ disabled: increaseDisabled }}
                        disabled={increaseDisabled}
                        android_ripple={{ color: colors.authBorder }}
                        onPress={onIncrease}
                        style={[StyleSheet.absoluteFillObject, styles.sizeButton]}>
                        <Plus size={20} color={colors.authForeground} accessible={false} />
                    </Pressable>
                </View>
            </View>
        </View>
    );
};

const GridDashboardView: FC<GridDashboardViewProps> = ({ deviceId, dashboardId, canManage }) => {
    const { colors } = useTheme().current;
    const { width: windowWidth } = useWindowDimensions();
    const device = useDevice();
    const httpClient = useHttpClient();
    const router = useRouter();
    const scrollRef = useRef<ScrollView>(null);
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
    const [placeMode, setPlaceMode] = useState(false);
    const [placement, setPlacement] = useState<DashboardPlacement>();
    const [placementError, setPlacementError] = useState("");
    const [unlinkTarget, setUnlinkTarget] = useState<UnlinkTarget>();
    const [failedUnlink, setFailedUnlink] = useState<UnlinkTarget>();
    const [unlinking, setUnlinking] = useState(false);
    const [positions, setPositions] = useState<PositionedWidget[]>([]);
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

    useEffect(() => {
        setPlaceMode(false);
        setPlacement(undefined);
        setPlacementError("");
        setUnlinkTarget(undefined);
        setFailedUnlink(undefined);
        setUnlinking(false);
        setPositions([]);
        setFeedbackHeights({});
    }, [identity]);

    useEffect(() => {
        if (!canManage) {
            setPlaceMode(false);
            setPlacement(undefined);
            setPlacementError("");
            setUnlinkTarget(undefined);
            setFailedUnlink(undefined);
        }
    }, [canManage]);

    useEffect(() => {
        if (grid) setPositions(grid.positionedWidgets);
    }, [grid]);

    const cancelPlaceMode = useCallback(() => {
        setPlaceMode(false);
        setPlacement(undefined);
        setPlacementError("");
    }, []);

    useFocusEffect(
        useCallback(() => {
            if (!placeMode) return;
            const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
                cancelPlaceMode();
                return true;
            });
            return () => subscription.remove();
        }, [cancelPlaceMode, placeMode]),
    );

    if (!selectedDashboard) return <Loading />;

    const refresh = async () => {
        setRefreshing(true);
        try {
            await device.refresh(false);
        } finally {
            setRefreshing(false);
        }
    };

    const startPlaceMode = () => {
        if (!canManageRef.current) return;
        setPlaceMode(true);
        setPlacement(undefined);
        setPlacementError("");
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

    const selectCell = (row: number, column: number) => {
        if (!canManageRef.current || !grid) return;
        const next = { row, column, rowSpan: 1, columnSpan: 1 };
        if (!isPlacementAvailable({ ...grid, positionedWidgets: positions }, next)) return;
        setPlacement(next);
        setPlacementError("");
        requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
    };

    const resizePlacement = (key: "rowSpan" | "columnSpan", delta: -1 | 1) => {
        if (!grid || !placement || !canManageRef.current) return;
        const next = { ...placement, [key]: placement[key] + delta };
        if (isPlacementAvailable({ ...grid, positionedWidgets: positions }, next)) {
            setPlacement(next);
            setPlacementError("");
        }
    };

    const chooseWidget = () => {
        if (!canManageRef.current || !grid || !placement) return;
        if (!isPlacementAvailable({ ...grid, positionedWidgets: positions }, placement)) {
            setPlacementError("Choose an empty area within the dashboard grid.");
            return;
        }
        router.push({
            pathname: "device/dashboard/placeWidget",
            params: {
                deviceId,
                dashboardId,
                row: String(placement.row),
                column: String(placement.column),
                rowSpan: String(placement.rowSpan),
                columnSpan: String(placement.columnSpan),
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
                if (isCurrentUnlink(target))
                    setPositions((current) =>
                        current.filter((position) => position.widgetId !== target.widgetId),
                    );
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
    const canGrowHeight = Boolean(
        grid &&
        placement &&
        placement.row + placement.rowSpan < grid.rows &&
        isPlacementAvailable(
            { ...grid, positionedWidgets: positions },
            { ...placement, rowSpan: placement.rowSpan + 1 },
        ),
    );
    const canGrowWidth = Boolean(
        grid &&
        placement &&
        placement.column + placement.columnSpan < grid.columns &&
        isPlacementAvailable(
            { ...grid, positionedWidgets: positions },
            { ...placement, columnSpan: placement.columnSpan + 1 },
        ),
    );

    if (!grid)
        return (
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
                    ref={scrollRef}
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />
                    }>
                    <View style={styles.headingRow}>
                        <Text accessibilityRole="header" size="large" color="onBackground" bold>
                            Widgets
                        </Text>
                        {canManage && positions.length > 0 && !placeMode && (
                            <SectionHeaderAction
                                label="Place widget"
                                accessibilityLabel="Place widget"
                                icon={<Icon icon="add-outline" size={20} color="complementary" />}
                                disabled={unlinking}
                                onPress={startPlaceMode}
                            />
                        )}
                    </View>

                    {placeMode && (
                        <View style={styles.placePanel}>
                            <View style={styles.placeHeading}>
                                <View style={styles.placeCopy}>
                                    <Text size="medium" color="onBackground" bold>
                                        Choose widget area
                                    </Text>
                                    <Text size="small" color="onBackground">
                                        Select the top-left empty cell, then set the size.
                                    </Text>
                                </View>
                                <SectionHeaderAction
                                    label="Cancel"
                                    accessibilityLabel="Cancel widget placement"
                                    icon={
                                        <Icon
                                            icon="close-outline"
                                            size={20}
                                            color="complementary"
                                        />
                                    }
                                    onPress={cancelPlaceMode}
                                />
                            </View>

                            {placement ? (
                                <>
                                    <Text
                                        accessibilityLiveRegion="polite"
                                        size="medium"
                                        color="onBackground">
                                        Row {placement.row + 1} · Column {placement.column + 1} ·{" "}
                                        {placement.rowSpan} rows × {placement.columnSpan} columns
                                    </Text>
                                    <View style={styles.sizeControls}>
                                        <SizeControl
                                            label="Height"
                                            value={placement.rowSpan}
                                            decreaseDisabled={placement.rowSpan <= 1}
                                            increaseDisabled={!canGrowHeight}
                                            onDecrease={() => resizePlacement("rowSpan", -1)}
                                            onIncrease={() => resizePlacement("rowSpan", 1)}
                                        />
                                        <SizeControl
                                            label="Width"
                                            value={placement.columnSpan}
                                            decreaseDisabled={placement.columnSpan <= 1}
                                            increaseDisabled={!canGrowWidth}
                                            onDecrease={() => resizePlacement("columnSpan", -1)}
                                            onIncrease={() => resizePlacement("columnSpan", 1)}
                                        />
                                    </View>
                                    <View style={styles.placementActions}>
                                        <Button
                                            name="Change position"
                                            type="brand-outline"
                                            loading={false}
                                            onPress={() => {
                                                setPlacement(undefined);
                                                setPlacementError("");
                                            }}
                                            style={styles.changePositionButton}
                                        />
                                        <Button
                                            name="Choose widget"
                                            type="auth"
                                            loading={false}
                                            onPress={chooseWidget}
                                            style={styles.chooseWidgetButton}
                                        />
                                    </View>
                                </>
                            ) : (
                                <Text size="small" color="onBackground">
                                    Empty cells are labelled by row and column.
                                </Text>
                            )}
                            {!!placementError && (
                                <Alert
                                    icon={CircleAlert}
                                    compact
                                    variant="destructive"
                                    accessibilityRole="alert"
                                    accessibilityLiveRegion="polite">
                                    <AlertDescription compact>{placementError}</AlertDescription>
                                </Alert>
                            )}
                        </View>
                    )}

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

                    {positions.length === 0 && !placeMode ? (
                        <View style={styles.emptyState}>
                            <Text size="medium" color="onBackground" bold>
                                No widgets placed.
                            </Text>
                            <Text size="small" color="onBackground">
                                {canManage
                                    ? "Choose an empty dashboard area to add a widget."
                                    : "Ask a home manager to add widgets to this dashboard."}
                            </Text>
                            {canManage && (
                                <Button
                                    name="Place widget"
                                    type="auth"
                                    loading={false}
                                    disabled={unlinking}
                                    onPress={startPlaceMode}
                                />
                            )}
                        </View>
                    ) : (
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
                            {positions.length > 0 && !placeMode && (
                                <Text size="small" color="onBackground">
                                    Visible values are informational.
                                </Text>
                            )}
                            <ScrollView
                                style={styles.horizontalViewport}
                                horizontal
                                scrollEnabled={horizontalOverflow}
                                showsHorizontalScrollIndicator={horizontalOverflow}
                                contentContainerStyle={styles.horizontalGrid}>
                                <View
                                    style={[styles.grid, { width: gridWidth, height: gridHeight }]}>
                                    {placeMode &&
                                        Array.from({ length: rows }, (_, row) => (
                                            <View
                                                key={`row-${row}`}
                                                style={[
                                                    styles.gridRow,
                                                    { width: gridWidth, height: rowHeight },
                                                ]}>
                                                {Array.from({ length: columns }, (_, column) => {
                                                    const available = isPlacementAvailable(
                                                        { ...grid, positionedWidgets: positions },
                                                        {
                                                            row,
                                                            column,
                                                            rowSpan: 1,
                                                            columnSpan: 1,
                                                        },
                                                    );
                                                    if (!available)
                                                        return (
                                                            <View
                                                                key={`occupied-${row}-${column}`}
                                                                pointerEvents="none"
                                                                style={{
                                                                    width: cellWidth,
                                                                    flexBasis: cellWidth,
                                                                    flexShrink: 0,
                                                                    height: rowHeight,
                                                                }}
                                                            />
                                                        );
                                                    return (
                                                        <View
                                                            key={`empty-${row}-${column}`}
                                                            style={[
                                                                styles.gridCellSlot,
                                                                {
                                                                    width: cellWidth,
                                                                    flexBasis: cellWidth,
                                                                    flexShrink: 0,
                                                                    height: rowHeight,
                                                                },
                                                            ]}>
                                                            <Pressable
                                                                accessibilityRole="button"
                                                                accessibilityLabel={`Row ${row + 1}, column ${column + 1}, empty`}
                                                                android_ripple={{
                                                                    color: colors.authBorder,
                                                                }}
                                                                onPress={() =>
                                                                    selectCell(row, column)
                                                                }
                                                                style={[
                                                                    StyleSheet.absoluteFillObject,
                                                                    styles.emptyCell,
                                                                    {
                                                                        backgroundColor:
                                                                            colors.authFieldBackground,
                                                                        borderColor:
                                                                            colors.authBorder,
                                                                    },
                                                                ]}>
                                                                <Icon
                                                                    icon="add-outline"
                                                                    size={24}
                                                                    color="complementary"
                                                                />
                                                            </Pressable>
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        ))}
                                    {placement && (
                                        <View
                                            pointerEvents="none"
                                            style={[
                                                styles.placementPreview,
                                                {
                                                    top: placement.row * (rowHeight + GAP),
                                                    left: placement.column * (cellWidth + GAP),
                                                    width:
                                                        placement.columnSpan * cellWidth +
                                                        GAP * (placement.columnSpan - 1),
                                                    height:
                                                        placement.rowSpan * rowHeight +
                                                        GAP * (placement.rowSpan - 1),
                                                    backgroundColor: colors.authPrimary,
                                                    borderColor: colors.complementary,
                                                },
                                            ]}
                                        />
                                    )}

                                    {placedWidgets.map(({ position, widget }) => (
                                        <WidgetView
                                            key={widgetPositionKey(dashboardId, position)}
                                            calculatedWidget={widget}
                                            positionedWidget={position}
                                            itemHeight={rowHeight}
                                            itemWidth={cellWidth}
                                            gap={GAP}
                                            disabled={placeMode || unlinking}
                                            onRemove={
                                                canManage && !placeMode
                                                    ? () => openUnlinkConfirmation(widget)
                                                    : undefined
                                            }
                                            onFeedbackHeightChange={(height) => {
                                                const key = widgetPositionKey(
                                                    dashboardId,
                                                    position,
                                                );
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
                    )}
                </ScrollView>
            </View>
        </AlertDialog>
    );
};

export default GridDashboardView;

const styles = StyleSheet.create({
    root: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 16 },
    headingRow: {
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    placePanel: { gap: 12 },
    placeHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
    placeCopy: { flex: 1, minWidth: 0, gap: 2 },
    sizeControls: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
    sizeControl: { flex: 1, minWidth: 142, gap: 4 },
    sizeActions: { flexDirection: "row", alignItems: "center", gap: 8 },
    sizeButtonSlot: {
        width: 50,
        height: 50,
        borderWidth: 1,
        borderRadius: 12,
        position: "relative",
        overflow: "hidden",
    },
    sizeButton: {
        alignItems: "center",
        justifyContent: "center",
    },
    sizeValue: { minWidth: 32, textAlign: "center" },
    placementActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    changePositionButton: { flex: 1, minWidth: 140 },
    chooseWidgetButton: { flex: 1, minWidth: 140 },
    unlinkError: { gap: 8 },
    emptyState: { flex: 1, justifyContent: "center", alignItems: "stretch", gap: 12, padding: 8 },
    gridSection: { width: "100%", gap: 12 },
    horizontalGrid: { flexGrow: 1 },
    grid: { position: "relative", alignSelf: "flex-start", gap: GAP },
    gridRow: { flexDirection: "row", gap: GAP },
    gridCellSlot: { position: "relative" },
    horizontalViewport: { width: "100%" },
    emptyCell: {
        borderWidth: 1,
        borderStyle: "dashed",
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    placementPreview: {
        position: "absolute",
        opacity: 0.2,
        borderWidth: 2,
        borderStyle: "dashed",
        borderRadius: 12,
        zIndex: 1,
    },
    recovery: { flex: 1, justifyContent: "center", paddingHorizontal: 16, gap: 16 },
    dialogContent: { maxHeight: "90%" },
    dialogBody: { flexShrink: 1, maxHeight: "75%" },
});
