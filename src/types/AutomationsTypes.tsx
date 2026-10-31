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

export type AutomationConditionInput =
    | {
          operationId: string;
          conditionType: "BooleanCondition";
          conditionConfiguration: { isOn: boolean };
      }
    | {
          operationId: string;
          conditionType: "NumberCondition";
          conditionConfiguration: { minValue: number; maxValue: number };
      }
    | {
          operationId: string;
          conditionType: "TextCondition";
          conditionConfiguration: { requiredValue: string };
      };

export type AutomationConditionDraft = AutomationConditionInput & { operationName: string };

export interface AutomationResultDraft {
    operationId: string;
    operationName: string;
    valueToSend: string;
}

export interface AutomationFormValues {
    name: string;
    icon: string;
    conditionConnector: ConditionConnector;
    isEnabled: boolean;
}

export interface CreateAutomationRequest {
    homeId: string;
    name: string;
    icon: string;
    conditionConnector: ConditionConnector;
    conditions: AutomationConditionInput[];
    results: { operationId: string; valueToSend: string }[];
}

export type PatchAutomationRequest = Partial<
    Pick<AutomationFormValues, "name" | "icon" | "conditionConnector">
>;

export interface PutAutomationResultRequest {
    operationId: string;
    value: string;
}

export interface AutomationSession {
    token: string;
    homeId: string;
    automationId?: string;
    conditions: AutomationConditionDto[];
    results: AutomationResultDto[];
}

export const OperationToConditionMap: Record<
    OperationType,
    Exclude<ConditionType, "InvalidCondition">
> = {
    Boolean: "BooleanCondition",
    Number: "NumberCondition",
    Integer: "NumberCondition",
    Text: "TextCondition",
    HexColor: "TextCondition",
    Options: "TextCondition",
};
