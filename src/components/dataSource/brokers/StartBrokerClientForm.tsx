import Button from "@/components/common/Button";
import FormSection from "@/components/common/FormSection";
import Input from "@/components/common/Input";
import PasswordInput from "@/components/common/PasswordInput";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Text } from "@/components/ui/text";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { keyboardOffset } from "@/styles/defaultStyles";
import { useFocusEffect, useRouter } from "expo-router";
import { CircleAlert, Info } from "lucide-react-native";
import React, { FC, useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import * as SecureStore from "expo-secure-store";

interface StartBrokerClientFormProps {
    brokerId: string;
}

type ActionFeedback = {
    message: string;
    variant: "default" | "destructive";
};

const credentialCacheKey = (brokerId: string) => `brokerClientCredentials-${brokerId}`;

const StartBrokerClientForm: FC<StartBrokerClientFormProps> = ({ brokerId }) => {
    const httpClient = useHttpClient();
    const router = useRouter();
    const homes = useHomes();
    const { colors } = useTheme().current;

    const [restoring, setRestoring] = useState(true);
    const [pending, setPending] = useState(false);
    const [username, setUsername] = useState("");
    const [usernameError, setUsernameError] = useState("");
    const [password, setPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [rememberCredentials, setRememberCredentials] = useState(false);
    const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);

    const usernameRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);
    const submitLock = useRef(false);
    const accepted = useRef(false);
    const returning = useRef(false);
    const announced = useRef(false);
    const focused = useRef(false);
    const homesRef = useRef(homes);
    homesRef.current = homes;

    const fieldsDisabled = restoring || accepted.current;
    const controlsDisabled = fieldsDisabled || pending;

    useEffect(() => {
        let active = true;
        const restoreCredentials = async () => {
            try {
                const stored = await SecureStore.getItemAsync(credentialCacheKey(brokerId));
                if (!active || stored === null) return;

                const credentials: unknown = JSON.parse(stored);
                if (
                    typeof credentials === "object" &&
                    credentials !== null &&
                    !Array.isArray(credentials) &&
                    "username" in credentials &&
                    "password" in credentials &&
                    typeof credentials.username === "string" &&
                    typeof credentials.password === "string"
                ) {
                    setUsername(credentials.username);
                    setPassword(credentials.password);
                    setRememberCredentials(true);
                } else {
                    setActionFeedback({
                        message: "Couldn't load saved credentials. Enter them again.",
                        variant: "destructive",
                    });
                }
            } catch {
                if (active) {
                    setActionFeedback({
                        message: "Couldn't load saved credentials. Enter them again.",
                        variant: "destructive",
                    });
                }
            } finally {
                if (active) setRestoring(false);
            }
        };

        void restoreCredentials();
        return () => {
            active = false;
        };
    }, [brokerId]);

    const returnToDetails = useCallback(() => {
        if (!focused.current || !accepted.current || returning.current) return;

        if (!announced.current) {
            announced.current = true;
            AccessibilityInfo.announceForAccessibility("Broker client started.");
        }

        returning.current = true;
        try {
            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace({ pathname: "/dataSource/details", params: { id: brokerId } });
            }
            setActionFeedback(null);
        } catch {
            returning.current = false;
            setActionFeedback({
                message:
                    "Broker client started. Return to the data source to check its connection.",
                variant: "default",
            });
        }
    }, [brokerId, router]);

    useFocusEffect(
        useCallback(() => {
            focused.current = true;
            if (accepted.current) returnToDetails();
            return () => {
                focused.current = false;
            };
        }, [returnToDetails]),
    );

    const changeUsername = (value: string) => {
        if (submitLock.current || accepted.current || restoring || !focused.current) return;
        setUsername(value);
        setUsernameError("");
        setActionFeedback(null);
    };

    const changePassword = (value: string) => {
        if (submitLock.current || accepted.current || restoring || !focused.current) return;
        setPassword(value);
        setPasswordError("");
        setActionFeedback(null);
    };

    const toggleRemember = () => {
        if (!controlsDisabled) setRememberCredentials((value) => !value);
    };

    const submitClicked = async () => {
        if (submitLock.current || accepted.current || restoring || !focused.current) return;

        submitLock.current = true;
        setPending(true);
        setActionFeedback(null);

        const nextUsernameError =
            username.trim().length === 0
                ? "Username is required."
                : username.length > 256
                  ? "Username must be 256 characters or fewer."
                  : "";
        const nextPasswordError =
            password.trim().length === 0
                ? "Password is required."
                : password.length > 256
                  ? "Password must be 256 characters or fewer."
                  : "";
        setUsernameError(nextUsernameError);
        setPasswordError(nextPasswordError);

        if (nextUsernameError || nextPasswordError) {
            if (nextUsernameError) usernameRef.current?.focus();
            else passwordRef.current?.focus();
            submitLock.current = false;
            setPending(false);
            return;
        }

        try {
            if (rememberCredentials) {
                await SecureStore.setItemAsync(
                    credentialCacheKey(brokerId),
                    JSON.stringify({ username, password }),
                );
            } else {
                await SecureStore.deleteItemAsync(credentialCacheKey(brokerId));
            }
        } catch {
            if (focused.current) {
                setActionFeedback({
                    message: "Couldn't update saved credentials on this device. Try again.",
                    variant: "destructive",
                });
            }
            submitLock.current = false;
            setPending(false);
            return;
        }

        try {
            const result = await httpClient.post(`v1/datasources/brokers/${brokerId}/clients`, {
                username,
                password,
            });
            if (!result.isSuccess) {
                if (focused.current) {
                    setActionFeedback({
                        message:
                            "Couldn't start the broker client. Check your credentials and connection, then try again.",
                        variant: "destructive",
                    });
                }
                return;
            }

            accepted.current = true;
            if (focused.current && homesRef.current.current?.dataSource?.id === brokerId) {
                try {
                    await homesRef.current.refreshCurrent();
                } catch {
                    // Start succeeded; a home refresh failure cannot undo it.
                }
            }
            returnToDetails();
        } catch {
            if (!accepted.current && focused.current) {
                setActionFeedback({
                    message:
                        "Couldn't start the broker client. Check your credentials and connection, then try again.",
                    variant: "destructive",
                });
            }
        } finally {
            submitLock.current = false;
            setPending(false);
        }
    };

    const returnAfterNavigationFailure = () => {
        if (focused.current && accepted.current) returnToDetails();
    };

    return (
        <KeyboardAwareScrollView
            bottomOffset={keyboardOffset}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            <View style={styles.content}>
                <FormSection
                    title="Start broker client"
                    helper="Enter your MQTT broker credentials to connect this data source."
                    actions={[
                        actionFeedback ? (
                            <Alert
                                key="feedback"
                                icon={actionFeedback.variant === "destructive" ? CircleAlert : Info}
                                variant={actionFeedback.variant}>
                                <AlertDescription>{actionFeedback.message}</AlertDescription>
                            </Alert>
                        ) : null,
                        actionFeedback?.variant === "default" ? (
                            <Button
                                key="return"
                                name="Return to data source"
                                type="brand-outline"
                                loading={false}
                                onPress={returnAfterNavigationFailure}
                                style={styles.actionButton}
                            />
                        ) : (
                            <Button
                                key="start"
                                name="Start broker client"
                                type="auth"
                                loading={pending}
                                disabled={controlsDisabled}
                                onPress={submitClicked}
                                style={styles.actionButton}
                            />
                        ),
                    ]}>
                    <Input
                        title="Username"
                        value={username}
                        setValue={changeUsername}
                        error={usernameError}
                        placeholder="Enter username"
                        variant="auth"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="username"
                        textContentType="username"
                        returnKeyType="next"
                        submitBehavior="submit"
                        maxLength={256}
                        editable={!fieldsDisabled}
                        accessibilityState={{ busy: pending }}
                        inputRef={usernameRef}
                        onSubmitEditing={() => passwordRef.current?.focus()}
                        trim={false}
                    />
                    <PasswordInput
                        title="Password"
                        value={password}
                        setValue={changePassword}
                        error={passwordError}
                        placeholder="Enter password"
                        variant="auth"
                        autoComplete="current-password"
                        textContentType="password"
                        returnKeyType="go"
                        submitBehavior="submit"
                        maxLength={256}
                        editable={!fieldsDisabled}
                        accessibilityState={{ busy: pending }}
                        inputRef={passwordRef}
                        onSubmitEditing={submitClicked}
                        trim={false}
                    />
                    <Pressable
                        style={styles.rememberRow}
                        onPress={toggleRemember}
                        disabled={controlsDisabled}
                        accessibilityRole="checkbox"
                        accessibilityLabel="Remember credentials on this device"
                        accessibilityState={{
                            checked: rememberCredentials,
                            disabled: controlsDisabled,
                        }}>
                        <View
                            style={styles.checkboxVisual}
                            accessible={false}
                            accessibilityElementsHidden
                            importantForAccessibility="no-hide-descendants"
                            pointerEvents="none">
                            <Checkbox
                                checked={rememberCredentials}
                                disabled={controlsDisabled}
                                onCheckedChange={(checked) => {
                                    if (!controlsDisabled) setRememberCredentials(checked);
                                }}
                                className={rememberCredentials ? "border-primary" : "border-border"}
                                accessible={false}
                                pointerEvents="none"
                            />
                        </View>
                        <View style={styles.rememberCopy}>
                            <Text style={[styles.rememberLabel, { color: colors.authForeground }]}>
                                Remember credentials on this device
                            </Text>
                            <Text style={[styles.rememberHelper, { color: colors.authMuted }]}>
                                Credentials aren't saved on the server. Remember them here for the
                                next connection.
                            </Text>
                        </View>
                    </Pressable>
                </FormSection>
            </View>
        </KeyboardAwareScrollView>
    );
};

export default StartBrokerClientForm;

const styles = StyleSheet.create({
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 16,
    },
    content: {
        width: "100%",
        maxWidth: 448,
        alignSelf: "center",
    },
    rememberRow: {
        minHeight: 48,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
    },
    checkboxVisual: { marginTop: 4 },
    rememberCopy: { flex: 1, gap: 4 },
    rememberLabel: { fontSize: 16, lineHeight: 24, fontWeight: "500" },
    rememberHelper: { fontSize: 14, lineHeight: 20 },
    actionButton: { width: "100%" },
});
