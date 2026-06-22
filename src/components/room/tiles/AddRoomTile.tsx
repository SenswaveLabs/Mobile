import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import Icon from "@/components/common/Icon";
import { shadowStyles } from "@/styles/shadowStyles";
import { useTheme } from "@/contexts/ThemeProvider";

export default function AddRoomTile() {
    const router = useRouter();
    const theme = useTheme();

    const addRoom = () => {
        router.push("home/room/add");
    };

    return (
        <Pressable onPress={addRoom}>
            <View
                style={[
                    styles.room,
                    { backgroundColor: theme.current.colors.secondary },
                    shadowStyles.default,
                ]}>
                <Icon icon="add-outline" size={20} color="onSecondary" />
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    room: {
        flexDirection: "row",
        borderRadius: 12,
        alignSelf: "center",
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 5,
        paddingHorizontal: 12,
        marginHorizontal: 4,
        minWidth: 50,
        minHeight: 30,
    },
});
