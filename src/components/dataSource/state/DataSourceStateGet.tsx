import React, { useCallback, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useToast } from "@/contexts/ToastProvider";
import Loading from "@/components/common/Loading";
import Text from "@/components/common/Text";
import Button from "@/components/common/Button";
import DataSourceState from "./DataSourceState";

type BrokerClientStateResponse = {
    connectionStatus: string;
    latestSessionId: string;
};

interface BrokerClientStateGetProperties {
    id: string;
    inlineRecovery?: boolean;
}

interface LoadState {
    id: string;
    loading: boolean;
    state?: BrokerClientStateResponse;
    error?: boolean;
}

const isBrokerClientState = (value: unknown): value is BrokerClientStateResponse => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const body = value as Record<string, unknown>;
    return typeof body.connectionStatus === "string" && typeof body.latestSessionId === "string";
};

function BrokerClientStateGet({ id, inlineRecovery = false }: BrokerClientStateGetProperties) {
    const httpClient = useHttpClient();
    const toast = useToast();
    const toastRef = useRef(toast);
    toastRef.current = toast;
    const idRef = useRef(id);
    idRef.current = id;
    const focusGeneration = useRef(0);
    const request = useRef(0);
    const retryRef = useRef<() => void>(() => {});
    const [loadState, setLoadState] = useState<LoadState>({ id, loading: !!id });
    const visibleState: LoadState = loadState.id === id ? loadState : { id, loading: !!id };
    const renderedFocus = focusGeneration.current;

    useFocusEffect(
        useCallback(() => {
            const capturedFocus = ++focusGeneration.current;
            let active = true;
            const current = (requestId: number) =>
                active &&
                focusGeneration.current === capturedFocus &&
                request.current === requestId;

            const fetchBrokerClientState = () => {
                const requestId = ++request.current;
                setLoadState({ id, loading: true });

                void (async () => {
                    try {
                        const result = await httpClient.get(`v1/datasources/brokers/${id}/clients`);
                        if (!current(requestId)) return;
                        if (!result.isSuccess || !result.response) {
                            if (inlineRecovery) setLoadState({ id, loading: false, error: true });
                            else {
                                setLoadState({ id, loading: false });
                                if (!result.isSuccess) toastRef.current.httpError(result);
                                else toastRef.current.error("Failed to fetch broker client state.");
                            }
                            return;
                        }

                        const body: unknown = await result.response.json();
                        if (!current(requestId)) return;
                        if (!isBrokerClientState(body) && inlineRecovery)
                            throw new Error("Invalid broker client state");
                        setLoadState({
                            id,
                            loading: false,
                            state: body as BrokerClientStateResponse,
                        });
                    } catch (error) {
                        if (!current(requestId)) return;
                        console.error("Failed to fetch broker client state", error);
                        if (inlineRecovery) setLoadState({ id, loading: false, error: true });
                        else {
                            setLoadState({ id, loading: false });
                            toastRef.current.error("Failed to fetch broker client state.");
                        }
                    }
                })();
            };

            retryRef.current = fetchBrokerClientState;
            if (id) fetchBrokerClientState();
            else setLoadState({ id, loading: false });

            return () => {
                active = false;
                if (focusGeneration.current === capturedFocus) {
                    focusGeneration.current += 1;
                    request.current += 1;
                }
                if (retryRef.current === fetchBrokerClientState) retryRef.current = () => {};
            };
        }, [httpClient, id, inlineRecovery]),
    );

    return (
        <View style={styles.container}>
            {visibleState.loading ? (
                <>
                    <View style={styles.loadingIcon}>
                        <Loading size={28} useBackgroundColor={false} />
                    </View>
                    <Text size="medium" color="onPrimary">
                        Loading...
                    </Text>
                </>
            ) : inlineRecovery && visibleState.error ? (
                <View style={styles.recovery}>
                    <Text
                        accessibilityRole="alert"
                        accessibilityLiveRegion="polite"
                        size="small"
                        color="onBackground"
                        numberOfLines={0}>
                        Status unavailable
                    </Text>
                    <Button
                        name="Retry"
                        accessibilityLabel="Retry data source status"
                        type="brand-outline"
                        loading={false}
                        onPress={(event) => {
                            event?.stopPropagation?.();
                            if (idRef.current !== id || focusGeneration.current !== renderedFocus)
                                return;
                            retryRef.current();
                        }}
                    />
                </View>
            ) : (
                <DataSourceState connectionStatus={visibleState.state?.connectionStatus} />
            )}
        </View>
    );
}

export default BrokerClientStateGet;

const styles = StyleSheet.create({
    container: { width: "100%", alignItems: "center" },
    loadingIcon: { height: 28 },
    recovery: { width: "100%", gap: 8 },
});
