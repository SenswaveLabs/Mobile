import { useTheme } from "@/contexts/ThemeProvider";
import { View, ViewProps } from "react-native";

interface DividerProps extends ViewProps {
    color?:
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

const Divider = ({ color = "textOnBackground", style }: DividerProps) => {
    const theme = useTheme();

    const selectedColor = (() => {
        switch (color) {
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
        <View style={[{ paddingVertical: 15 }, style]}>
            <View
                style={{
                    height: 1,
                    borderRadius: 2,
                    width: "100%",
                    opacity: 0.5,
                    backgroundColor: selectedColor,
                }}
            />
        </View>
    );
};

export default Divider;
