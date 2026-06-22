import React, { useState } from "react";
import { View, Pressable, StyleProp, ViewStyle } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeProvider";
import Text from "@/components/common/Text";
import Icon from "./Icon";
import { shadowStyles } from "@/styles/shadowStyles";

export interface Option {
    name: string;
    value: string;
}

interface DropdownProps {
    selectedValue: string;
    title: string;
    onSelected: (value: string) => void;
    options: Option[];
    style?: StyleProp<ViewStyle>;
    disablePress?: boolean;
    error?: string;
}

function Dropdown({
    selectedValue,
    title,
    onSelected,
    options,
    style,
    disablePress = false,
    error,
}: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownHeight = useSharedValue(40);
    const theme = useTheme();

    const toggleDropdown = () => {
        if (disablePress) {
            console.info("[Dropdown] Dropdown is disabled.");
            return;
        }

        setIsOpen(!isOpen);
        dropdownHeight.value = withTiming(isOpen ? 40 : options.length * 40, {
            duration: 300,
        });
    };

    const animatedStyle = useAnimatedStyle(() => {
        return {
            height: dropdownHeight.value,
        };
    });

    function optionComponent(option: Option, setOption?: (o: string) => void) {
        const onPress = () => {
            if (setOption) {
                console.info(`[Dropdown] Option selected: ${option.name}. Value: ${option.value}.`);
                setOption(option.value);
            }
            toggleDropdown();
        };

        return (
            <Pressable
                key={option.value}
                onPress={onPress}
                style={[
                    {
                        justifyContent: "center",
                        marginLeft: 10,
                        height: 40,
                    },
                ]}>
                <Text size={"medium"} color={"onPrimary"}>
                    {option.name}
                </Text>
                {!setOption && (
                    <View style={{ position: "absolute", right: 10 }}>
                        <Icon icon={"chevron-down-outline"} size={20} color="onPrimary" />
                    </View>
                )}
            </Pressable>
        );
    }

    return (
        <View style={style}>
            {title !== "" && (
                <Text
                    style={{ marginBottom: 5 }}
                    bold={true}
                    size={"medium"}
                    color={"onBackground"}>
                    {title}
                </Text>
            )}
            <Animated.View
                style={[
                    {
                        borderRadius: 10,
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        backgroundColor: theme.current.colors.primary,
                    },
                    animatedStyle,
                    shadowStyles.default,
                ]}>
                {optionComponent(
                    options.find((o) => o.value === selectedValue) ?? {
                        name: "Option not found",
                        value: "",
                    },
                )}
                {options
                    .filter((option) => option.value !== selectedValue)
                    .map((option) => optionComponent(option, onSelected))}
            </Animated.View>
            {error && (
                <Text style={{ marginTop: 0, marginBottom: 5 }} size={"small"} color={"error"}>
                    {error}
                </Text>
            )}
        </View>
    );
}

export default Dropdown;
