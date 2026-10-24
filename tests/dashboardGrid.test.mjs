import assert from "node:assert/strict";
import test from "node:test";
import {
    isPlacementAvailable,
    parseDashboardPlacement,
    readGridConfiguration,
    unlinkDashboardWidget,
    dragDashboardPlacement,
} from "../src/utils/dashboardGrid.ts";

const grid = {
    rows: 2,
    columns: 3,
    calculatedWidgets: [{ id: "widget-a", name: "Light", type: "Switch", configuration: {} }],
    positionedWidgets: [{ widgetId: "widget-a", row: 0, column: 1, rowSpan: 1, columnSpan: 1 }],
};

test("placement gestures snap from their starting rectangle and clamp to grid edges", () => {
    const empty = { ...grid, rows: 4, columns: 5, positionedWidgets: [] };
    const placement = { row: 1, column: 1, rowSpan: 1, columnSpan: 2 };
    const drag = (mode, deltaX, deltaY) =>
        dragDashboardPlacement({
            grid: empty,
            placement,
            mode,
            deltaX,
            deltaY,
            columnPitch: 60,
            rowPitch: 104,
        });
    assert.deepEqual(drag("move", 61, 105), { ...placement, row: 2, column: 2 });
    assert.deepEqual(drag("move", 10000, -10000), { ...placement, row: 0, column: 3 });
    assert.deepEqual(drag("resize", 60, 104), { ...placement, rowSpan: 2, columnSpan: 3 });
    assert.deepEqual(drag("resize", -10000, -10000), { ...placement, rowSpan: 1, columnSpan: 1 });
    assert.deepEqual(drag("resize", 10000, 10000), { ...placement, rowSpan: 3, columnSpan: 4 });
});

test("placement gestures reject collisions and malformed movement without changing the draft", () => {
    const placement = { row: 0, column: 0, rowSpan: 1, columnSpan: 1 };
    const input = {
        grid,
        placement,
        mode: "move",
        deltaX: 60,
        deltaY: 0,
        columnPitch: 60,
        rowPitch: 104,
    };
    assert.equal(dragDashboardPlacement(input), undefined);
    assert.equal(dragDashboardPlacement({ ...input, mode: "resize" }), undefined);
    assert.equal(dragDashboardPlacement({ ...input, deltaX: NaN }), undefined);
    assert.equal(dragDashboardPlacement({ ...input, columnPitch: 0 }), undefined);
    assert.deepEqual(placement, { row: 0, column: 0, rowSpan: 1, columnSpan: 1 });
});

test("dashboard grid validator keeps supported dimensions and rejects malformed geometry", () => {
    assert.equal(readGridConfiguration(grid), grid);
    assert.ok(
        readGridConfiguration({
            rows: 1,
            columns: 1,
            calculatedWidgets: [],
            positionedWidgets: [],
        }),
    );
    assert.ok(
        readGridConfiguration({
            rows: 10,
            columns: 5,
            calculatedWidgets: [],
            positionedWidgets: [],
        }),
    );
    assert.equal(readGridConfiguration({ ...grid, rows: 0 }), undefined);
    assert.equal(readGridConfiguration({ ...grid, rows: 11 }), undefined);
    assert.equal(readGridConfiguration({ ...grid, rows: 1.5 }), undefined);
    assert.equal(readGridConfiguration({ ...grid, columns: 0 }), undefined);
    assert.equal(readGridConfiguration({ ...grid, columns: 6 }), undefined);
    assert.equal(readGridConfiguration({ ...grid, columns: Number.NaN }), undefined);
    assert.equal(readGridConfiguration({ ...grid, calculatedWidgets: null }), undefined);
    assert.equal(readGridConfiguration({ ...grid, positionedWidgets: "invalid" }), undefined);

    for (const placement of [
        { ...grid.positionedWidgets[0], row: -1 },
        { ...grid.positionedWidgets[0], row: 0.5 },
        { ...grid.positionedWidgets[0], column: Number.POSITIVE_INFINITY },
        { ...grid.positionedWidgets[0], rowSpan: 0 },
        { ...grid.positionedWidgets[0], columnSpan: -1 },
        { ...grid.positionedWidgets[0], row: 2 },
        { ...grid.positionedWidgets[0], column: 3 },
        { ...grid.positionedWidgets[0], columnSpan: 4 },
        { ...grid.positionedWidgets[0], widgetId: "" },
    ]) {
        assert.equal(
            readGridConfiguration({ ...grid, positionedWidgets: [placement] }),
            undefined,
            JSON.stringify(placement),
        );
    }

    assert.equal(
        readGridConfiguration({
            ...grid,
            positionedWidgets: [
                grid.positionedWidgets[0],
                { widgetId: "widget-b", row: 0, column: 1, rowSpan: 1, columnSpan: 1 },
            ],
        }),
        undefined,
        "Stored widget rectangles cannot overlap",
    );
});

