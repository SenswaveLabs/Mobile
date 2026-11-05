import Button from "@/components/common/Button";
import ContentSection from "@/components/common/ContentSection";
import SectionHeaderAction from "@/components/common/SectionHeaderAction";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import ListRow from "@/components/common/ListRow";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { SubscriptionDto } from "@/types/DataSourcesTypes";
import { useFocusEffect, useRouter } from "expo-router";
import { CircleAlert, Plus, Trash2 } from "lucide-react-native";
import React, { FC, useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text as NativeText, View } from "react-native";

interface BrokerSubscriptionsProps {
    id: string;
}

const isSubscription = (value: unknown): value is SubscriptionDto =>
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "id" in value &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    "topic" in value &&
    typeof value.topic === "string";

const BrokerSubscriptions: FC<BrokerSubscriptionsProps> = ({ id }) => {
    const httpClient = useHttpClient();
    const theme = useTheme();
    const router = useRouter();
    const [collection, setCollection] = useState<{ brokerId: string; items: SubscriptionDto[] }>({
        brokerId: id,
        items: [],
    });
    const subscriptions = collection.brokerId === id ? collection.items : [];
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
                const content: unknown = await result.response.json();
                if (
                    !content ||
                    typeof content !== "object" ||
                    Array.isArray(content) ||
                    !("items" in content) ||
                    !Array.isArray(content.items) ||
                    !content.items.every(isSubscription)
                )
                    throw new Error("Invalid subscriptions response");
                if (current && sequence === readSequence.current)
                    setCollection({ brokerId: id, items: content.items });
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
        if (removePending.current || requestPending.current) return;
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
            if (active.current) {
                if (requestPending.current) {
                    readSequence.current++;
                    requestPending.current = false;
                    setLoadState("ready");
                }
                setCollection((current) =>
                    current.brokerId === id
                        ? {
                              ...current,
                              items: current.items.filter((item) => item.id !== subscriptionId),
                          }
                        : current,
                );
            }
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
        <>
            <ContentSection
                title="Subscriptions"
                helper="Topics this broker client listens to."
                separated
                headerAction={
                    <SectionHeaderAction
                        label="Add"
                        accessibilityLabel="Add subscription"
                        onPress={addSubscription}
                        icon={
                            <Plus
                                size={18}
                                color={theme.current.colors.authForeground}
                                accessible={false}
                            />
                        }
                    />
                }>
                <View style={styles.body}>
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
                            <NativeText
                                style={{
                                    color: theme.current.colors.authMuted,
                                    fontSize: 14,
                                    lineHeight: 20,
                                }}>
                                Loading subscriptions…
                            </NativeText>
                        </View>
                    ) : null}
                    {loadState === "error" && (
                        <Button
                            name="Retry"
                            type="brand-outline"
                            loading={false}
                            disabled={requestPending.current}
                            onPress={retryLoad}
                        />
                    )}
                    {loadState === "ready" && subscriptions.length === 0 && (
                        <NativeText
                            style={[styles.empty, { color: theme.current.colors.authMuted }]}>
                            No subscriptions yet.
                        </NativeText>
                    )}
                    {loadState !== "loading" && subscriptions.length > 0 && (
                        <View style={styles.list}>
                            {subscriptions.map((item, index) => (
                                <ListRow
                                    key={item.id}
                                    title={
                                        <NativeText
                                            style={[
                                                styles.topic,
                                                { color: theme.current.colors.authForeground },
                                            ]}
                                            selectable>
                                            {item.topic}
                                        </NativeText>
                                    }
                                    separator={index < subscriptions.length - 1}
                                    trailing={
                                        <Pressable
                                            cssInterop={false}
                                            accessibilityRole="button"
                                            accessibilityLabel={`Remove subscription ${item.topic}`}
                                            accessibilityState={{
                                                disabled: removing,
                                                busy: removingId === item.id,
                                            }}
                                            disabled={removing}
                                            onPress={() => {
                                                if (
                                                    !requestPending.current &&
                                                    !removePending.current
                                                )
                                                    setPendingDeleteId(item.id);
                                            }}
                                            android_ripple={{
                                                color: theme.current.colors.authBorder,
                                            }}
                                            style={({ pressed }) => [
                                                styles.removeAction,
                                                pressed && styles.pressed,
                                            ]}>
                                            {removingId === item.id ? (
                                                <ActivityIndicator
                                                    size="small"
                                                    color={theme.current.colors.error}
                                                />
                                            ) : (
                                                <Trash2
                                                    size={20}
                                                    color={theme.current.colors.error}
                                                    accessible={false}
                                                />
                                            )}
                                        </Pressable>
                                    }
                                />
                            ))}
                        </View>
                    )}
                </View>
            </ContentSection>
            <ConfirmDialog
                visible={pendingDeleteId !== null}
                title="Remove subscription"
                content="Broker will stop listening to this topic. This action cannot be undone."
                confirmLabel="Remove"
                onConfirm={confirmRemove}
                onCancel={cancelRemove}
            />
        </>
    );
};

export default BrokerSubscriptions;

const styles = StyleSheet.create({
    body: { gap: 16 },
    pressed: { opacity: 0.72 },
    loadState: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 10 },
    empty: { paddingVertical: 10 },
    list: { gap: 0 },
    topic: { fontSize: 16, lineHeight: 24, fontWeight: "600", flexShrink: 1 },
    removeAction: {
        width: 48,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
    },
});
