import { useTheme } from "@/contexts/ThemeProvider";
import React, { useState, useRef } from "react";
import { TouchableOpacity, Text, View, StyleSheet, Animated } from "react-native";
import Icon from "./Icon";

interface ExpanderProps {
    title: string;
    summary?: string;
    expanded?: boolean;
    onExpandedChange?: (expanded: boolean) => void;
    children: React.ReactNode;
    padding?: {
        paddingTop?: number;
        paddingBottom?: number;
        paddingLeft?: number;
        paddingRight?: number;
    };
}

const Expander: React.FC<ExpanderProps> = ({
    title,
    summary,
    expanded: expandedProp,
    onExpandedChange,
    children,
    padding,
}) => {
    const theme = useTheme();

    const [internalExpanded, setInternalExpanded] = useState(false);
    const expanded = expandedProp ?? internalExpanded;

    // Animated value for rotation
    const rotateAnim = useRef(new Animated.Value(0)).current;

    const toggleExpand = () => {
        if (expandedProp === undefined) setInternalExpanded(!expanded);
        onExpandedChange?.(!expanded);

        // Animate rotation between 0 and 90 degrees
        Animated.timing(rotateAnim, {
            toValue: expanded ? 0 : 1, // 0 when collapsed, 1 when expanded
            duration: 300, // Duration of animation in milliseconds
            useNativeDriver: true, // Use native driver for better performance
        }).start();
    };

    // Interpolate rotateAnim to convert to degrees
    const rotateInterpolate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "90deg"], // Rotate 0 to 90 degrees
    });

    return (
        <View
            style={[
                styles.container,
                {
                    paddingBottom: padding?.paddingBottom,
                    paddingTop: padding?.paddingTop,
                },
            ]}>
            <TouchableOpacity
                onPress={toggleExpand}
                style={[
                    styles.header,
                    {
                        paddingLeft: padding?.paddingLeft,
                        paddingRight: padding?.paddingRight,
                    },
                ]}>
                <Animated.View
                    style={[
                        styles.iconContainer,
                        { transform: [{ rotate: rotateInterpolate }] }, // Apply rotation animation
                    ]}>
                    <Icon size={24} icon="chevron-forward-outline" color="onBackground" />
                </Animated.View>
                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: theme.current.colors.textOnBackground }]}>
                        {title}
                    </Text>
                    {!!summary && (
                        <Text
                            numberOfLines={1}
                            style={[styles.summary, { color: theme.current.colors.authMuted }]}>
                            {summary}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
            {expanded && <View style={styles.content}>{children}</View>}
        </View>
    );
};

export default Expander;

const styles = StyleSheet.create({
    container: {},
    header: {
        flexDirection: "row",
        alignItems: "center",
        minHeight: 48,
        paddingVertical: 6,
    },
    iconContainer: {
        width: 24,
        justifyContent: "center",
        alignItems: "center",
    },
    textContainer: {
        flex: 1,
        paddingLeft: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: "bold",
    },
    summary: { fontSize: 13, lineHeight: 18 },
    content: {
        paddingBottom: 15,
    },
});
