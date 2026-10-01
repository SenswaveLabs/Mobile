export interface LoginErrors {
    email?: string;
    password?: string;
}

export interface RegistrationErrors extends LoginErrors {
    confirmPassword?: string;
    consent?: string;
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

export const validateRegistration = (
    email: unknown,
    password: unknown,
    confirmPassword: unknown,
    consentGiven: unknown,
): RegistrationErrors => {
    let passwordError = validateLogin(email, password).password;
    if (!passwordError && typeof password === "string") {
        if (password.length < 10) passwordError = "Use at least 10 characters.";
        else if (!/[a-z]/.test(password)) passwordError = "Add a lowercase letter.";
        else if (!/[A-Z]/.test(password)) passwordError = "Add an uppercase letter.";
        else if (!/[0-9]/.test(password)) passwordError = "Add a number.";
        else if (!/[^A-Za-z0-9]/.test(password)) passwordError = "Add a special character.";
    }

    return {
        email: validateEmail(email),
        password: passwordError,
        confirmPassword:
            typeof confirmPassword !== "string" || !confirmPassword
                ? "Confirm your password."
                : confirmPassword !== password
                  ? "Passwords do not match."
                  : undefined,
        consent: consentGiven === true ? undefined : "Agree to the Terms and Privacy Policy.",
    };
};

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
