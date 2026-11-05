import type { OperationListDto } from "@/contexts/custom/DeviceListProvider";

export const getOperationLabel = (
    operation: OperationListDto,
    operations: OperationListDto[],
): string => {
    const matches = operations.filter((item) => item.name === operation.name);
    if (matches.length < 2) return operation.name;

    const prefix = operation.id.slice(0, 8);
    const hasPrefixCollision = matches.some(
        (item) => item.id !== operation.id && item.id.slice(0, 8) === prefix,
    );
    return `${operation.name} (${operation.type} · ${hasPrefixCollision ? operation.id : prefix})`;
};
