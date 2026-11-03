import Loading from "@/components/common/Loading";
import Button from "@/components/common/Button";
import DataSourceTile from "@/components/dataSource/tile/DataSourceTile";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useSession } from "@/contexts/SessionProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { ListResponse } from "@/utils/httpClient";
import { CircleAlert } from "lucide-react-native";
import { useFocusEffect } from "expo-router";
import React, { FC, ReactNode, useCallback, useRef, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import Text from "@/components/common/Text";

export type DataSource = {
    id: string;
    name: string;
    server: string;
    createdAt: string;
    updatedAt: string;
};

export interface DataSourceListProps {
    onListItemSelected?: (id: string) => void;
    header?: ReactNode;
    feedback?: ReactNode;
    disabled?: boolean;
    selectedSourceId?: string;
    pending?: boolean;
}

const DataSourceList: FC<DataSourceListProps> = ({
    onListItemSelected,
    header,
    feedback,
    disabled = false,
    selectedSourceId,
    pending = false,
}) => {
    const httpClient = useHttpClient();
    const session = useSession().session;
    const { colors } = useTheme().current;
    const sessionKey = `${session.authenticated}:${session.accessToken}`;
    const sessionKeyRef = useRef(sessionKey);
    sessionKeyRef.current = sessionKey;
    const loadedSession = useRef(sessionKey);
    const request = useRef(0);
    const hasLoaded = useRef(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [dataSources, setDataSources] = useState<DataSource[]>([]);
    const [error, setError] = useState("");
    const visibleSources = loadedSession.current === sessionKey ? dataSources : [];
    const visibleLoading = loading || loadedSession.current !== sessionKey;

    const loadDataSources = async () => {
        if (loadedSession.current !== sessionKey) {
            loadedSession.current = sessionKey;
            hasLoaded.current = false;
            setDataSources([]);
            setError("");
        }
        const requestId = ++request.current;
        if (hasLoaded.current) setRefreshing(true);
        else setLoading(true);
        setError("");
        try {
            const result = await httpClient.get("v1/datasources/brokers?page=1&size=2147483647");
            let items: DataSource[];
            if (!result.isSuccess && result.statusCode === 404) {
                items = [];
            } else {
                if (!result.isSuccess || !result.response) throw new Error("Source read failed");
                const content = (await result.response.json()) as ListResponse<DataSource>;
                if (
                    !content ||
                    !Array.isArray(content.items) ||
                    content.items.some(
                        (item) =>
                            !item ||
                            typeof item.id !== "string" ||
                            !item.id ||
                            typeof item.name !== "string" ||
                            typeof item.server !== "string",
                    )
                )
                    throw new Error("Invalid source response");
                items = content.items;
            }
            if (requestId !== request.current || sessionKey !== sessionKeyRef.current) return;
            loadedSession.current = sessionKey;
            hasLoaded.current = true;
            setDataSources(items);
        } catch {
            if (requestId === request.current && sessionKey === sessionKeyRef.current) {
                hasLoaded.current = true;
                setError("Couldn't load data sources. Try again.");
            }
        } finally {
            if (requestId === request.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    };
    const loadRef = useRef(loadDataSources);
    loadRef.current = loadDataSources;

    useFocusEffect(
        useCallback(() => {
            const focusSession = sessionKey;
            if (sessionKeyRef.current === focusSession) void loadRef.current();
            return () => {
                if (sessionKeyRef.current === focusSession) {
                    request.current += 1;
                    setLoading(false);
                    setRefreshing(false);
                }
            };
        }, [sessionKey]),
    );

    const selectedIsListed = visibleSources.some((source) => source.id === selectedSourceId);
    const listHeader = (
        <View>
            {header}
            {!selectedIsListed && feedback}
            {!!error && (
                <View style={styles.readFeedback}>
                    <Alert
                        variant="destructive"
                        icon={CircleAlert}
                        accessibilityRole="alert"
                        accessibilityLiveRegion="polite">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                    <Button
                        name="Retry"
                        type="brand-outline"
                        loading={false}
                        disabled={visibleLoading || refreshing}
                        onPress={() => void loadDataSources()}
                    />
                </View>
            )}
        </View>
    );

    return (
        <FlatList
            data={visibleSources}
            keyExtractor={(item) => item.id}
            style={styles.list}
            renderItem={({ item, index }) => {
                const selected = item.id === selectedSourceId;
                return (
                    <View>
                        <DataSourceTile
                            id={item.id}
                            name={item.name}
                            server={item.server}
                            onClicked={onListItemSelected}
                            variant="list"
                            separator={index < visibleSources.length - 1}
                            selected={selected}
                            loading={selected && pending}
                            onClickDisabled={disabled || pending}
                        />
                        {selected && feedback}
                    </View>
                );
            }}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => void loadDataSources()}
                    colors={[colors.authForeground]}
                    tintColor={colors.authForeground}
                />
            }
            ListHeaderComponent={listHeader}
            ListEmptyComponent={
                visibleLoading ? (
                    <View style={styles.empty}>
                        <Loading activityColor="textOnBackground" />
                        <Text size="medium" color="onBackground">
                            Loading data sources…
                        </Text>
                    </View>
                ) : error ? null : (
                    <Text size="medium" color="onBackground">
                        No data sources found.
                    </Text>
                )
            }
            contentContainerStyle={styles.content}
            removeClippedSubviews={false}
        />
    );
};

export default DataSourceList;

const styles = StyleSheet.create({
    list: { flex: 1, width: "100%" },
    content: {
        flexGrow: 1,
        width: "100%",
        maxWidth: 448,
        alignSelf: "center",
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 16,
    },
    empty: { alignItems: "center", gap: 8, paddingVertical: 24 },
    readFeedback: { gap: 12, paddingTop: 12 },
});
