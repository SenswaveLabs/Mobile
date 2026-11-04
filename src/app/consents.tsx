import Button from "@/components/common/Button";
import Text from "@/components/common/Text";
import DefaultHeader from "@/components/headers/DefaultHeader";
import { useSession } from "@/contexts/SessionProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { useUser } from "@/contexts/domain/UserProvider";
import { BackHandler, Pressable, StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useFocusEffect, useRouter } from "expo-router";
import { FC, useCallback, useEffect, useRef, useState } from "react";

type GateState =
    | "checking"
    | "read-error"
    | "needs-consent"
    | "submitting"
    | "write-error"
    | "verifying"
    | "accepted-error"
    | "returning"
    | "return-error"
    | "returned";

const ConsentsPage: FC = () => {
    const user = useUser();
    const session = useSession();
    const router = useRouter();
    const { colors } = useTheme().current;
    const [gateState, setGateState] = useState<GateState>("checking");
    const gateStateRef = useRef<GateState>("checking");
    const sessionRef = useRef(session.session);
    sessionRef.current = session.session;
    const observedIdentity = useRef(
        session.session.authenticated ? session.session.accessToken : "",
    );
    const focused = useRef(false);
    const cancelled = useRef(false);
    const inFlight = useRef(false);
    const operationId = useRef(0);
    const initialReadStarted = useRef(false);
    const focusEpoch = useRef(0);
    const acceptedIdentity = useRef<string | null>(null);
    const verifiedIdentity = useRef<string | null>(null);
    const deferredState = useRef<GateState | null>(null);
    const cancelRef = useRef<() => void>(() => {});
    const focusRef = useRef<() => void>(() => {});

    const identity = () => (sessionRef.current.authenticated ? sessionRef.current.accessToken : "");
    const sessionIsCurrent = (value: string) =>
        !!value && !cancelled.current && identity() === value;
    const screenIsCurrent = (value: string, epoch: number) =>
        sessionIsCurrent(value) && focused.current && focusEpoch.current === epoch;
    const setGate = (next: GateState) => {
        gateStateRef.current = next;
        if (focused.current && !cancelled.current) setGateState(next);
        else deferredState.current = next;
    };

    const returnToApp = (value: string, epoch: number) => {
        if (!screenIsCurrent(value, epoch) || verifiedIdentity.current !== value) return;
        try {
            router.replace("/");
            setGate("returned");
        } catch {
            if (screenIsCurrent(value, epoch)) setGate("return-error");
        }
    };

    const verifyAccepted = async (value: string) => {
        if (inFlight.current || acceptedIdentity.current !== value || !sessionIsCurrent(value))
            return;
        const operation = ++operationId.current;
        inFlight.current = true;
        const epoch = focusEpoch.current;
        setGate("verifying");

        try {
            const result = await user.getUserData({ silent: true });
            if (!sessionIsCurrent(value)) return;
            if (!screenIsCurrent(value, epoch)) return;
            if (result.isSuccess && result.data?.hasActiveConsent === true) {
                verifiedIdentity.current = value;
                returnToApp(value, epoch);
            } else {
                setGate("accepted-error");
            }
        } catch {
            if (screenIsCurrent(value, epoch)) setGate("accepted-error");
        } finally {
            if (operationId.current === operation) {
                inFlight.current = false;
                if (focused.current && sessionIsCurrent(value) && focusEpoch.current !== epoch) {
                    void verifyAccepted(value);
                }
            }
        }
    };

    const readAccount = async () => {
        if (inFlight.current || initialReadStarted.current) return;
        const value = identity();
        if (!value) {
            setGate("read-error");
            return;
        }

        const operation = ++operationId.current;
        initialReadStarted.current = true;
        inFlight.current = true;
        const epoch = focusEpoch.current;
        setGate("checking");
        try {
            const result = await user.getUserData({ silent: true });
            if (!sessionIsCurrent(value) || !screenIsCurrent(value, epoch)) return;
            if (!result.isSuccess || typeof result.data?.hasActiveConsent !== "boolean") {
                setGate("read-error");
            } else if (result.data.hasActiveConsent === true) {
                verifiedIdentity.current = value;
                returnToApp(value, epoch);
            } else {
                setGate("needs-consent");
            }
        } catch {
            if (screenIsCurrent(value, epoch)) setGate("read-error");
        } finally {
            if (operationId.current === operation) {
                inFlight.current = false;
                if (focused.current && sessionIsCurrent(value) && focusEpoch.current !== epoch) {
                    initialReadStarted.current = false;
                    void readAccount();
                }
            }
        }
    };

    const accept = async () => {
        if (inFlight.current || !focused.current || cancelled.current) return;
        if (
            !["needs-consent", "write-error"].includes(gateStateRef.current) ||
            acceptedIdentity.current
        )
            return;
        const value = identity();
        if (!value || !sessionIsCurrent(value)) {
            setGate("read-error");
            return;
        }

        const operation = ++operationId.current;
        inFlight.current = true;
        setGate("submitting");
        let accepted = false;
        try {
            const result = await user.makeConsents();
            if (!sessionIsCurrent(value)) return;
            if (!result.isSuccess) {
                setGate("write-error");
                return;
            }

            acceptedIdentity.current = value;
            accepted = true;
            setGate("verifying");
        } catch {
            if (sessionIsCurrent(value)) setGate("write-error");
        } finally {
            if (operationId.current === operation) inFlight.current = false;
        }

        if (accepted && sessionIsCurrent(value) && focused.current) await verifyAccepted(value);
    };

    const retryAccountCheck = () => {
        if (inFlight.current) return;
        const value = identity();
        if (acceptedIdentity.current === value && value) {
            void verifyAccepted(value);
            return;
        }
        initialReadStarted.current = false;
        void readAccount();
    };

    const continueToApp = () => {
        if (inFlight.current || !focused.current || cancelled.current) return;
        const value = identity();
        const epoch = focusEpoch.current;
        if (!value || verifiedIdentity.current !== value || !screenIsCurrent(value, epoch)) return;
        inFlight.current = true;
        setGate("returning");
        try {
            returnToApp(value, epoch);
        } finally {
            inFlight.current = false;
        }
    };

    const cancel = useCallback(() => {
        if (cancelled.current) return;
        cancelled.current = true;
        operationId.current++;
        inFlight.current = false;
        session.logout();
    }, [session]);
    cancelRef.current = cancel;

    useEffect(() => {
        const currentIdentity = identity();
        if (currentIdentity === observedIdentity.current) return;
        observedIdentity.current = currentIdentity;
        operationId.current++;
        inFlight.current = false;
        acceptedIdentity.current = null;
        verifiedIdentity.current = null;
        initialReadStarted.current = false;
        deferredState.current = null;
        if (!currentIdentity) return;
        cancelled.current = false;
        setGate("checking");
        if (focused.current) void readAccount();
        // Session changes invalidate any accepted consent latch and its recovery state.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session.session.authenticated, session.session.accessToken]);

    focusRef.current = () => {
        if (cancelled.current) return;
        if (deferredState.current) {
            gateStateRef.current = deferredState.current;
            setGateState(deferredState.current);
            deferredState.current = null;
        }
        const value = identity();
        if (acceptedIdentity.current === value && gateStateRef.current === "verifying") {
            void verifyAccepted(value);
        } else if (!initialReadStarted.current && gateStateRef.current === "checking") {
            void readAccount();
        }
    };

    useFocusEffect(
        useCallback(() => {
            focused.current = true;
            focusEpoch.current++;
            focusRef.current();
            const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
                cancelRef.current();
                return true;
            });
            return () => {
                focused.current = false;
                focusEpoch.current++;
                if (gateStateRef.current === "checking") initialReadStarted.current = false;
                subscription.remove();
            };
        }, []),
    );

    const isBusy = ["checking", "submitting", "verifying", "returning"].includes(gateState);
    const canAccept = gateState === "needs-consent" || gateState === "write-error";
    const statusText =
        gateState === "checking"
            ? "Checking account status…"
            : gateState === "submitting"
              ? "Submitting consent…"
              : gateState === "verifying"
                ? "Checking account status…"
                : gateState === "read-error"
                  ? "Could not check account status. Retry to continue."
                  : gateState === "write-error"
                    ? "Could not submit consent. Please try again."
                    : gateState === "accepted-error"
                      ? "Consent submitted. Check account status to continue."
                      : gateState === "return-error"
                        ? "Consent confirmed. Continue to open the app."
                        : null;

    return (
        <KeyboardAwareScrollView
            keyboardShouldPersistTaps="handled"
            style={[styles.screen, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.content}>
            <View style={styles.page}>
                <DefaultHeader titlePrefix="Senswave" variant="brand" onBack={cancel} />
                <View style={styles.body}>
                    <Text accessibilityRole="header" size="large" color="onBackground" bold>
                        Review and accept
                    </Text>
                    <Text size="medium" color="onBackground" numberOfLines={0}>
                        Before continuing, please review and accept our Terms of Service and Privacy
                        Policy.
                    </Text>
                    <View style={styles.legalLinks}>
                        <Pressable
                            accessibilityRole="link"
                            accessibilityLabel="Terms of Service"
                            onPress={() => router.push("/terms")}
                            style={styles.legalLink}>
                            <Text size="medium" color="onBackground" style={styles.underlined}>
                                Terms of Service
                            </Text>
                        </Pressable>
                        <Pressable
                            accessibilityRole="link"
                            accessibilityLabel="Privacy Policy"
                            onPress={() => router.push("/privacy")}
                            style={styles.legalLink}>
                            <Text size="medium" color="onBackground" style={styles.underlined}>
                                Privacy Policy
                            </Text>
                        </Pressable>
                    </View>
                    <Text size="medium" color="onBackground" numberOfLines={0}>
                        By tapping Accept, you confirm that you have read and agree to our Terms of
                        Service and Privacy Policy.
                    </Text>
                    <Text size="medium" color="onBackground" numberOfLines={0}>
                        You can tap Cancel if you do not wish to continue.
                    </Text>
                    {statusText && (
                        <Text
                            accessibilityLiveRegion="polite"
                            size="small"
                            numberOfLines={0}
                            color={
                                gateState === "read-error" || gateState === "write-error"
                                    ? "error"
                                    : "onBackground"
                            }>
                            {statusText}
                        </Text>
                    )}
                    {gateState === "read-error" || gateState === "accepted-error" ? (
                        <Button
                            name="Retry account check"
                            type="brand-outline"
                            loading={false}
                            disabled={isBusy}
                            onPress={retryAccountCheck}
                        />
                    ) : null}
                    {gateState === "return-error" ? (
                        <Button
                            name="Continue"
                            type="auth"
                            loading={false}
                            disabled={false}
                            onPress={continueToApp}
                        />
                    ) : null}
                </View>
                <View style={styles.actions}>
                    <Button
                        name="Accept"
                        type="auth"
                        loading={gateState === "submitting"}
                        disabled={!canAccept || isBusy || !!acceptedIdentity.current}
                        onPress={accept}
                    />
                    <Button name="Cancel" type="brand-outline" loading={false} onPress={cancel} />
                </View>
            </View>
        </KeyboardAwareScrollView>
    );
};

export default ConsentsPage;

const styles = StyleSheet.create({
    screen: { flex: 1 },
    content: {
        flexGrow: 1,
        width: "100%",
        maxWidth: 448,
        alignSelf: "center",
        padding: 24,
    },
    page: { flex: 1 },
    body: { gap: 16, paddingTop: 16 },
    legalLinks: { gap: 4 },
    legalLink: { minHeight: 48, justifyContent: "center", alignSelf: "flex-start" },
    underlined: { textDecorationLine: "underline" },
    actions: { gap: 12, marginTop: "auto", paddingTop: 32 },
});
