import RegisterForm from "@/components/auth/RegisterForm";
import ImageButton from "@/components/common/ImageButton";
import { useSession } from "@/contexts/SessionProvider";
import { useToast } from "@/contexts/ToastProvider";
import { useRouter } from "expo-router";
import React from "react";
import { View, StyleSheet } from "react-native";

import Text from "@/components/common/Text";

const Register: React.FC = () => {
    const toast = useToast();
    const router = useRouter();
    const session = useSession();

    const handleBack = () => {
        console.debug("Back clicked");
        router.back();
    };

    const handleRegister = async (email: string, password: string) => {
        try {
            const result = await session.register!(email, password);

            if (!result.isSuccess) {
                toast.error(result.errorMessage || "Registration failed");
                return;
            } else {
                toast.success("Successfully registered!");
                router.back();
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to log in. Please try again.");
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <ImageButton onPress={handleBack} />
            </View>
            <View style={styles.content}>
                <Text size={"title"} color={"onBackground"} bold={true}>
                    Register to get started!
                </Text>

                <View style={styles.contentContainer}>
                    <RegisterForm submitClicked={handleRegister} />
                </View>
            </View>
        </View>
    );
};

export default Register;

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
    },
});
