import React, {
    createContext,
    FC,
    PropsWithChildren,
    useCallback,
    useContext,
    useMemo,
    useRef,
} from "react";
import { useSession } from "./SessionProvider";
import { executeTimeout, HttpResponse } from "@/utils/httpClient";
import { useConfiguration } from "./ConfigurationProvider";
import { useToast } from "./ToastProvider";

interface HttpClientProviderProps {
    get: (path: string) => Promise<HttpResponse>;
    post: (path: string, body: any) => Promise<HttpResponse>;
    patch: (path: string, body: any) => Promise<HttpResponse>;
    put: (path: string, body: any) => Promise<HttpResponse>;
    delete: (path: string) => Promise<HttpResponse>;
}

const failedResponse: HttpResponse = {
    isSuccess: false,
    statusCode: 0,
    response: null,
};

const unauthorized: HttpResponse = {
    isSuccess: false,
    statusCode: 401,
    response: null,
};

const HttpClientContext = createContext<HttpClientProviderProps>({
    get: async () => {
        console.error("[HttpClient] Not initialized.");
        return failedResponse;
    },
    post: async () => {
        console.error("[HttpClient] Not initialized.");
        return failedResponse;
    },
    patch: async () => {
        console.error("[HttpClient] Not initialized.");
        return failedResponse;
    },
    put: async () => {
        console.error("[HttpClient] Not initialized.");
        return failedResponse;
    },
    delete: async () => {
        console.error("[HttpClient] Not initialized.");
        return failedResponse;
    },
});

export const useHttpClient = () => useContext(HttpClientContext);

export const HttpClientProvider: FC<PropsWithChildren> = ({ children }) => {
    const session = useSession();
    const configuration = useConfiguration();
    const toast = useToast();

    // Refs keep latest values accessible inside stable callbacks without triggering re-renders
    const sessionRef = useRef(session);
    sessionRef.current = session;
    const configurationRef = useRef(configuration);
    configurationRef.current = configuration;
    const toastRef = useRef(toast);
    toastRef.current = toast;

    const refreshFailureCountRef = useRef(0);

    const executeRequest = useCallback(
        async (
            path: string,
            method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
            body?: any,
            timeoutMs: number = 15000,
        ): Promise<HttpResponse> => {
            const s = sessionRef.current;
            const url = configurationRef.current.getApiUrl(path);

            if (!s.session.authenticated) {
                s.logout();
                console.error("[HttpClient] User is not authenticated.");
                return unauthorized;
            }

            const headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${s.session.accessToken}`,
            };

            const options: RequestInit = {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
            };

            const response = await executeTimeout(url, options, timeoutMs);

            if (response.isSuccess) {
                refreshFailureCountRef.current = 0;
                return response;
            }

            if (response.statusCode === 401) {
                const newToken = await s.refresh();

                if (!newToken) {
                    console.error("[HttpClient] Failed to refresh auth token");
                    refreshFailureCountRef.current++;
                    if (refreshFailureCountRef.current >= 10) {
                        refreshFailureCountRef.current = 0;
                        toastRef.current.error("Please check your internet connection.");
                    }
                    return unauthorized;
                }

                refreshFailureCountRef.current = 0;

                const retryOptions: RequestInit = {
                    method,
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${newToken}`,
                    },
                    body: body ? JSON.stringify(body) : undefined,
                };

                return await executeTimeout(url, retryOptions, timeoutMs);
            }

            // valid only when LegalMiddleware returns 403 for missing consents
            if (response.statusCode === 403) {
                s.logout();
                console.warn("[HttpClient] Logged out due to 403 Forbidden.");
                toastRef.current.httpError(response);
                return unauthorized;
            }

            return response;
        },
        [],
    );

    const get = useCallback(
        async (path: string) => {
            console.debug(`[HttpClient] GET ${path}`);
            return await executeRequest(path, "GET");
        },
        [executeRequest],
    );

    const post = useCallback(
        async (path: string, body: any) => {
            console.debug(`[HttpClient] POST ${path} ${body}`);
            return await executeRequest(path, "POST", body);
        },
        [executeRequest],
    );

    const patch = useCallback(
        async (path: string, body: any) => {
            console.debug(`[HttpClient] PATCH ${path} ${body}`);
            return await executeRequest(path, "PATCH", body);
        },
        [executeRequest],
    );

    const put = useCallback(
        async (path: string, body: any) => {
            console.debug(`[HttpClient] PUT ${path} ${body}`);
            return await executeRequest(path, "PUT", body);
        },
        [executeRequest],
    );

    const deleteRequest = useCallback(
        async (path: string) => {
            console.debug(`[HttpClient] DELETE ${path}`);
            return await executeRequest(path, "DELETE");
        },
        [executeRequest],
    );

    const contextValue = useMemo(
        () => ({ get, post, patch, put, delete: deleteRequest }),
        [get, post, patch, put, deleteRequest],
    );

    return <HttpClientContext.Provider value={contextValue}>{children}</HttpClientContext.Provider>;
};
