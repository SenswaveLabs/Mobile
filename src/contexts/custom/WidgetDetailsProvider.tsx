import type { OperationDto, OperationType, WidgetDto, WidgetType } from "@/types/DeviceTypes";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    FC,
    PropsWithChildren,
} from "react";
import { useHttpClient } from "../HttpClientProvider";

export interface AddWidgetDto {
    operationId: string;
    name: string;
    type: WidgetType;
    configuration: any;
}

export const supportedWidgetTypes: Record<OperationType, WidgetType[]> = {
    Boolean: ["Button", "Switch"],
    Number: ["Button", "Display", "Slider"],
    Integer: ["Button", "Display", "Slider"],
    Text: ["Button", "Display"],
    HexColor: ["Button", "Color"],
    Options: ["Button", "Radio"],
};

interface WidgetDetailsContextProps {
    loading: boolean;
    loadError: string;
    operation: OperationDto | undefined;
    widget: WidgetDto | undefined;
    errors: { nameError: string };
    setWidget: (widget: WidgetDto) => void;
    initializeForAdd: (operationId: string) => Promise<void>;
    initializeForDisplay: (widgetId: string) => Promise<void>;
    toAddDto: () => AddWidgetDto;
    isValid: boolean;
    setIsValid: (valid: boolean) => void;
    validateDto: (showErrors?: boolean) => boolean;
    setAdditionalValidation: (callback: (() => boolean) | null) => void;
}

const WidgetDetailsContext = createContext<WidgetDetailsContextProps>({
    loading: true,
    loadError: "",
    operation: undefined,
    widget: undefined,
    errors: { nameError: "" },
    setWidget: () => {},
    initializeForAdd: async () => {},
    initializeForDisplay: async () => {},
    toAddDto: () => ({ operationId: "", name: "", type: "Invalid", configuration: {} }),
    isValid: false,
    setIsValid: () => {},
    validateDto: () => false,
    setAdditionalValidation: () => {},
});

const isConfiguration = (value: unknown) =>
    value !== null && typeof value === "object" && !Array.isArray(value);

export const WidgetDetailsProvider: FC<PropsWithChildren> = ({ children }) => {
    const httpClient = useHttpClient();
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [operation, setOperation] = useState<OperationDto>();
    const [widget, setWidgetState] = useState<WidgetDto>();
    const [errors, setErrors] = useState({ nameError: "" });
    const [isValid, setIsValid] = useState(false);
    const widgetRef = useRef<WidgetDto | undefined>(undefined);
    const requestRef = useRef(0);
    const additionalValidateRef = useRef<(() => boolean) | null>(null);

    useEffect(
        () => () => {
            ++requestRef.current;
        },
        [],
    );

    const setWidget = useCallback((value: WidgetDto) => {
        widgetRef.current = value;
        setWidgetState(value);
    }, []);

    const readOperation = useCallback(
        async (operationId: string) => {
            const result = await httpClient.get(`v1/devices/operations/${operationId}`);
            if (!result.isSuccess || !result.response) throw new Error("Operation read failed");
            const content = (await result.response.json()) as OperationDto;
            if (
                !content ||
                content.id !== operationId ||
                typeof content.name !== "string" ||
                !Object.prototype.hasOwnProperty.call(supportedWidgetTypes, content.type) ||
                !isConfiguration(content.configuration)
            ) {
                throw new Error("Invalid operation");
            }
            return content;
        },
        [httpClient],
    );

    const initialize = useCallback(
        async (id: string, display: boolean) => {
            const request = ++requestRef.current;
            setLoading(true);
            setLoadError("");
            setOperation(undefined);
            widgetRef.current = undefined;
            setWidgetState(undefined);
            setErrors({ nameError: "" });
            setIsValid(false);
            additionalValidateRef.current = null;

            try {
                if (!id?.trim()) throw new Error("Missing identifier");
                let nextWidget: WidgetDto;
                if (display) {
                    const result = await httpClient.get(`v1/devices/widgets/${id}`);
                    if (!result.isSuccess || !result.response)
                        throw new Error("Widget read failed");
                    nextWidget = (await result.response.json()) as WidgetDto;
                    if (
                        !nextWidget ||
                        nextWidget.id !== id ||
                        typeof nextWidget.operationId !== "string" ||
                        !nextWidget.operationId.trim() ||
                        typeof nextWidget.deviceId !== "string" ||
                        typeof nextWidget.name !== "string" ||
                        typeof nextWidget.type !== "string" ||
                        typeof nextWidget.enabled !== "boolean" ||
                        !isConfiguration(nextWidget.configuration)
                    ) {
                        throw new Error("Invalid widget");
                    }
                } else {
                    nextWidget = {
                        id: "",
                        deviceId: "",
                        operationId: id,
                        name: "",
                        type: "Button",
                        enabled: true,
                        configuration: {},
                    };
                }
                const nextOperation = await readOperation(nextWidget.operationId);
                if (request !== requestRef.current) return;
                setOperation(nextOperation);
                setWidget(nextWidget);
            } catch {
                if (request === requestRef.current)
                    setLoadError(
                        display
                            ? "Couldn't load this widget. Try again."
                            : "Couldn't load the operation. Try again.",
                    );
            } finally {
                if (request === requestRef.current) setLoading(false);
            }
        },
        [httpClient, readOperation, setWidget],
    );

    const initializeForAdd = useCallback(
        (operationId: string) => initialize(operationId, false),
        [initialize],
    );
    const initializeForDisplay = useCallback(
        (widgetId: string) => initialize(widgetId, true),
        [initialize],
    );

    const toAddDto = (): AddWidgetDto => ({
        operationId: widgetRef.current?.operationId ?? "",
        name: widgetRef.current?.name.trim() ?? "",
        type: widgetRef.current?.type ?? "Invalid",
        configuration: widgetRef.current?.configuration ?? {},
    });

    const validateDto = (showErrors = false) => {
        const current = widgetRef.current;
        const name = current?.name.trim() ?? "";
        const nameError =
            name.length === 0
                ? showErrors
                    ? "Name is required."
                    : ""
                : name.length < 3 || name.length > 64
                  ? "Use 3–64 characters."
                  : "";
        setErrors({ nameError });
        const additionalValid = additionalValidateRef.current?.() ?? true;
        const valid =
            name.length >= 3 &&
            name.length <= 64 &&
            Boolean(
                operation &&
                current &&
                supportedWidgetTypes[operation.type]?.includes(current.type),
            ) &&
            additionalValid;
        setIsValid(valid);
        return valid;
    };

    const setAdditionalValidation = useCallback((callback: (() => boolean) | null) => {
        additionalValidateRef.current = callback;
    }, []);

    return (
        <WidgetDetailsContext.Provider
            value={{
                loading,
                loadError,
                operation,
                widget,
                errors,
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
