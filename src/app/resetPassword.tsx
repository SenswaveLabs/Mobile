import ImageButton from "@/components/common/ImageButton";
import { useSession } from "@/contexts/SessionProvider";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { View, StyleSheet } from "react-native";

import Text from "@/components/common/Text";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { useToast } from "@/contexts/ToastProvider";

const ResetPassword: React.FC = () => {
    const toast = useToast();
    const session = useSession();
    const router = useRouter();
    const { email } = useLocalSearchParams() as { email: string };

    const handleBack = () => {
        console.debug("Back clicked");
        router.back();
    };

    const handleResetPassword = async (password: string, resetCode: string) => {
        const result = await session.resetPassword!(email, password, resetCode);

        if (!result.isSuccess) {
            toast.error(result.errorMessage ?? "Failed to reset password");
        } else {
            router.replace({ pathname: "start" });
            toast.success("Password reset successful.");
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <ImageButton onPress={handleBack} />
            </View>
            <View style={styles.content}>
                <Text size={"title"} color={"onBackground"} bold={true}>
                    Reset Passsword
                </Text>

                <View style={styles.contentContainer}>
                    <ResetPasswordForm submitClicked={handleResetPassword} />
                </View>
            </View>
        </View>
    );
};

export default ResetPassword;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
    },
    header: {
        height: "15%",
        width: "100%",
        justifyContent: "center",
        paddingTop: 30,
        paddingHorizontal: 15,
    },
    content: {
        height: "70%",
        width: "100%",
        paddingHorizontal: 15,
    },
    contentContainer: {
        alignItems: "center",
        width: "100%",
    },
});
