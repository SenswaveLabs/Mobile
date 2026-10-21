import React, { FC } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import AddRoomTile from "./tiles/AddRoomTile";
import RoomTile from "./tiles/RoomTile";

const RoomsView: FC = () => {
    const { current: home } = useHomes();
    const { colors } = useTheme().current;
    if (!home) return null;
    if (home.rooms.length === 0) {
        if (!home.isOwner && !home.canManage) return null;
        return (
            <View style={styles.empty}>
                <Text style={[styles.helper, { color: colors.authMuted }]}>
                    Organize your devices into rooms.
                </Text>
                <AddRoomTile />
            </View>
        );
    }
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.content}>
            <RoomTile id="all" name="All" disableDetails />
            {home.rooms.map((room) => (
                <RoomTile key={room.id} id={room.id} name={room.name} />
            ))}
        </ScrollView>
    );
};
export default RoomsView;
const styles = StyleSheet.create({
    content: { gap: 8, alignItems: "center" },
    empty: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
    helper: { flex: 1, minWidth: 160, fontSize: 14, lineHeight: 20 },
});
