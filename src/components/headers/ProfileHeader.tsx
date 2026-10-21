import React, { FC } from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import UserProfileImage from "../user/UserProfileImage";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { useRouter } from "expo-router";
import Icon from "../common/Icon";

const ProfileHeader: FC = () => {
    const router = useRouter();
    const homes = useHomes();
    const { colors } = useTheme().current;
    return (
        <View style={[styles.header, { backgroundColor: colors.background }]}>
            {!homes.loading && homes.current ? (
                <>
                    <Pressable
                        cssInterop={false}
                        accessibilityRole="button"
                        accessibilityLabel={"Switch home, current home: " + homes.current.name}
                        onPress={() => router.push("home/list")}
                        style={({ pressed }) => [styles.home, pressed && styles.pressed]}>
                        <Text style={[styles.title, { color: colors.authForeground }]}>
                            {homes.current.name}
                        </Text>
                        <Icon icon="chevron-down-outline" size={18} color="brand" />
                    </Pressable>
                    <Pressable
                        cssInterop={false}
                        accessibilityRole="button"
                        accessibilityLabel="Home details"
                        onPress={() => router.push("home/details")}
                        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                        <Icon icon="settings-outline" size={22} color="brand" />
                    </Pressable>
                </>
            ) : (
                <View style={styles.spacer} />
            )}
            <UserProfileImage size={48} enableNavigation />
        </View>
    );
};
export default ProfileHeader;
const styles = StyleSheet.create({
    header: {
        minHeight: 64,
        paddingHorizontal: 16,
        paddingVertical: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    home: {
        flex: 1,
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 8,
    },
    title: { flexShrink: 1, fontSize: 24, lineHeight: 32, fontWeight: "600" },
    iconButton: {
        minWidth: 48,
        minHeight: 48,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
    },
    spacer: { flex: 1 },
    pressed: { opacity: 0.72 },
});
