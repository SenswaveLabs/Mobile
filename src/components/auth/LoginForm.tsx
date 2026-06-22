import React from "react";
import { FC, useEffect, useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { useSession } from "@/contexts/SessionProvider";
import Input from "../common/Input";
import PasswordInput from "../common/PasswordInput";
import Button from "../common/Button";
import { useRouter } from "expo-router";
import { useToast } from "@/contexts/ToastProvider";
import { Switch } from "../common/Switch";
import Text from "../common/Text";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { keyboardOffset } from "@/styles/defaultStyles";
import JoinWith from "./JoinWith";

export const LoginForm: FC = () => {
    const session = useSession();
    const router = useRouter();
    const toasts = useToast();

    const [confirmEmailButton, setConfirmEmailButton] = useState(false);
    const [confirmEmailButtonLoading, setConfirmEmailButtonLoading] = useState(false);
    const [lastEmailSentAt, setLastEmailSentAt] = useState<Date | null>(null);

    const [loading, setLoading] = useState(false);

    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState("");

    const [password, setPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");

    const loginClicked = async () => {
        setLoading(true);

        if (!validateForm()) {
            console.info("[Login Form] Form is not valid.");
            toasts.error("Please fill in all required fields.");
            setLoading(false);
            return;
        }

        const result = await session.login(email, password);

        if (!result.isSuccess) {
            toasts.error(result.errorMessage || "Unexpected fail during login.");

            setConfirmEmailButton(result.data ?? true);
        }

        setLoading(false);
    };

    const forgotClicked = () => {
        console.debug("[Login Form] Forgot password clicked.");

        router.push({ pathname: "forgotPassword" });
    };

    const resendConfirmEmailClicked = async () => {
        console.debug("[Loading Form] Resend confirmation email.");

        const now = new Date();

        if (lastEmailSentAt && now.getTime() - lastEmailSentAt.getTime() < 60000) {
            const secondsLeft = Math.ceil(
                (60000 - (now.getTime() - lastEmailSentAt.getTime())) / 1000,
            );
            toasts.error(`Please wait ${secondsLeft}s before resending.`);
            return;
        }

        setConfirmEmailButtonLoading(true);

        if (!validateEmail()) {
            console.info("[Login Form] Form is not valid.");
            toasts.error("Please provide valid email.");
            setConfirmEmailButtonLoading(false);
            return;
        }

        const result = await session.resendEmailConfirmationMessage(email);

        if (result.isSuccess) {
            toasts.success("Confirm email resend, check your mail.");
            setLastEmailSentAt(now);
        } else {
            toasts.error(result.errorMessage!);
        }

        setConfirmEmailButtonLoading(false);
    };

    useEffect(() => {
        validateForm();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [email, password]);

    const validateForm = (): boolean => {
        if (password === "") {
            setPasswordError("");
            return false;
        }

        const isEmailValid = validateEmail();

        if (!isEmailValid) return false;

        if (!password) {
            setPasswordError("Password is required.");
            return false;
        }

        if (password.length > 64) {
            setPasswordError("Too long password.");
            return false;
        }

        setPasswordError("");

        return true;
    };

    const validateEmail = (): boolean => {
        if (email === "") {
            setEmailError("");
            return false;
        }

        if (!email) {
            setEmailError("Email is required.");
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            setEmailError("Email is not valid.");
            return false;
        }

        setEmailError("");

        return true;
    };

    return (
        <KeyboardAwareScrollView
            bottomOffset={keyboardOffset}
            style={styles.container}
            contentContainerStyle={{ paddingHorizontal: 5 }}>
            <Input
                error={emailError}
                value={email}
                setValue={setEmail}
                title="Email"
                placeholder="you@example.com"
                trim={true}
            />

            <PasswordInput
                error={passwordError}
                value={password}
                setValue={setPassword}
                title="Password"
                placeholder="Enter your password"
            />

            <View style={styles.textContainer}>
                <View
                    style={{
                        width: "50%",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                    }}>
                    <Switch
                        value={{ value: session.rememberMe }}
                        onPress={session.toogleRememberMe}
                        orientation={"horizontal"}
                        style={{ height: 26, width: 50 }}
                    />

                    <Text size="small" color="onBackground">
                        Remember me
                    </Text>
                </View>

                <View
                    style={{
                        width: "50%",
                        alignItems: "flex-end",
                        justifyContent: "center",
                    }}>
                    <TouchableOpacity
                        style={{
                            alignItems: "center",
                        }}
                        onPress={forgotClicked}>
                        <Text bold={true} size={"small"} color={"onBackground"}>
                            Forgot Password?
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <Button
                name="Login"
                type="alternative"
                onPress={loginClicked}
                loading={loading}
                style={{ marginBottom: 15 }}
            />

            {confirmEmailButton && (
                <Button
                    name="Resend Email Confirmation Message"
                    loading={confirmEmailButtonLoading}
                    onPress={resendConfirmEmailClicked}
                />
            )}

            {confirmEmailButton && (
                <View style={{ alignItems: "center", marginTop: 5 }}>
                    <Text size={"small"} color={"error"}>
                        If you haven’t received the message, check your spam or junk folder.
                    </Text>
                </View>
            )}

            <JoinWith />
        </KeyboardAwareScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        padding: 0,
        margin: 0,
        marginTop: 10,
    },
    textContainer: {
        flexDirection: "row",
        paddingTop: 5,
        paddingBottom: 10,
    },
    forgotPassword: {
        textAlign: "center",

        width: "100%",
    },
    rememberMe: {
        marginTop: 8,
        marginBottom: 8,
    },
});
