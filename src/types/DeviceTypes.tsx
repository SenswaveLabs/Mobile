export type OperationType = "Boolean" | "Number" | "Integer" | "Text" | "HexColor" | "Options";

export type DevicePresenceType = "" | "Default" | "BooleanOperation";

export type WidgetType =
    | "Invalid"
    | "Empty"
    | "Button"
    | "Display"
    | "Switch"
    | "Radio"
    | "Slider"
    | "Color";

export type WidgetListDto = {
    id: string;
    name: string;
    type: WidgetType;
    enabled: boolean;

    // Frontend only field
    empty?: boolean;
};

export type OperationGroupListDto = {
    id: string;
    name: string;
    type: OperationType;
};

export type OperationGroup = {
    widgets: WidgetListDto[];
    operation: OperationGroupListDto;
};

export type OperationDto = {
    id: string;
    name: string;
    topic: string;
    type: OperationType;
    configuration: any;
};

export type WidgetDto = {
    id: string;
    deviceId: string;
    operationId: string;

    name: string;
    type: WidgetType;
    enabled: boolean;

    configuration: any;
};
