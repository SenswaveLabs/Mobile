import Button from "@/components/common/Button";
import Icon from "@/components/common/Icon";
import Text from "@/components/common/Text";
import { useConfiguration } from "@/contexts/ConfigurationProvider";
import { useSession } from "@/contexts/SessionProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { FC, useCallback, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";

type ConfirmationStatus = "Verifying" | "Failed" | "Success";

interface ConfirmationViewState {
    identity: string;
    status: ConfirmationStatus;
}

interface ConfirmationEntry {
    accepted: boolean;
    inFlight?: Promise<void>;
}

const ConfirmEmail: FC = () => {
    const params = useLocalSearchParams<{ userId?: string | string[]; code?: string | string[] }>();
    const session = useSession();
    const configuration = useConfiguration();
    const router = useRouter();
    const theme = useTheme();
    const sessionRef = useRef(session);
    const routerRef = useRef(router);
    const identityRef = useRef("");
    const focusedRef = useRef(false);
    const entriesRef = useRef(new Map<string, ConfirmationEntry>());
    const [view, setView] = useState<ConfirmationViewState>({ identity: "", status: "Verifying" });

    sessionRef.current = session;
    routerRef.current = router;

    const userId = params.userId;
    const code = params.code;
    const validParams =
        typeof userId === "string" &&
        userId.length > 0 &&
        typeof code === "string" &&
        code.length > 0;
    let serverUrl = "";
    try {
        serverUrl = configuration.getBaseUrl().toString();
    } catch {
        // Confirmation provider returns the local request failure for an unavailable configuration.
    }
    const identity = JSON.stringify([serverUrl, userId, code]);
    identityRef.current = identity;

    const updateView = (status: ConfirmationStatus, requestIdentity: string) => {
        if (focusedRef.current && identityRef.current === requestIdentity) {
            setView({ identity: requestIdentity, status });
        }
    };

    const verify = useCallback(() => {
        if (!validParams || typeof userId !== "string" || typeof code !== "string") {
            updateView("Failed", identity);
            return;
        }

        let entry = entriesRef.current.get(identity);
        if (entry?.accepted) {
            updateView("Success", identity);
            return;
        }
        if (entry?.inFlight) return;

        entry ??= { accepted: false };
        entriesRef.current.set(identity, entry);
        updateView("Verifying", identity);

        const request = Promise.resolve()
            .then(() => sessionRef.current.confirmEmail(userId, code))
            .then((result) => {
                entry!.accepted = result.isSuccess;
                updateView(result.isSuccess ? "Success" : "Failed", identity);
            })
            .catch(() => {
                entry!.accepted = false;
                updateView("Failed", identity);
            });

        entry.inFlight = request;
        void request.then(() => {
            if (entry!.inFlight === request) entry!.inFlight = undefined;
        });
    }, [identity, validParams, userId, code]);

    useFocusEffect(
        useCallback(() => {
            focusedRef.current = true;
            verify();
            return () => {
                focusedRef.current = false;
            };
        }, [verify]),
    );

    const status = view.identity === identity ? view.status : validParams ? "Verifying" : "Failed";
    const signIn = () => routerRef.current.replace("/login");
    return (
        <View style={[styles.root, { backgroundColor: theme.current.colors.background }]}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled">
                <View style={styles.message}>
                    {status === "Verifying" && (
                        <>
                            <ActivityIndicator size="large" />
                            <Text size="large" color="onBackground" numberOfLines={0}>
                                Verifying your email
                            </Text>
                            <Text size="small" color="onBackground" numberOfLines={0}>
                                Please wait while we verify your email address.
                            </Text>
                        </>
                    )}
                    {status === "Success" && (
                        <>
                            <Icon icon="checkmark-circle-outline" size={72} color="success" />
                            <Text size="large" color="onBackground" numberOfLines={0}>
                                Email verified
                            </Text>
                            <Text size="small" color="onBackground" numberOfLines={0}>
                                Your email address was successfully verified.
                            </Text>
                        </>
                    )}
                    {status === "Failed" && (
                        <>
                            <Icon icon="close-circle-outline" size={72} color="error" />
                            <Text size="large" color="onBackground" numberOfLines={0}>
                                Unable to verify email
                            </Text>
                            <Text size="small" color="onBackground" numberOfLines={0}>
                                {validParams
                                    ? "We couldn't verify your email. Try again."
                                    : "This verification link is missing or invalid."}
                            </Text>
                        </>
                    )}
                </View>

                {status === "Failed" && validParams && (
                    <Button
                        name="Retry verification"
                        loading={false}
                        type="brand-outline"
                        onPress={verify}
                    />
                )}
                {status !== "Verifying" && (
                    <Button name="Sign in" loading={false} type="auth" onPress={signIn} />
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "transparent" },
    scroll: { flex: 1 },
    content: {
        flexGrow: 1,
        width: "100%",
        maxWidth: 448,
        alignSelf: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
        paddingVertical: 24,
        gap: 16,
    },
    message: { alignItems: "center", gap: 12, marginBottom: 16 },
});

export default ConfirmEmail;
