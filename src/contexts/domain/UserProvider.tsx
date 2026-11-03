import React from "react";
import { Result, SimpleResult } from "@/utils/result";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useHttpClient } from "../HttpClientProvider";
import { useToast } from "../ToastProvider";
import { useTheme } from "../ThemeProvider";
import { useSession } from "../SessionProvider";

export enum ThemeMode {
    Light = "light",
    Dark = "dark",
    Default = "default",
}

interface GetUserDataOptions {
    silent?: boolean;
}

type UserResponse = {
    Id: string;
    email: string;
    theme: ThemeMode;
    language: string;
    hasActiveConsent: boolean;
};

interface UserData {
    language: string;
    theme: ThemeMode;
    email: string;
    name: string;
    image?: string;
    hasActiveConsent: boolean;
}

interface UserProperties {
    data: UserData;
    updateTheme: (theme: ThemeMode) => Promise<SimpleResult>;
    updateLanguage: (language: string) => Promise<SimpleResult>;
    makeConsents: () => Promise<SimpleResult>;
    getUserData: (options?: GetUserDataOptions) => Promise<Result<UserData>>;
    removeUserAccount: () => Promise<SimpleResult>;
}

const UserContext = createContext<UserProperties>({
    data: {
        language: "en",
        theme: ThemeMode.Default,
        email: "",
        name: "",
        hasActiveConsent: false,
    },
    updateTheme: async () => SimpleResult.failure("Not implemented."),
    updateLanguage: async () => SimpleResult.failure("Not implemented."),
    makeConsents: async () => SimpleResult.failure("Not implemented."),
    getUserData: async () => Result.failure("Not implemented."),
    removeUserAccount: async () => SimpleResult.failure("NotImplemented"),
});

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }: any) => {
    const httpClient = useHttpClient();
    const toast = useToast();
    const theme = useTheme();
    const session = useSession();
    const sessionRef = useRef(session.session);
    sessionRef.current = session.session;

    const [userData, setUserData] = useState<UserData>({
        language: "en",
        theme: ThemeMode.Light,
        email: "",
        name: "",
        hasActiveConsent: false,
    });

    const updateThemeInternal = async (internalTheme: ThemeMode, isCurrent?: () => boolean) => {
        if (internalTheme === ThemeMode.Default) {
            if (isCurrent) await theme.resetTheme(isCurrent);
            else await theme.resetTheme();
        } else if (internalTheme === ThemeMode.Light) {
            await theme.lightTheme();
        } else {
            await theme.darkTheme();
        }
    };

    const updateTheme = async (internalTheme: ThemeMode) => {
        console.debug("[User provider] Updating theme...");

        const result = await httpClient.patch("v1/users/settings", {
            theme: internalTheme,
        });

        if (result.isSuccess) {
            setUserData({ ...userData, theme: internalTheme });
            updateThemeInternal(internalTheme);
            return SimpleResult.success();
        } else {
            return SimpleResult.failure("Failed to update theme.");
        }
    };

    const updateLanguage = async (language: string) => {
        console.debug("[User provider] Updating language...");

        const result = await httpClient.patch("v1/user/settings", {
            language: language,
        });

        if (result.isSuccess) {
            setUserData({ ...userData, language: language });
            return SimpleResult.success();
        } else {
            toast.httpError(result);
            return SimpleResult.failure("Failed to update language.");
        }
    };

    const makeConsents = async () => {
        console.debug("[User provider] Making consents...");

        const result = await httpClient.post("v1/users/consents", {});

        if (result.isSuccess) {
            console.debug("[User provider] Consents made.");
            return SimpleResult.success();
        } else {
            return SimpleResult.failure("Failed to make consents.");
        }
    };

    const getUserData = async ({ silent = false }: GetUserDataOptions = {}) => {
        const requestAuthenticated = sessionRef.current.authenticated;
        const requestAccessToken = sessionRef.current.accessToken;
        const isCurrentSession = () =>
            sessionRef.current.authenticated === requestAuthenticated &&
            sessionRef.current.accessToken === requestAccessToken;
        const response = await httpClient.get("v1/users");

        if (response.isSuccess) {
            console.debug("[User Provider] User data loaded.");

            const parsedData: unknown = await response.response?.json();
            if (
                typeof parsedData !== "object" ||
                parsedData === null ||
                typeof (parsedData as { hasActiveConsent?: unknown }).hasActiveConsent !== "boolean"
            )
                return Result.failure<UserData>("Failed to load account details.");

            const data = parsedData as UserResponse;
            if (!isCurrentSession())
                return Result.failure<UserData>("Failed to load account details.");

            updateThemeInternal(data.theme, isCurrentSession);
            const name = data.email.charAt(0).toUpperCase() + data.email.split("@")[0].slice(1);

            const userData: UserData = {
                theme: data.theme,
                language: data.language,
                email: data.email,
                name: name,
                hasActiveConsent: data.hasActiveConsent,
            };

            if (!isCurrentSession())
                return Result.failure<UserData>("Failed to load account details.");
            setUserData(userData);

            return Result.success<UserData>(userData);
        } else {
            if (!silent && isCurrentSession()) toast.httpError(response);

            return Result.failure<UserData>("Failed to load account details.");
        }
    };

    const removeUserAccount = async () => {
        try {
            const response = await httpClient.delete("v1/users/account");

            if (response.statusCode === 204) {
                console.debug("[Session Provider] Account removed successfully.");
                session.logout();
                return SimpleResult.success();
            }

            return SimpleResult.failure("Failed to remove account.");
        } catch (error) {
            console.error(`[Session Provider] Unexpected exception when removing account ${error}`);

            return SimpleResult.failure("Unexpected exrror when removing account.");
        }
    };

    useEffect(() => {
        if (session.session.authenticated) {
            getUserData({ silent: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session.session.authenticated]);

    const values = useMemo(
        () => ({
            data: userData,
            updateTheme: updateTheme,
            updateLanguage: updateLanguage,
            makeConsents: makeConsents,
            getUserData: getUserData,
            removeUserAccount: removeUserAccount,
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [userData],
    );

    console.debug("[User Provider] Intialized.");

    return <UserContext.Provider value={values}>{children}</UserContext.Provider>;
};
