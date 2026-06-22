import React, { useRef } from "react";
import {
    View,
    TouchableOpacity,
    Animated,
    StyleSheet,
    LayoutAnimation,
    StyleProp,
    ViewStyle,
} from "react-native";
import { useTheme } from "@/contexts/ThemeProvider";
import { shadowStyles } from "@/styles/shadowStyles";
import Text from "./Text";
import { TextColor } from "./Text";

interface HorizontalSelectorProps {
    options: string[];
    selected: string;
    onSelect: (option: string) => void;
    height?: number;
    margin?: {
        top?: number;
        right?: number;
        bottom?: number;
        left?: number;
    };
    optionAdditionalStyles?: StyleProp<ViewStyle>[];
    textColorWhenNotSelected?: TextColor;
    textColorWhenSelected?: TextColor;
}

const HorizontalSelector: React.FC<HorizontalSelectorProps> = ({
    options,
    selected,
    onSelect,
    height = 30,
    margin = { top: 10, right: 15, bottom: 10, left: 15 },
    optionAdditionalStyles = [],
    textColorWhenNotSelected = "onPrimary",
    textColorWhenSelected = "onSecondary",
}) => {
    const theme = useTheme();

    const selectedIndex = options.indexOf(selected);
    const animation = useRef(new Animated.Value(selectedIndex)).current;

    const handleSelect = (index: number) => {
        console.info("[Horizontal Selector] Option Clicked: ", options[index]);

        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        Animated.timing(animation, {
            toValue: index,
            duration: 200,
            useNativeDriver: false,
        }).start();
        onSelect(options[index]);
    };

    const additionalStyle = optionAdditionalStyles[selectedIndex] || {};

    if (options.length === 0) {
        return (
            <View
                style={[
                    styles.container,
                    {
                        marginTop: margin.top,
                        marginRight: margin.right,
                        marginBottom: margin.bottom,
                        marginLeft: margin.left,
                    },
                ]}>
                <View
                    style={[
                        styles.selector,
                        { height: height, backgroundColor: theme.current.colors.primary },
                        shadowStyles.default,
                    ]}>
                    <TouchableOpacity style={styles.option}>
                        <Text size={"medium"} color={textColorWhenNotSelected}>
                            No Options provided
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (options.length === 1) {
        return (
            <View
                style={[
                    styles.container,
                    {
                        marginTop: margin.top,
                        marginRight: margin.right,
                        marginBottom: margin.bottom,
                        marginLeft: margin.left,
                    },
                ]}>
                <View
                    style={[
                        styles.selector,
                        { height: height, backgroundColor: theme.current.colors.primary },
                        shadowStyles.default,
                        additionalStyle,
                    ]}>
                    <TouchableOpacity style={styles.option}>
                        <Text size={"medium"} color={textColorWhenNotSelected}>
                            {options[0]}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View
            style={[
                styles.container,
                {
                    marginTop: margin.top,
                    marginRight: margin.right,
                    marginBottom: margin.bottom,
                    marginLeft: margin.left,
                },
            ]}>
            <View
                style={[
                    styles.selector,
                    { height: height, backgroundColor: theme.current.colors.primary },
                    shadowStyles.default,
                ]}>
                <Animated.View
                    style={[
                        styles.animatedBackground,
                        {
                            backgroundColor: theme.current.colors.secondary,
                            width: `${100 / options.length}%`,
                            left: animation.interpolate({
                                inputRange: options.map((_, i) => i),
                                outputRange: options.map(
                                    (_, i) => `${(i * 100) / options.length}%`,
                                ),
                            }),
                        },
                        additionalStyle,
                    ]}
                />
                {options.map((option, index) => (
                    <TouchableOpacity
                        key={option}
                        style={styles.option}
                        onPress={() => handleSelect(index)}>
                        {selected === option ? (
                            <Text
                                size={options.length >= 3 ? "small" : "medium"}
                                color={textColorWhenSelected}>
                                {" "}
                                {option}{" "}
                            </Text>
                        ) : (
                            <Text
                                size={options.length >= 3 ? "small" : "medium"}
                                color={textColorWhenNotSelected}>
                                {" "}
                                {option}{" "}
                            </Text>
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
    },
    selector: {
        flexDirection: "row",
        borderRadius: 16,
        position: "relative",
        overflow: "hidden",
    },
    animatedBackground: {
        position: "absolute",
        height: "100%",
        borderRadius: 16,
    },
    option: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
});

export default HorizontalSelector;
