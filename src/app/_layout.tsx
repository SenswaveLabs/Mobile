import "react-native-gesture-handler";
import "react-native-reanimated";
import "../../global.css";
import { SessionProvider } from "@/contexts/SessionProvider";
import { ThemeProvider, useTheme } from "@/contexts/ThemeProvider";
import { Stack } from "expo-router";
import React, { FC, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { RootSiblingParent } from "react-native-root-siblings";
import { ToastProvider } from "@/contexts/ToastProvider";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ConfigurationProvider } from "@/contexts/ConfigurationProvider";
import { HttpClientProvider } from "@/contexts/HttpClientProvider";
import { UserProvider } from "@/contexts/domain/UserProvider";
import { LegalProvider } from "@/contexts/domain/LegalProvider";
import { SignalRProvider } from "@/contexts/SignalRProvider";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { vars } from "nativewind";

const RootLayoutInner: FC = () => {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const backgroundColor = theme.current.colors.background;
    const { colors } = theme.current;
    const nativeTheme = vars(
        Object.entries({
            background: colors.background,
            foreground: colors.authForeground,
            card: colors.authFieldBackground,
            "card-foreground": colors.authForeground,
            primary: colors.authPrimary,
            "primary-foreground": colors.authOnPrimary,
            secondary: colors.secondary,
            "secondary-foreground": colors.textOnSecondary,
            muted: colors.authFieldBackground,
            "muted-foreground": colors.authMuted,
            accent: colors.authFieldBackground,
            "accent-foreground": colors.authForeground,
            destructive: colors.error,
            border: colors.authBorder,
            input: colors.authFieldBackground,
            ring: colors.authFocus,
        }).reduce<Record<string, string>>((tokens, [role, color]) => {
            tokens[`--${role}`] = [1, 3, 5]
                .map((start) => parseInt(color.slice(start, start + 2), 16))
                .join(" ");
            return tokens;
        }, {}),
    );

    useEffect(() => {
        GoogleSignin.configure({
            webClientId: process.env.EXPO_PUBLIC_API_GOOGLE_CLIENT_ID,
            offlineAccess: true,
            scopes: ["profile", "email", "openid"],
        });
    }, []);

    return (
        <View
            style={[
                styles.container,
                nativeTheme,
                { backgroundColor, paddingTop: insets.top, paddingBottom: insets.bottom },
            ]}>
            <Stack
                screenOptions={{
                    headerShown: false,
                    animation: "none",
                    contentStyle: { backgroundColor },
                }}
            />
            <StatusBar style={theme.current.type === "dark" ? "light" : "dark"} />
        </View>
    );
};

const RootLayout: FC = () => {
    return (
        <GestureHandlerRootView style={styles.container}>
            <RootSiblingParent>
                <SafeAreaProvider>
                    <KeyboardProvider>
                        <ToastProvider>
                            <ConfigurationProvider>
                                <LegalProvider>
                                    <SessionProvider>
                                        <ThemeProvider>
                                            <HttpClientProvider>
                                                <SignalRProvider>
                                                    <UserProvider>
                                                        <RootLayoutInner />
                                                    </UserProvider>
                                                </SignalRProvider>
                                            </HttpClientProvider>
                                        </ThemeProvider>
                                    </SessionProvider>
                                </LegalProvider>
                            </ConfigurationProvider>
                        </ToastProvider>
                    </KeyboardProvider>
                </SafeAreaProvider>
            </RootSiblingParent>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
});

export default RootLayout;
