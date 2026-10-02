export interface LoginErrors {
    email?: string;
    password?: string;
}

export interface RegistrationErrors extends LoginErrors {
    confirmPassword?: string;
    consent?: string;
}

export interface ResetPasswordErrors {
    password?: string;
    confirmPassword?: string;
    resetCode?: string;
}

export const validateEmail = (email: unknown): string | undefined => {
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return "Enter a valid email address.";
    }
};

export const validateLogin = (email: unknown, password: unknown): LoginErrors => ({
    email: validateEmail(email),
    password:
        typeof password !== "string" || !password
            ? "Enter your password."
            : password.length > 64
              ? "Password must be 64 characters or fewer."
              : undefined,
});

const validateNewPassword = (password: unknown): string | undefined => {
    if (typeof password !== "string" || !password) return "Enter your password.";
    if (password.length > 64) return "Password must be 64 characters or fewer.";
    if (password.length < 10) return "Use at least 10 characters.";
    if (!/[a-z]/.test(password)) return "Add a lowercase letter.";
    if (!/[A-Z]/.test(password)) return "Add an uppercase letter.";
    if (!/[0-9]/.test(password)) return "Add a number.";
    if (!/[^A-Za-z0-9]/.test(password)) return "Add a special character.";
};

const validatePasswordConfirmation = (password: unknown, confirmation: unknown) =>
    typeof confirmation !== "string" || !confirmation
        ? "Confirm your password."
        : confirmation !== password
          ? "Passwords do not match."
          : undefined;

export const validateRegistration = (
    email: unknown,
    password: unknown,
    confirmPassword: unknown,
    consentGiven: unknown,
): RegistrationErrors => ({
    email: validateEmail(email),
    password: validateNewPassword(password),
    confirmPassword: validatePasswordConfirmation(password, confirmPassword),
    consent: consentGiven === true ? undefined : "Agree to the Terms and Privacy Policy.",
});

export const validateResetPassword = (
    password: unknown,
    confirmPassword: unknown,
    resetCode: unknown,
): ResetPasswordErrors => ({
    password: validateNewPassword(password),
    confirmPassword: validatePasswordConfirmation(password, confirmPassword),
    resetCode:
        typeof resetCode !== "string" || !resetCode.trim()
            ? "Enter the reset code from your email."
            : resetCode.length > 512
              ? "Reset code must be 512 characters or fewer."
              : undefined,
});

export const validateServerUrl = (value: unknown): string | undefined => {
    if (typeof value === "string" && value.trim()) {
        try {
            const url = new URL(value.trim());
            if (
                (url.protocol === "http:" || url.protocol === "https:") &&
                url.hostname &&
                !url.username &&
                !url.password
            ) {
                return;
            }
        } catch {
            // Invalid absolute URL; return the same field error below.
        }
    }
    return "Enter a full server address starting with http:// or https://.";
};
