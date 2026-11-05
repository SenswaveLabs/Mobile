import { useTheme } from "@/contexts/ThemeProvider";
import { Text as ReusableText } from "@/components/ui/text";
import React, { FC } from "react";
import { StyleSheet, TextProps as NativeTextProps } from "react-native";

export type TextColor =
    | "onPrimary"
    | "onSecondary"
    | "onBackground"
    | "complementary"
    | "error"
    | "success"
    | "warning"
    | "info";

export interface TextProps extends NativeTextProps {
    size?: "small" | "medium" | "large" | "xlarge" | "title";
    color?: TextColor;
    bold?: boolean;
}

const Text: FC<TextProps> = ({
    size = "medium",
    color = "onBackground",
    bold = false,
    style,
    ...props
}) => {
    const { colors } = useTheme().current;
    const foreground = {
        onPrimary: colors.authOnPrimary,
        onSecondary: colors.textOnSecondary,
        onBackground: colors.authForeground,
        complementary: colors.authFocus,
        error: colors.error,
        success: colors.success,
        warning: colors.warning,
        info: colors.info,
    }[color];
    return (
        <ReusableText
            {...props}
            style={[styles[size], { color: foreground, fontWeight: bold ? "600" : "400" }, style]}
        />
    );
};
export default Text;

const styles = StyleSheet.create({
    small: { fontSize: 14, lineHeight: 20 },
    medium: { fontSize: 16, lineHeight: 24 },
    large: { fontSize: 20, lineHeight: 28 },
    xlarge: { fontSize: 24, lineHeight: 32 },
    title: { fontSize: 30, lineHeight: 36 },
});
