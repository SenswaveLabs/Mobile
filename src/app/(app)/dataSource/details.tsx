import Button from "@/components/common/Button";
import Loading from "@/components/common/Loading";
import BrokerClient from "@/components/dataSource/brokers/BrokerClient";
import DataSourceDetailsSection from "@/components/dataSource/sections/DataSourceDetailsSection";
import BrokerSubscriptions from "@/components/dataSource/subscriptions/BrokerSubscriptions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Text } from "@/components/ui/text";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { DataSourceDto } from "@/types/DataSourcesTypes";
import { CircleAlert } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { FC, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

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
                <Tabs
                    value={tab}
                    onValueChange={(value) => setTab(value as DetailsTab)}
                    style={styles.tabsRoot}>
                    <TabsList
                        className="h-auto min-h-12 w-full flex-row items-stretch justify-start rounded-none bg-transparent p-0"
                        style={[styles.tabsList, { borderBottomColor: colors.authBorder }]}>
                        {(["Overview", "Settings"] as const).map((item) => (
                            <TabsTrigger
                                key={item}
                                value={item}
                                accessibilityLabel={item}
                                className="h-12 min-h-12 flex-1 rounded-none border-0 bg-transparent px-0 py-0 shadow-none active:opacity-70"
                                android_ripple={{ color: colors.authBorder }}
                                style={[
                                    styles.tabTrigger,
                                    tab === item && {
                                        borderBottomWidth: 2,
                                        borderBottomColor: colors.authForeground,
                                    },
                                ]}>
                                <Text
                                    style={[
                                        styles.tabLabel,
                                        {
                                            color:
                                                tab === item
                                                    ? colors.authForeground
                                                    : colors.authMuted,
                                        },
                                    ]}>
                                    {item}
                                </Text>
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <TabsContent
                        value="Overview"
                        forceMount
                        style={[styles.panel, tab === "Overview" ? styles.visible : styles.hidden]}
                        accessibilityElementsHidden={tab !== "Overview"}
                        importantForAccessibility={
                            tab === "Overview" ? "auto" : "no-hide-descendants"
                        }>
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
                                <Text
                                    selectable
                                    style={[styles.endpoint, { color: colors.authMuted }]}>
                                    {dataSource.url}:{dataSource.port}
                                </Text>
                            </View>
                            <BrokerClient id={dataSource.id} />
                            <BrokerSubscriptions id={dataSource.id} />
                        </ScrollView>
                    </TabsContent>

                    <TabsContent
                        value="Settings"
                        forceMount
                        style={[styles.panel, tab === "Settings" ? styles.visible : styles.hidden]}
                        accessibilityElementsHidden={tab !== "Settings"}
                        importantForAccessibility={
                            tab === "Settings" ? "auto" : "no-hide-descendants"
                        }>
                        <DataSourceDetailsSection
                            dataSource={dataSource}
                            onSaved={saved}
                            onDeleted={() => router.back()}
                        />
                    </TabsContent>
                </Tabs>
            </View>
        </View>
    );
};

export default DetailsPage;

const styles = StyleSheet.create({
    screen: { flex: 1 },
    measure: { flex: 1, width: "100%", maxWidth: 448, alignSelf: "center" },
    tabsRoot: { flex: 1 },
    tabsList: {
        flexDirection: "row",
        alignItems: "stretch",
        justifyContent: "flex-start",
        minHeight: 49,
        gap: 24,
        paddingHorizontal: 24,
        borderBottomWidth: 1,
    },
    tabTrigger: {
        flex: 1,
        minHeight: 48,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 0,
        paddingVertical: 0,
        borderWidth: 0,
        borderRadius: 0,
        backgroundColor: "transparent",
    },
    tabLabel: { fontSize: 14, lineHeight: 20, fontWeight: "600", textAlign: "center" },
    panel: { flex: 1, minHeight: 0 },
    visible: { display: "flex" },
    hidden: { display: "none" },
    overviewScroll: { flex: 1 },
    overviewContent: { gap: 22, paddingHorizontal: 24, paddingTop: 14, paddingBottom: 28 },
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
