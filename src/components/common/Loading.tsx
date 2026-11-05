import { useTheme } from "@/contexts/ThemeProvider";
import React, { FC } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";

interface SenswaveLoadingProperties {
    size?: number;
    useBackgroundColor?: boolean;
    activityColor?:
        | "authForeground"
        | "primary"
        | "secondary"
        | "background"
        | "complementary"
        | "textOnPrimary"
        | "textOnSecondary"
        | "textOnBackground"
        | "error"
        | "success"
        | "warning"
        | "info";
}

const Loading: FC<SenswaveLoadingProperties> = ({
    size = 32,
    useBackgroundColor = true,
    activityColor = "authForeground",
}) => {
    const theme = useTheme();

    const background = useBackgroundColor ? theme.current.colors.background : "transparent";

    const activity = theme.current.colors[activityColor];

    return (
        <View style={[styles.container, { backgroundColor: background }]}>
            <ActivityIndicator
                accessibilityRole="progressbar"
                accessibilityLabel="Loading"
                size={size}
                color={activity}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
});

export default Loading;
