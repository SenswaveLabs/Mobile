import { useTheme } from "@/contexts/ThemeProvider";
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
    type?: "auth" | "brand-outline" | "brand-ghost" | "brand-destructive";
    style?: StyleProp<ViewStyle>;
    disabled?: boolean;
    accessibilityLabel?: string;
}

const Button: FC<ButtonProps> = ({
    ref,
    name,
    loading,
    onPress,
    type = "auth",
    style,
    disabled = false,
    accessibilityLabel,
}) => {
    const { colors } = useTheme().current;
    const destructiveBrand = type === "brand-destructive";
    const outlinedBrand = type === "brand-outline" || destructiveBrand;
    const ghostBrand = type === "brand-ghost";
    const foreground = destructiveBrand
        ? colors.error
        : outlinedBrand || ghostBrand
          ? colors.authForeground
          : colors.authOnPrimary;
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
                {
                    borderColor: destructiveBrand
                        ? colors.error
                        : outlinedBrand
                          ? colors.authBorder
                          : "transparent",
                    backgroundColor: ghostBrand
                        ? "transparent"
                        : outlinedBrand
                          ? colors.authBackground
                          : colors.authPrimary,
                },
                disabled && styles.disabled,
                style,
            ]}
            onPress={onPress}>
            {loading && <ActivityIndicator accessible={false} size="small" color={foreground} />}
            <NativeText allowFontScaling style={[styles.label, { color: foreground }]}>
                {name}
            </NativeText>
        </ReusableButton>
    );
};

export default Button;

const styles = StyleSheet.create({
    button: {
        width: "100%",
        minHeight: 48,
        paddingHorizontal: 16,
        paddingVertical: 11,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        rowGap: 10,
        columnGap: 10,
    },
    label: { fontSize: 16, lineHeight: 24, fontWeight: "500", flexShrink: 1, textAlign: "center" },
    disabled: { opacity: 0.6 },
});
