import type {
    CalculatedWidget,
    GridDashboardConfiguration,
    PositionedWidget,
} from "@/components/device/dashboards/DashboardView";

export interface DashboardPlacement {
    row: number;
    column: number;
    rowSpan: number;
    columnSpan: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isSafeInteger = (value: unknown): value is number =>
    typeof value === "number" && Number.isSafeInteger(value);

const isGridSize = (rows: unknown, columns: unknown): boolean =>
    isSafeInteger(rows) &&
    rows >= 1 &&
    rows <= 10 &&
    isSafeInteger(columns) &&
    columns >= 1 &&
    columns <= 5;

const isPosition = (value: unknown, rows: number, columns: number): value is PositionedWidget => {
    if (!isRecord(value)) return false;
    const { widgetId, row, column, rowSpan, columnSpan } = value;
    return (
        typeof widgetId === "string" &&
        widgetId.length > 0 &&
        isSafeInteger(row) &&
        row >= 0 &&
        isSafeInteger(column) &&
        column >= 0 &&
        isSafeInteger(rowSpan) &&
        rowSpan >= 1 &&
        isSafeInteger(columnSpan) &&
        columnSpan >= 1 &&
        row + rowSpan <= rows &&
        column + columnSpan <= columns
    );
};

const overlaps = (first: DashboardPlacement, second: DashboardPlacement) =>
    first.row < second.row + second.rowSpan &&
    first.row + first.rowSpan > second.row &&
    first.column < second.column + second.columnSpan &&
    first.column + first.columnSpan > second.column;

const validPositions = (positions: unknown, rows: number, columns: number) => {
    if (!Array.isArray(positions)) return false;
    const accepted: PositionedWidget[] = [];
    for (const position of positions) {
        if (!isPosition(position, rows, columns)) return false;
        if (accepted.some((current) => overlaps(current, position))) return false;
        accepted.push(position);
    }
    return true;
};

export const readGridConfiguration = (value: unknown): GridDashboardConfiguration | undefined => {
    if (!isRecord(value) || !isGridSize(value.rows, value.columns)) return undefined;
    const rows = value.rows as number;
    const columns = value.columns as number;
    if (!Array.isArray(value.calculatedWidgets)) return undefined;
    const widgets = value.calculatedWidgets as unknown[];
    if (
        !widgets.every(
            (widget) =>
                isRecord(widget) &&
                typeof widget.id === "string" &&
                widget.id.length > 0 &&
                typeof widget.name === "string" &&
                typeof widget.type === "string" &&
                (widget.configuration === undefined ||
                    widget.configuration === null ||
                    isRecord(widget.configuration)),
        )
    )
        return undefined;
    if (!validPositions(value.positionedWidgets, rows, columns)) return undefined;
    return value as unknown as GridDashboardConfiguration;
};

const parseNatural = (value: string | string[] | undefined, minimum: number) => {
    const first = Array.isArray(value) ? value[0] : value;
    if (typeof first !== "string" || !/^\d+$/.test(first)) return undefined;
    const parsed = Number(first);
    return Number.isSafeInteger(parsed) && parsed >= minimum ? parsed : undefined;
};

export const parseDashboardPlacement = (
    params: Record<string, string | string[] | undefined>,
): DashboardPlacement | undefined => {
    const row = parseNatural(params.row, 0);
    const column = parseNatural(params.column, 0);
    const rowSpan = parseNatural(params.rowSpan, 1);
    const columnSpan = parseNatural(params.columnSpan, 1);
    if (
        row === undefined ||
        column === undefined ||
        rowSpan === undefined ||
        columnSpan === undefined
    )
        return undefined;
    return { row, column, rowSpan, columnSpan };
};

export const isPlacementAvailable = (
    grid: GridDashboardConfiguration,
    placement: DashboardPlacement,
): boolean => {
    if (
        !isGridSize(grid.rows, grid.columns) ||
        !isSafeInteger(placement.row) ||
        placement.row < 0 ||
        !isSafeInteger(placement.column) ||
        placement.column < 0 ||
        !isSafeInteger(placement.rowSpan) ||
        placement.rowSpan < 1 ||
        !isSafeInteger(placement.columnSpan) ||
        placement.columnSpan < 1 ||
        placement.row + placement.rowSpan > grid.rows ||
        placement.column + placement.columnSpan > grid.columns ||
        !validPositions(grid.positionedWidgets, grid.rows, grid.columns)
    )
        return false;
    return !grid.positionedWidgets.some((position) => overlaps(position, placement));
};

export const dragDashboardPlacement = ({
    grid,
    placement,
    mode,
    deltaX,
    deltaY,
    columnPitch,
    rowPitch,
}: {
    grid: GridDashboardConfiguration;
    placement: DashboardPlacement;
    mode: "move" | "resize";
    deltaX: number;
    deltaY: number;
    columnPitch: number;
    rowPitch: number;
}): DashboardPlacement | undefined => {
    if (
        ![deltaX, deltaY, columnPitch, rowPitch].every(Number.isFinite) ||
        columnPitch <= 0 ||
        rowPitch <= 0
    )
        return undefined;
    const columns = Math.round(deltaX / columnPitch);
    const rows = Math.round(deltaY / rowPitch);
    const clamp = (value: number, max: number, min = 0) => Math.max(min, Math.min(max, value));
    const next =
        mode === "move"
            ? {
                  ...placement,
                  column: clamp(placement.column + columns, grid.columns - placement.columnSpan),
                  row: clamp(placement.row + rows, grid.rows - placement.rowSpan),
              }
            : {
                  ...placement,
                  columnSpan: clamp(
                      placement.columnSpan + columns,
                      grid.columns - placement.column,
                      1,
                  ),
                  rowSpan: clamp(placement.rowSpan + rows, grid.rows - placement.row, 1),
              };
    return isPlacementAvailable(grid, next) ? next : undefined;
};

export const unlinkDashboardWidget = async ({
    dashboardId,
    widgetId,
    deleteWidget,
    onRemoved,
}: {
    dashboardId: string;
    widgetId: string;
    deleteWidget: (path: string) => Promise<{ isSuccess?: boolean } | undefined>;
    onRemoved: () => void;
}): Promise<boolean> => {
    try {
        const result = await deleteWidget(
            `v1/devices/dashboards/${dashboardId}/widgets/${widgetId}`,
        );
        if (result?.isSuccess !== true) return false;
        onRemoved();
        return true;
    } catch {
        return false;
    }
};

export type { CalculatedWidget };
