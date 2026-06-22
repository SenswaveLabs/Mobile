import { useTheme } from "@/contexts/ThemeProvider";
import { shadowStyles } from "@/styles/shadowStyles";
import React, { FC } from "react";
import { StyleSheet, Pressable, ActivityIndicator, View, StyleProp, ViewStyle } from "react-native";
import Text from "./Text";
import Icon from "./Icon";

interface ButtonWithTextAndImagePropertiess {
    title: string;
    loading: boolean;
    onPress: (e: any) => void;
    type?: "default" | "alternative" | "outlined";
    style?: StyleProp<ViewStyle>;
    icon?: string;
}

const ButtonWithTextAndImage: FC<ButtonWithTextAndImagePropertiess> = ({
    title,
    loading,
    onPress,
    type = "default",
    style,
    icon = "add-outline",
}) => {
    const theme = useTheme();

    const buttonStyles = {
        borderColor: type === "outlined" ? theme.current.colors.secondary : "transparent",
        backgroundColor:
            type === "alternative" ? theme.current.colors.secondary : theme.current.colors.primary,
        ...localStyles.button,
    };

    return (
        <View style={[{ padding: 15 }, style]}>
            <Pressable
                style={({ pressed }) => [
                    buttonStyles,
                    pressed && localStyles.buttonPressed,
                    shadowStyles.default,
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
                    <View
                        style={{
                            alignItems: "center",
                            justifyContent: "center",
                            flexDirection: "column",
                        }}>
                        <Icon
                            icon={icon}
                            size={28}
                            color={type === "alternative" ? "onSecondary" : "onPrimary"}
                        />

                        <Text
                            bold={true}
                            size="small"
                            color={type === "alternative" ? "onSecondary" : "onPrimary"}>
                            {title}
                        </Text>
                    </View>
                )}
            </Pressable>
        </View>
    );
};

export default ButtonWithTextAndImage;

const localStyles = StyleSheet.create({
    button: {
        width: "100%",
        margin: 0,
        padding: 8,
        borderRadius: 12,
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
    },
    buttonPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.97 }],
    },
});
