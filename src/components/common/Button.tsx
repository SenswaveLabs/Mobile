import { useTheme } from "@/contexts/ThemeProvider";
import { shadowStyles } from "@/styles/shadowStyles";
import React, { FC } from "react";
import { Button as ReusableButton } from "@/components/ui/button";
import {
    StyleSheet,
    ActivityIndicator,
    Text as NativeText,
    StyleProp,
    ViewStyle,
    GestureResponderEvent,
} from "react-native";

interface ButtonProps {
    ref?: React.ComponentProps<typeof ReusableButton>["ref"];
    name: string;
    loading: boolean;
    onPress: (event: GestureResponderEvent) => void;
    type?:
        | "default"
        | "alternative"
        | "outlined"
        | "auth"
        | "brand-outline"
        | "brand-ghost"
        | "brand-destructive";
    style?: StyleProp<ViewStyle>;
    disabled?: boolean;
    accessibilityLabel?: string;
}

const Button: FC<ButtonProps> = ({
    ref,
    name,
    loading,
    onPress,
    type = "default",
    style,
    disabled = false,
    accessibilityLabel,
}) => {
    const { colors } = useTheme().current;
    const destructiveBrand = type === "brand-destructive";
    const outlinedBrand = type === "brand-outline" || destructiveBrand;
    const ghostBrand = type === "brand-ghost";
    const auth = type === "auth" || outlinedBrand || ghostBrand;
    const foreground = destructiveBrand
        ? colors.error
        : auth
          ? outlinedBrand || ghostBrand
              ? colors.authForeground
              : colors.authOnPrimary
          : type === "alternative"
            ? colors.textOnSecondary
            : colors.textOnPrimary;
    const unavailable = loading || disabled;

    return (
        <ReusableButton
            ref={ref}
            variant="ghost"
            className={`h-auto rounded-none border-0 p-0 opacity-100 shadow-none ${destructiveBrand ? "active:opacity-90" : "active:opacity-80"}`}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? name}
            accessibilityState={{ disabled: unavailable, busy: loading }}
            disabled={unavailable}
            style={[
                styles.button,
                auth && styles.authButton,
                {
                    borderColor: destructiveBrand
                        ? colors.error
                        : outlinedBrand
                          ? colors.authBorder
                          : type === "outlined"
                            ? colors.secondary
                            : "transparent",
                    backgroundColor: ghostBrand
                        ? "transparent"
                        : outlinedBrand
                          ? colors.authBackground
                          : auth
                            ? colors.authPrimary
                            : type === "alternative"
                              ? colors.secondary
                              : colors.primary,
                },
                !auth && shadowStyles.default,
                !auth && styles.legacyShadow,
                disabled && styles.disabled,
                style,
            ]}
            onPress={onPress}>
            {loading && <ActivityIndicator accessible={false} size="small" color={foreground} />}
            <NativeText
                allowFontScaling
                style={[styles.label, auth && styles.authLabel, { color: foreground }]}>
                {name}
            </NativeText>
        </ReusableButton>
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
        rowGap: 10,
        columnGap: 10,
    },
    label: { fontSize: 20, lineHeight: 24, fontWeight: "bold", flexShrink: 1, textAlign: "center" },
    authButton: { minHeight: 48, borderRadius: 8, borderWidth: 1, paddingVertical: 11 },
    authLabel: { fontSize: 16, lineHeight: 24, fontWeight: "500" },
    legacyShadow: { shadowColor: "#000" },
    disabled: { opacity: 0.6 },
});
