import React, { FC, useCallback, useRef, useState } from "react";
import { AccessibilityInfo, StyleSheet, Text, TextInput, View } from "react-native";
import Button from "../common/Button";
import FormScreen from "../common/FormScreen";
import HomeCodeInput from "./HomeCodeInput";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useFocusEffect, useRouter } from "expo-router";
import { useToast } from "@/contexts/ToastProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useTheme } from "@/contexts/ThemeProvider";

const JoinHomeForm: FC = () => {
    const httpClient = useHttpClient();
    const router = useRouter();
    const toast = useToast();
    const homes = useHomes();
    const { colors } = useTheme().current;
    const [loading, setLoading] = useState(false);
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const pending = useRef(false);
    const active = useRef(true);
    const codeInput = useRef<TextInput>(null);

    useFocusEffect(
        useCallback(() => {
            active.current = true;
            return () => {
                active.current = false;
            };
        }, []),
    );

    const submitClicked = async () => {
        if (pending.current || !active.current) return;
        if (!/^[A-Z0-9]{8}$/.test(code)) {
            const message = "Enter all 8 characters using letters A–Z and numbers 0–9.";
            setError(message);
            AccessibilityInfo.announceForAccessibility(message);
            codeInput.current?.focus();
            return;
        }

        pending.current = true;
        setLoading(true);
        setError("");
        try {
            const result = await httpClient.put("/v1/homes/sharings", { password: code });
            if (!active.current) return;

            if (!result.isSuccess) {
                const message =
                    result.statusCode === 400 || result.statusCode === 404
                        ? "This code is invalid or expired. Ask the home owner for a new invitation."
                        : !result.response
                          ? "Couldn't connect. Check your connection and try again."
                          : "Couldn't join this home. Try again, or contact the home owner.";
                setError(message);
                toast.error(message);
                return;
            }

            let homeReady = !!homes.current;
            if (!homeReady) {
                try {
                    homeReady = await homes.initializeCurrentHome({ silent: true });
                } catch {
                    homeReady = false;
                }
            }
            if (!active.current) return;

            if (!homeReady) {
                toast.info("You've joined the home. Select it from your homes.");
                router.replace("/home/list");
                return;
            }

            toast.success("Joined home successfully.");
            if (router.canGoBack()) router.back();
            else router.replace("/");
        } catch {
            if (active.current) {
                const message = "Couldn't join this home. Please try again.";
                setError(message);
                toast.error(message);
            }
        } finally {
            pending.current = false;
            setLoading(false);
        }
    };

    return (
        <FormScreen
            actions={
                <Button name="Join home" onPress={submitClicked} type="auth" loading={loading} />
            }>
            <View style={styles.fields}>
                <View style={styles.intro}>
                    <Text
                        accessibilityRole="header"
                        style={[styles.title, { color: colors.authForeground }]}>
                        Join a home
                    </Text>
                    <Text style={[styles.description, { color: colors.authMuted }]}>
                        Enter the invite code shared by the home owner.
                    </Text>
                </View>
                <View style={styles.codeField}>
                    <HomeCodeInput
                        value={code}
                        setValue={(value) => {
                            const normalized = value.trim().toUpperCase();
                            setCode(normalized);
                            setError(
                                normalized.length > 8
                                    ? "Invite codes have 8 characters. Check the code you pasted."
                                    : "",
                            );
                        }}
                        error={error}
                        inputRef={codeInput}
                        editable={!loading}
                        onSubmitEditing={() => void submitClicked()}
                    />
                    <Text style={[styles.hint, { color: colors.authMuted }]}>
                        Invitations expire after 15 minutes.
                    </Text>
                </View>
            </View>
        </FormScreen>
    );
};

export default JoinHomeForm;

const styles = StyleSheet.create({
    fields: { gap: 32 },
    intro: { gap: 12 },
    title: { fontSize: 30, lineHeight: 36, fontWeight: "600" },
    description: { fontSize: 16, lineHeight: 24 },
    codeField: { gap: 12 },
    hint: { fontSize: 14, lineHeight: 20 },
});
