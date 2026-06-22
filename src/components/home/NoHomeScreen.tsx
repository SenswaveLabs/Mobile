import Button from "@/components/common/Button";
import Text from "@/components/common/Text";
import React, { FC } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";

interface NoHomeScreenProps {
    onCreateHome: () => void;
    onJoinHome: () => void;
    refreshing: boolean;
    onRefresh: () => void;
}

const NoHomeScreen: FC<NoHomeScreenProps> = ({
    onCreateHome,
    onJoinHome,
    refreshing,
    onRefresh,
}) => {
    return (
        <ScrollView
            contentContainerStyle={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#000"]} />
            }>
            <View style={styles.content}>
                <Text size="title" color="onBackground" bold style={styles.headline}>
                    Welcome
                </Text>
                <Text size="medium" color="onBackground" style={styles.subtitle} numberOfLines={10}>
                    No home configured yet. Set up a new one from scratch or connect to an existing
                    Home shared with you.
                </Text>
            </View>

            <View style={styles.buttons}>
                <Button name="Create" onPress={onCreateHome} loading={false} />
                <Button
                    name="Join"
                    type="alternative"
                    onPress={onJoinHome}
                    loading={false}
                    style={{ marginTop: 12 }}
                />
            </View>
        </ScrollView>
    );
};

export default NoHomeScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 24,
        paddingBottom: 32,
    },
    content: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 8,
    },
    headline: {
        textAlign: "center",
        marginBottom: 16,
    },
    subtitle: {
        textAlign: "center",
        opacity: 0.7,
    },
    buttons: {
        width: "100%",
        paddingTop: 16,
    },
});
