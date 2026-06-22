import { useTheme } from "@/contexts/ThemeProvider";
import { shadowStyles } from "@/styles/shadowStyles";
import React, { FC } from "react";
import { View, StyleSheet } from "react-native";

interface TileProperties {
    children?: React.ReactNode;
    padding?: number;
    borderRadius?: number;
    backgroundColor?:
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

const Tile: FC<TileProperties> = ({
    children,
    backgroundColor = "primary",
    padding = 10,
    borderRadius = 16,
}) => {
    const theme = useTheme();

    const background = (() => {
        switch (backgroundColor) {
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
        <View
            style={[
                {
                    backgroundColor: background,
                    padding: padding,
                    borderRadius: borderRadius,
                },
                shadowStyles.default,
                styles.container,
            ]}>
            {children}
        </View>
    );
};

export default Tile;

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        justifyContent: "center",
    },
});
