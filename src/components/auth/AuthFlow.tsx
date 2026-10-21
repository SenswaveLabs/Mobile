import React, { createContext, FC, useContext } from "react";
import { useRouter } from "expo-router";
import { useSession } from "@/contexts/SessionProvider";
import { useConfiguration } from "@/contexts/ConfigurationProvider";
import { useGoogleSignIn } from "@/hooks/useGoogleSignIn";
import {
    validateEmail,
    validateLogin,
    validateRegistration,
    validateServerUrl,
} from "@/utils/authValidation";
import AuthPanel from "./AuthPanel";
import { AUTH_SCREENS, type AuthPanelProps, type AuthScreen } from "./authTypes";

interface AuthFlowProps {
    screen: AuthScreen;
}

export const ResendCooldownContext = createContext({ current: 0 });

export const AuthFlow: FC<AuthFlowProps> = ({ screen }) => {
    const session = useSession();
    const configuration = useConfiguration();
    const router = useRouter();
    const google = useGoogleSignIn();
    const lastEmailSentAt = useContext(ResendCooldownContext);

    const login: AuthPanelProps["onLogin"] = async (email, password) => {
        // Keep validation at the provider boundary as well as beside the fields.
        const errors = validateLogin(email, password);
        if (errors.email || errors.password) return { error: errors.email || errors.password };

        const result = await session.login(email.trim(), password);
        return result.isSuccess
            ? {}
            : {
                  error: result.errorMessage || "Unable to sign in. Please try again.",
                  needsEmailConfirmation: result.data ?? false,
              };
    };

    const register: AuthPanelProps["onRegister"] = async (
        email,
        password,
        confirmPassword,
        consentGiven,
    ) => {
        const error = Object.values(
            validateRegistration(email, password, confirmPassword, consentGiven),
        ).find(Boolean);
        if (error) return { error };

        const result = await session.register(email.trim(), password);
        return result.isSuccess
            ? {}
            : { error: result.errorMessage || "Unable to create account." };
    };

    const forgotPassword: AuthPanelProps["onForgotPassword"] = async (email) => {
        const error = validateEmail(email);
        if (error) return { error };

        const result = await session.forgotPassword(email.trim());
        if (!result.isSuccess) {
            return { error: result.errorMessage || "Unable to send the reset email." };
        }
        router.push({ pathname: "/resetPassword", params: { email: email.trim() } });
        return {};
    };

    const changeServer: AuthPanelProps["onServerChange"] = async (url) => {
        if (!configuration.isDevelopment()) return { error: "Server selection is unavailable." };
        if (url !== null) {
            const error = validateServerUrl(url);
            if (error) return { error };
        }
        configuration.overrideUrl(url === null ? "" : url.trim());
        return {};
    };

    const resendConfirmation: AuthPanelProps["onResendConfirmation"] = async (email) => {
        const error = validateEmail(email);
        if (error) return { error };

        const secondsLeft = Math.ceil((60000 - (Date.now() - lastEmailSentAt.current)) / 1000);
        if (secondsLeft > 0) return { error: `Please wait ${secondsLeft}s before resending.` };

        const result = await session.resendEmailConfirmationMessage(email.trim());
        if (!result.isSuccess) {
            return { error: result.errorMessage || "Unable to send the confirmation email." };
        }
        lastEmailSentAt.current = Date.now();
        return {};
    };

    const navigate: AuthPanelProps["onNavigate"] = async (destination) => {
        if (destination === "back") {
            if (router.canGoBack()) router.back();
            else router.replace("/start");
        } else if (destination === "server") {
            if (configuration.isDevelopment()) router.push("/server");
        } else if (
            AUTH_SCREENS.some((screen) => screen === destination) ||
            destination === "terms" ||
            destination === "privacy"
        ) {
            router.push(`/${destination}`);
        }
    };

    return (
        <AuthPanel
            key={screen}
            screen={screen}
            rememberMe={session.rememberMe}
            isDevelopment={configuration.isDevelopment()}
            serverUrl={configuration.getBaseUrl().toString()}
            onLogin={login}
            onRegister={register}
            onForgotPassword={forgotPassword}
            onServerChange={changeServer}
            onResendConfirmation={resendConfirmation}
            onRememberMeChange={session.toogleRememberMe}
            onGoogleLogin={async () => {
                const result = await google.signIn();
                return result.isSuccess
                    ? {}
                    : { error: result.errorMessage || "Google Sign-In error" };
            }}
            onNavigate={navigate}
        />
    );
};
