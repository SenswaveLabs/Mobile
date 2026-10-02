"use dom";

import "./styles/auth.css";
import React, { FC, FormEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Mail } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "./ui/input-group";
import { Spinner } from "./ui/spinner";
import {
    type RegistrationErrors,
    validateEmail,
    validateLogin,
    validateRegistration,
    validateServerUrl,
} from "@/utils/authValidation";
import type { AuthDestination, AuthPanelProps } from "./authTypes";

const logo = require("@/assets/icon.png");

const AuthPanel: FC<AuthPanelProps> = (props) => {
    const { theme, fontScale, screen, onReady } = props;
    const readyReported = useRef(false);

    useLayoutEffect(() => {
        document.documentElement.id = "senswave-web";
        document.documentElement.lang = "en";
        document.documentElement.classList.toggle("dark", theme === "dark");
        document.documentElement.style.fontSize = `${16 * fontScale}px`;
        document
            .querySelector('meta[name="viewport"]')
            ?.setAttribute("content", "width=device-width, initial-scale=1");
    }, [theme, fontScale]);

    useLayoutEffect(() => {
        document.title = "Senswave";
        window.scrollTo(0, 0);
        document.getElementById("auth-title")?.focus({ preventScroll: true });
    }, [screen]);

    useEffect(() => {
        if (readyReported.current) return;
        const frame = requestAnimationFrame(() => {
            readyReported.current = true;
            void onReady();
        });
        return () => cancelAnimationFrame(frame);
    }, [onReady]);

    // Only form state resets on navigation. The DOM root and its WebView stay mounted.
    return <AuthContent key={screen} {...props} />;
};

