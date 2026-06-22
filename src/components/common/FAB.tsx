import React, { FC, useEffect } from "react";
import { StyleSheet, Pressable, View } from "react-native";
import Animated, {
    SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { useKeyboardHandler } from "react-native-keyboard-controller";
import { useTheme } from "@/contexts/ThemeProvider";
import { shadowStyles } from "@/styles/shadowStyles";
import Icon from "./Icon";
import Text from "./Text";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SPRING_CONFIG = {
    duration: 1200,
    overshootClamping: true,
    dampingRatio: 0.8,
};

const GAP = 8;
const FAB_RIGHT = 15;
const FAB_BOTTOM = 15;
const MAIN_SIZE = 56;
const ACTION_SIZE = 44;
// centers ACTION_SIZE button over MAIN_SIZE button, both anchored from right
const ACTION_RIGHT = FAB_RIGHT + (MAIN_SIZE - ACTION_SIZE) / 2;

export interface FABAction {
    icon: string;
    label: string;
    onPress: () => void;
}

interface ActionButtonProps {
    action: FABAction;
    isExpanded: SharedValue<boolean>;
    index: number;
    onPress: () => void;
}

const ActionButton: FC<ActionButtonProps> = ({ action, isExpanded, index, onPress }) => {
    const theme = useTheme();
    const delay = index * 50;

    const animatedStyle = useAnimatedStyle(() => {
        const moveValue = isExpanded.value
            ? MAIN_SIZE + (index - 1) * ACTION_SIZE + index * GAP
            : 0;
        const scaleValue = isExpanded.value ? 1 : 0;
        const opacityValue = isExpanded.value ? 1 : 0;

        return {
            transform: [
                { translateY: withSpring(-moveValue, SPRING_CONFIG) },
                { scale: withDelay(delay, withTiming(scaleValue, { duration: 200 })) },
            ],
            opacity: withDelay(delay, withTiming(opacityValue, { duration: 200 })),
        };
    });

    return (
        <Animated.View style={[styles.actionRow, animatedStyle]}>
            <View style={[styles.label, { backgroundColor: theme.current.colors.secondary }]}>
                <Text size="small" color="onSecondary">
                    {action.label}
                </Text>
            </View>
            <AnimatedPressable
                onPress={onPress}
                style={[
                    styles.actionButton,
                    { backgroundColor: theme.current.colors.secondary },
                    shadowStyles.default,
                ]}>
                <Icon icon={action.icon} size={20} color="onSecondary" />
            </AnimatedPressable>
        </Animated.View>
    );
};

interface FABProps {
    actions: FABAction[];
    forceExpanded?: boolean;
}

const FAB: FC<FABProps> = ({ actions, forceExpanded }) => {
    const theme = useTheme();
    const isExpanded = useSharedValue(false);
    const keyboardHeight = useSharedValue(0);

    useKeyboardHandler(
        {
            onStart: (e) => {
                "worklet";
                keyboardHeight.value = e.height;
            },
        },
        [],
    );

    useEffect(() => {
        if (forceExpanded !== undefined) {
            isExpanded.value = forceExpanded;
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [forceExpanded]);

    const handlePress = () => {
        isExpanded.value = !isExpanded.value;
    };

    const mainIconStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: withTiming(isExpanded.value ? 0.85 : 1, { duration: 200 }) }],
            opacity: withTiming(isExpanded.value ? 0.7 : 1, { duration: 200 }),
        };
    });

    const containerStyle = useAnimatedStyle(() => ({
        opacity: withTiming(keyboardHeight.value > 0 ? 0 : 1, { duration: 150 }),
    }));

    return (
        <Animated.View style={[styles.container, containerStyle]} pointerEvents="box-none">
            {actions.map((action, i) => (
                <ActionButton
                    key={action.label}
                    action={action}
                    isExpanded={isExpanded}
                    index={i + 1}
                    onPress={() => {
                        isExpanded.value = false;
                        action.onPress();
                    }}
                />
            ))}
            <AnimatedPressable
                onPress={handlePress}
                style={[
                    styles.mainButton,
                    { backgroundColor: theme.current.colors.complementary },
                    shadowStyles.default,
                ]}>
                <Animated.View style={mainIconStyle}>
                    <Icon icon="ellipsis-vertical" size={28} color="onPrimary" />
                </Animated.View>
            </AnimatedPressable>
        </Animated.View>
    );
};

export default FAB;

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    mainButton: {
        position: "absolute",
        right: FAB_RIGHT,
        bottom: FAB_BOTTOM,
        width: MAIN_SIZE,
        height: MAIN_SIZE,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1,
    },
    actionRow: {
        position: "absolute",
        right: ACTION_RIGHT,
        bottom: FAB_BOTTOM,
        flexDirection: "row",
        alignItems: "center",
    },
    actionButton: {
        width: ACTION_SIZE,
        height: ACTION_SIZE,
        borderRadius: ACTION_SIZE / 2,
        justifyContent: "center",
        alignItems: "center",
    },
    label: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        marginRight: 10,
        maxWidth: 200,
    },
});
