import { useTheme } from "@/contexts/ThemeProvider";
import { shadowStyles } from "@/styles/shadowStyles";
import React, { FC } from "react";
import { StyleSheet, Pressable, ActivityIndicator, StyleProp, ViewStyle } from "react-native";
import Text from "./Text";

interface ButtonPropertiess {
    name: string;
    loading: boolean;
    onPress: (e: any) => void;
    type?: "default" | "alternative" | "outlined";
    style?: StyleProp<ViewStyle>;
}

const Button: FC<ButtonPropertiess> = ({ name, loading, onPress, type = "default", style }) => {
    const theme = useTheme();

    const buttonStyles = {
        borderColor: type === "outlined" ? theme.current.colors.secondary : "transparent",
        backgroundColor:
            type === "alternative" ? theme.current.colors.secondary : theme.current.colors.primary,
        ...styles.button,
    };

    return (
        <Pressable
            style={({ pressed }) => [
                buttonStyles,
                pressed && styles.buttonPressed,
                shadowStyles.default,
                style,
            ]}
            onPress={!loading ? onPress : undefined}>
            {loading ? (
                <ActivityIndicator
                    size={36}
                    color={
                        type === "alternative"
                            ? theme.current.colors.textOnSecondary
                            : theme.current.colors.textOnPrimary
                    }
                />
            ) : (
                <Text
                    bold={true}
                    size="large"
                    color={type === "alternative" ? "onSecondary" : "onPrimary"}>
                    {name}
                </Text>
            )}
        </Pressable>
    );
};

export default Button;

const styles = StyleSheet.create({
    button: {
        width: "100%",
        padding: 0,
        borderRadius: 12,
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
        height: 54,
    },
    buttonPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.97 }],
    },
});
