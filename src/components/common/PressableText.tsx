import React, { FC } from "react";
import { Pressable } from "react-native";
import { useTheme } from "@/contexts/ThemeProvider";
import Text, { TextProps } from "./Text";

interface PressableTextProps extends TextProps {
    onPress: () => void;
}

const PressableText: FC<PressableTextProps> = ({ onPress, children, ...textProps }) => {
    const theme = useTheme();

    return (
        <Pressable
            style={({ pressed }) => ({
                opacity: pressed ? 0.5 : 1,
                borderRadius: 8,
                backgroundColor: theme.current.colors.background,
                paddingHorizontal: 8,
                paddingVertical: 6,
                alignItems: "center",
                justifyContent: "center",
            })}
            onPress={onPress}>
            <Text {...textProps}>{children}</Text>
        </Pressable>
    );
};

export default PressableText;
