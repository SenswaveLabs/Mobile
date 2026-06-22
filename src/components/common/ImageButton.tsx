import React, { FC } from "react";
import {
    StyleSheet,
    GestureResponderEvent,
    View,
    Pressable,
    ActivityIndicator,
    StyleProp,
    ViewStyle,
} from "react-native";
import { shadowStyles } from "@/styles/shadowStyles";
import { useTheme } from "@/contexts/ThemeProvider";
import Icon from "./Icon";

interface ImageButtonProps {
    type?: "default" | "alternative" | "outlined";
    loading?: boolean;
    size?: number;
    onPress?: (e: GestureResponderEvent) => void;
    icon?: string;
    style?: StyleProp<ViewStyle>;
}

const ImageButton: FC<ImageButtonProps> = ({
    type = "default",
    loading = false,
    size = 32,
    onPress,
    icon = "chevron-back-outline",
    style,
}) => {
    const theme = useTheme();

    const backgroundColor =
        type === "alternative" ? theme.current.colors.secondary : theme.current.colors.primary;

    const buttonStyles = {
        borderColor: type === "outlined" ? theme.current.colors.secondary : "transparent",
        backgroundColor: backgroundColor,
        ...styles.button,
    };
    const iconColor =
        type === "alternative"
            ? theme.current.colors.textOnSecondary
            : theme.current.colors.textOnPrimary;

    return (
        <Pressable
            style={({ pressed }) => [
                buttonStyles,
                pressed && styles.buttonPressed,
                shadowStyles.default,
                style,
            ]}
            onPress={!loading ? onPress : undefined}>
            <View style={styles.iconContainer}>
                {loading ? (
                    <ActivityIndicator size={size} color={iconColor} />
                ) : (
                    <Icon
                        size={size}
                        icon={icon}
                        color={type === "alternative" ? "onSecondary" : "onPrimary"}
                    />
                )}
            </View>
        </Pressable>
    );
};

export default ImageButton;

const styles = StyleSheet.create({
    button: {
        alignSelf: "flex-start",
        margin: 0,
        padding: 6,
        borderRadius: 12,
        borderWidth: 1.5,
    },
    iconContainer: {
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        margin: 0,
    },
    buttonPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.97 }],
    },
});
