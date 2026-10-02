import React, { FC, useCallback, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useWindowDimensions } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "@/contexts/SessionProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { useConfiguration } from "@/contexts/ConfigurationProvider";
import { useGoogleSignIn } from "@/hooks/useGoogleSignIn";
import { useKeyboardVisible } from "@/hooks/useKeyboardVisible";
import {
    validateEmail,
    validateLogin,
    validateRegistration,
    validateServerUrl,
} from "@/utils/authValidation";
import AuthPanel from "@/components/dom/AuthPanel";
import { AUTH_SCREENS, getAuthScreen, type AuthPanelProps } from "@/components/dom/authTypes";
import Button from "@/components/common/Button";
import Text from "@/components/common/Text";

export const AuthFlow: FC = () => {
    const session = useSession();
    const theme = useTheme();
    const configuration = useConfiguration();
    const router = useRouter();
    const pathname = usePathname();
    const google = useGoogleSignIn();
    const { fontScale } = useWindowDimensions();
    const keyboardVisible = useKeyboardVisible();
    const insets = useSafeAreaInsets();
    const lastEmailSentAt = useRef(0);
    const [ready, setReady] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [reloadCount, setReloadCount] = useState(0);
    const onReady = useCallback(async () => setReady(true), []);

    const login: AuthPanelProps["onLogin"] = async (email, password) => {
        // Validate again at the WebView/native boundary before calling the auth provider.
        const errors = validateLogin(email, password);
        if (errors.email || errors.password) return { error: errors.email || errors.password };

        const result = await session.login(email.trim(), password);
        return result.isSuccess
            ? {}
            : {
                  error: result.errorMessage || "Unable to sign in. Please try again.",
                  needsEmailConfirmation: result.data ?? false,
              };
    };

    const register: AuthPanelProps["onRegister"] = async (
        email,
        password,
        confirmPassword,
        consentGiven,
    ) => {
        const error = Object.values(
            validateRegistration(email, password, confirmPassword, consentGiven),
        ).find(Boolean);
        if (error) return { error };

        const result = await session.register(email.trim(), password);
        return result.isSuccess
            ? {}
            : { error: result.errorMessage || "Unable to create account." };
    };

    const forgotPassword: AuthPanelProps["onForgotPassword"] = async (email) => {
        const error = validateEmail(email);
        if (error) return { error };

        const result = await session.forgotPassword(email.trim());
        if (!result.isSuccess) {
            return { error: result.errorMessage || "Unable to send the reset email." };
        }
        router.push({ pathname: "/resetPassword", params: { email: email.trim() } });
        return {};
    };

    const changeServer: AuthPanelProps["onServerChange"] = async (url) => {
        if (!configuration.isDevelopment()) return { error: "Server selection is unavailable." };
        if (url !== null) {
            const error = validateServerUrl(url);
            if (error) return { error };
        }
        configuration.overrideUrl(url === null ? "" : url.trim());
        return {};
    };

    const resendConfirmation: AuthPanelProps["onResendConfirmation"] = async (email) => {
        const error = validateEmail(email);
        if (error) return { error };

        const secondsLeft = Math.ceil((60000 - (Date.now() - lastEmailSentAt.current)) / 1000);
        if (secondsLeft > 0) return { error: `Please wait ${secondsLeft}s before resending.` };

        const result = await session.resendEmailConfirmationMessage(email.trim());
        if (!result.isSuccess) {
            return { error: result.errorMessage || "Unable to send the confirmation email." };
        }
        lastEmailSentAt.current = Date.now();
        return {};
    };

    const navigate: AuthPanelProps["onNavigate"] = async (destination) => {
        if (destination === "back") {
            if (router.canGoBack()) router.back();
            else router.replace("/start");
        } else if (destination === "server") {
            if (configuration.isDevelopment()) router.push("/server");
        } else if (
            AUTH_SCREENS.some((screen) => screen === destination) ||
            destination === "terms" ||
            destination === "privacy"
        ) {
            router.push(`/${destination}`);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior="height"
            keyboardVerticalOffset={insets.top}
            style={styles.container}>
            <AuthPanel
                key={reloadCount}
                dom={{
                    style: [
                        styles.container,
                        { backgroundColor: theme.current.colors.authBackground },
                        !ready && styles.hidden,
                    ],
                    bounces: false,
                    overScrollMode: "never",
                    onLoadStart: () => setReady(false),
                    onError: () => setLoadError(true),
                }}
                screen={getAuthScreen(pathname) ?? "start"}
                theme={theme.current.type}
                fontScale={fontScale}
                keyboardVisible={keyboardVisible}
                rememberMe={session.rememberMe}
                isDevelopment={configuration.isDevelopment()}
                serverUrl={configuration.getBaseUrl().toString()}
                onReady={onReady}
                onLogin={login}
                onRegister={register}
                onForgotPassword={forgotPassword}
                onServerChange={changeServer}
                onResendConfirmation={resendConfirmation}
                onRememberMeChange={session.toogleRememberMe}
                onGoogleLogin={google.signIn}
                onNavigate={navigate}
            />
            {(!ready || loadError) && (
                <View
                    style={[
                        styles.loading,
                        { backgroundColor: theme.current.colors.authBackground },
                    ]}
                    accessibilityLiveRegion="polite">
                    <Text bold size="xlarge" color="onBackground">
                        Senswave
                    </Text>
                    {loadError ? (
                        <>
                            <Text color="onBackground">Unable to load this screen.</Text>
                            <Button
                                name="Try again"
                                loading={false}
                                onPress={() => {
                                    setReady(false);
                                    setLoadError(false);
                                    setReloadCount((count) => count + 1);
                                }}
                            />
                        </>
                    ) : (
                        <ActivityIndicator
                            color={theme.current.colors.complementary}
                            accessibilityLabel="Loading Senswave"
                        />
                    )}
                </View>
            )}
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    hidden: { opacity: 0 },
    loading: {
        ...StyleSheet.absoluteFillObject,
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        padding: 24,
    },
});
