import React, { useEffect, useState } from "react";
import {
    View,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    ScrollView,
    RefreshControl,
} from "react-native";
import WidgetView from "../../widgets/WidgetView";
import { useDevice } from "@/contexts/custom/DeviceProvider";
import { CalculatedWidget, GridDashboardConfiguration, PositionedWidget } from "../DashboardView";
import ImageButton from "@/components/common/ImageButton";
import { useToast } from "@/contexts/ToastProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import Icon from "@/components/common/Icon";
import { shadowStyles } from "@/styles/shadowStyles";
import { useLocalSearchParams, useRouter } from "expo-router";
import UserNote from "@/components/common/UserNote";
import FAB from "@/components/common/FAB";

const InvalidWidget = (id: string): CalculatedWidget => {
    return {
        id: id,
        name: "Unknown",
        type: "Invalid",
        configuration: {},
        updatedAtUtc: "",
        createdAtUtc: "",
    };
};

const BottomBarPadding: number = 80;

export default function GridDashboardView() {
    const theme = useTheme();
    const toast = useToast();
    const device = useDevice();
    const router = useRouter();
    const { deviceId } = useLocalSearchParams<{ deviceId: string }>();

    const deviceDetailsClicked = () =>
        router.push({ pathname: "device/details", params: { deviceId } });
    const addDashboardClicked = () =>
        router.push({ pathname: "device/dashboard/add", params: { deviceId } });
    const editDashboardClicked = () =>
        router.push({
            pathname: "device/dashboard/details",
            params: { dashboardId: device.currentDashboardId },
        });
    const [toogleMode, setToogleMode] = useState(false);
    const [rows, setRows] = useState(0);
    const [columns, setColumns] = useState(0);
    const [positionedWidgets, setPositionedWidgets] = useState<PositionedWidget[]>([]);
    const [calculatedWidgets, setCalculatedWidgets] = useState<CalculatedWidget[]>([]);
    const [availableHeight, setAvailableHeight] = useState(50);
    const [newWidgetStart, setNewWidgetStart] = useState<{ row: number; column: number } | null>(
        null,
    );
    const [newWidgetSize, setNewWidgetSize] = useState<{ rowSpan: number; colSpan: number }>({
        rowSpan: 1,
        colSpan: 1,
    });
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (!device.currentDashboard) {
            console.warn("[GridDashboardView] No current dashboard found.");
            return;
        }

        const configuration = device.currentDashboard!.configuration as GridDashboardConfiguration;

        setRows(configuration.rows);
        setColumns(configuration.columns);
        setPositionedWidgets(configuration.positionedWidgets);
        setCalculatedWidgets(configuration.calculatedWidgets);
    }, [device.currentDashboard, device.currentDashboardId]);

    const paddingHorizontal = 15;
    const gap = 7;

    const screenWidth = Dimensions.get("window").width - 2 * paddingHorizontal;
    const gridItemWidth = (screenWidth - (columns - 1) * gap) / columns;
    const itemHeight = (availableHeight - BottomBarPadding - (rows - 1) * gap) / rows;

    const handleLayout = (event: { nativeEvent: { layout: { width: any; height: any } } }) => {
        setAvailableHeight(event.nativeEvent.layout.height);
    };

    const addMode = (): boolean => {
        return toogleMode && newWidgetStart !== null && newWidgetStart !== undefined;
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await device.refresh(false);
        setRefreshing(false);
    };

    const toogleModeClicked = () => {
        setToogleMode(!toogleMode);
        setNewWidgetStart(null);
    };

    const getOccupiedMap = (): boolean[][] => {
        const map: boolean[][] = Array.from({ length: rows }, () => Array(columns).fill(false));

        positionedWidgets.forEach(({ row, column, rowSpan, columnSpan }) => {
            for (let r = row; r < row + rowSpan; r++) {
                for (let c = column; c < column + columnSpan; c++) {
                    if (r < rows && c < columns) {
                        map[r][c] = true;
                    }
                }
            }
        });

        return map;
    };

    const onAddWidgetPress = (row: number, column: number) => {
        const map = getOccupiedMap();
        if (map[row][column]) {
            console.warn("Cell is already occupied.");
            return;
        }

        setNewWidgetStart({ row, column });
        setNewWidgetSize({ rowSpan: 1, colSpan: 1 });
    };

    const adjustWidgetSize = (dir: "up" | "down" | "left" | "right", increase: boolean) => {
        if (!newWidgetStart) return;

        const { row, column } = newWidgetStart;
        const { rowSpan, colSpan } = newWidgetSize;
        const map = getOccupiedMap();

        let newRow = row;
        let newCol = column;
        let newRowSpan = rowSpan;
        let newColSpan = colSpan;

        const isRowFree = (r: number, cStart: number, cEnd: number) =>
            cStart >= 0 &&
            cEnd <= columns &&
            Array.from({ length: cEnd - cStart }, (_, i) => map[r][cStart + i]).every(
                (cell) => !cell,
            );

        const isColFree = (c: number, rStart: number, rEnd: number) =>
            rStart >= 0 &&
            rEnd <= rows &&
            Array.from({ length: rEnd - rStart }, (_, i) => map[rStart + i][c]).every(
                (cell) => !cell,
            );

        if (dir === "up") {
            if (increase) {
                if (row > 0 && isRowFree(row - 1, column, column + colSpan)) {
                    newRow--;
                    newRowSpan++;
                }
            } else if (rowSpan > 1) {
                newRow++;
                newRowSpan--;
            }
        } else if (dir === "down") {
            if (increase) {
                const nextRow = row + rowSpan;
                if (nextRow < rows && isRowFree(nextRow, column, column + colSpan)) {
                    newRowSpan++;
                }
            } else if (rowSpan > 1) {
                newRowSpan--;
            }
        } else if (dir === "left") {
            if (increase) {
                if (column > 0 && isColFree(column - 1, row, row + rowSpan)) {
                    newCol--;
                    newColSpan++;
                }
            } else if (colSpan > 1) {
                newCol++;
                newColSpan--;
            }
        } else if (dir === "right") {
            if (increase) {
                const nextCol = column + colSpan;
                if (nextCol < columns && isColFree(nextCol, row, row + rowSpan)) {
                    newColSpan++;
                }
            } else if (colSpan > 1) {
                newColSpan--;
            }
        }

        setNewWidgetStart({ row: newRow, column: newCol });
        setNewWidgetSize({ rowSpan: newRowSpan, colSpan: newColSpan });
    };

    const addWidget = () => {
        if (!newWidgetStart) return;

        const { row, column } = newWidgetStart;
        const { rowSpan, colSpan } = newWidgetSize;
        const map = getOccupiedMap();

        for (let r = row; r < row + rowSpan; r++) {
            for (let c = column; c < column + colSpan; c++) {
                if (r >= rows || c >= columns || map[r][c]) {
                    toast.error("Widget overlaps an existing widget or is out of bounds.");
                    return;
                }
            }
        }

        setToogleMode(false);

        router.push({
            pathname: "device/dashboard/placeWidget",
            params: {
                row,
                column,
                rowSpan,
                columnSpan: colSpan,
                dashboardId: device.currentDashboardId,
            },
        });
    };

    const occupiedMap = getOccupiedMap();

    return (
        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flex: 1 }}
            scrollEnabled={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
            <View
                style={{ height: "100%", alignItems: "center", paddingBottom: BottomBarPadding }}
                onLayout={handleLayout}>
                <View style={{ height: "100%", width: "100%" }}>
                    <View style={styles.container}>
                        {positionedWidgets.map((widget) => {
                            const calculatedWidget =
                                calculatedWidgets.find((w) => w.id === widget.widgetId) ||
                                InvalidWidget(widget.widgetId);

                            return (
                                <WidgetView
                                    key={`r${widget.row}c${widget.column}`}
                                    calculatedWidget={calculatedWidget}
                                    positionedWidget={widget}
                                    itemHeight={itemHeight}
                                    itemWidth={gridItemWidth}
                                    gap={gap}
                                    disabled={toogleMode}
                                />
                            );
                        })}

                        {toogleMode &&
                            !newWidgetStart &&
                            occupiedMap.map((rowArray, rIndex) =>
                                rowArray.map((isOccupied, cIndex) => {
                                    if (!isOccupied) {
                                        return (
                                            <TouchableOpacity
                                                key={`add-r${rIndex}-c${cIndex}`}
                                                style={[
                                                    {
                                                        position: "absolute",
                                                        top: rIndex * (itemHeight + gap),
                                                        left: cIndex * (gridItemWidth + gap),
                                                        width: gridItemWidth,
                                                        height: itemHeight,
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        borderRadius: 8,
                                                        backgroundColor:
                                                            theme.current.colors.primary,
                                                        opacity: 0.7,
                                                        borderWidth: 1,
                                                        borderColor: "#ccc",
                                                        zIndex: 0,
                                                    },
                                                    shadowStyles.default,
                                                ]}
                                                onPress={() => onAddWidgetPress(rIndex, cIndex)}>
                                                <Icon
                                                    icon="add-outline"
                                                    size={30}
                                                    color="onPrimary"
                                                />
                                            </TouchableOpacity>
                                        );
                                    }
                                }),
                            )}

                        {toogleMode && newWidgetStart && (
                            <>
                                {/* Widget Preview Box */}
                                <View
                                    style={{
                                        position: "absolute",
                                        top: newWidgetStart.row * (itemHeight + gap),
                                        left: newWidgetStart.column * (gridItemWidth + gap),
                                        width:
                                            gridItemWidth * newWidgetSize.colSpan +
                                            gap * (newWidgetSize.colSpan - 1),
                                        height:
                                            itemHeight * newWidgetSize.rowSpan +
                                            gap * (newWidgetSize.rowSpan - 1),
                                        backgroundColor: theme.current.colors.secondary,
                                        opacity: 0.4,
                                        borderColor: theme.current.colors.secondary,
                                        borderRadius: 8,
                                        borderWidth: 2,
                                        zIndex: 10,
                                    }}
                                />

                                {/* UP Controls */}
                                {(() => {
                                    const map = getOccupiedMap();
                                    const canShrink = newWidgetSize.rowSpan > 1;

                                    const nextRow = newWidgetStart.row - 1;
                                    const canGrow =
                                        nextRow >= 0 &&
                                        (() => {
                                            const { column } = newWidgetStart;
                                            const { colSpan } = newWidgetSize;
                                            return Array.from(
                                                { length: colSpan },
                                                (_, i) => !map[nextRow][column + i],
                                            ).every(Boolean);
                                        })();

                                    if (!canShrink && !canGrow) return null;

                                    const top = newWidgetStart.row * (itemHeight + gap) - 14;
                                    const left = newWidgetStart.column * (gridItemWidth + gap);
                                    const currentWidth =
                                        gridItemWidth * newWidgetSize.colSpan +
                                        gap * (newWidgetSize.colSpan - 1);

                                    return (
                                        <View
                                            style={{
                                                position: "absolute",
                                                top,
                                                left,
                                                zIndex: 11,
                                                flexDirection: "row",
                                                justifyContent: "center",
                                                width: currentWidth,
                                                gap: 5,
                                            }}>
                                            {canShrink && (
                                                <ImageButton
                                                    type="alternative"
                                                    icon="remove-outline"
                                                    size={16}
                                                    onPress={() => adjustWidgetSize("up", false)}
                                                />
                                            )}

                                            {canGrow && (
                                                <ImageButton
                                                    type="alternative"
                                                    icon="add-outline"
                                                    size={16}
                                                    onPress={() => adjustWidgetSize("up", true)}
                                                />
                                            )}
                                        </View>
                                    );
                                })()}

                                {/* DOWN Controls */}
                                {(() => {
                                    const map = getOccupiedMap();
                                    const canShrink = newWidgetSize.rowSpan > 1;

                                    const nextRow = newWidgetStart.row + newWidgetSize.rowSpan;
                                    const canGrow =
                                        nextRow < rows &&
                                        (() => {
                                            const { column } = newWidgetStart;
                                            const { colSpan } = newWidgetSize;
                                            return Array.from(
                                                { length: colSpan },
                                                (_, i) => !map[nextRow][column + i],
                                            ).every(Boolean);
                                        })();

                                    if (!canShrink && !canGrow) return null;

                                    const top = nextRow * (itemHeight + gap) - 14;
                                    const left = newWidgetStart.column * (gridItemWidth + gap);
                                    const currentWidth =
                                        gridItemWidth * newWidgetSize.colSpan +
                                        gap * (newWidgetSize.colSpan - 1);

                                    return (
                                        <View
                                            style={{
                                                position: "absolute",
                                                top,
                                                left,
                                                zIndex: 11,
                                                flexDirection: "row",
                                                justifyContent: "center",
                                                width: currentWidth,
                                                gap: 5,
                                            }}>
                                            {canShrink && (
                                                <ImageButton
                                                    type="alternative"
                                                    icon="remove-outline"
                                                    size={16}
                                                    onPress={() => adjustWidgetSize("down", false)}
                                                />
                                            )}
                                            {canGrow && (
                                                <ImageButton
                                                    type="alternative"
                                                    icon="add-outline"
                                                    size={16}
                                                    onPress={() => adjustWidgetSize("down", true)}
                                                />
                                            )}
                                        </View>
                                    );
                                })()}

                                {/* LEFT Controls */}
                                {(() => {
                                    const map = getOccupiedMap();
                                    const canShrink = newWidgetSize.colSpan > 1;

                                    const nextCol = newWidgetStart.column - 1;
                                    const canGrow =
                                        nextCol >= 0 &&
                                        (() => {
                                            const { row } = newWidgetStart;
                                            const { rowSpan } = newWidgetSize;
                                            return Array.from(
                                                { length: rowSpan },
                                                (_, i) => !map[row + i][nextCol],
                                            ).every(Boolean);
                                        })();

                                    if (!canShrink && !canGrow) return null;

                                    const left = newWidgetStart.column * (gridItemWidth + gap) - 14;
                                    const top = newWidgetStart.row * (itemHeight + gap);
                                    const currentHeight =
                                        itemHeight * newWidgetSize.rowSpan +
                                        gap * (newWidgetSize.rowSpan - 1);

                                    return (
                                        <View
                                            style={{
                                                position: "absolute",
                                                top,
                                                left,
                                                zIndex: 11,
                                                flexDirection: "column",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                height: currentHeight,
                                                gap: 5,
                                            }}>
                                            {canShrink && (
                                                <ImageButton
                                                    type="alternative"
                                                    icon="remove-outline"
                                                    size={16}
                                                    onPress={() => adjustWidgetSize("left", false)}
                                                />
                                            )}
                                            {canGrow && (
                                                <ImageButton
                                                    type="alternative"
                                                    icon="add-outline"
                                                    size={16}
                                                    onPress={() => adjustWidgetSize("left", true)}
                                                />
                                            )}
                                        </View>
                                    );
                                })()}

                                {/* RIGHT Controls */}
                                {(() => {
                                    const map = getOccupiedMap();
                                    const canShrink = newWidgetSize.colSpan > 1;

                                    const nextCol = newWidgetStart.column + newWidgetSize.colSpan;
                                    const canGrow =
                                        nextCol < columns &&
                                        (() => {
                                            const { row } = newWidgetStart;
                                            const { rowSpan } = newWidgetSize;
                                            return Array.from(
                                                { length: rowSpan },
                                                (_, i) => !map[row + i][nextCol],
                                            ).every(Boolean);
                                        })();

                                    if (!canShrink && !canGrow) return null;

                                    const left =
                                        newWidgetStart.column * (gridItemWidth + gap) +
                                        gridItemWidth * newWidgetSize.colSpan +
                                        gap * (newWidgetSize.colSpan - 1) -
                                        14;

                                    const top = newWidgetStart.row * (itemHeight + gap);
                                    const currentHeight =
                                        itemHeight * newWidgetSize.rowSpan +
                                        gap * (newWidgetSize.rowSpan - 1);

                                    return (
                                        <View
                                            style={{
                                                position: "absolute",
                                                top,
                                                left,
                                                zIndex: 11,
                                                flexDirection: "column",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                height: currentHeight,
                                                gap: 5,
                                            }}>
                                            {canShrink && (
                                                <ImageButton
                                                    type="alternative"
                                                    icon="remove-outline"
                                                    size={16}
                                                    onPress={() => adjustWidgetSize("right", false)}
                                                />
                                            )}
                                            {canGrow && (
                                                <ImageButton
                                                    type="alternative"
                                                    icon="add-outline"
                                                    size={16}
                                                    onPress={() => adjustWidgetSize("right", true)}
                                                />
                                            )}
                                        </View>
                                    );
                                })()}
                            </>
                        )}
                    </View>
                </View>

                <View
                    style={{
                        position: "absolute",
                        bottom: 0,
                        marginBottom: 15,
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%",
                        paddingHorizontal: 15,
                        paddingRight: addMode() ? 15 : 80,
                    }}>
                    {addMode() ? (
                        <View
                            style={{
                                flex: 1,
                                flexDirection: "row",
                                justifyContent: "flex-end",
                                gap: 12,
                            }}>
                            <ImageButton icon="checkmark-outline" size={40} onPress={addWidget} />
                            <ImageButton
                                icon="close-outline"
                                size={40}
                                onPress={toogleModeClicked}
                            />
                        </View>
                    ) : (
                        <>
                            <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 0 }}>
                                <UserNote text={"Visible values are only informational."} />
                            </View>
                        </>
                    )}
                </View>

                {!addMode() && (
                    <FAB
                        actions={
                            toogleMode
                                ? [
                                      {
                                          icon: "arrow-undo-outline",
                                          label: "Cancel",
                                          onPress: toogleModeClicked,
                                      },
                                  ]
                                : [
                                      {
                                          icon: "hardware-chip-outline",
                                          label: "Device Details",
                                          onPress: deviceDetailsClicked,
                                      },
                                      {
                                          icon: "add-circle-outline",
                                          label: "Add Dashboard",
                                          onPress: addDashboardClicked,
                                      },
                                      {
                                          icon: "create-outline",
                                          label: "Dashboard Details",
                                          onPress: editDashboardClicked,
                                      },
                                      {
                                          icon: "apps-outline",
                                          label: "Place Widget",
                                          onPress: toogleModeClicked,
                                      },
                                  ]
                        }
                    />
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: "absolute",
        left: 15,
        paddingHorizontal: 15,
        paddingTop: 20,
        paddingBottom: 100,
    },
    adjustBtn: {
        backgroundColor: "#eee",
        padding: 5,
        borderRadius: 5,
        marginHorizontal: 2,
        borderWidth: 1,
        borderColor: "#ccc",
    },
});
