import type { OperationDto } from "@/types/DeviceTypes";

const isRecord = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === "object" && !Array.isArray(value);

export const isConsumedOperation = (value: unknown, expectedId: string): value is OperationDto => {
    if (!isRecord(value) || !isRecord(value.configuration)) return false;
    const { configuration, type } = value;
    if (
        value.id !== expectedId ||
        typeof value.name !== "string" ||
        typeof type !== "string" ||
        !["Boolean", "Number", "Integer", "Text", "HexColor", "Options"].includes(type)
    )
        return false;

    if (type === "Number" || type === "Integer") {
        for (const bound of [configuration.min, configuration.max])
            if (bound !== undefined && (typeof bound !== "number" || !Number.isFinite(bound)))
                return false;
    }
    return (
        type !== "Options" ||
        (Array.isArray(configuration.options) &&
            configuration.options.every(
                (option) => isRecord(option) && typeof option.name === "string",
            ))
    );
};
