import { useUser } from "@/contexts/domain/UserProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { useRouter } from "expo-router";
import React, { FC } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

interface UserProfileImageProps {
    enableNavigation?: boolean;
    size?: number;
}

const UserProfileImage: FC<UserProfileImageProps> = ({ enableNavigation = false, size = 64 }) => {
    const router = useRouter();
    const user = useUser();
    const { colors } = useTheme().current;

    const firstLetter = user.data?.name?.charAt(0) ?? "";

    return (
        <Pressable
            cssInterop={false}
            accessibilityRole={enableNavigation ? "button" : "image"}
            accessibilityLabel={enableNavigation ? "My profile" : user.data?.name || "Profile"}
            style={({ pressed }) => [
                styles.avatar,
                {
                    height: size,
                    width: size,
                    backgroundColor: colors.authFieldBackground,
                    borderColor: colors.authBorder,
                    borderRadius: size,
                },
                enableNavigation && pressed && styles.pressed,
            ]}
            onPress={enableNavigation ? () => router.push("user/profile") : undefined}>
            <Text
                accessible={false}
                maxFontSizeMultiplier={1}
                style={[
                    styles.initial,
                    { color: colors.authForeground, fontSize: size >= 64 ? 30 : 20 },
                ]}>
                {firstLetter}
            </Text>
        </Pressable>
    );
};

export default UserProfileImage;

const styles = StyleSheet.create({
    avatar: { borderWidth: 1, alignItems: "center", justifyContent: "center" },
    initial: { fontWeight: "bold" },
    pressed: { opacity: 0.72 },
});
