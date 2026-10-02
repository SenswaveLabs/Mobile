import "react-native-gesture-handler";
import "react-native-reanimated";
import { SessionProvider } from "@/contexts/SessionProvider";
import { ThemeProvider, useTheme } from "@/contexts/ThemeProvider";
import { Slot } from "expo-router";
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

const RootLayoutInner: FC = () => {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const backgroundColor = theme.current.colors.background;

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
                { backgroundColor, paddingTop: insets.top, paddingBottom: insets.bottom },
            ]}>
            <Slot />
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
