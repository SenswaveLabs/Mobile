import type { Device } from "@/contexts/custom/DeviceListProvider";
import type { OperationType } from "@/types/DeviceTypes";

export interface DeviceReading {
    operationId?: string;
    label: string;
    unit: string;
    value?: number | boolean | null;
    operationType?: OperationType;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const isOptionalString = (value: unknown) =>
    value === undefined || value === null || typeof value === "string";

const isDeviceConfiguration = (value: unknown) => {
    if (value === undefined || value === null) return true;
    if (!isRecord(value)) return false;

    const readings = value.readings;
    const range = value.range;
    return (
        isOptionalString(value.label) &&
        isOptionalString(value.unit) &&
        (value.step === undefined ||
            value.step === null ||
            typeof value.step === "number" ||
            typeof value.step === "string") &&
        (value.operationType === undefined ||
            value.operationType === null ||
            typeof value.operationType === "string") &&
        (value.options === undefined ||
            value.options === null ||
            (Array.isArray(value.options) &&
                value.options.every((option) => typeof option === "string"))) &&
        (range === undefined ||
            range === null ||
            (isRecord(range) && typeof range.min === "number" && typeof range.max === "number")) &&
        (readings === undefined ||
            readings === null ||
            (Array.isArray(readings) &&
                readings.every(
                    (reading) =>
                        isRecord(reading) &&
                        typeof reading.operationId === "string" &&
                        typeof reading.label === "string" &&
                        typeof reading.unit === "string",
                )))
    );
};

export const isConsumedDevice = (value: unknown, expectedId?: string): value is Device => {
    if (!isRecord(value)) return false;
    const tile = value.tile;
    const presence = value.presence;
    return (
        typeof value.id === "string" &&
        value.id.length > 0 &&
        (expectedId === undefined || value.id === expectedId) &&
        typeof value.name === "string" &&
        typeof value.icon === "string" &&
        isOptionalString(value.roomId) &&
        isRecord(tile) &&
        typeof tile.type === "string" &&
        isOptionalString(tile.operationId) &&
        isOptionalString(tile.displayableOperationId) &&
        isDeviceConfiguration(tile.configuration) &&
        (presence === undefined ||
            presence === null ||
            (isRecord(presence) &&
                typeof presence.type === "string" &&
                isOptionalString(presence.operationId) &&
                (presence.value === undefined ||
                    presence.value === null ||
                    typeof presence.value === "boolean") &&
                isOptionalString(presence.lastSeenAtUtc)))
    );
};

export const formatReadingValue = (value: unknown, unit: string) => {
    const text =
        typeof value === "boolean"
            ? value
                ? "On"
                : "Off"
            : typeof value === "number" && Number.isFinite(value)
              ? String(value)
              : "—";
    return text + (unit ? ` ${unit}` : "");
};

export const getDeviceReadings = (tile: Device["tile"], inactive = false): DeviceReading[] =>
    [
        {
            label: tile.configuration?.label ?? "",
            unit: tile.configuration?.unit ?? "",
            value: tile.value,
            operationType: tile.configuration?.operationType,
        },
        ...(Array.isArray(tile.configuration?.readings) ? tile.configuration.readings : []),
    ]
        .filter(
            (reading): reading is DeviceReading =>
                reading && typeof reading.label === "string" && typeof reading.unit === "string",
        )
        .map((reading) => ({ ...reading, value: inactive ? null : reading.value }));
