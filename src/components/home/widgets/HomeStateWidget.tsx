import Icon from "@/components/common/Icon";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { useRouter } from "expo-router";
import React from "react";
import { View, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import Text from "@/components/common/Text";
import { shadowStyles } from "@/styles/shadowStyles";
import DataSourceState from "@/components/dataSource/state/DataSourceState";
import { useToast } from "@/contexts/ToastProvider";

function HomeStateWidget() {
    const home = useHomes();
    const theme = useTheme();
    const toast = useToast();
    const router = useRouter();

    const addDataSourceClicked = () => {
        router.push({
            pathname: "home/dataSource/select",
            params: { homeId: home.current!.id },
        });
    };

    const dataSourceClicked = () => {
        if (!home.current?.isOwner) {
            toast.error("You are not allowed to access home data source.");
            return;
        }

        router.push({
            pathname: "dataSource/details",
            params: { id: home.current?.dataSource?.id ?? "" },
        });
    };

    if (!home.current?.dataSource?.id) {
        return (
            <View style={{ ...styles.tile, backgroundColor: theme.current.colors.primary }}>
                <TouchableOpacity onPress={addDataSourceClicked}>
                    <View style={styles.internalContainer}>
                        <Icon icon="add-outline" size={28} color={"onPrimary"} />
                        <Text size={"medium"} color={"onPrimary"}>
                            Select Data Source
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={{ ...styles.tile, backgroundColor: theme.current.colors.primary }}>
            <TouchableOpacity onPress={dataSourceClicked}>
                {home.loading ? (
                    <>
                        <ActivityIndicator size={28} color={theme.current.colors.textOnPrimary} />
                        <Text size="medium" color="onPrimary">
                            Loading...
                        </Text>
                    </>
                ) : (
                    <DataSourceState connectionStatus={home.current?.dataSource?.state} />
                )}
            </TouchableOpacity>
        </View>
    );
}

export default HomeStateWidget;

const styles = StyleSheet.create({
    internalContainer: {
        width: "100%",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
    },
    tile: {
        ...shadowStyles.default,
        borderRadius: 12,
        padding: 20,
        marginRight: 10,
        justifyContent: "center",
        alignItems: "center",
    },
});
