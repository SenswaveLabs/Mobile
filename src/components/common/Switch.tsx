import React, { useEffect } from "react";
import { Pressable } from "react-native";
import Animated, {
    interpolate,
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

import { ViewStyle } from "react-native";
import { useTheme } from "@/contexts/ThemeProvider";

interface SwitchProps {
    value: { value: boolean };
    onPress: () => void;
    style?: ViewStyle;
    duration?: number;
    orientation: "horizontal" | "vertical";
    disabled?: boolean;
}

export const Switch = ({
    value,
    onPress,
    style = {} as ViewStyle,
    duration = 400,
    orientation = "horizontal",
    disabled = false,
}: SwitchProps) => {
    const theme = useTheme();

    const height = useSharedValue(0);
    const width = useSharedValue(0);

    const trackAnimatedStyle = useAnimatedStyle(() => {
        const color = interpolateColor(
            value.value! ? 1 : 0,
            [0, 1],
            [theme.current.colors.error, theme.current.colors.success],
        );
        const colorValue = withTiming(color, { duration });

        return {
            backgroundColor: colorValue,
        };
    });

    const progress = useSharedValue(value.value ? 1 : 0);

    useEffect(() => {
        progress.value = withTiming(value.value ? 1 : 0, { duration });

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value.value, duration]);

    const thumbAnimatedStyle = useAnimatedStyle(() => {
        if (width.value === 0 || height.value === 0) return { opacity: 0 };

        return {
            opacity: 1,
            transform: [
                {
                    translateX: interpolate(
                        progress.value,
                        [0, 1],
                        [0, width.value - height.value],
                    ),
                },
            ],
        };
    });

    const orientationStyle =
        orientation === "horizontal" ? {} : { transform: [{ rotate: "-90deg" }] };

    const onSwitchPressed = () => {
        if (disabled) return;

        onPress();
    };

    return (
        <Pressable onPress={onSwitchPressed} style={orientationStyle}>
            <Animated.View
                onLayout={(e) => {
                    height.value = e.nativeEvent.layout.height;
                    width.value = e.nativeEvent.layout.width;
                }}
                style={[
                    {
                        alignItems: "flex-start",
                        width: 100,
                        height: 40,
                        padding: 5,
                        borderRadius: 128,
                    },
                    style,
                    trackAnimatedStyle,
                ]}>
                <Animated.View
                    style={[
                        {
                            height: "100%",
                            aspectRatio: 1,
                            borderRadius: 128,
                        },
                        thumbAnimatedStyle,
                        { backgroundColor: theme.current.colors.secondary },
                    ]}></Animated.View>
            </Animated.View>
        </Pressable>
    );
};
