import { useUser } from "@/contexts/domain/UserProvider";
import React from "react";
import { View, StyleSheet } from "react-native";
import Text from "../common/Text";

function UserWelcome() {
    const user = useUser();

    const username = user.data.name;

    return (
        <View style={styles.welcomeContainer}>
            <Text size={"title"} color={"onBackground"} style={{ marginRight: 5 }}>
                Hello
            </Text>
            <Text
                size={"title"}
                color={"complementary"}
                bold={true}
                numberOfLines={1}
                style={{ flexShrink: 1 }}>
                {username}!
            </Text>
        </View>
    );
}

export default UserWelcome;

const styles = StyleSheet.create({
    welcomeContainer: {
        alignItems: "center",
        display: "flex",
        flexDirection: "row",
        flexWrap: "nowrap",
        flexGrow: 1,
        height: "60%",
    },
});
