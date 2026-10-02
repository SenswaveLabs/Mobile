import { useTheme } from "@/contexts/ThemeProvider";
import { shadowStyles } from "@/styles/shadowStyles";
import React, { FC } from "react";
import {
    StyleSheet,
    Pressable,
    ActivityIndicator,
    StyleProp,
    ViewStyle,
    Text,
    GestureResponderEvent,
} from "react-native";

interface ButtonProps {
    name: string;
    loading: boolean;
    onPress: (event: GestureResponderEvent) => void;
    type?: "default" | "alternative" | "outlined" | "auth";
    style?: StyleProp<ViewStyle>;
    disabled?: boolean;
}

const Button: FC<ButtonProps> = ({
    name,
    loading,
    onPress,
    type = "default",
    style,
    disabled = false,
}) => {
    const { colors } = useTheme().current;
    const auth = type === "auth";
    const foreground = auth
        ? colors.authOnPrimary
        : type === "alternative"
          ? colors.textOnSecondary
          : colors.textOnPrimary;
    const unavailable = loading || disabled;

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={name}
            accessibilityState={{ disabled: unavailable, busy: loading }}
            disabled={unavailable}
            style={({ pressed }) => [
                styles.button,
                auth && styles.authButton,
                {
                    borderColor: type === "outlined" ? colors.secondary : "transparent",
                    backgroundColor: auth
                        ? colors.authPrimary
                        : type === "alternative"
                          ? colors.secondary
                          : colors.primary,
                },
                !auth && shadowStyles.default,
                pressed && styles.buttonPressed,
                disabled && styles.disabled,
                style,
            ]}
            onPress={onPress}>
            {loading && <ActivityIndicator accessible={false} size="small" color={foreground} />}
            <Text style={[styles.label, auth && styles.authLabel, { color: foreground }]}>
                {name}
            </Text>
        </Pressable>
    );
};

export default Button;

const styles = StyleSheet.create({
    button: {
        width: "100%",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 54,
        flexDirection: "row",
        gap: 10,
    },
    label: { fontSize: 20, fontWeight: "bold", flexShrink: 1, textAlign: "center" },
    authButton: { minHeight: 48, borderRadius: 8, borderWidth: 1 },
    authLabel: { fontSize: 16, fontWeight: "500" },
    buttonPressed: { opacity: 0.8 },
    disabled: { opacity: 0.6 },
});
