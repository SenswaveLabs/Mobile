import Button from "@/components/common/Button";
import Icon from "@/components/common/Icon";
import { useTheme } from "@/contexts/ThemeProvider";
import React, { FC } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

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
    const { colors } = useTheme().current;

    return (
        <ScrollView
            style={[styles.scroll, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.container}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={[colors.authForeground]}
                    tintColor={colors.authForeground}
                />
            }>
            <View style={styles.content}>
                <View
                    accessible={false}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants">
                    <Icon icon="home-outline" size={36} color="brand" />
                </View>
                <Text
                    accessibilityRole="header"
                    style={[styles.headline, { color: colors.authForeground }]}>
                    Set up your home
                </Text>
                <Text style={[styles.subtitle, { color: colors.authMuted }]}>
                    Create a home to start adding rooms and devices, or join a home shared with you.
                </Text>
            </View>

            <View style={styles.buttons}>
                <Button name="Create home" type="auth" onPress={onCreateHome} loading={false} />
                <Button
                    name="Join home"
                    type="brand-outline"
                    onPress={onJoinHome}
                    loading={false}
                />
            </View>
        </ScrollView>
    );
};

export default NoHomeScreen;

const styles = StyleSheet.create({
    scroll: { flex: 1 },
    container: {
        flexGrow: 1,
        width: "100%",
        maxWidth: 448,
        alignSelf: "center",
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 32,
    },
    content: {
        flexGrow: 1,
        alignItems: "flex-start",
        justifyContent: "center",
        paddingVertical: 32,
        gap: 16,
    },
    headline: {
        fontSize: 30,
        lineHeight: 36,
        fontWeight: "600",
    },
    subtitle: {
        fontSize: 16,
        lineHeight: 24,
    },
    buttons: {
        width: "100%",
        paddingTop: 32,
        gap: 12,
    },
});
