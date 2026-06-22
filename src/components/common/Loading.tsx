import { useTheme } from "@/contexts/ThemeProvider";
import React, { FC } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";

interface SenswaveLoadingProperties {
    size?: number;
    useBackgroundColor?: boolean;
    activityColor?:
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
    size = 72,
    useBackgroundColor = true,
    activityColor = "textOnPrimary",
}) => {
    const theme = useTheme();

    const background = useBackgroundColor ? theme.current.colors.background : "transparent";

    const activity = (() => {
        switch (activityColor) {
            case "secondary":
                return theme.current.colors.secondary;
            case "background":
                return theme.current.colors.background;
            case "complementary":
                return theme.current.colors.complementary;
            case "textOnPrimary":
                return theme.current.colors.textOnPrimary;
            case "textOnSecondary":
                return theme.current.colors.textOnSecondary;
            case "textOnBackground":
                return theme.current.colors.textOnBackground;
            case "error":
                return theme.current.colors.error;
            case "success":
                return theme.current.colors.success;
            case "warning":
                return theme.current.colors.warning;
            case "info":
                return theme.current.colors.info;
            default:
                return theme.current.colors.primary;
        }
    })();

    return (
        <View style={[styles.container, { backgroundColor: background }]}>
            <ActivityIndicator size={size} color={activity} />
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
