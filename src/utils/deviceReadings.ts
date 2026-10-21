import { Device } from "@/contexts/custom/DeviceListProvider";
import { OperationType } from "@/types/DeviceTypes";

export interface DeviceReading {
    operationId?: string;
    label: string;
    unit: string;
    value?: number | boolean | null;
    operationType?: OperationType;
}

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
