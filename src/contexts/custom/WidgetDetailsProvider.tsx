import { OperationDto, WidgetDto, WidgetType } from "@/types/DeviceTypes";
import React, { createContext, useContext, useState, useRef, ReactNode } from "react";
import { useHttpClient } from "../HttpClientProvider";
import { useToast } from "../ToastProvider";

type AddWidgetDto = {
    operationId: string;

    name: string;
    type: WidgetType;

    configuration: any;
};

type WidgetBaseErrors = {
    nameError: string;
};

interface WidgetDetailsContextProps {
    loading: boolean;

    operation: OperationDto | undefined;
    widget: WidgetDto | undefined;
    errors: WidgetBaseErrors;
    setWidget: (widget: WidgetDto) => void;

    initializeForAdd: (operationId: string) => Promise<void>;
    initializeForDisplay: (widgetId: string) => Promise<void>;

    toAddDto: () => AddWidgetDto;
    isValid: boolean;
    setIsValid: (valid: boolean) => void;
    validateDto: () => boolean;
    setAdditionalValidation: (callback: () => boolean) => void;
}

const WidgetDetailsContext = createContext<WidgetDetailsContextProps>({
    loading: false,

    operation: undefined,

    widget: undefined,
    errors: { nameError: "" },
    setWidget: () => {},

    initializeForAdd: (): Promise<void> => {
        console.warn("[WidgetDetailsProvider] Initialize for add not implemented.");
        return Promise.resolve();
    },
    initializeForDisplay: (): Promise<void> => Promise.resolve(),

    toAddDto: (): AddWidgetDto => {
        return { operationId: "", name: "", type: "Invalid", configuration: {} };
    },
    isValid: false,
    setIsValid: () => {},
    validateDto: () => false,
    setAdditionalValidation: () => {
        console.warn("[WidgetDetailsProvider] Validation function set.");
    },
});

export const WidgetDetailsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const httpClient = useHttpClient();
    const toast = useToast();

    const [loading, setLoading] = useState<boolean>(false);

    const [operation, setOperation] = useState<OperationDto | undefined>(undefined);
    const [widget, setWidget] = useState<WidgetDto | undefined>(undefined);
    const [errors, setErrors] = useState<WidgetBaseErrors>({ nameError: "" });
    const [isValid, setIsValid] = useState<boolean>(false);

    const additionalValidateRef = useRef<(() => boolean) | null>(null);

    const initializeForAdd = async (operationId: string) => {
        if (loading) {
            console.info("[WidgetDetailsContext] Already processing.");
            return;
        }

        setLoading(true);

        const response = await httpClient.get("v1/devices/operations/" + operationId);

        if (response.isSuccess) {
            const content = (await response.response?.json()) as OperationDto;
            setOperation(content);
        } else {
            toast.httpError(response);
        }

        setWidget({
            id: "",
            deviceId: "",
            operationId: operationId,

            name: "",
            type: "Button",
            enabled: true,

            configuration: {},
        });

        setLoading(false);
    };

    const initializeForDisplay = async (widgetId: string) => {
        if (loading) {
            console.info("[WidgetDetailsContext] Already processing.");
            return;
        }

        setLoading(true);

        const widgetResponse = await httpClient.get("v1/devices/widgets/" + widgetId);

        let operationId = "";

        if (widgetResponse.isSuccess) {
            const content = (await widgetResponse.response?.json()) as WidgetDto;
            operationId = content.operationId;
            setWidget(content);
        } else {
            toast.httpError(widgetResponse);
            setLoading(false);
            return;
        }

        const response = await httpClient.get("v1/devices/operations/" + operationId);

        if (response.isSuccess) {
            const content = (await response.response?.json()) as OperationDto;
            setOperation(content);
        } else {
            toast.httpError(response);
            setLoading(false);
            return;
        }

        setLoading(false);
    };

    const toAddDto = (): AddWidgetDto => {
        return {
            operationId: widget?.operationId ?? "",

            name: widget?.name ?? "",
            type: widget?.type ?? "Invalid",

            configuration: widget?.configuration ?? {},
        };
    };

    const validateDto = () => {
        console.info("[WidgetDetailsProvider] Validating.");

        let valid = true;

        const name = widget?.name ?? "";

        if (name === "") {
            valid = false;
            setErrors({ ...errors, nameError: "" });
        } else if (name.length > 64) {
            valid = false;
            setErrors({ ...errors, nameError: "Name is too long." });
        } else if (name.length < 3) {
            valid = false;
            setErrors({ ...errors, nameError: "Name is too short." });
        } else {
            setErrors({ ...errors, nameError: "" });
        }

        if (additionalValidateRef.current) {
            const additionalValid = additionalValidateRef.current();
            valid = additionalValid && valid;

            console.info("[WidgetDetailsProvider] Additional validation result:", additionalValid);
        } else {
            console.warn("[WidgetDetailsProvider] No additional validation function set.");
        }

        setIsValid(valid);

        return valid;
    };

    const setAdditionalValidation = (callback: () => boolean) => {
        additionalValidateRef.current = () => {
            return callback();
        };
    };

    console.info("[WidgetDetailsProvider] Initialized.");

    return (
        <WidgetDetailsContext.Provider
            value={{
                loading,
                operation,
                errors,
                widget,
                setWidget,
                initializeForAdd,
                initializeForDisplay,
                toAddDto,
                isValid,
                setIsValid,
                validateDto,
                setAdditionalValidation,
            }}>
            {children}
        </WidgetDetailsContext.Provider>
    );
};

export const useWidgetDetails = () => useContext(WidgetDetailsContext);
