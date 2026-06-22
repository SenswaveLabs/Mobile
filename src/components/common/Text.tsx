import { useTheme } from "@/contexts/ThemeProvider";
import React, { FC } from "react";
import { Text as BaseText, TextProps as BaseTextProps, StyleProp, TextStyle } from "react-native";

export type TextColor =
    | "onPrimary"
    | "onSecondary"
    | "onBackground"
    | "complementary"
    | "error"
    | "success"
    | "warning"
    | "contrast"
    | "info";

export interface TextProps extends BaseTextProps {
    size?: "small" | "medium" | "large" | "xlarge" | "title";
    color?: TextColor;
    children?: React.ReactNode;
    style?: StyleProp<TextStyle>;
    bold?: boolean;
    selectable?: boolean;
    numberOfLines?: number;
    ellipsizeMode?: "head" | "middle" | "tail" | "clip";
    contrastingColor?: string;
}

const getLuminance = (hex: string): number => {
    const rgb = hex.replace("#", "").match(/.{1,2}/g);
    if (!rgb || rgb.length !== 3) return 0;

    const [r, g, b] = rgb.map((ch) => {
        const c = parseInt(ch, 16) / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const getContrastRatio = (hex1: string, hex2: string): number => {
    const lum1 = getLuminance(hex1);
    const lum2 = getLuminance(hex2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
};

const Text: FC<TextProps> = ({
    children,
    style,
    selectable = false,
    bold = false,
    size = "medium",
    color = "onPrimary",
    numberOfLines = 3,
    ellipsizeMode = "tail",
    contrastingColor = "#000000",
    ...props
}) => {
    const theme = useTheme();

    const calculateFontSize = (size: string) => {
        switch (size) {
            case "small":
                return 12;
            case "medium":
                return 16;
            case "large":
                return 20;
            case "xlarge":
                return 24;
            default:
                return 30;
        }
    };

    const calculateTextColor = (color: string) => {
        switch (color) {
            case "onPrimary":
                return theme.current.colors.textOnPrimary;
            case "onSecondary":
                return theme.current.colors.textOnSecondary;
            case "complementary":
                return theme.current.colors.complementary;
            case "error":
                return theme.current.colors.error;
            case "info":
                return theme.current.colors.info;
            case "success":
                return theme.current.colors.success;
            case "warning":
                return theme.current.colors.warning;
            case "contrast": {
                const contrastWithPrimary = getContrastRatio(
                    contrastingColor,
                    theme.current.colors.primary,
                );
                const contrastWithSecondary = getContrastRatio(
                    contrastingColor,
                    theme.current.colors.secondary,
                );
                return contrastWithPrimary >= contrastWithSecondary
                    ? theme.current.colors.primary
                    : theme.current.colors.secondary;
            }
            default:
                return theme.current.colors.textOnBackground;
        }
    };

    return (
        <BaseText
            style={[
                style,
                {
                    color: calculateTextColor(color),
                    fontSize: calculateFontSize(size),
                    fontWeight: bold ? "bold" : "normal",
                },
            ]}
            numberOfLines={numberOfLines}
            ellipsizeMode={ellipsizeMode}
            selectable={selectable}
            {...props}>
            {children}
        </BaseText>
    );
};

export default Text;
