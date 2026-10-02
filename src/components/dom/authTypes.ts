import type { DOMProps } from "expo/dom";

export const AUTH_SCREENS = ["start", "login", "register", "forgotPassword", "server"] as const;
export type AuthScreen = (typeof AUTH_SCREENS)[number];
export type AuthDestination = AuthScreen | "back" | "terms" | "privacy";

export const getAuthScreen = (pathname: string): AuthScreen | undefined =>
    AUTH_SCREENS.find((screen) => pathname === `/${screen}`);

export const isAuthSurface = (pathname: string): boolean =>
    getAuthScreen(pathname) !== undefined || pathname === "/resetPassword";

export interface AuthActionResult {
    error?: string;
    needsEmailConfirmation?: boolean;
}

export interface AuthPanelProps {
    dom?: DOMProps;
    screen: AuthScreen;
    theme: "light" | "dark";
    fontScale: number;
    keyboardVisible?: boolean;
    rememberMe: boolean;
    isDevelopment: boolean;
    serverUrl: string;
    onReady(): Promise<void>;
    onLogin(email: string, password: string): Promise<AuthActionResult>;
    onRegister(
        email: string,
        password: string,
        confirmPassword: string,
        consentGiven: boolean,
    ): Promise<AuthActionResult>;
    onForgotPassword(email: string): Promise<AuthActionResult>;
    onServerChange(url: string | null): Promise<AuthActionResult>;
    onResendConfirmation(email: string): Promise<AuthActionResult>;
    onRememberMeChange(): Promise<void>;
    onGoogleLogin(): Promise<void>;
    onNavigate(destination: AuthDestination): Promise<void>;
}
