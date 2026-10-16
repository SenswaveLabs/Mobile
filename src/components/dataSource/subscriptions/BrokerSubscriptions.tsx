import Button from "@/components/common/Button";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import Text from "@/components/common/Text";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { SubscriptionDto } from "@/types/DataSourcesTypes";
import { ListResponse } from "@/utils/httpClient";
import { useFocusEffect, useRouter } from "expo-router";
import { CircleAlert } from "lucide-react-native";
import React, { FC, useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

interface BrokerSubscriptionsProps {
    id: string;
}

const BrokerSubscriptions: FC<BrokerSubscriptionsProps> = ({ id }) => {
    const httpClient = useHttpClient();
    const theme = useTheme();
    const router = useRouter();
    const [subscriptions, setSubscriptions] = useState<SubscriptionDto[]>([]);
    const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
    const [loadError, setLoadError] = useState("");
    const [removeError, setRemoveError] = useState("");
    const [reload, setReload] = useState(0);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [removing, setRemoving] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const requestPending = useRef(false);
    const readSequence = useRef(0);
    const removePending = useRef(false);
    const firstFocus = useRef(true);
    const active = useRef(true);

    useEffect(() => {
        let current = true;
        const sequence = ++readSequence.current;
        active.current = true;
        requestPending.current = true;
        setLoadState("loading");
        setLoadError("");

        const load = async () => {
            try {
                const result = await httpClient.get(
                    `v1/datasources/brokers/${id}/subscriptions?page=1&size=300`,
                );
                if (!result.isSuccess || !result.response) {
                    if (result.response?.status === 404)
                        throw new Error("This data source is no longer available.");
                    throw new Error(
                        "Couldn't load subscriptions. Check your connection and try again.",
                    );
                }
                const content = (await result.response.json()) as ListResponse<SubscriptionDto>;
                if (current && sequence === readSequence.current)
                    setSubscriptions(content.items ?? []);
                if (current && sequence === readSequence.current) setLoadState("ready");
            } catch (error) {
                if (current && sequence === readSequence.current) {
                    setLoadState("error");
                    setLoadError(
                        error instanceof Error &&
                            error.message === "This data source is no longer available."
                            ? error.message
                            : "Couldn't load subscriptions. Check your connection and try again.",
                    );
                }
            } finally {
                if (current && sequence === readSequence.current) requestPending.current = false;
            }
        };

        void load();
        return () => {
            current = false;
            active.current = false;
        };
        // The HTTP client binding changes identity during provider renders; reload only for id/reload.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, reload]);

    useFocusEffect(
        useCallback(() => {
            if (firstFocus.current) {
                firstFocus.current = false;
                return;
            }
            readSequence.current++;
            requestPending.current = true;
            setReload((value) => value + 1);
        }, []),
    );

    const retryLoad = () => {
        if (requestPending.current) return;
        readSequence.current++;
        requestPending.current = true;
        setReload((value) => value + 1);
    };

    const addSubscription = () => {
        router.push({
            pathname: "dataSource/brokers/addSubscription",
            params: { brokerId: id },
        });
    };

    const removeSubscription = async (subscriptionId: string) => {
        if (removePending.current) return;
        removePending.current = true;
        setRemoving(true);
        setRemovingId(subscriptionId);
        setRemoveError("");

        try {
            const result = await httpClient.delete(
                `v1/datasources/brokers/${id}/subscriptions/${subscriptionId}`,
            );
            if (!result.isSuccess && result.response?.status !== 404)
                throw new Error(
                    "Couldn't remove subscription. Check your connection and try again.",
                );
            if (active.current)
                setSubscriptions((current) => current.filter((item) => item.id !== subscriptionId));
        } catch (error) {
            if (active.current)
                setRemoveError(
                    error instanceof Error
                        ? error.message
                        : "Couldn't remove subscription. Try again.",
                );
        } finally {
            removePending.current = false;
            if (active.current) {
                setRemoving(false);
                setRemovingId(null);
            }
        }
    };

    const confirmRemove = () => {
        const subscriptionId = pendingDeleteId;
        setPendingDeleteId(null);
        if (subscriptionId) void removeSubscription(subscriptionId);
    };

    const cancelRemove = () => {
        if (!removing) setPendingDeleteId(null);
    };

    return (
        <View style={styles.section}>
            <View style={styles.header}>
                <View style={styles.titleGroup}>
                    <Text color="onBackground" size="large" bold>
                        Subscriptions
                    </Text>
                    <Text color="onBackground" style={styles.description}>
                        Topics this broker client listens to.
                    </Text>
                </View>
                <Button
                    name="Add subscription"
                    type="auth"
                    loading={false}
                    onPress={addSubscription}
                    style={styles.addButton}
                />
            </View>

            {!!loadError && (
                <Alert accessibilityRole="alert" variant="destructive" icon={CircleAlert}>
                    <AlertDescription>{loadError}</AlertDescription>
                </Alert>
            )}
            {!!removeError && (
                <Alert accessibilityRole="alert" variant="destructive" icon={CircleAlert}>
                    <AlertDescription>{removeError}</AlertDescription>
                </Alert>
            )}

            {loadState === "loading" ? (
                <View style={styles.loadState}>
                    <ActivityIndicator color={theme.current.colors.authForeground} />
                    <Text color="onBackground">Loading subscriptions…</Text>
                </View>
            ) : loadState === "error" ? (
                <Button
                    name="Retry"
                    type="brand-outline"
                    loading={false}
                    disabled={requestPending.current}
                    onPress={retryLoad}
                />
            ) : subscriptions.length === 0 ? (
                <Text color="onBackground" style={styles.empty}>
                    No subscriptions yet.
                </Text>
            ) : (
                <View style={styles.list}>
                    {subscriptions.map((item) => (
                        <View
                            key={item.id}
                            style={[
                                styles.subscription,
                                { backgroundColor: theme.current.colors.primary },
                            ]}>
                            <Text color="onPrimary" style={styles.topic} selectable>
                                {item.topic}
                            </Text>
                            <Button
                                name="Remove"
                                accessibilityLabel={`Remove subscription ${item.topic}`}
                                type="brand-destructive"
                                loading={removingId === item.id}
                                disabled={removing}
                                onPress={() => setPendingDeleteId(item.id)}
                                style={styles.removeButton}
                            />
                        </View>
                    ))}
                </View>
            )}

            <ConfirmDialog
                visible={pendingDeleteId !== null}
                title="Remove subscription"
                content="Broker will stop listening to this topic. This action cannot be undone."
                confirmLabel="Remove"
                onConfirm={confirmRemove}
                onCancel={cancelRemove}
            />
        </View>
    );
};

export default BrokerSubscriptions;

const styles = StyleSheet.create({
    section: { gap: 14 },
    header: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12 },
    titleGroup: { flexGrow: 1, flexBasis: 190, gap: 4 },
    description: { lineHeight: 21, flexShrink: 1 },
    addButton: { flexGrow: 1, flexBasis: 160 },
    loadState: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 10 },
    empty: { paddingVertical: 10 },
    list: { gap: 10 },
    subscription: {
        minHeight: 72,
        borderRadius: 12,
        padding: 12,
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 12,
    },
    topic: { flexGrow: 1, flexBasis: 180, lineHeight: 22, flexShrink: 1 },
    removeButton: { width: 96, minWidth: 96, minHeight: 48, paddingHorizontal: 8 },
});
