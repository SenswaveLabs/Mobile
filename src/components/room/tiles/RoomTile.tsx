import { useDeviceList } from "@/contexts/custom/DeviceListProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { shadowStyles } from "@/styles/shadowStyles";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Animated } from "react-native";

interface RoomProperties {
    id: string;
    name: string;
    disableClicks?: boolean;
    disableDetails?: boolean;
}

export default function RoomTile({
    id,
    name,
    disableClicks = false,
    disableDetails = false,
}: RoomProperties) {
    const theme = useTheme();
    const devices = useDeviceList();

    const backgroundColorAnim = useRef(new Animated.Value(0)).current;
    const textColorAnim = useRef(new Animated.Value(0)).current;

    const [isSelected, setIsSelected] = useState(devices.filter === id);

    useEffect(() => {
        setIsSelected(devices.filter === id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [devices.filter]);

    useEffect(() => {
        Animated.timing(backgroundColorAnim, {
            toValue: isSelected ? 1 : 0,
            duration: 300,
            useNativeDriver: false,
        }).start();

        Animated.timing(textColorAnim, {
            toValue: isSelected ? 1 : 0,
            duration: 300,
            useNativeDriver: false,
        }).start();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSelected]);

    const animatedBackgroundColor = backgroundColorAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [theme.current.colors.primary, theme.current.colors.secondary],
    });

    const animatedTextColor = textColorAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [theme.current.colors.textOnPrimary, theme.current.colors.textOnSecondary],
    });

    const switchRoom = () => {
        if (disableClicks) {
            console.debug("[Room Tile] Room clicks disabled");
            return;
        }

        console.debug("[Room Tile] Switching to room:", id);
        devices.setFilter(id);
    };

    const roomDetails = () => {
        if (disableDetails) {
            console.debug("[Room Tile] Room details disabled");
            return;
        }

        router.push({ pathname: `home/room/details`, params: { id: id } });
    };

    return (
        <Pressable onPress={switchRoom} onLongPress={roomDetails}>
            <Animated.View
                style={[
                    styles.room,
                    { backgroundColor: animatedBackgroundColor },
                    shadowStyles.default,
                ]}>
                <Animated.Text style={[styles.text, { color: animatedTextColor }]}>
                    {name}
                </Animated.Text>
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    text: {
        fontSize: 16,
    },
    room: {
        borderRadius: 12,
        alignSelf: "center",
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 3,
        paddingHorizontal: 10,
        marginHorizontal: 2,
        minWidth: 60,
        minHeight: 30,
    },
});
