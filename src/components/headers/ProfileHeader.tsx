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
    const home = homes.current;
    const connected =
        !homes.loading &&
        Boolean(home?.dataSource?.id) &&
        (home?.dataSource?.state === "Working" || home?.dataSource?.state === "Connected");
    return (
        <View style={[styles.header, { backgroundColor: colors.background }]}>
            {!homes.loading && home ? (
                <View style={styles.identity}>
                    <Pressable
                        cssInterop={false}
                        accessibilityRole="button"
                        accessibilityLabel={"Switch home, current home: " + home.name}
                        onPress={() => router.push("home/list")}
                        style={({ pressed }) => [styles.home, pressed && styles.pressed]}>
                        <Text style={[styles.title, { color: colors.authForeground }]}>
                            {home.name}
                        </Text>
                        <Icon icon="chevron-down-outline" size={18} color="brand" />
                    </Pressable>
                    {connected && (
                        <View
                            accessible
                            accessibilityRole="text"
                            accessibilityLabel="Data source connected"
                            accessibilityLiveRegion="polite"
                            style={styles.status}>
                            <View
                                accessible={false}
                                accessibilityElementsHidden
                                importantForAccessibility="no-hide-descendants">
                                <Icon icon="checkmark-circle-outline" size={14} color="brand" />
                            </View>
                            <Text style={[styles.statusText, { color: colors.authMuted }]}>
                                Data source connected
                            </Text>
                        </View>
                    )}
                </View>
            ) : (
                <View style={styles.spacer} />
            )}
            {!homes.loading && home ? (
                <Pressable
                    cssInterop={false}
                    accessibilityRole="button"
                    accessibilityLabel="Home details"
                    onPress={() => router.push("home/details")}
                    style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                    <Icon icon="settings-outline" size={22} color="brand" />
                </Pressable>
            ) : null}
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
    identity: { flex: 1, minWidth: 0 },
    home: {
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 8,
    },
    title: { flexShrink: 1, fontSize: 24, lineHeight: 32, fontWeight: "600" },
    status: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        minHeight: 20,
    },
    statusText: { flexShrink: 1, fontSize: 12, lineHeight: 18 },
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
