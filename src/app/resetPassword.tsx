import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { useSession } from "@/contexts/SessionProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { useToast } from "@/contexts/ToastProvider";
import { validateEmail } from "@/utils/authValidation";
import { SimpleResult } from "@/utils/result";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { FC, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

const ResetPassword: FC = () => {
    const toast = useToast();
    const session = useSession();
    const router = useRouter();
    const { colors } = useTheme().current;
    const { email } = useLocalSearchParams<{ email?: string | string[] }>();
    const [loading, setLoading] = useState(false);

    const handleBack = () => {
        if (router.canGoBack()) router.back();
        else router.replace("/login");
    };

    const handleResetPassword = async (
        password: string,
        resetCode: string,
    ): Promise<SimpleResult> => {
        if (validateEmail(email) || typeof email !== "string") {
            return SimpleResult.failure(
                "Your email is missing or invalid. Go back to request a new reset code.",
            );
        }
        const result = await session.resetPassword(email.trim(), password, resetCode);
        if (result.isSuccess) {
            router.replace("/start");
            toast.success("Password reset successful.");
        }
        return result;
    };

    return (
        <ResetPasswordForm
            submitClicked={handleResetPassword}
            onLoadingChange={setLoading}
            header={
                <View style={styles.header}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                        accessibilityState={{ disabled: loading }}
                        disabled={loading}
                        onPress={handleBack}
                        style={({ pressed }) => [
                            styles.back,
                            (pressed || loading) && styles.dimmed,
                        ]}>
                        <Ionicons name="arrow-back" size={16} color={colors.authForeground} />
                    </Pressable>
                    <Text style={[styles.brand, { color: colors.authForeground }]}>Senswave</Text>
                </View>
            }
            intro={
                <View style={styles.intro}>
                    <Text
                        accessibilityRole="header"
                        style={[styles.title, { color: colors.authForeground }]}>
                        Reset password
                    </Text>
                    <Text style={[styles.description, { color: colors.authMuted }]}>
                        Enter the code from your email and choose a new password.
                    </Text>
                </View>
            }
        />
    );
};

export default ResetPassword;

const styles = StyleSheet.create({
    header: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 12 },
    back: {
        minWidth: 48,
        minHeight: 48,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: -8,
    },
    brand: { fontSize: 18, fontWeight: "600", flexShrink: 1 },
    intro: { gap: 12 },
    title: { fontSize: 30, lineHeight: 36, fontWeight: "600" },
    description: { fontSize: 16, lineHeight: 24 },
    dimmed: { opacity: 0.6 },
});
