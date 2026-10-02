import { useRouter } from "expo-router";
import React, { FC } from "react";
import { Pressable, View, StyleSheet, Keyboard, Text as NativeText } from "react-native";
import Icon from "../common/Icon";
import Text from "../common/Text";
import { useTheme } from "@/contexts/ThemeProvider";

interface DefaultHeaderProps {
    titlePrefix?: string;
    titleSuffix?: string;
    variant?: "default" | "brand";
}

const DefaultHeader: FC<DefaultHeaderProps> = ({
    titlePrefix,
    titleSuffix,
    variant = "default",
}) => {
    const router = useRouter();
    const { colors } = useTheme().current;
    const brand = variant === "brand";
    const backClicked = () => {
        console.debug("[Default Header] Back clicked");
        Keyboard.dismiss();
        if (brand && !router.canGoBack()) router.replace("/");
        else router.back();
    };

    return (
        <View
            style={[
                styles.header,
                brand && styles.brandHeader,
                brand && { backgroundColor: colors.authBackground },
            ]}>
            <View style={[styles.left, brand && styles.brandLeft]}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    onPress={backClicked}
                    style={({ pressed }) => [
                        styles.iconButton,
                        brand && styles.brandBack,
                        pressed && styles.pressed,
                    ]}>
                    <Icon
                        icon="arrow-back-outline"
                        size={brand ? 16 : 28}
                        color={brand ? "brand" : "onBackground"}
                    />
                </Pressable>
            </View>

            <View style={[styles.center, brand && styles.brandCenter]}>
                {brand ? (
                    <NativeText
                        accessibilityRole="header"
                        style={[styles.brandTitle, { color: colors.authForeground }]}>
                        {[titlePrefix, titleSuffix].filter(Boolean).join(" ")}
                    </NativeText>
                ) : (
                    <>
                        <Text size={"medium"} bold color={"onBackground"} numberOfLines={1}>
                            {titlePrefix}
                            {titleSuffix ? " " : ""}
                        </Text>
                        {titleSuffix && (
                            <Text size={"medium"} bold color={"complementary"} numberOfLines={1}>
                                {titleSuffix}
                            </Text>
                        )}
                    </>
                )}
            </View>

            {!brand && <View style={styles.right} />}
        </View>
    );
};

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
    brandHeader: {
        height: "auto",
        minHeight: 64,
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 8,
        gap: 12,
    },
    brandLeft: { width: 40 },
    brandCenter: { justifyContent: "flex-start", overflow: "visible" },
    brandBack: {
        minWidth: 48,
        minHeight: 48,
        marginLeft: -8,
        alignItems: "center",
        justifyContent: "center",
    },
    brandTitle: { fontSize: 18, fontWeight: "600", flexShrink: 1 },
});
