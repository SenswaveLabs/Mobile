import Button from "@/components/common/Button";
import DataSourceState from "@/components/dataSource/state/DataSourceState";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { useFocusEffect, useRouter } from "expo-router";
import { CircleAlert, Info } from "lucide-react-native";
import React, { FC, useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text as NativeText, View } from "react-native";

interface BrokerClientProps {
    id: string;
}

type ConnectionStatus =
    | "NotStarted"
    | "Working"
    | "Restarting"
    | "Stopped"
    | "Connecting"
    | "Connected"
    | "Disconnected"
    | "Error";

type ClientDto = {
    connectionStatus: ConnectionStatus;
    latestSessionId?: string;
};

const isConnectionStatus = (value: unknown): value is ConnectionStatus =>
    typeof value === "string" &&
    [
        "NotStarted",
        "Working",
        "Restarting",
        "Stopped",
        "Connecting",
        "Connected",
        "Disconnected",
        "Error",
    ].includes(value);

const isActive = (status: ConnectionStatus) =>
    status === "Working" ||
    status === "Connected" ||
    status === "Restarting" ||
    status === "Connecting";

const canStart = (status: ConnectionStatus) =>
    status === "NotStarted" ||
    status === "Stopped" ||
    status === "Disconnected" ||
    status === "Error";

const canRestart = (status: ConnectionStatus) =>
    status !== "Working" &&
    status !== "Connected" &&
    status !== "NotStarted" &&
    status !== "Stopped";

