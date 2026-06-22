import Loading from "@/components/common/Loading";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { useToast } from "@/contexts/ToastProvider";
import { shadowStyles } from "@/styles/shadowStyles";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import DataSourceStateGet from "../state/DataSourceStateGet";
import Icon from "@/components/common/Icon";
import Text from "@/components/common/Text";
import { useHomes } from "@/contexts/domain/HomeProvider";

type ClientDto = {
    connectionStatus: "NotStarted" | "Working" | "Restarting" | "Stopped";
    latestSessionId: string;
};

function ClientsDetailsView() {
    const router = useRouter();
    const toast = useToast();
    const homes = useHomes();
    const httpClient = useHttpClient();
    const theme = useTheme();

    const { id } = useLocalSearchParams();
    const [loading, setLoading] = useState<boolean>(false);
    const [client, setClient] = useState<ClientDto | null>(null);

    const [refresh, setRefresh] = useState(0);

    useEffect(() => {
        const loadDetails = async () => {
            setLoading(true);

            try {
                const result = await httpClient.get(`v1/datasources/brokers/${id}/clients`);

                if (result.isSuccess) {
                    const content = (await result.response?.json()) as ClientDto;
                    setClient(content);
                } else {
                    const response = await result.response?.text();
                    console.error(response);

                    console.error("Failed to load broker details.");
                    toast.error("Failed to load broker client details.");
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        if (refresh > 0) {
            loadDetails();
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refresh]);

    useFocusEffect(
        useCallback(() => {
            setRefresh((prev) => prev + 1);
        }, []),
    );

    if (loading) return <Loading size={64} />;

    const onStop = async () => {
        if (client?.connectionStatus === "Stopped" || client?.connectionStatus === "NotStarted") {
            toast.info("Broker client is currently offline.");
            return;
        }

        try {
            setLoading(true);

            const result = await httpClient.delete(`v1/datasources/brokers/${id}/clients`);
            if (result.isSuccess) {
                console.info("[Client Details] Stopped broker client.");
                toast.success("Broker client stopped successfully.");
                await homes.refreshCurrent();
            } else {
                console.error("[Client Details] Failed to stop broker client.");
                toast.error("Failed to stop broker client.");
            }
        } catch (error) {
            console.error("Failed to stop broker client", error);
        } finally {
            setRefresh((prev) => prev + 1);
            setLoading(false);
        }
    };

    const onStart = async () => {
        if (client?.connectionStatus === "Restarting" || client?.connectionStatus === "Working") {
            toast.info("Broker client is still running.");
            return;
        }

        router.push({
            pathname: "dataSource/brokers/startBrokerClient",
            params: {
                brokerId: id,
            },
        });
    };

    const onRestart = async () => {
        if (
            client?.connectionStatus === "Restarting" ||
            client?.connectionStatus === "NotStarted"
        ) {
            toast.info("Broker client cannot be restarted in its current state.");
            return;
        }

        try {
            setLoading(true);

            const result = await httpClient.patch(
                `v1/datasources/brokers/${id}/clients/restart`,
                {},
            );
            if (result.isSuccess) {
                console.info("[Client Details] Restart broker client.");
                toast.success("Broker client restarted successfully.");
                await homes.refreshCurrent();
            } else {
                toast.error("Failed to restart broker client.");
            }
        } catch (error) {
            console.error("Failed to restart broker client", error);
        } finally {
            setRefresh((prev) => prev + 1);
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.inlineContainer}
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContentContainer}>
                <View style={{ ...styles.tile, backgroundColor: theme.current.colors.primary }}>
                    <DataSourceStateGet id={id as string} />
                </View>
            </ScrollView>
            <ScrollView
                style={styles.inlineContainer}
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContentContainer}>
                <View style={{ ...styles.tile, backgroundColor: theme.current.colors.success }}>
                    <TouchableOpacity style={styles.centetTileContent} onPress={onStart}>
                        <Icon icon={"cloud-done-outline"} size={28} color="onSecondary" />
                        <Text size={"medium"} color={"onSecondary"}>
                            Start
                        </Text>
                    </TouchableOpacity>
                </View>
                <View style={{ ...styles.tile, backgroundColor: theme.current.colors.error }}>
                    <TouchableOpacity style={styles.centetTileContent} onPress={onStop}>
                        <Icon icon={"cloud-offline-outline"} size={28} color="onSecondary" />
                        <Text size={"medium"} color={"onSecondary"}>
                            Stop
                        </Text>
                    </TouchableOpacity>
                </View>
                <View style={{ ...styles.tile, backgroundColor: theme.current.colors.warning }}>
                    <TouchableOpacity style={styles.centetTileContent} onPress={onRestart}>
                        <Icon icon={"refresh-outline"} size={28} color="onSecondary" />
                        <Text size={"medium"} color="onSecondary">
                            Restart
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

export default ClientsDetailsView;

const styles = StyleSheet.create({
    container: {
        padding: 0,
        paddingTop: 0,
    },
    inlineContainer: {
        flexDirection: "row",
    },
    scrollContentContainer: {
        justifyContent: "flex-start",
        alignItems: "flex-start",
        padding: 5,
        paddingLeft: 15,
        paddingBottom: 15,
    },
    tile: {
        ...shadowStyles.default,
        borderRadius: 12,
        padding: 20,
        marginRight: 10,
    },
    centetTileContent: {
        justifyContent: "center",
        alignItems: "center",
    },
});
