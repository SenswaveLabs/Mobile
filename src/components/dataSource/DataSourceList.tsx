import Loading from "@/components/common/Loading";
import DataSourceTile from "@/components/dataSource/tile/DataSourceTile";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useToast } from "@/contexts/ToastProvider";
import React, { FC, useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import Text from "@/components/common/Text";
import { ListResponse } from "@/utils/httpClient";
import { useFocusEffect } from "expo-router";

export type DataSource = {
    id: string;
    name: string;
    server: string;
    createdAt: string;
    updatedAt: string;
};

interface DataSourceListInterface {
    onListItemSelected?: (id: string) => void;
}

const DataSourceList: FC<DataSourceListInterface> = ({ onListItemSelected }) => {
    const httpClient = useHttpClient();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [dataSources, setDataSources] = useState<DataSource[]>([]);

    const onRefresh = async () => {
        setRefreshing(true);
        const result = await httpClient.get("v1/datasources/brokers");

        if (result.isSuccess) {
            const content = (await result.response!.json()) as ListResponse<DataSource>;
            setDataSources(content.items);
            setRefreshing(false);
        } else {
            toast.error("Failed to load data sources.");
            setRefreshing(false);
        }
    };

    const getDataSources = async () => {
        setLoading(true);
        const result = await httpClient.get("v1/datasources/brokers");

        if (result.isSuccess) {
            const content = (await result.response!.json()) as ListResponse<DataSource>;
            setDataSources(content.items);
            setLoading(false);
        } else if (result.statusCode === 404) {
            toast.info("Create your first data source.");
            setLoading(false);
        } else {
            toast.error("Failed to load data sources.");
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            getDataSources();
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []),
    );

    useEffect(() => {
        getDataSources();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) {
        return <Loading />;
    }

    return (
        <View style={{ flex: 1, width: "100%" }}>
            <FlatList
                data={dataSources}
                keyExtractor={(item, index) => index.toString()}
                style={{ flex: 1, width: "100%" }}
                renderItem={({ item, index }) => (
                    <DataSourceTile
                        id={item.id}
                        name={item.name}
                        server={item.server}
                        onClicked={onListItemSelected}
                        variant="list"
                        separator={index < dataSources.length - 1}
                    />
                )}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={
                    <Text size={"medium"} color={"onBackground"}>
                        No data sources found.
                    </Text>
                }
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 90 }}
                removeClippedSubviews={false}
            />
        </View>
    );
};

export default DataSourceList;