const AuthContent: FC<AuthPanelProps> = ({
    screen,
    keyboardVisible = false,
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
    const isRegister = screen === "register";
    const isForgot = screen === "forgotPassword";
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [consentGiven, setConsentGiven] = useState(false);
    const [visiblePassword, setVisiblePassword] = useState<string | null>(null);
    const [errors, setErrors] = useState<RegistrationErrors>({});
    const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
    const [registered, setRegistered] = useState(false);
    const [url, setUrl] = useState(serverUrl);
    const [urlError, setUrlError] = useState<string>();
    const [pending, setPending] = useState<string | null>(null);
    const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
    const actionInFlight = useRef(false);

    useEffect(() => setUrl(serverUrl), [serverUrl]);

    useLayoutEffect(() => {
        if (registered) document.getElementById("auth-title")?.focus({ preventScroll: true });
    }, [registered]);

    const runAction = async (name: string, action: () => Promise<void>) => {
        if (actionInFlight.current) return;
        actionInFlight.current = true;
        setPending(name);
        setNotice(null);
        try {
            await action();
        } catch {
            setNotice({ text: "Something went wrong. Please try again.", error: true });
        } finally {
            actionInFlight.current = false;
            setPending(null);
        }
    };

    const navigate = (destination: AuthDestination) =>
        runAction("navigate", () => onNavigate(destination));

    const submitForm = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const nextErrors = isRegister
            ? validateRegistration(email, password, confirmPassword, consentGiven)
            : isForgot
              ? { email: validateEmail(email) }
              : validateLogin(email, password);
        setErrors(nextErrors);
        const firstError = Object.entries(nextErrors).find(([, error]) => error)?.[0];
        if (firstError) {
            document.getElementById(`${screen}-${firstError}`)?.focus();
            return;
        }
        void runAction("submit", async () => {
            const result = isRegister
                ? await onRegister(email.trim(), password, confirmPassword, consentGiven)
                : isForgot
                  ? await onForgotPassword(email.trim())
                  : await onLogin(email.trim(), password);
            setNeedsEmailConfirmation(result.needsEmailConfirmation ?? false);
            if (result.error) setNotice({ text: result.error, error: true });
            else if (isRegister) {
                setPassword("");
                setConfirmPassword("");
                setRegistered(true);
            }
        });
    };

    const resendConfirmation = () => {
        const error = validateEmail(email);
        if (error) {
            setErrors((current) => ({ ...current, email: error }));
            document.getElementById(`${screen}-email`)?.focus();
            return;
        }
        void runAction("resend", async () => {
            const result = await onResendConfirmation(email.trim());
            setNotice({
                text: result.error || "Confirmation email sent. Check your inbox and spam folder.",
                error: !!result.error,
            });
        });
    };

    const changeServer = (reset: boolean) => {
        const error = reset ? undefined : validateServerUrl(url);
        setUrlError(error);
        if (error) {
            document.getElementById("server-url")?.focus();
            return;
        }
        void runAction(reset ? "reset" : "submit", async () => {
            const result = await onServerChange(reset ? null : url.trim());
            setNotice({
                text:
                    result.error || (reset ? "Default server restored." : "Server address saved."),
                error: !!result.error,
            });
        });
    };

    const liveNotice = (
        <div aria-live="polite" aria-atomic="true" className="empty:sr-only">
            {notice && (
                <Alert variant={notice.error ? "destructive" : "default"} role="status">
                    <AlertDescription>{notice.text}</AlertDescription>
                </Alert>
            )}
        </div>
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
        <div className="flex flex-col gap-3">
            {registered && (
                <Mail className="mb-2 size-8 text-muted-foreground" aria-hidden="true" />
            )}
            <h1
                id="auth-title"
                tabIndex={-1}
                className="text-3xl font-semibold tracking-tight text-balance outline-none">
                {title}
            </h1>
            <p id="auth-description" className="text-base leading-relaxed text-muted-foreground">
                {registered ? (
                    <>
                        We’ve sent a verification link to{" "}
                        <strong className="font-medium text-foreground">{email.trim()}</strong>.
                        Check your inbox and spam folder before signing in.
                    </>
                ) : (
                    description
                )}
            </p>
        </div>
    );

    return (
        <main
            data-keyboard-visible={keyboardVisible}
            className="auth-panel mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden">
            <header className="flex min-h-12 shrink-0 items-center gap-3">
                {screen !== "start" && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-lg"
                        aria-label="Go back"
                        className="-ml-2"
                        disabled={!!pending}
                        onClick={() => void navigate("back")}>
                        <ArrowLeft aria-hidden="true" />
                    </Button>
                )}
                <span className="text-lg font-semibold tracking-tight">Senswave</span>
            </header>

            <div className="flex min-h-0 flex-1 flex-col">
                {screen === "start" ? (
                    <>
                        <section
                            aria-labelledby="auth-title"
                            className="auth-content flex flex-col justify-center-safe gap-6">
                            <img
                                src={logo.uri}
                                alt=""
                                width={96}
                                height={96}
                                className="size-24 rounded-3xl"
                            />
                            <div className="flex flex-col gap-3">
                                <h1
                                    id="auth-title"
                                    tabIndex={-1}
                                    className="text-4xl font-semibold tracking-tight text-balance outline-none">
                                    Your home, connected.
                                </h1>
                                <p className="text-base leading-relaxed text-muted-foreground">
                                    Manage your devices, rooms and automations in one place.
                                </p>
                            </div>
                            {liveNotice}
                        </section>
                        <div className="auth-actions">
                            <Button disabled={!!pending} onClick={() => void navigate("login")}>
                                Sign in
                            </Button>
                            <Button
                                variant="outline"
                                disabled={!!pending}
                                onClick={() => void navigate("register")}>
                                Create account
                            </Button>
                            {isDevelopment && (
                                <Button
                                    variant="ghost"
                                    disabled={!!pending}
                                    className="text-muted-foreground"
                                    onClick={() => void navigate("server")}>
                                    Choose server
                                </Button>
                            )}
                        </div>
                    </>
                ) : (
                    <section aria-labelledby="auth-title" className="flex min-h-0 flex-1 flex-col">
                        {registered ? (
                            <>
                                <div className="auth-content flex flex-col gap-8">
                                    {introduction}
                                    {liveNotice}
                                </div>
                                <div className="auth-actions">
                                    <Button
                                        disabled={!!pending}
                                        onClick={() => void navigate("login")}>
                                        Go to sign in
                                    </Button>
                                </div>
                            </>
                        ) : screen === "server" ? (
                            isDevelopment ? (
                                <form
                                    noValidate
                                    aria-busy={!!pending}
                                    aria-describedby="auth-description"
                                    className="flex min-h-0 flex-1 flex-col"
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        changeServer(false);
                                    }}>
                                    <div className="auth-content flex flex-col gap-8">
                                        {introduction}
                                        <Field data-invalid={!!urlError} data-disabled={!!pending}>
                                            <FieldLabel htmlFor="server-url">Server URL</FieldLabel>
                                            <Input
                                                id="server-url"
                                                name="serverUrl"
                                                type="url"
                                                inputMode="url"
                                                enterKeyHint="go"
                                                autoComplete="url"
                                                autoCapitalize="none"
                                                spellCheck={false}
                                                required
                                                disabled={!!pending}
                                                value={url}
                                                placeholder="https://your-server.example.com"
                                                onChange={(event) => {
                                                    setUrl(event.target.value);
                                                    setUrlError(undefined);
                                                }}
                                                aria-invalid={!!urlError}
                                                aria-describedby={
                                                    urlError ? "server-url-error" : undefined
                                                }
                                            />
                                            <FieldError id="server-url-error">
                                                {urlError}
                                            </FieldError>
                                        </Field>
                                        {liveNotice}
                                    </div>
                                    <div className="auth-actions">
                                        <Button type="submit" disabled={!!pending}>
                                            {pending === "submit" && <Spinner />}
                                            {pending === "submit" ? "Saving…" : "Save server"}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={!!pending}
                                            onClick={() => changeServer(true)}>
                                            {pending === "reset" && <Spinner />}Use default server
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                <div className="auth-content flex flex-col gap-8">
                                    {introduction}
                                    <p className="text-muted-foreground">
                                        Server selection is unavailable.
                                    </p>
                                </div>
                            )
                        ) : (
                            <form
                                noValidate
                                onSubmit={submitForm}
                                aria-busy={!!pending}
                                aria-describedby="auth-description"
                                className="flex min-h-0 flex-1 flex-col">
                                <div className="auth-content flex flex-col gap-8">
                                    {introduction}
                                    <FieldGroup className="gap-6">
                                        <Field
                                            data-invalid={!!errors.email}
                                            data-disabled={!!pending}>
                                            <FieldLabel htmlFor={`${screen}-email`}>
                                                Email
                                            </FieldLabel>
                                            <Input
                                                id={`${screen}-email`}
                                                name="email"
                                                type="email"
                                                inputMode="email"
                                                enterKeyHint={isForgot ? "go" : "next"}
                                                autoComplete={
                                                    isRegister || isForgot ? "email" : "username"
                                                }
                                                autoCapitalize="none"
                                                spellCheck={false}
                                                placeholder="you@example.com"
                                                required
                                                disabled={!!pending}
                                                value={email}
                                                onChange={(event) => {
                                                    setEmail(event.target.value);
                                                    setNeedsEmailConfirmation(false);
                                                    setErrors((current) => ({
                                                        ...current,
                                                        email: undefined,
                                                    }));
                                                }}
                                                onKeyDown={(event) => {
                                                    if (event.key === "Enter" && !isForgot) {
                                                        event.preventDefault();
                                                        document
                                                            .getElementById(`${screen}-password`)
                                                            ?.focus();
                                                    }
                                                }}
                                                aria-invalid={!!errors.email}
                                                aria-describedby={
                                                    errors.email
                                                        ? `${screen}-email-error`
                                                        : undefined
                                                }
                                            />
                                            <FieldError id={`${screen}-email-error`}>
                                                {errors.email}
                                            </FieldError>
                                        </Field>

                                        {!isForgot &&
                                            (isRegister
                                                ? (["password", "confirmPassword"] as const)
                                                : (["password"] as const)
                                            ).map((name) => (
                                                <Field
                                                    key={name}
                                                    data-invalid={!!errors[name]}
                                                    data-disabled={!!pending}>
                                                    <FieldLabel htmlFor={`${screen}-${name}`}>
                                                        {name === "password"
                                                            ? "Password"
                                                            : "Confirm password"}
                                                    </FieldLabel>
                                                    <InputGroup>
                                                        <InputGroupInput
                                                            id={`${screen}-${name}`}
                                                            name={name}
                                                            type={
                                                                visiblePassword === name
                                                                    ? "text"
                                                                    : "password"
                                                            }
                                                            autoComplete={
                                                                isRegister
                                                                    ? "new-password"
                                                                    : "current-password"
                                                            }
                                                            autoCapitalize="none"
                                                            spellCheck={false}
                                                            enterKeyHint={
                                                                isRegister && name === "password"
                                                                    ? "next"
                                                                    : "go"
                                                            }
                                                            placeholder={
                                                                name === "confirmPassword"
                                                                    ? "Repeat your password"
                                                                    : isRegister
                                                                      ? "Create a password"
                                                                      : "Enter your password"
                                                            }
                                                            required
                                                            disabled={!!pending}
                                                            value={
                                                                name === "password"
                                                                    ? password
                                                                    : confirmPassword
                                                            }
                                                            onChange={(event) => {
                                                                if (name === "password")
                                                                    setPassword(event.target.value);
                                                                else
                                                                    setConfirmPassword(
                                                                        event.target.value,
                                                                    );
                                                                setErrors((current) => ({
                                                                    ...current,
                                                                    [name]: undefined,
                                                                }));
                                                            }}
                                                            onKeyDown={(event) => {
                                                                if (
                                                                    event.key === "Enter" &&
                                                                    isRegister &&
                                                                    name === "password"
                                                                ) {
                                                                    event.preventDefault();
                                                                    document
                                                                        .getElementById(
                                                                            `${screen}-confirmPassword`,
                                                                        )
                                                                        ?.focus();
                                                                }
                                                            }}
                                                            aria-invalid={!!errors[name]}
                                                            aria-describedby={
                                                                [
                                                                    errors[name]
                                                                        ? `${screen}-${name}-error`
                                                                        : "",
                                                                    isRegister &&
                                                                    name === "password"
                                                                        ? "password-hint"
                                                                        : "",
                                                                ]
                                                                    .filter(Boolean)
                                                                    .join(" ") || undefined
                                                            }
                                                        />
                                                        <InputGroupAddon align="inline-end">
                                                            <InputGroupButton
                                                                size="icon-sm"
                                                                disabled={!!pending}
                                                                aria-label={`${visiblePassword === name ? "Hide" : "Show"} ${name === "password" ? "password" : "confirm password"}`}
                                                                aria-pressed={
                                                                    visiblePassword === name
                                                                }
                                                                onClick={() =>
                                                                    setVisiblePassword((current) =>
                                                                        current === name
                                                                            ? null
                                                                            : name,
                                                                    )
                                                                }>
                                                                {visiblePassword === name ? (
                                                                    <EyeOff aria-hidden="true" />
                                                                ) : (
                                                                    <Eye aria-hidden="true" />
                                                                )}
                                                            </InputGroupButton>
                                                        </InputGroupAddon>
                                                    </InputGroup>
                                                    {isRegister && name === "password" && (
                                                        <FieldDescription id="password-hint">
                                                            10–64 characters, with uppercase,
                                                            lowercase, a number and a special
                                                            character.
                                                        </FieldDescription>
                                                    )}
                                                    <FieldError id={`${screen}-${name}-error`}>
                                                        {errors[name]}
                                                    </FieldError>
                                                </Field>
                                            ))}
                                    </FieldGroup>

                                    {isRegister ? (
                                        <Field
                                            data-invalid={!!errors.consent}
                                            data-disabled={!!pending}>
                                            <div className="flex items-start gap-3">
                                                <Checkbox
                                                    id="register-consent"
                                                    name="consent"
                                                    checked={consentGiven}
                                                    disabled={!!pending}
                                                    className="mt-4"
                                                    onCheckedChange={(checked) => {
                                                        setConsentGiven(checked);
                                                        setErrors((current) => ({
                                                            ...current,
                                                            consent: undefined,
                                                        }));
                                                    }}
                                                    aria-invalid={!!errors.consent}
                                                    aria-describedby={
                                                        errors.consent
                                                            ? "register-consent-error"
                                                            : undefined
                                                    }
                                                />
                                                <div className="min-h-12 flex-1 text-sm leading-relaxed">
                                                    <FieldLabel
                                                        htmlFor="register-consent"
                                                        className="min-h-12">
                                                        I agree to the Terms of Service and Privacy
                                                        Policy.
                                                    </FieldLabel>
                                                    <div className="flex flex-wrap gap-x-4">
                                                        <a
                                                            href="/terms"
                                                            aria-disabled={!!pending}
                                                            className="inline-flex min-h-12 items-center underline"
                                                            onClick={(event) => {
                                                                event.preventDefault();
                                                                void navigate("terms");
                                                            }}>
                                                            Terms of Service
                                                        </a>
                                                        <a
                                                            href="/privacy"
                                                            aria-disabled={!!pending}
                                                            className="inline-flex min-h-12 items-center underline"
                                                            onClick={(event) => {
                                                                event.preventDefault();
                                                                void navigate("privacy");
                                                            }}>
                                                            Privacy Policy
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                            <FieldError id="register-consent-error">
                                                {errors.consent}
                                            </FieldError>
                                        </Field>
                                    ) : (
                                        !isForgot && (
                                            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                                                <Field
                                                    orientation="horizontal"
                                                    className="w-auto"
                                                    data-disabled={!!pending}>
                                                    <Checkbox
                                                        id="remember-me"
                                                        name="rememberMe"
                                                        checked={rememberMe}
                                                        disabled={!!pending}
                                                        onCheckedChange={() =>
                                                            void runAction(
                                                                "remember",
                                                                onRememberMeChange,
                                                            )
                                                        }
                                                    />
                                                    <FieldLabel
                                                        htmlFor="remember-me"
                                                        className="min-h-12 text-sm">
                                                        Remember me
                                                    </FieldLabel>
                                                </Field>
                                                <a
                                                    href="/forgotPassword"
                                                    className="inline-flex min-h-12 items-center text-sm underline"
                                                    aria-disabled={!!pending}
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        void navigate("forgotPassword");
                                                    }}>
                                                    Forgot password?
                                                </a>
                                            </div>
                                        )
                                    )}

                                    {liveNotice}
                                </div>
                                <div className="auth-actions">
                                    <Button type="submit" disabled={!!pending} className="w-full">
                                        {pending === "submit" && <Spinner />}
                                        {pending === "submit"
                                            ? isRegister
                                                ? "Creating account…"
                                                : isForgot
                                                  ? "Sending code…"
                                                  : "Signing in…"
                                            : isRegister
                                              ? "Create account"
                                              : isForgot
                                                ? "Send reset code"
                                                : "Sign in"}
                                    </Button>
                                    {needsEmailConfirmation && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={!!pending}
                                            onClick={resendConfirmation}>
                                            {pending === "resend" && <Spinner />}Resend confirmation
                                            email
                                        </Button>
                                    )}
                                    {!isForgot && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={!!pending}
                                            className="w-full"
                                            onClick={() => void runAction("google", onGoogleLogin)}>
                                            {pending === "google" && <Spinner />}Continue with
                                            Google
                                        </Button>
                                    )}
                                    <footer className="flex flex-wrap items-center justify-center gap-x-1 text-sm text-muted-foreground">
                                        {!isForgot && (
                                            <span>
                                                {isRegister
                                                    ? "Already have an account?"
                                                    : "Don’t have an account?"}
                                            </span>
                                        )}
                                        <a
                                            href={isRegister || isForgot ? "/login" : "/register"}
                                            className="inline-flex min-h-12 items-center font-medium text-foreground underline"
                                            aria-disabled={!!pending}
                                            onClick={(event) => {
                                                event.preventDefault();
                                                void navigate(
                                                    isRegister || isForgot ? "login" : "register",
                                                );
                                            }}>
                                            {isForgot
                                                ? "Back to sign in"
                                                : isRegister
                                                  ? "Sign in"
                                                  : "Sign up"}
                                        </a>
                                    </footer>
                                </div>
                            </form>
                        )}
                    </section>
                )}
            </div>
        </main>
    );
};

export default AuthPanel;
