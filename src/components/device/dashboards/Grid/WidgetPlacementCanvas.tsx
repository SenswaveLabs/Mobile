import { Text } from "@/components/ui/text";
import { useTheme } from "@/contexts/ThemeProvider";
import type { WidgetListDto } from "@/types/DeviceTypes";
import { dragDashboardPlacement, isPlacementAvailable } from "@/utils/dashboardGrid";
import type { DashboardPlacement } from "@/utils/dashboardGrid";
import type { GridDashboardConfiguration } from "../DashboardView";
import { Move, MoveDiagonal2 } from "lucide-react-native";
import React, { FC, useMemo, useRef, useState } from "react";
import {
    PanResponder,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
    useWindowDimensions,
} from "react-native";

interface WidgetPlacementCanvasProps {
    grid: GridDashboardConfiguration;
    widget: Pick<WidgetListDto, "id" | "name" | "type">;
    placement: DashboardPlacement;
    onChange: (placement: DashboardPlacement) => void;
    disabled?: boolean;
}

const GAP = 8;
const ROW_HEIGHT = 96;

const WidgetPlacementCanvas: FC<WidgetPlacementCanvasProps> = ({
    grid,
    widget,
    placement,
    onChange,
    disabled = false,
}) => {
    const { colors } = useTheme().current;
    const { width: windowWidth } = useWindowDimensions();
    const [measured, setMeasured] = useState<{ windowWidth: number; width: number }>();
    const viewportWidth = measured?.windowWidth === windowWidth ? measured.width : windowWidth - 32;
    const cellWidth = Math.max(48, (viewportWidth - GAP * (grid.columns - 1)) / grid.columns);
    const gridWidth = cellWidth * grid.columns + GAP * (grid.columns - 1);
    const gridHeight = ROW_HEIGHT * grid.rows + GAP * (grid.rows - 1);
    const [dragging, setDragging] = useState(false);
    const [focused, setFocused] = useState(false);
    const [blocked, setBlocked] = useState(false);
    const scroll = useRef<ScrollView>(null);
    const viewport = useRef({ height: 0, offset: 0 });
    const gestureActive = useRef(false);
    const current = useRef({ grid, placement, onChange, disabled, cellWidth });
    current.current = { grid, placement, onChange, disabled, cellWidth };
    const origin = useRef(placement);

    const revealPlacement = (corner: boolean) => {
        const { height, offset } = viewport.current;
        if (height <= 0 || gestureActive.current) return;
        const value = current.current.placement;
        const top = value.row * (ROW_HEIGHT + GAP);
        const bottom = top + value.rowSpan * (ROW_HEIGHT + GAP) - GAP;
        const next =
            bottom - top > height
                ? corner
                    ? bottom - height
                    : top
                : top < offset
                  ? top
                  : Math.max(offset, bottom - height);
        if (Math.abs(next - offset) < 1) return;
        viewport.current.offset = Math.max(0, next);
        scroll.current?.scrollTo({ y: viewport.current.offset, animated: false });
    };

    const update = (next?: DashboardPlacement) => {
        const value = current.current;
        if (value.disabled) return;
        setBlocked(!next);
        if (!next) return;
        if (
            next.row === value.placement.row &&
            next.column === value.placement.column &&
            next.rowSpan === value.placement.rowSpan &&
            next.columnSpan === value.placement.columnSpan
        )
            return;
        current.current = { ...value, placement: next };
        value.onChange(next);
        if (!gestureActive.current) requestAnimationFrame(() => revealPlacement(true));
    };

    const responders = useMemo(() => {
        const create = (mode: "move" | "resize") =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => !current.current.disabled,
                onPanResponderGrant: () => {
                    origin.current = current.current.placement;
                    gestureActive.current = true;
                    setDragging(true);
                    setBlocked(false);
                },
                onPanResponderMove: (_event, gesture) => {
                    const value = current.current;
                    update(
                        dragDashboardPlacement({
                            grid: value.grid,
                            placement: origin.current,
                            mode,
                            deltaX: gesture.dx,
                            deltaY: gesture.dy,
                            columnPitch: value.cellWidth + GAP,
                            rowPitch: ROW_HEIGHT + GAP,
                        }),
                    );
                },
                onPanResponderRelease: () => {
                    gestureActive.current = false;
                    setDragging(false);
                    setBlocked(false);
                    requestAnimationFrame(() => revealPlacement(mode === "resize"));
                },
                onPanResponderTerminate: () => {
                    gestureActive.current = false;
                    setDragging(false);
                    setBlocked(false);
                    requestAnimationFrame(() => revealPlacement(mode === "resize"));
                },
                onPanResponderTerminationRequest: () => false,
            });
        return { move: create("move"), resize: create("resize") };
    }, []);

    const adjust = (mode: "move" | "resize", deltaX: number, deltaY: number) => {
        const value = current.current;
        update(
            dragDashboardPlacement({
                grid: value.grid,
                placement: value.placement,
                mode,
                deltaX: deltaX * (value.cellWidth + GAP),
                deltaY: deltaY * (ROW_HEIGHT + GAP),
                columnPitch: value.cellWidth + GAP,
                rowPitch: ROW_HEIGHT + GAP,
            }),
        );
    };
    const draftWidth = placement.columnSpan * cellWidth + GAP * (placement.columnSpan - 1);
    const draftHeight = placement.rowSpan * ROW_HEIGHT + GAP * (placement.rowSpan - 1);

    return (
        <View
            style={styles.root}
            onLayout={({ nativeEvent }) => {
                if (nativeEvent.layout.width > 0)
                    setMeasured({ windowWidth, width: nativeEvent.layout.width });
            }}>
            <ScrollView
                ref={scroll}
                style={styles.scroll}
                scrollEnabled={!dragging}
                onLayout={({ nativeEvent }) => {
                    viewport.current.height = nativeEvent.layout.height;
                    requestAnimationFrame(() => revealPlacement(true));
                }}
                onScroll={({ nativeEvent }) => {
                    viewport.current.offset = nativeEvent.contentOffset.y;
                }}
                scrollEventThrottle={16}
                onContentSizeChange={() => {
                    requestAnimationFrame(() => revealPlacement(true));
                }}>
                <ScrollView
                    horizontal
                    scrollEnabled={!dragging && gridWidth > viewportWidth}
                    showsHorizontalScrollIndicator={gridWidth > viewportWidth}>
                    <View style={{ width: gridWidth, height: gridHeight }}>
                        {Array.from({ length: grid.rows }, (_, row) =>
                            Array.from({ length: grid.columns }, (_, column) => {
                                const next = { ...placement, row, column };
                                const available = isPlacementAvailable(grid, next);
                                return (
                                    <Pressable
                                        key={`${row}:${column}`}
                                        cssInterop={false}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Move widget to row ${row + 1}, column ${column + 1}`}
                                        disabled={disabled || !available}
                                        onPress={() => update(next)}
                                        style={[
                                            styles.cell,
                                            {
                                                left: column * (cellWidth + GAP),
                                                top: row * (ROW_HEIGHT + GAP),
                                                width: cellWidth,
                                                height: ROW_HEIGHT,
                                                borderColor: colors.deviceTileBorder,
                                            },
                                        ]}
                                    />
                                );
                            }),
                        )}
                        {grid.positionedWidgets.map((position) => {
                            const occupied = grid.calculatedWidgets.find(
                                (item) => item.id === position.widgetId,
                            );
                            return (
                                <View
                                    key={position.widgetId}
                                    pointerEvents="none"
                                    style={[
                                        styles.occupied,
                                        {
                                            left: position.column * (cellWidth + GAP),
                                            top: position.row * (ROW_HEIGHT + GAP),
                                            width:
                                                position.columnSpan * cellWidth +
                                                GAP * (position.columnSpan - 1),
                                            height:
                                                position.rowSpan * ROW_HEIGHT +
                                                GAP * (position.rowSpan - 1),
                                            borderColor: colors.deviceTileBorder,
                                            backgroundColor: colors.deviceTileSubtle,
                                        },
                                    ]}>
                                    <Text
                                        numberOfLines={3}
                                        style={[styles.occupiedName, { color: colors.authMuted }]}>
                                        {occupied?.name ?? "Placed widget"}
                                    </Text>
                                </View>
                            );
                        })}
                        <View
                            style={[
                                styles.draft,
                                {
                                    left: placement.column * (cellWidth + GAP),
                                    top: placement.row * (ROW_HEIGHT + GAP),
                                    width: draftWidth,
                                    height: draftHeight,
                                    borderColor: blocked
                                        ? colors.error
                                        : dragging || focused
                                          ? colors.authFocus
                                          : colors.deviceTileBorder,
                                    backgroundColor: colors.deviceTileSurface,
                                },
                            ]}>
                            <View
                                {...responders.move.panHandlers}
                                accessible
                                accessibilityRole="adjustable"
                                accessibilityLabel={`Move ${widget.name}`}
                                accessibilityState={{ disabled }}
                                onFocus={() => setFocused(true)}
                                onBlur={() => setFocused(false)}
                                accessibilityValue={{
                                    text: `Row ${placement.row + 1}, column ${placement.column + 1}`,
                                }}
                                accessibilityActions={[
                                    { name: "left", label: "Move left" },
                                    { name: "right", label: "Move right" },
                                    { name: "up", label: "Move up" },
                                    { name: "down", label: "Move down" },
                                ]}
                                onAccessibilityAction={({ nativeEvent }) => {
                                    const moves: Record<string, [number, number]> = {
                                        left: [-1, 0],
                                        right: [1, 0],
                                        up: [0, -1],
                                        down: [0, 1],
                                    };
                                    const move = moves[nativeEvent.actionName];
                                    if (move) adjust("move", ...move);
                                }}
                                style={styles.moveTarget}>
                                <Move size={20} color={colors.authMuted} accessible={false} />
                                <Text
                                    numberOfLines={draftWidth >= 100 ? 2 : 1}
                                    style={[styles.name, { color: colors.authForeground }]}>
                                    {widget.name}
                                </Text>
                            </View>
                            <View
                                {...responders.resize.panHandlers}
                                accessible
                                accessibilityRole="adjustable"
                                accessibilityLabel={`Resize ${widget.name}`}
                                accessibilityState={{ disabled }}
                                onFocus={() => setFocused(true)}
                                onBlur={() => setFocused(false)}
                                accessibilityValue={{
                                    text: `${placement.columnSpan} ${placement.columnSpan === 1 ? "column" : "columns"}, ${placement.rowSpan} ${placement.rowSpan === 1 ? "row" : "rows"}`,
                                }}
                                accessibilityActions={[
                                    { name: "wider", label: "Make wider" },
                                    { name: "narrower", label: "Make narrower" },
                                    { name: "taller", label: "Make taller" },
                                    { name: "shorter", label: "Make shorter" },
                                ]}
                                onAccessibilityAction={({ nativeEvent }) => {
                                    const sizes: Record<string, [number, number]> = {
                                        wider: [1, 0],
                                        narrower: [-1, 0],
                                        taller: [0, 1],
                                        shorter: [0, -1],
                                    };
                                    const size = sizes[nativeEvent.actionName];
                                    if (size) adjust("resize", ...size);
                                }}
                                style={styles.resizeTarget}>
                                <View
                                    style={[
                                        styles.resizeAffordance,
                                        { backgroundColor: colors.deviceTileSubtle },
                                    ]}>
                                    <MoveDiagonal2
                                        size={16}
                                        color={colors.authForeground}
                                        accessible={false}
                                    />
                                </View>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </ScrollView>
            {blocked && (
                <Text
                    accessibilityLiveRegion="polite"
                    style={[styles.blocked, { color: colors.error }]}>
                    That space is occupied.
                </Text>
            )}
        </View>
    );
};

export default WidgetPlacementCanvas;

const styles = StyleSheet.create({
    root: { flex: 1, minHeight: 0, marginHorizontal: 16 },
    scroll: { flex: 1 },
    cell: { position: "absolute", borderWidth: 1, borderStyle: "dashed", borderRadius: 12 },
    occupied: {
        position: "absolute",
        borderWidth: 1,
        borderRadius: 12,
        padding: 8,
        justifyContent: "center",
        overflow: "hidden",
    },
    occupiedName: { fontSize: 12, lineHeight: 16 },
    draft: { position: "absolute", borderWidth: 1, borderRadius: 12, zIndex: 1 },
    moveTarget: {
        flex: 1,
        minHeight: 48,
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        paddingHorizontal: 4,
        paddingBottom: 40,
    },
    name: { fontSize: 14, lineHeight: 20, fontWeight: "600", textAlign: "center" },
    resizeTarget: {
        position: "absolute",
        right: 0,
        bottom: 0,
        width: 48,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
    },
    resizeAffordance: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    blocked: { fontSize: 14, lineHeight: 20, paddingVertical: 8 },
});