test("dashboard grid validator does not repair or mutate the saved configuration", () => {
    const source = structuredClone(grid);
    const before = structuredClone(source);
    assert.equal(readGridConfiguration(source), source);
    assert.deepEqual(source, before);
});

test("placement route parser accepts only decimal route values and first array entries", () => {
    assert.deepEqual(
        parseDashboardPlacement({
            row: ["0", "9"],
            column: ["2", "9"],
            rowSpan: ["1", "8"],
            columnSpan: ["2", "8"],
        }),
        { row: 0, column: 2, rowSpan: 1, columnSpan: 2 },
    );
    assert.deepEqual(
        parseDashboardPlacement({ row: "9", column: "4", rowSpan: "10", columnSpan: "5" }),
        { row: 9, column: 4, rowSpan: 10, columnSpan: 5 },
    );

    for (const value of [undefined, "", "-1", "1.5", "1e2", "2x", " 1", "+1"])
        assert.equal(
            parseDashboardPlacement({ row: value, column: "0", rowSpan: "1", columnSpan: "1" }),
            undefined,
            `Invalid route value ${JSON.stringify(value)} must be rejected`,
        );

    for (const params of [
        {},
        { row: ["", "1"], column: "0", rowSpan: "1", columnSpan: "1" },
        { row: "0", column: "0", rowSpan: "0", columnSpan: "1" },
        { row: "0", column: "0", rowSpan: "1", columnSpan: "0" },
        { row: "9007199254740992", column: "0", rowSpan: "1", columnSpan: "1" },
    ])
        assert.equal(parseDashboardPlacement(params), undefined);
});

test("placement availability checks edge cells and occupied rectangles", () => {
    const empty = { ...grid, positionedWidgets: [] };
    assert.equal(
        isPlacementAvailable(empty, { row: 0, column: 0, rowSpan: 1, columnSpan: 1 }),
        true,
    );
    assert.equal(
        isPlacementAvailable(empty, { row: 1, column: 2, rowSpan: 1, columnSpan: 1 }),
        true,
    );
    assert.equal(
        isPlacementAvailable(grid, { row: 0, column: 1, rowSpan: 1, columnSpan: 1 }),
        false,
    );
    assert.equal(
        isPlacementAvailable(grid, { row: 0, column: 0, rowSpan: 2, columnSpan: 2 }),
        false,
    );
    assert.equal(
        isPlacementAvailable(empty, { row: 2, column: 0, rowSpan: 1, columnSpan: 1 }),
        false,
    );
    assert.equal(
        isPlacementAvailable(empty, { row: 0, column: 3, rowSpan: 1, columnSpan: 1 }),
        false,
    );
    assert.equal(
        isPlacementAvailable(empty, { row: 0, column: 0, rowSpan: 0, columnSpan: 1 }),
        false,
    );
    assert.equal(
        isPlacementAvailable(
            {
                ...grid,
                positionedWidgets: [
                    { widgetId: "bad", row: 8, column: 0, rowSpan: 1, columnSpan: 1 },
                ],
            },
            { row: 0, column: 0, rowSpan: 1, columnSpan: 1 },
        ),
        false,
        "Malformed saved rectangles do not permit new placement",
    );
});

test("dashboard widget unlink uses the captured dashboard identity and removes locally only after acceptance", async () => {
    const requests = [];
    let removed = 0;
    const didRemove = await unlinkDashboardWidget({
        dashboardId: "dashboard-captured",
        widgetId: "widget-a",
        deleteWidget: async (path) => {
            requests.push(path);
            return { isSuccess: true };
        },
        onRemoved: () => removed++,
    });

    assert.equal(didRemove, true);
    assert.deepEqual(requests, ["v1/devices/dashboards/dashboard-captured/widgets/widget-a"]);
    assert.equal(removed, 1);
});

test("failed dashboard widget unlink preserves local placement and can be retried", async () => {
    let requests = 0;
    let removed = 0;
    const options = {
        dashboardId: "dashboard-captured",
        widgetId: "widget-a",
        deleteWidget: async () => {
            requests++;
            return { isSuccess: false };
        },
        onRemoved: () => removed++,
    };

    assert.equal(await unlinkDashboardWidget(options), false);
    assert.equal(removed, 0);
    options.deleteWidget = async () => {
        requests++;
        return { isSuccess: true };
    };
    assert.equal(await unlinkDashboardWidget(options), true);
    assert.equal(requests, 2);
    assert.equal(removed, 1);
});

test("thrown dashboard widget unlink errors leave local placement intact", async () => {
    let removed = false;
    assert.equal(
        await unlinkDashboardWidget({
            dashboardId: "dashboard-captured",
            widgetId: "widget-a",
            deleteWidget: async () => {
                throw new Error("network unavailable");
            },
            onRemoved: () => (removed = true),
        }),
        false,
    );
    assert.equal(removed, false);
});
