import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

interface WidgetActionProps {
    widgetId: string;
    disabled: boolean;
}

export interface WidgetAction {
    pending: boolean;
    error: string;
    send: (value: string | number | boolean) => Promise<boolean>;
}

const failureMessage = "Couldn't control this widget. Try again.";

export const useWidgetAction = ({ widgetId, disabled }: WidgetActionProps): WidgetAction => {
    const httpClient = useHttpClient();
    const identityRef = useRef(widgetId);
    const disabledRef = useRef(disabled);
    const activeRef = useRef(false);
    const pendingRef = useRef(false);
    const requestVersionRef = useRef(0);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");

    identityRef.current = widgetId;
    disabledRef.current = disabled;

    useEffect(() => {
        requestVersionRef.current++;
        pendingRef.current = false;
        setPending(false);
        setError("");
    }, [widgetId]);

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
                activeRef.current;

            try {
                const response = await httpClient.post(
                    `v1/devices/widgets/${capturedWidgetId}/action`,
                    { value },
                );
                if (!response.isSuccess) throw new Error("Widget action failed");
                return isCurrent();
            } catch {
                if (isCurrent()) setError(failureMessage);
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
