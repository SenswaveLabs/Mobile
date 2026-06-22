import React, { FC, useEffect, useState } from "react";
import { useToast } from "@/contexts/ToastProvider";
import Input from "../common/Input";
import Button from "../common/Button";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { keyboardOffset } from "@/styles/defaultStyles";

interface ForgotPasswordFormProps {
    submitClicked: (email: string) => Promise<void>;
    loading?: boolean;
}

const ForgotPasswordForm: FC<ForgotPasswordFormProps> = ({ submitClicked }) => {
    const toast = useToast();

    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState("");

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

        await submitClicked(email);

        setLoading(false);
    };

    useEffect(() => {
        validateForm();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [email]);

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
                value={email}
                setValue={setEmail}
                error={emailError}
                title="Email"
                placeholder="you@example.com"
            />

            <Button
                style={{ marginTop: 10 }}
                name="Send Email"
                onPress={onSubmit}
                type="alternative"
                loading={loading}
            />
        </KeyboardAwareScrollView>
    );
};

export default ForgotPasswordForm;
