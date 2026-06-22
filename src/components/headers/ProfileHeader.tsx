import React from "react";
import { View, StyleSheet, Pressable, TouchableOpacity } from "react-native";
import Text from "../common/Text";
import UserProfileImage from "../user/UserProfileImage";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useRouter } from "expo-router";
import Icon from "../common/Icon";

const ProfileHeader = () => {
    const router = useRouter();
    const homes = useHomes();

    const hamburgerClicked = () => {
        console.debug("[Profile Header] Change home clicked.");
        router.push("home/list");
    };

    return (
        <View style={styles.header}>
            <View style={styles.left}>
                {!homes.loading && homes.current && (
                    <TouchableOpacity onPress={hamburgerClicked}>
                        <Icon icon="menu-outline" size={36} />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.center}>
                {!homes.loading && homes.current && (
                    <Pressable
                        style={({ pressed }) => [pressed && styles.pressed]}
                        onPress={hamburgerClicked}>
                        <Text size="medium" bold color="onBackground" numberOfLines={1}>
                            {homes.current.name}
                        </Text>
                    </Pressable>
                )}
            </View>

            <View style={styles.right}>
                <UserProfileImage size={48} enableNavigation={true} />
            </View>
        </View>
    );
};

export default ProfileHeader;

const styles = StyleSheet.create({
    header: {
        height: 80,
        paddingHorizontal: 15,
        paddingTop: 10,
        flexDirection: "row",
        alignItems: "center",
    },
    left: {
        width: 48,
        alignItems: "flex-start",
        justifyContent: "center",
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    right: {
        width: 48,
        alignItems: "flex-end",
        justifyContent: "center",
    },
    pressed: {
        opacity: 0.8,
    },
});
