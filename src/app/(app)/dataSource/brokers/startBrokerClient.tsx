import StartBrokerClientForm from "@/components/dataSource/brokers/StartBrokerClientForm";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { View, StyleSheet } from "react-native";

function StartClient() {
    const { brokerId } = useLocalSearchParams();
    return (
        <View style={styles.container}>
            <StartBrokerClientForm brokerId={brokerId as string} />
        </View>
    );
}

export default StartClient;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 15,
        paddingTop: 0,
    },
});
