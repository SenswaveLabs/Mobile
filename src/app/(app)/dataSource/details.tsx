import Button from "@/components/common/Button";
import Loading from "@/components/common/Loading";
import BrokerClient from "@/components/dataSource/brokers/BrokerClient";
import DataSourceDetailsSection from "@/components/dataSource/sections/DataSourceDetailsSection";
import BrokerSubscriptions from "@/components/dataSource/subscriptions/BrokerSubscriptions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Text } from "@/components/ui/text";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { DataSourceDto } from "@/types/DataSourcesTypes";
import { CircleAlert } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { FC, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

type DetailsTab = "Overview" | "Settings";

const DetailsPage: FC = () => {
    const httpClient = useHttpClient();
    const router = useRouter();
    const { colors } = useTheme().current;
    const params = useLocalSearchParams();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const [dataSource, setDataSource] = useState<DataSourceDto>();
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [retry, setRetry] = useState(0);
    const [tab, setTab] = useState<DetailsTab>("Overview");
    const requestPending = useRef(false);
    const active = useRef(true);

    useEffect(() => {
        let current = true;
        active.current = true;
        setDataSource(undefined);
        setLoadError("");
        setLoading(true);

        const load = async () => {
            requestPending.current = true;
            try {
                if (!id) throw new Error("Missing data source id.");
                const response = await httpClient.get(`v1/datasources/brokers/${id}`);
                if (!response.isSuccess || !response.response) {
                    if (response.response?.status === 404)
                        throw new Error("This data source is no longer available.");
                    throw new Error(
                        "Couldn't load this data source. Check your connection and try again.",
                    );
                }
                const result = (await response.response.json()) as DataSourceDto;
                if (current) setDataSource(result);
            } catch (error) {
                if (current)
                    setLoadError(
                        error instanceof Error &&
                            error.message === "This data source is no longer available."
                            ? error.message
                            : "Couldn't load this data source. Check your connection and try again.",
                    );
            } finally {
                requestPending.current = false;
                if (current) setLoading(false);
            }
        };

        void load();
        return () => {
            current = false;
            active.current = false;
        };
        // The HTTP client binding changes identity during provider renders; reload only for id/retry.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, retry]);

    const retryLoad = () => {
        if (requestPending.current) return;
        requestPending.current = true;
        setRetry((value) => value + 1);
    };

    const saved = (updated: DataSourceDto) => {
        if (active.current) setDataSource(updated);
    };

    if (loading) {
        return (
            <View style={[styles.stateContainer, { backgroundColor: colors.background }]}>
                <Loading activityColor="textOnBackground" />
                <Text style={[styles.stateLabel, { color: colors.authForeground }]}>
                    Loading data source…
                </Text>
            </View>
        );
    }

    if (!dataSource) {
        return (
            <View
                style={[
                    styles.stateContainer,
                    styles.stateContent,
                    { backgroundColor: colors.background },
                ]}>
                <Alert accessibilityRole="alert" variant="destructive" icon={CircleAlert}>
                    <AlertDescription>
                        {loadError || "Couldn't load this data source. Try again."}
                    </AlertDescription>
                </Alert>
                <Button
                    name="Retry"
                    type="auth"
                    loading={false}
                    disabled={requestPending.current}
                    onPress={retryLoad}
                />
            </View>
        );
    }

    return (
        <View style={[styles.screen, { backgroundColor: colors.background }]}>
            <View style={styles.measure}>
                <View style={styles.tabs} accessibilityRole="tablist">
                    {(["Overview", "Settings"] as const).map((item) => (
                        <Pressable
                            key={item}
                            accessibilityRole="tab"
                            accessibilityLabel={item}
                            accessibilityState={{ selected: tab === item }}
                            onPress={() => setTab(item)}
                            style={[
                                styles.tabButton,
                                {
                                    backgroundColor:
                                        tab === item ? colors.authPrimary : colors.authBackground,
                                    borderColor: colors.authBorder,
                                },
                            ]}>
                            <Text
                                style={[
                                    styles.tabLabel,
                                    {
                                        color:
                                            tab === item
                                                ? colors.authOnPrimary
                                                : colors.authForeground,
                                    },
                                ]}>
                                {item}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                <View style={[styles.panel, tab === "Overview" ? styles.visible : styles.hidden]}>
                    <ScrollView
                        style={styles.overviewScroll}
                        contentContainerStyle={styles.overviewContent}
                        keyboardShouldPersistTaps="handled">
                        <View style={styles.sourceHeading}>
                            <Text
                                accessibilityRole="header"
                                style={[styles.name, { color: colors.authForeground }]}>
                                {dataSource.name}
                            </Text>
                            <Text selectable style={[styles.endpoint, { color: colors.authMuted }]}>
                                {dataSource.url}:{dataSource.port}
                            </Text>
                        </View>
                        <BrokerClient id={dataSource.id} />
                        <BrokerSubscriptions id={dataSource.id} />
                    </ScrollView>
                </View>

                <View style={[styles.panel, tab === "Settings" ? styles.visible : styles.hidden]}>
                    <DataSourceDetailsSection
                        dataSource={dataSource}
                        onSaved={saved}
                        onDeleted={() => router.back()}
                    />
                </View>
            </View>
        </View>
    );
};

export default DetailsPage;

const styles = StyleSheet.create({
    screen: { flex: 1 },
    measure: { flex: 1, width: "100%", maxWidth: 760, alignSelf: "center" },
    tabs: {
        flexDirection: "row",
        gap: 10,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 8,
    },
    tabButton: {
        flex: 1,
        minHeight: 48,
        paddingHorizontal: 12,
        paddingVertical: 10,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderRadius: 8,
    },
    tabLabel: { fontSize: 16, lineHeight: 24, fontWeight: "500", textAlign: "center" },
    panel: { flex: 1, minHeight: 0 },
    visible: { display: "flex" },
    hidden: { display: "none" },
    overviewScroll: { flex: 1 },
    overviewContent: { gap: 22, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28 },
    sourceHeading: { gap: 6 },
    name: { fontSize: 28, lineHeight: 36, fontWeight: "600", flexShrink: 1 },
    endpoint: { fontSize: 15, lineHeight: 22, flexShrink: 1 },
    stateContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        gap: 16,
    },
    stateContent: { maxWidth: 560, width: "100%", alignSelf: "center" },
    stateLabel: { fontSize: 16, lineHeight: 24, textAlign: "center" },
});
