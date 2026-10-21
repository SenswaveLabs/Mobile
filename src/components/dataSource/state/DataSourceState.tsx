import { View, StyleSheet } from "react-native";
import React, { FC } from "react";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/contexts/ThemeProvider";

interface DataSourceStateProps {
    connectionStatus?: string;
}

export const getDataSourceStateLabel = (connectionStatus?: string): string => {
    if (connectionStatus === "Working" || connectionStatus === "Connected") return "Connected";
    if (
        connectionStatus === "Restarting" ||
        connectionStatus === "Connecting" ||
        connectionStatus === "Error"
    )
        return connectionStatus;
    return "Disconnected";
};

const DataSourceState: FC<DataSourceStateProps> = ({ connectionStatus }) => {
    const { colors } = useTheme().current;
    let tone: keyof typeof colors.dataSourceStatus = "neutral";
    const message = getDataSourceStateLabel(connectionStatus);
    let indicator = false;

    if (connectionStatus === "Working" || connectionStatus === "Connected") {
        tone = "positive";
        indicator = true;
    } else if (connectionStatus === "Restarting" || connectionStatus === "Connecting") {
        tone = "warning";
        indicator = true;
    } else if (connectionStatus === "Error") {
        tone = "critical";
    }
    const palette = colors.dataSourceStatus[tone];

    return (
        <View
            accessible
            accessibilityRole="text"
            accessibilityLabel={`Data source status: ${message}`}
            accessibilityLiveRegion="polite"
            style={[
                styles.container,
                { backgroundColor: palette.background, borderColor: palette.border },
            ]}>
            {indicator && (
                <View
                    accessible={false}
                    style={[styles.indicator, { backgroundColor: palette.foreground }]}
                />
            )}
            <Text style={[styles.label, { color: palette.foreground }]}>{message}</Text>
        </View>
    );
};

export default DataSourceState;

const styles = StyleSheet.create({
    container: {
        maxWidth: "100%",
        minHeight: 24,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderWidth: 1,
        borderRadius: 999,
    },
    label: { fontSize: 12, lineHeight: 18, fontWeight: "500", flexShrink: 1 },
    indicator: { width: 6, height: 6, borderRadius: 3 },
});
