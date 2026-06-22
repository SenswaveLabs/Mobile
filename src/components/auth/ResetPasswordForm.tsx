import React, { FC, useEffect, useState } from "react";
import Button from "../common/Button";
import Input from "../common/Input";
import PasswordInput from "../common/PasswordInput";
import { useToast } from "@/contexts/ToastProvider";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { keyboardOffset } from "@/styles/defaultStyles";

interface ResetPasswordFormProps {
    submitClicked: (password: string, resetCode: string) => void;
}

const ResetPasswordForm: FC<ResetPasswordFormProps> = ({ submitClicked }) => {
    const toast = useToast();

    const [resetCode, setResetCode] = useState("");
    const [resetCodeError, setResetCodeError] = useState("");
    const [password, setPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [confirmPasswordError, setConfirmPasswordError] = useState("");

    const [loading, setLoading] = useState(false);

    const validateForm = (): boolean => {
        let isValid = true;

        if (resetCode === "") {
            isValid = false;
        } else if (resetCode.length > 512) {
            setResetCodeError("Reset code is too long");
            isValid = false;
        } else {
            setResetCodeError("");
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

        setLoading(true);

        await submitClicked(password, resetCode);

        setLoading(false);
    };

    useEffect(() => {
        validateForm();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [password, confirmPassword, resetCode]);

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
                value={resetCode}
                setValue={setResetCode}
                error={resetCodeError}
                title="Reset Code"
                placeholder="Paste code from your email"
            />

            <PasswordInput
                value={password}
                setValue={setPassword}
                error={passwordError}
                title="Password"
                placeholder="New password"
            />

            <PasswordInput
                value={confirmPassword}
                setValue={setConfirmPassword}
                error={confirmPasswordError}
                title="Confirm Password"
                placeholder="Repeat new password"
            />

            <Button
                style={{ marginTop: 10 }}
                name="Reset Password"
                type="alternative"
                onPress={onSubmit}
                loading={loading}
            />
        </KeyboardAwareScrollView>
    );
};

export default ResetPasswordForm;
