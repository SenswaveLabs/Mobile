import { useUser } from "@/contexts/domain/UserProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { shadowStyles } from "@/styles/shadowStyles";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable } from "react-native";
import Text from "../common/Text";

interface UserProfileImageProps {
    enableNavigation?: boolean;
    size?: number;
}

function UserProfileImage({ enableNavigation = false, size = 64 }: UserProfileImageProps) {
    const router = useRouter();
    const user = useUser();
    const theme = useTheme();

    const openProfile = () => {
        if (!enableNavigation) {
            console.debug("[User Profile Component] Navigation is disabled");
            return;
        }
        router.push("user/profile");
    };

    const firstLetter = user.data?.name?.charAt(0) ?? "";

    return (
        <Pressable
            style={[
                {
                    height: size,
                    width: size,
                    backgroundColor: theme.current.colors.primary,
                    borderRadius: size,
                    alignItems: "center",
                    justifyContent: "center",
                },
                shadowStyles.default,
            ]}
            onPress={openProfile}>
            <Text bold={true} size={size >= 64 ? "title" : "large"} color={"complementary"}>
                {firstLetter}
            </Text>
        </Pressable>
    );
}

export default UserProfileImage;
