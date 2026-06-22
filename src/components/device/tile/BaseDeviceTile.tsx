import { View, StyleSheet } from "react-native";
import React from "react";
import Icon from "@/components/common/Icon";

interface BaseDeviceTileProps {
    icon: string;
}

function BaseDeviceTile({ icon }: BaseDeviceTileProps) {
    return (
        <View style={styles.iconContainer}>
            <Icon icon={icon} size={64} color={"onPrimary"} />
        </View>
    );
}

export default BaseDeviceTile;

const styles = StyleSheet.create({
    iconContainer: {
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        minHeight: 64,
        height: "55%",
    },
});
