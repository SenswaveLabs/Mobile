import React, { FC, ReactNode, useRef, useState } from "react";
import { AccessibilityInfo, StyleSheet, Text as NativeText, TextInput, View } from "react-native";
import Button from "../common/Button";
import FormScreen from "../common/FormScreen";
import Input from "../common/Input";
import PasswordInput from "../common/PasswordInput";
import Text from "../common/Text";
import { validateResetPassword, ResetPasswordErrors } from "@/utils/authValidation";
import { SimpleResult } from "@/utils/result";
import { useTheme } from "@/contexts/ThemeProvider";

interface ResetPasswordFormProps {
    submitClicked: (password: string, resetCode: string) => Promise<SimpleResult>;
    onLoadingChange?: (loading: boolean) => void;
    header?: ReactNode;
    intro?: ReactNode;
}

const ResetPasswordForm: FC<ResetPasswordFormProps> = ({
    submitClicked,
    onLoadingChange,
    header,
    intro,
}) => {
    const { colors } = useTheme().current;
    const [resetCode, setResetCode] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [errors, setErrors] = useState<ResetPasswordErrors>({});
    const [submitError, setSubmitError] = useState("");
    const [loading, setLoading] = useState(false);
    const pending = useRef(false);
    const resetCodeInput = useRef<TextInput>(null);
    const passwordInput = useRef<TextInput>(null);
    const confirmPasswordInput = useRef<TextInput>(null);

    const onSubmit = async () => {
        if (pending.current) return;
        const nextErrors = validateResetPassword(password, confirmPassword, resetCode);
        setErrors(nextErrors);
        if (Object.values(nextErrors).some(Boolean)) {
            const firstError =
                nextErrors.resetCode || nextErrors.password || nextErrors.confirmPassword;
            AccessibilityInfo.announceForAccessibility(firstError!);
            (nextErrors.resetCode
                ? resetCodeInput
                : nextErrors.password
                  ? passwordInput
                  : confirmPasswordInput
            ).current?.focus();
            return;
        }

        pending.current = true;
        setLoading(true);
        onLoadingChange?.(true);
        setSubmitError("");
        try {
            const result = await submitClicked(password, resetCode.trim());
            if (!result.isSuccess) {
                const message =
                    result.errorMessage || "Couldn't reset your password. Please try again.";
                setSubmitError(message);
                AccessibilityInfo.announceForAccessibility(message);
            }
        } catch {
            const message = "Couldn't reset your password. Please try again.";
            setSubmitError(message);
            AccessibilityInfo.announceForAccessibility(message);
        } finally {
            pending.current = false;
            setLoading(false);
            onLoadingChange?.(false);
        }
    };

    return (
        <FormScreen
            header={header}
            actions={
                <Button name="Reset password" type="auth" onPress={onSubmit} loading={loading} />
            }>
            <View style={styles.form}>
                {intro}
                <View style={styles.fields}>
                    <Input
                        value={resetCode}
                        setValue={(value) => {
                            setResetCode(value);
                            setErrors((current) => ({ ...current, resetCode: undefined }));
                        }}
                        error={errors.resetCode ?? ""}
                        title="Reset code"
                        placeholder="Paste code from your email"
                        variant="auth"
                        editable={!loading}
                        inputRef={resetCodeInput}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="one-time-code"
                        returnKeyType="next"
                        onSubmitEditing={() => passwordInput.current?.focus()}
                    />
                    <View style={styles.passwordField}>
                        <PasswordInput
                            value={password}
                            setValue={(value) => {
                                setPassword(value);
                                setErrors((current) => ({ ...current, password: undefined }));
                            }}
                            error={errors.password ?? ""}
                            title="New password"
                            placeholder="Enter your new password"
                            variant="auth"
                            editable={!loading}
                            inputRef={passwordInput}
                            autoComplete="new-password"
                            returnKeyType="next"
                            onSubmitEditing={() => confirmPasswordInput.current?.focus()}
                        />
                        <NativeText style={[styles.hint, { color: colors.authMuted }]}>
                            Use 10–64 characters with uppercase, lowercase, a number and a special
                            character.
                        </NativeText>
                    </View>
                    <PasswordInput
                        value={confirmPassword}
                        setValue={(value) => {
                            setConfirmPassword(value);
                            setErrors((current) => ({ ...current, confirmPassword: undefined }));
                        }}
                        error={errors.confirmPassword ?? ""}
                        title="Confirm password"
                        placeholder="Repeat your new password"
                        variant="auth"
                        editable={!loading}
                        inputRef={confirmPasswordInput}
                        autoComplete="new-password"
                        returnKeyType="done"
                        onSubmitEditing={() => void onSubmit()}
                    />
                </View>
                {!!submitError && (
                    <Text
                        color="error"
                        numberOfLines={0}
                        accessibilityRole="alert"
                        accessibilityLiveRegion="polite">
                        {submitError}
                    </Text>
                )}
            </View>
        </FormScreen>
    );
};

export default ResetPasswordForm;

const styles = StyleSheet.create({
    form: { width: "100%", gap: 32 },
    fields: { gap: 24 },
    passwordField: { gap: 12 },
    hint: { fontSize: 14, lineHeight: 20 },
});
