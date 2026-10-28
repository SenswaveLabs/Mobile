import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

interface WidgetActionProps {
    widgetId: string;
    disabled: boolean;
    onFailure?: (failure: WidgetActionFailure) => void;
    onSuccess?: () => void;
}

export interface WidgetActionFailure {
    message: string;
    retry: () => Promise<boolean>;
}

export interface WidgetAction {
    pending: boolean;
    error: string;
    send: (value: string | number | boolean) => Promise<boolean>;
}

const failureMessage = "Couldn't control this widget. Try again.";

export const useWidgetAction = ({
    widgetId,
    disabled,
    onFailure,
    onSuccess,
}: WidgetActionProps): WidgetAction => {
    const httpClient = useHttpClient();
    const identityRef = useRef(widgetId);
    const disabledRef = useRef(disabled);
    const activeRef = useRef(false);
    const pendingRef = useRef(false);
    const requestVersionRef = useRef(0);
    const callbacksRef = useRef({ onFailure, onSuccess });
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");

    identityRef.current = widgetId;
    disabledRef.current = disabled;
    callbacksRef.current = { onFailure, onSuccess };

    useEffect(() => {
        requestVersionRef.current++;
        pendingRef.current = false;
        setPending(false);
        setError("");
    }, [widgetId]);

    useEffect(() => {
        if (!disabled) return;
        requestVersionRef.current++;
        pendingRef.current = false;
        setPending(false);
        setError("");
    }, [disabled]);

    useFocusEffect(
        useCallback(() => {
            activeRef.current = true;
            return () => {
                activeRef.current = false;
                requestVersionRef.current++;
                pendingRef.current = false;
                setPending(false);
                setError("");
            };
        }, []),
    );

    const send = useCallback(
        async (value: string | number | boolean) => {
            const capturedWidgetId = widgetId;
            if (
                !capturedWidgetId ||
                !activeRef.current ||
                disabledRef.current ||
                identityRef.current !== capturedWidgetId ||
                pendingRef.current
            )
                return false;

            pendingRef.current = true;
            setPending(true);
            setError("");
            const requestVersion = ++requestVersionRef.current;
            const isCurrent = () =>
                requestVersion === requestVersionRef.current &&
                identityRef.current === capturedWidgetId &&
                activeRef.current &&
                !disabledRef.current;

            try {
                const response = await httpClient.post(
                    `v1/devices/widgets/${capturedWidgetId}/action`,
                    { value },
                );
                if (!response.isSuccess) throw new Error("Widget action failed");
                if (!isCurrent()) return false;
                callbacksRef.current.onSuccess?.();
                return true;
            } catch {
                if (isCurrent()) {
                    setError(failureMessage);
                    callbacksRef.current.onFailure?.({
                        message: failureMessage,
                        retry: async () => {
                            if (!isCurrent() || pendingRef.current) return false;
                            return send(value);
                        },
                    });
                }
                return false;
            } finally {
                if (requestVersion === requestVersionRef.current) {
                    pendingRef.current = false;
                    setPending(false);
                }
            }
        },
        [httpClient, widgetId],
    );

    return { pending, error, send };
};
