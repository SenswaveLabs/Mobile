import { OperationType } from "@/types/DeviceTypes";

export type ConditionType =
    | "BooleanCondition"
    | "NumberCondition"
    | "TextCondition"
    | "InvalidCondition";
export type ConditionConnector = "And" | "Or";

export type AutomationConditionDto = {
    operationId: string;
    operationName: string;
    conditionType: ConditionType;

    conditionConfiguration: any;
};

export type AutomationResultDto = {
    operationId: string;
    operationName: string;

    valueToSend: any;
};

export type AutomationDto = {
    id: string;
    homeId: string;
    name: string;
    icon: string;
    conditionConnector: ConditionConnector;
    isEnabled: boolean;

    conditions?: AutomationConditionDto[];
    results?: AutomationResultDto[];
};

export const OperationToConditionMap: Record<OperationType, ConditionType> = {
    Boolean: "BooleanCondition",
    Number: "NumberCondition",
    Integer: "NumberCondition",
    Text: "TextCondition",
    HexColor: "TextCondition",
    Options: "TextCondition",
};
