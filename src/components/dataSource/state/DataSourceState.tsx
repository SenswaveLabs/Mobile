import { View, StyleSheet } from "react-native";
import React from "react";
import Icon, { IconColor } from "@/components/common/Icon";
import Text, { TextColor } from "@/components/common/Text";

interface BrokerClientStateProperties {
    connectionStatus?: string;
}

function DataSourceState({ connectionStatus }: BrokerClientStateProperties) {
    let color: IconColor = "onPrimary";
    let message = "Unknown";

    if (connectionStatus === "Working") {
        color = "success";
        message = "Working";
    } else if (connectionStatus === "Restarting") {
        color = "warning";
        message = "Restarting";
    } else if (connectionStatus === "Stopped") {
        color = "error";
        message = "Stopped";
    } else if (connectionStatus === "NotStarted") {
        message = "Not started";
    }

    return (
        <View style={styles.container}>
            <Icon icon="globe-outline" size={28} color={color} />
            <Text size={"medium"} color={color as TextColor} bold>
                {message}
            </Text>
        </View>
    );
}

export default DataSourceState;

const styles = StyleSheet.create({
    container: {
        width: "100%",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
    },
});
