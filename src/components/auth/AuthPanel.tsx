import React, { FC, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Image, StyleSheet, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { ArrowLeft, CircleAlert, Info, Mail } from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeProvider";
import { keyboardOffset } from "@/styles/defaultStyles";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import PasswordInput from "@/components/common/PasswordInput";
import { Button as ReusableButton } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    type RegistrationErrors,
    validateEmail,
    validateLogin,
    validateRegistration,
    validateServerUrl,
} from "@/utils/authValidation";
import type { AuthDestination, AuthPanelProps } from "./authTypes";

const logo = require("@/assets/icon.png");

const AuthPanel: FC<AuthPanelProps> = ({
    screen,
    rememberMe,
    isDevelopment,
    serverUrl,
    onLogin,
    onRegister,
    onForgotPassword,
    onServerChange,
    onResendConfirmation,
    onRememberMeChange,
    onGoogleLogin,
    onNavigate,
}) => {
    const { colors } = useTheme().current;
    const isRegister = screen === "register";
    const isForgot = screen === "forgotPassword";
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [consentGiven, setConsentGiven] = useState(false);
    const [errors, setErrors] = useState<RegistrationErrors>({});
    const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
    const [registered, setRegistered] = useState(false);
    const [url, setUrl] = useState(serverUrl);
    const [urlError, setUrlError] = useState<string>();
    const [pending, setPending] = useState<string | null>(null);
    const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
    const actionInFlight = useRef(false);
    const emailInput = useRef<TextInput>(null);
    const passwordInput = useRef<TextInput>(null);
    const confirmPasswordInput = useRef<TextInput>(null);
    const serverInput = useRef<TextInput>(null);

    useEffect(() => setUrl(serverUrl), [serverUrl]);

    const runAction = async (name: string, action: () => Promise<void>) => {
        if (actionInFlight.current) return;
        actionInFlight.current = true;
        if (name !== "remember" && name !== "navigate") setPending(name);
        setNotice(null);
        try {
            await action();
        } catch {
            const text = "Something went wrong. Please try again.";
            setNotice({ text, error: true });
            AccessibilityInfo.announceForAccessibility(text);
        } finally {
            actionInFlight.current = false;
            setPending(null);
        }
    };

    const navigate = (destination: AuthDestination) =>
        runAction("navigate", () => onNavigate(destination));

    const submitForm = async () => {
        if (actionInFlight.current) return;
        const nextErrors: RegistrationErrors = isRegister
            ? validateRegistration(email, password, confirmPassword, consentGiven)
            : isForgot
              ? { email: validateEmail(email) }
              : validateLogin(email, password);
        setErrors(nextErrors);
        const firstError = Object.values(nextErrors).find(Boolean);
        if (firstError) {
            AccessibilityInfo.announceForAccessibility(firstError);
            const field = nextErrors.email
                ? emailInput
                : nextErrors.password
                  ? passwordInput
                  : nextErrors.confirmPassword
                    ? confirmPasswordInput
                    : undefined;
            field?.current?.focus();
            return;
        }
        await runAction("submit", async () => {
            const result = isRegister
                ? await onRegister(email.trim(), password, confirmPassword, consentGiven)
                : isForgot
                  ? await onForgotPassword(email.trim())
                  : await onLogin(email.trim(), password);
            setNeedsEmailConfirmation(result.needsEmailConfirmation ?? false);
            if (result.error) {
                setNotice({ text: result.error, error: true });
                AccessibilityInfo.announceForAccessibility(result.error);
            } else if (isRegister) {
                setPassword("");
                setConfirmPassword("");
                setRegistered(true);
                AccessibilityInfo.announceForAccessibility(
                    "Verify your email. Check your inbox and spam folder.",
                );
            }
        });
    };

    const resendConfirmation = async () => {
        const error = validateEmail(email);
        if (error) {
            setErrors((current) => ({ ...current, email: error }));
            emailInput.current?.focus();
            return;
        }
        await runAction("resend", async () => {
            const result = await onResendConfirmation(email.trim());
            setNotice({
                text: result.error || "Confirmation email sent. Check your inbox and spam folder.",
                error: !!result.error,
            });
        });
    };

    const changeServer = async (reset: boolean) => {
        if (!isDevelopment || actionInFlight.current) return;
        const error = reset ? undefined : validateServerUrl(url);
        setUrlError(error);
        if (error) {
            AccessibilityInfo.announceForAccessibility(error);
            serverInput.current?.focus();
            return;
        }
        await runAction(reset ? "reset" : "submit", async () => {
            const result = await onServerChange(reset ? null : url.trim());
            setNotice({
                text:
                    result.error || (reset ? "Default server restored." : "Server address saved."),
                error: !!result.error,
            });
        });
    };

    const liveNotice = notice && (
        <Alert
            icon={notice.error ? CircleAlert : Info}
            variant={notice.error ? "destructive" : "default"}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite">
            <AlertDescription>{notice.text}</AlertDescription>
        </Alert>
    );
    const title = registered
        ? "Verify your email"
        : isRegister
          ? "Create account"
          : isForgot
            ? "Forgot password?"
            : screen === "server"
              ? "Choose server"
              : "Sign in";
    const description = isRegister
        ? "Create your account to get started."
        : isForgot
          ? "Enter your email and we’ll send you a code to reset your password."
          : screen === "server"
            ? "Connect the app to your Senswave server."
            : "Enter your email and password to access your account.";

    const introduction = (
        <View style={styles.intro}>
            {registered && (
                <Mail accessible={false} size={32} color={colors.authMuted} style={styles.mail} />
            )}
            <Text
                accessibilityRole="header"
                style={[styles.title, { color: colors.authForeground }]}>
                {title}
            </Text>
            <Text style={[styles.description, { color: colors.authMuted }]}>
                {registered ? (
                    <>
                        We’ve sent a verification link to{" "}
                        <Text style={{ fontWeight: "500", color: colors.authForeground }}>
                            {email.trim()}
                        </Text>
                        . Check your inbox and spam folder before signing in.
                    </>
                ) : (
                    description
                )}
            </Text>
        </View>
    );

    const link = (label: string, destination: AuthDestination) => (
        <ReusableButton
            variant="link"
            disabled={!!pending}
            onPress={() => void navigate(destination)}
            accessibilityLabel={label}
            className="h-auto min-h-12 min-w-12 px-0 py-2">
            <Text style={[styles.link, { color: colors.authForeground }]}>{label}</Text>
        </ReusableButton>
    );

    return (
        <KeyboardAwareScrollView
            bottomOffset={keyboardOffset}
            keyboardShouldPersistTaps="handled"
            style={[styles.screen, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.content}>
            <View style={styles.header}>
                {screen !== "start" && (
                    <ReusableButton
                        variant="ghost"
                        size="icon"
                        accessibilityLabel="Go back"
                        disabled={!!pending}
                        onPress={() => void navigate("back")}
                        className="h-auto min-h-12 w-12 p-0"
                        style={styles.back}>
                        <ArrowLeft accessible={false} size={16} color={colors.authForeground} />
                    </ReusableButton>
                )}
                <Text style={[styles.brand, { color: colors.authForeground }]}>Senswave</Text>
            </View>
            {screen === "start" ? (
                <>
                    <View style={styles.welcome}>
                        <Image source={logo} accessible={false} style={styles.logo} />
                        <View style={styles.intro}>
                            <Text
                                accessibilityRole="header"
                                style={[styles.welcomeTitle, { color: colors.authForeground }]}>
                                Your home, connected.
                            </Text>
                            <Text style={[styles.description, { color: colors.authMuted }]}>
                                Manage your devices, rooms and automations in one place.
                            </Text>
                        </View>
                        {liveNotice}
                    </View>
                    <View style={styles.actions}>
                        <Button
                            name="Sign in"
                            type="auth"
                            loading={false}
                            disabled={!!pending}
                            onPress={() => void navigate("login")}
                        />
                        <Button
                            name="Create account"
                            type="brand-outline"
                            loading={false}
                            disabled={!!pending}
                            onPress={() => void navigate("register")}
                        />
                        {isDevelopment && (
                            <Button
                                name="Choose server"
                                type="brand-ghost"
                                loading={false}
                                disabled={!!pending}
                                onPress={() => void navigate("server")}
                            />
                        )}
                    </View>
                </>
            ) : (
                <View style={styles.form}>
                    {introduction}
                    {registered ? (
                        <View style={styles.bottomActions}>
                            {liveNotice}
                            <Button
                                name="Go to sign in"
                                type="auth"
                                loading={false}
                                disabled={!!pending}
                                onPress={() => void navigate("login")}
                            />
                        </View>
                    ) : screen === "server" ? (
                        isDevelopment ? (
                            <>
                                <Input
                                    title="Server URL"
                                    value={url}
                                    setValue={(value) => {
                                        setUrl(value);
                                        setNotice(null);
                                        setUrlError(undefined);
                                    }}
                                    error={urlError ?? ""}
                                    placeholder="https://your-server.example.com"
                                    variant="auth"
                                    editable={!pending}
                                    inputRef={serverInput}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    keyboardType="url"
                                    autoComplete="url"
                                    returnKeyType="go"
                                    onSubmitEditing={() => changeServer(false)}
                                />
                                <View style={styles.bottomActions}>
                                    {liveNotice}
                                    <Button
                                        name="Save server"
                                        type="auth"
                                        loading={pending === "submit"}
                                        disabled={!!pending}
                                        onPress={() => changeServer(false)}
                                    />
                                    <Button
                                        name="Use default server"
                                        type="brand-outline"
                                        loading={pending === "reset"}
                                        disabled={!!pending}
                                        onPress={() => changeServer(true)}
                                    />
                                </View>
                            </>
                        ) : (
                            <Text style={{ color: colors.authMuted }}>
                                Server selection is unavailable.
                            </Text>
                        )
                    ) : (
                        <>
                            <View style={styles.fields}>
                                <Input
                                    title="Email"
                                    value={email}
                                    setValue={(value) => {
                                        setEmail(value);
                                        setNotice(null);
                                        setNeedsEmailConfirmation(false);
                                        setErrors((current) => ({ ...current, email: undefined }));
                                    }}
                                    error={errors.email ?? ""}
                                    placeholder="you@example.com"
                                    variant="auth"
                                    editable={!pending}
                                    inputRef={emailInput}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    autoComplete={isRegister || isForgot ? "email" : "username"}
                                    returnKeyType={isForgot ? "go" : "next"}
                                    submitBehavior={isForgot ? "blurAndSubmit" : "submit"}
                                    onSubmitEditing={() =>
                                        isForgot ? submitForm() : passwordInput.current?.focus()
                                    }
                                />
                                {!isForgot &&
                                    (isRegister
                                        ? (["password", "confirmPassword"] as const)
                                        : (["password"] as const)
                                    ).map((name) => (
                                        <View key={name} style={styles.passwordField}>
                                            <PasswordInput
                                                title={
                                                    name === "password"
                                                        ? "Password"
                                                        : "Confirm password"
                                                }
                                                value={
                                                    name === "password" ? password : confirmPassword
                                                }
                                                setValue={(value) => {
                                                    if (name === "password") setPassword(value);
                                                    else setConfirmPassword(value);
                                                    setNotice(null);
                                                    setErrors((current) => ({
                                                        ...current,
                                                        [name]: undefined,
                                                    }));
                                                }}
                                                error={errors[name] ?? ""}
                                                placeholder={
                                                    name === "confirmPassword"
                                                        ? "Repeat your password"
                                                        : isRegister
                                                          ? "Create a password"
                                                          : "Enter your password"
                                                }
                                                variant="auth"
                                                editable={!pending}
                                                inputRef={
                                                    name === "password"
                                                        ? passwordInput
                                                        : confirmPasswordInput
                                                }
                                                autoComplete={
                                                    isRegister ? "new-password" : "current-password"
                                                }
                                                returnKeyType={
                                                    isRegister && name === "password"
                                                        ? "next"
                                                        : "go"
                                                }
                                                submitBehavior={
                                                    isRegister && name === "password"
                                                        ? "submit"
                                                        : "blurAndSubmit"
                                                }
                                                onSubmitEditing={() =>
                                                    isRegister && name === "password"
                                                        ? confirmPasswordInput.current?.focus()
                                                        : submitForm()
                                                }
                                                accessibilityHint={
                                                    errors[name] ||
                                                    (isRegister && name === "password"
                                                        ? "10–64 characters, with uppercase, lowercase, a number and a special character."
                                                        : undefined)
                                                }
                                            />
                                            {isRegister && name === "password" && (
                                                <Text
                                                    style={[
                                                        styles.small,
                                                        { color: colors.authMuted },
                                                    ]}>
                                                    10–64 characters, with uppercase, lowercase, a
                                                    number and a special character.
                                                </Text>
                                            )}
                                        </View>
                                    ))}
                            </View>
                            {isRegister ? (
                                <View style={styles.consent}>
                                    <Checkbox
                                        accessibilityLabel="I agree to the Terms of Service and Privacy Policy."
                                        accessibilityHint={errors.consent}
                                        checked={consentGiven}
                                        disabled={!!pending}
                                        hitSlop={16}
                                        className={
                                            consentGiven
                                                ? "mt-4 border-primary"
                                                : "mt-4 border-border"
                                        }
                                        onCheckedChange={(checked) => {
                                            setConsentGiven(checked);
                                            setErrors((current) => ({
                                                ...current,
                                                consent: undefined,
                                            }));
                                        }}
                                    />
                                    <View style={styles.consentText}>
                                        <Label
                                            disabled={!!pending}
                                            onPress={() => {
                                                setConsentGiven((current) => !current);
                                                setErrors((current) => ({
                                                    ...current,
                                                    consent: undefined,
                                                }));
                                            }}
                                            style={[
                                                styles.consentLabel,
                                                { color: colors.authForeground },
                                            ]}>
                                            I agree to the Terms of Service and Privacy Policy.
                                        </Label>
                                        <View style={styles.legalLinks}>
                                            {link("Terms of Service", "terms")}
                                            {link("Privacy Policy", "privacy")}
                                        </View>
                                        {!!errors.consent && (
                                            <Text
                                                accessibilityRole="alert"
                                                accessibilityLiveRegion="polite"
                                                style={[styles.small, { color: colors.error }]}>
                                                {errors.consent}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            ) : (
                                !isForgot && (
                                    <View style={styles.loginOptions}>
                                        <View style={styles.remember}>
                                            <Checkbox
                                                accessibilityLabel="Remember me"
                                                checked={rememberMe}
                                                disabled={!!pending}
                                                hitSlop={16}
                                                className={
                                                    rememberMe ? "border-primary" : "border-border"
                                                }
                                                onCheckedChange={() =>
                                                    void runAction("remember", onRememberMeChange)
                                                }
                                            />
                                            <Label
                                                disabled={!!pending}
                                                onPress={() =>
                                                    void runAction("remember", onRememberMeChange)
                                                }
                                                style={[
                                                    styles.checkboxLabel,
                                                    { color: colors.authForeground },
                                                ]}>
                                                Remember me
                                            </Label>
                                        </View>
                                        {link("Forgot password?", "forgotPassword")}
                                    </View>
                                )
                            )}
                            <View style={styles.bottomActions}>
                                {liveNotice}
                                <Button
                                    name={
                                        isRegister
                                            ? "Create account"
                                            : isForgot
                                              ? "Send reset code"
                                              : "Sign in"
                                    }
                                    type="auth"
                                    loading={pending === "submit"}
                                    disabled={!!pending}
                                    onPress={submitForm}
                                />
                                {needsEmailConfirmation && (
                                    <Button
                                        name="Resend confirmation email"
                                        type="brand-outline"
                                        loading={pending === "resend"}
                                        disabled={!!pending}
                                        onPress={resendConfirmation}
                                    />
                                )}
                                {!isForgot && (
                                    <Button
                                        name="Continue with Google"
                                        type="brand-outline"
                                        loading={pending === "google"}
                                        disabled={!!pending}
                                        onPress={() =>
                                            void runAction("google", async () => {
                                                const result = await onGoogleLogin();
                                                if (result.error) {
                                                    setNotice({ text: result.error, error: true });
                                                    AccessibilityInfo.announceForAccessibility(
                                                        result.error,
                                                    );
                                                }
                                            })
                                        }
                                    />
                                )}
                                <View style={styles.footer}>
                                    {!isForgot && (
                                        <Text style={[styles.small, { color: colors.authMuted }]}>
                                            {isRegister
                                                ? "Already have an account?"
                                                : "Don’t have an account?"}
                                        </Text>
                                    )}
                                    {link(
                                        isForgot
                                            ? "Back to sign in"
                                            : isRegister
                                              ? "Sign in"
                                              : "Sign up",
                                        isRegister || isForgot ? "login" : "register",
                                    )}
                                </View>
                            </View>
                        </>
                    )}
                </View>
            )}
        </KeyboardAwareScrollView>
    );
};

export default AuthPanel;

const styles = StyleSheet.create({
    screen: { flex: 1 },
    content: {
        flexGrow: 1,
        width: "100%",
        maxWidth: 448,
        alignSelf: "center",
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 16,
    },
    // The keyboard scroll view appends a spacer; keep section gaps on visible children.
    header: {
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 32,
    },
    back: { marginLeft: -8 },
    brand: { fontSize: 18, fontWeight: "600", letterSpacing: -0.45 },
    welcome: {
        flexGrow: 1,
        justifyContent: "center",
        gap: 24,
        paddingVertical: 40,
        marginBottom: 32,
    },
    logo: { width: 96, height: 96, borderRadius: 24 },
    welcomeTitle: { fontSize: 36, lineHeight: 40, fontWeight: "600", letterSpacing: -0.9 },
    intro: { gap: 12 },
    title: { fontSize: 30, lineHeight: 36, fontWeight: "600", letterSpacing: -0.75 },
    description: { fontSize: 16, lineHeight: 26 },
    mail: { marginBottom: 8 },
    form: { flexGrow: 1, gap: 32 },
    fields: { gap: 24 },
    passwordField: { gap: 12 },
    actions: { gap: 12 },
    bottomActions: { marginTop: "auto", paddingTop: 8, gap: 12 },
    small: { fontSize: 14, lineHeight: 20 },
    link: { fontSize: 14, fontWeight: "500", textDecorationLine: "underline", flexShrink: 1 },
    loginOptions: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        columnGap: 16,
        rowGap: 4,
    },
    remember: { flexDirection: "row", alignItems: "center", gap: 12 },
    checkboxLabel: { minHeight: 48, paddingVertical: 14, fontSize: 14 },
    consent: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    consentText: { flex: 1, minWidth: 0 },
    consentLabel: { minHeight: 48, paddingVertical: 12, fontSize: 14, lineHeight: 22 },
    legalLinks: { flexDirection: "row", flexWrap: "wrap", columnGap: 16 },
    footer: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        columnGap: 4,
    },
});
