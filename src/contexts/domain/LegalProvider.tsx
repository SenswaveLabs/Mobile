import { useConfiguration } from "@/contexts/ConfigurationProvider";
import { executeTimeout } from "@/utils/httpClient";
import { Result } from "@/utils/result";
import { createContext, FC, PropsWithChildren, useContext } from "react";

export interface LegalDocument {
    id: string;
    version: string;
    content: string;
    summary: string;
    createdAtUtc: string;
}

interface LegalContextProps {
    getTerms: () => Promise<Result<LegalDocument>>;
    getPrivacy: () => Promise<Result<LegalDocument>>;
}

const LegalContext = createContext<LegalContextProps>({
    getTerms: async () => Result.failure<LegalDocument>("Not implemented"),
    getPrivacy: async () => Result.failure<LegalDocument>("Not implemented"),
});

const isLegalDocument = (value: unknown): value is LegalDocument => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;

    const document = value as Partial<LegalDocument>;
    return (
        typeof document.version === "string" &&
        document.version.trim().length > 0 &&
        typeof document.summary === "string" &&
        typeof document.content === "string" &&
        document.content.trim().length > 0
    );
};

export const LegalProvider: FC<PropsWithChildren> = ({ children }) => {
    const configuration = useConfiguration();

    const getDocument = async (path: string, name: string): Promise<Result<LegalDocument>> => {
        const options: RequestInit = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                accept: "application/json",
            },
        };

        try {
            const result = await executeTimeout(configuration.getApiUrl(path), options);
            if (!result.isSuccess) {
                if (result.statusCode === 500) {
                    console.error(`[LegalProvider] Server unavailable while fetching ${name}.`);
                } else {
                    console.error(`[LegalProvider] Failed to fetch ${name}.`);
                }
                return Result.failure<LegalDocument>("Service unavailable");
            }

            const data: unknown = await result.response?.json();
            if (!isLegalDocument(data)) {
                console.error(`[LegalProvider] Invalid ${name} response.`);
                return Result.failure<LegalDocument>("Service unavailable");
            }

            console.info(`[LegalProvider] Successfully fetched ${name}.`);
            return Result.success<LegalDocument>(data as LegalDocument);
        } catch {
            console.error(`[LegalProvider] Failed to fetch ${name}.`);
            return Result.failure<LegalDocument>("Service unavailable");
        }
    };

    const getTerms = (): Promise<Result<LegalDocument>> =>
        getDocument("v1/legal/terms", "Terms and Conditions");
    const getPrivacy = (): Promise<Result<LegalDocument>> =>
        getDocument("v1/legal/privacy", "Privacy Policy");

    console.info("[LegalProvider] Initialized.");

    return (
        <LegalContext.Provider
            value={{
                getTerms,
                getPrivacy,
            }}>
            {children}
        </LegalContext.Provider>
    );
};

export const useLegal = (): LegalContextProps => useContext(LegalContext);
