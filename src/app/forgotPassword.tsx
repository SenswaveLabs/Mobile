import { useRouter } from "expo-router";
import React from "react";
import { View, StyleSheet } from "react-native";

import ImageButton from "@/components/common/ImageButton";
import Text from "@/components/common/Text";
import { useSession } from "@/contexts/SessionProvider";
import ForgotPasswordForm from "@/components/auth/ForgetPasswordForm";

const ForgotPassword: React.FC = () => {
    const router = useRouter();
    const session = useSession();

    const handleBack = () => {
        console.debug("Back clicked");
        router.back();
    };

    const handleForgotPassword = async (email: string) => {
        try {
            const result = await session.forgotPassword(email);

            if (result.isSuccess) {
                router.push({ pathname: "resetPassword", params: { email } });
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <ImageButton onPress={handleBack} />
            </View>
            <View style={styles.content}>
                <Text size={"title"} color={"onBackground"} bold={true}>
                    Forgot password?
                </Text>

                <Text size={"small"} color={"onBackground"}>
                    Don't worry, we got you! Please enter your email address and you will receive a
                    message with a code to reset your password.
                </Text>

                <View style={styles.contentContainer}>
                    <ForgotPasswordForm submitClicked={handleForgotPassword} />
                </View>
            </View>
        </View>
    );
};

export default ForgotPassword;

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
