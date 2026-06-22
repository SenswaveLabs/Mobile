import { useRouter } from "expo-router";
import React from "react";
import { Pressable, View, StyleSheet, Keyboard } from "react-native";
import Icon from "../common/Icon";
import Text from "../common/Text";

interface Props {
    titlePrefix?: string;
    titleSuffix?: string;
}

function DefaultHeader({ titlePrefix, titleSuffix }: Props) {
    const router = useRouter();
    const backClicked = () => {
        console.debug("[Default Header] Back clicked");
        Keyboard.dismiss();
        router.back();
    };

    return (
        <View style={styles.header}>
            <View style={styles.left}>
                <Pressable
                    onPress={backClicked}
                    style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                    <Icon icon="arrow-back-outline" size={28} color="onBackground" />
                </Pressable>
            </View>

            <View style={styles.center}>
                <Text size={"medium"} bold color={"onBackground"} numberOfLines={1}>
                    {titlePrefix}
                    {titleSuffix ? " " : ""}
                </Text>
                {titleSuffix && (
                    <Text size={"medium"} bold color={"complementary"} numberOfLines={1}>
                        {titleSuffix}
                    </Text>
                )}
            </View>

            <View style={styles.right} />
        </View>
    );
}

export default DefaultHeader;

const styles = StyleSheet.create({
    header: {
        width: "100%",
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
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    right: {
        width: 48,
        alignItems: "flex-end",
        justifyContent: "center",
    },
    iconButton: {
        padding: 4,
    },
    pressed: {
        opacity: 0.7,
        transform: [{ scale: 0.98 }],
    },
});