const BrokerClient: FC<BrokerClientProps> = ({ id }) => {
    const httpClient = useHttpClient();
    const { colors } = useTheme().current;
    const homes = useHomes();
    const router = useRouter();
    const [client, setClient] = useState<ClientDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [actionError, setActionError] = useState("");
    const [actionNotice, setActionNotice] = useState("");
    const [refresh, setRefresh] = useState(0);
    const [busy, setBusy] = useState<"stop" | "restart" | null>(null);
    const request = useRef(false);
    const readSequence = useRef(0);
    const mutation = useRef(false);
    const navigating = useRef(false);
    const firstFocus = useRef(true);
    const active = useRef(true);

    const readClient = async (): Promise<ClientDto> => {
        const result = await httpClient.get(`v1/datasources/brokers/${id}/clients`);
        if (!result.isSuccess || !result.response) {
            if (result.response?.status === 404)
                throw new Error("This broker client is no longer available.");
            throw new Error("Couldn't load broker status. Check your connection and try again.");
        }
        const content = (await result.response.json()) as Partial<ClientDto>;
        if (!isConnectionStatus(content.connectionStatus))
            throw new Error("Broker status is unavailable. Retry to refresh it.");
        return content as ClientDto;
    };

    useEffect(() => {
        let current = true;
        const sequence = ++readSequence.current;
        active.current = true;
        request.current = true;
        setLoading(true);
        setLoadError("");

        const load = async () => {
            try {
                const content = await readClient();
                if (current && sequence === readSequence.current) setClient(content);
            } catch (error) {
                if (current && sequence === readSequence.current) {
                    setClient(null);
                    setLoadError(
                        error instanceof Error &&
                            (error.message === "This broker client is no longer available." ||
                                error.message ===
                                    "Broker status is unavailable. Retry to refresh it.")
                            ? error.message
                            : "Couldn't load broker status. Check your connection and try again.",
                    );
                }
            } finally {
                if (current && sequence === readSequence.current) {
                    request.current = false;
                    setLoading(false);
                }
            }
        };

        void load();
        return () => {
            current = false;
            active.current = false;
        };
        // The HTTP client binding changes identity during provider renders; reload only for id/refresh.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, refresh]);

    useFocusEffect(
        useCallback(() => {
            if (firstFocus.current) {
                firstFocus.current = false;
                return;
            }
            navigating.current = false;
            readSequence.current++;
            request.current = true;
            setRefresh((value) => value + 1);
        }, []),
    );

    const retryLoad = () => {
        if (request.current || mutation.current) return;
        readSequence.current++;
        request.current = true;
        setRefresh((value) => value + 1);
    };

    const start = () => {
        if (!client || !canStart(client.connectionStatus) || navigating.current) return;
        navigating.current = true;
        setActionError("");
        try {
            router.push({
                pathname: "dataSource/brokers/startBrokerClient",
                params: { brokerId: id },
            });
        } catch {
            setActionError("Couldn't open the start form. Try again.");
            navigating.current = false;
        }
    };

    const runAction = async (action: "stop" | "restart") => {
        if (!client || mutation.current || busy) return;
        const status = client.connectionStatus;
        if (action === "stop" && !isActive(status)) return;
        if (action === "restart" && !canRestart(status)) return;

        mutation.current = true;
        readSequence.current++;
        setBusy(action);
        setActionError("");
        setActionNotice("");
        try {
            try {
                const result =
                    action === "stop"
                        ? await httpClient.delete(`v1/datasources/brokers/${id}/clients`)
                        : await httpClient.patch(
                              `v1/datasources/brokers/${id}/clients/restart`,
                              {},
                          );
                if (!result.isSuccess) {
                    throw new Error(
                        result.response?.status === 404
                            ? "Broker status changed before the action completed."
                            : action === "stop"
                              ? "Couldn't stop the broker client. Check your connection and try again."
                              : "Couldn't restart the broker client. Check your connection and try again.",
                    );
                }
                if (active.current)
                    setActionNotice(
                        action === "stop" ? "Stop request accepted." : "Restart request accepted.",
                    );
                try {
                    await homes.refreshCurrent();
                } catch {
                    // The client action succeeded; home refresh failure does not undo it.
                }
            } catch (error) {
                const fallback =
                    action === "stop"
                        ? "Couldn't stop the broker client. Check your connection and try again."
                        : "Couldn't restart the broker client. Check your connection and try again.";
                if (active.current)
                    setActionError(
                        error instanceof Error &&
                            error.message === "Broker status changed before the action completed."
                            ? "Broker status changed before the action completed."
                            : fallback,
                    );
            }

            if (active.current) {
                setClient(null);
                setLoadError("");
                setLoading(true);
                request.current = true;
                const sequence = ++readSequence.current;
                try {
                    const updated = await readClient();
                    if (sequence === readSequence.current) setClient(updated);
                } catch (error) {
                    if (sequence === readSequence.current) {
                        setClient(null);
                        setLoadError(
                            error instanceof Error &&
                                error.message === "This broker client is no longer available."
                                ? error.message
                                : "Couldn't refresh broker status. Retry to see its current state.",
                        );
                    }
                } finally {
                    if (sequence === readSequence.current) {
                        request.current = false;
                        if (active.current) setLoading(false);
                    }
                }
            }
        } finally {
            mutation.current = false;
            if (active.current) setBusy(null);
        }
    };

    const status = client?.connectionStatus;
    const known = !!client;
    const startAllowed = known && canStart(status!);
    const stopAllowed = known && isActive(status!);
    const restartAllowed = known && canRestart(status!);

    return (
        <View style={styles.section}>
            <View style={styles.heading}>
                <NativeText
                    accessibilityRole="header"
                    style={[styles.title, { color: colors.authForeground }]}>
                    Broker client
                </NativeText>
                {loading ? (
                    <NativeText style={[styles.status, { color: colors.authMuted }]}>
                        Loading status…
                    </NativeText>
                ) : client ? (
                    <DataSourceState connectionStatus={client.connectionStatus} />
                ) : (
                    <NativeText style={[styles.status, { color: colors.error }]}>
                        Status unavailable
                    </NativeText>
                )}
            </View>

            {!!loadError && (
                <>
                    <Alert accessibilityRole="alert" variant="destructive" icon={CircleAlert}>
                        <AlertDescription>{loadError}</AlertDescription>
                    </Alert>
                    <Button
                        name="Retry"
                        type="brand-outline"
                        loading={loading}
                        disabled={request.current}
                        onPress={retryLoad}
                    />
                </>
            )}
            {!!actionError && (
                <Alert accessibilityRole="alert" variant="destructive" icon={CircleAlert}>
                    <AlertDescription>{actionError}</AlertDescription>
                </Alert>
            )}
            {!!actionNotice && (
                <Alert accessibilityLiveRegion="polite" icon={Info}>
                    <AlertDescription>{actionNotice}</AlertDescription>
                </Alert>
            )}

            <View style={styles.actions}>
                <Button
                    name="Start"
                    type="auth"
                    loading={false}
                    disabled={!startAllowed || loading || !!busy}
                    onPress={start}
                    style={styles.actionButton}
                />
                <Button
                    name="Stop"
                    type="brand-destructive"
                    loading={busy === "stop"}
                    disabled={!stopAllowed || loading || !!busy}
                    onPress={() => runAction("stop")}
                    style={styles.actionButton}
                />
                <Button
                    name="Restart"
                    type="brand-outline"
                    loading={busy === "restart"}
                    disabled={!restartAllowed || loading || !!busy}
                    onPress={() => runAction("restart")}
                    style={styles.actionButton}
                />
            </View>
        </View>
    );
};

export default BrokerClient;

const styles = StyleSheet.create({
    section: { gap: 12 },
    heading: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
    title: { fontSize: 20, lineHeight: 26, fontWeight: "600", flexShrink: 1 },
    status: { fontSize: 14, lineHeight: 20, flexShrink: 1 },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    actionButton: { width: "auto", flexGrow: 1, flexBasis: 104 },
});
