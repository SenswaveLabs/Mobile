import React, { FC, useEffect, useState } from "react";
import { View } from "react-native";
import Input from "../common/Input";
import PasswordInput from "../common/PasswordInput";
import Button from "../common/Button";
import { useToast } from "@/contexts/ToastProvider";
import Text from "@/components/common/Text";
import { Text as RNText } from "react-native";
import { useTheme } from "@/contexts/ThemeProvider";
import { useRouter } from "expo-router";
import { Switch } from "../common/Switch";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { keyboardOffset } from "@/styles/defaultStyles";
import JoinWith from "./JoinWith";

interface RegisterFormProps {
    submitClicked: (email: string, password: string) => Promise<void>;
}

const RegisterForm: FC<RegisterFormProps> = ({ submitClicked }) => {
    const toast = useToast();
    const theme = useTheme();
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState("");
    const [password, setPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [confirmPasswordError, setConfirmPasswordError] = useState("");
    const [consentGiven, setConsentGiven] = useState(false);

    const [loading, setLoading] = useState(false);

    const validateForm = (): boolean => {
        let isValid = true;

        if (email === "") {
            isValid = false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && !emailRegex.test(email)) {
            setEmailError("Email is not valid");
            isValid = false;
        } else {
            setEmailError("");
        }

        if (password === "") {
            isValid = false;
        } else if (password.length < 10) {
            setPasswordError("Password must be at least 10 characters");
            isValid = false;
        } else if (password.length > 64) {
            setPasswordError("Too long password");
            isValid = false;
        } else if (!/[a-z]/.test(password)) {
            setPasswordError("Password must contain a lowercase letter");
            isValid = false;
        } else if (!/[A-Z]/.test(password)) {
            setPasswordError("Password must contain an uppercase letter");
            isValid = false;
        } else if (!/[0-9]/.test(password)) {
            setPasswordError("Password must contain a digit");
            isValid = false;
        } else if (!/[^A-Za-z0-9]/.test(password)) {
            setPasswordError("Password must contain a special character");
            isValid = false;
        } else {
            setPasswordError("");
        }

        if (confirmPassword === "") {
            isValid = false;
        } else if (confirmPassword !== password) {
            setConfirmPasswordError("Passwords do not match");
            isValid = false;
        } else {
            setConfirmPasswordError("");
        }

        if (!isValid) {
            return false;
        }

        return true;
    };

    const onSubmit = async () => {
        if (!validateForm()) {
            toast.error("Some fields are not valid!");
            return;
        }

        if (!consentGiven) {
            toast.error("Please agree to the terms and conditions and to privacy policy.");
            return;
        }

        setLoading(true);

        await submitClicked(email, password);

        setLoading(false);
    };

    useEffect(() => {
        validateForm();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [email, password, confirmPassword]);

    return (
        <KeyboardAwareScrollView
            bottomOffset={keyboardOffset}
            style={{
                width: "100%",
                padding: 0,
                margin: 0,
                marginTop: 10,
            }}
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
                placeholder="Create a password"
            />

            <PasswordInput
                error={confirmPasswordError}
                value={confirmPassword}
                setValue={setConfirmPassword}
                title="Confirm Password"
                placeholder="Repeat your password"
            />

            <View
                style={{
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    paddingVertical: 8,
                }}>
                <View style={{ paddingRight: 16 }}>
                    <Switch
                        value={{ value: consentGiven }}
                        onPress={() => {
                            setConsentGiven(!consentGiven);
                        }}
                        orientation={"horizontal"}
                        style={{ height: 26, width: 50 }}
                    />
                </View>

                <View style={{ flex: 1 }}>
                    <Text size={"medium"} color={"onBackground"} style={{}}>
                        I have read and agree to the{" "}
                        <RNText
                            style={{
                                color: theme.current.colors.complementary,
                                textDecorationLine: "underline",
                            }}
                            onPress={() => router.push("terms")}>
                            Terms of Service
                        </RNText>{" "}
                        and{" "}
                        <RNText
                            style={{
                                color: theme.current.colors.complementary,
                                textDecorationLine: "underline",
                            }}
                            onPress={() => router.push("privacy")}>
                            Privacy Policy
                        </RNText>
                        .
                    </Text>
                </View>
            </View>

            <Button
                style={{ marginTop: 10 }}
                name="Register"
                type="alternative"
                onPress={onSubmit}
                loading={loading}
            />

            <JoinWith />
        </KeyboardAwareScrollView>
    );
};

export default RegisterForm;
