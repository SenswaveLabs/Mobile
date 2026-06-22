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

export const LegalProvider: FC<PropsWithChildren> = ({ children }) => {
    const configuration = useConfiguration();

    const getTerms = async (): Promise<Result<LegalDocument>> => {
        const url = configuration.getApiUrl("v1/legal/terms");

        const options: RequestInit = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                accept: "application/json",
            },
        };

        const result = await executeTimeout(url, options);

        if (result.isSuccess) {
            console.info("[LegalProvider] Successfully fetched Terms and Conditions.");
            const data: LegalDocument = await result.response?.json();
            return Result.success<LegalDocument>(data);
        }

        if (result.statusCode === 500) {
            console.error("[LegalProvider] Server unavailable while fetching Terms.");
            return Result.failure<LegalDocument>("Service unavailable");
        }

        console.error("[LegalProvider] Failed to fetch Terms and Conditions.");
        return Result.failure<LegalDocument>("Service unavailable");
    };

    const getPrivacy = async (): Promise<Result<LegalDocument>> => {
        const url = configuration.getApiUrl("v1/legal/privacy");

        const options: RequestInit = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                accept: "application/json",
            },
        };

        const result = await executeTimeout(url, options);

        if (result.isSuccess) {
            console.info("[LegalProvider] Successfully fetched Privacy Policy.");
            const data: LegalDocument = await result.response?.json();
            return Result.success<LegalDocument>(data);
        }

        if (result.statusCode === 500) {
            console.error("[LegalProvider] Server unavailable while fetching Privacy Policy.");
            return Result.failure<LegalDocument>("Service unavailable");
        }

        console.error("[LegalProvider] Failed to fetch Privacy Policy.");
        return Result.failure<LegalDocument>("Service unavailable");
    };

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
