import { useRouter, type Href } from "expo-router";
import React, { FC } from "react";
import { Pressable, View, StyleSheet, Keyboard, Text } from "react-native";
import Icon from "../common/Icon";
import { useTheme } from "@/contexts/ThemeProvider";

interface DefaultHeaderProps {
    titlePrefix?: string;
    titleSuffix?: string;
    variant?: "brand";
    onBack?: () => void;
    backFallback?: Href;
}

const DefaultHeader: FC<DefaultHeaderProps> = ({
    titlePrefix,
    titleSuffix,
    onBack,
    backFallback = "/",
}) => {
    const router = useRouter();
    const { colors } = useTheme().current;
    const backClicked = () => {
        Keyboard.dismiss();
        if (onBack) onBack();
        else if (!router.canGoBack()) router.replace(backFallback);
        else router.back();
    };
    return (
        <View style={[styles.header, { backgroundColor: colors.authBackground }]}>
            <Pressable
                cssInterop={false}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={backClicked}
                style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
                <Icon icon="arrow-back-outline" size={16} color="brand" />
            </Pressable>
            <Text
                accessibilityRole="header"
                style={[styles.title, { color: colors.authForeground }]}>
                {[titlePrefix, titleSuffix].filter(Boolean).join(" ")}
            </Text>
        </View>
    );
};
export default DefaultHeader;
const styles = StyleSheet.create({
    header: {
        width: "100%",
        minHeight: 64,
        paddingHorizontal: 24,
        paddingVertical: 8,
        gap: 12,
        flexDirection: "row",
        alignItems: "center",
    },
    back: {
        minWidth: 48,
        minHeight: 48,
        marginLeft: -8,
        alignItems: "center",
        justifyContent: "center",
    },
    pressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
    title: { flex: 1, fontSize: 18, fontWeight: "600" },
});
