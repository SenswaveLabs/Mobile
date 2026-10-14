import { useEffect, useState } from "react";
import { useConfiguration } from "@/contexts/ConfigurationProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useSession } from "@/contexts/SessionProvider";
import type { IconResource } from "@/utils/resourceIcons";

export interface IconCatalog {
    keys: string[];
    loading: boolean;
    error: string;
    retry: () => void;
}

interface CachedCatalog {
    scope: string;
    request: Promise<string[]>;
}

// Keep only the latest session/server entry for each resource, including in-flight requests.
const catalogs = new Map<IconResource, CachedCatalog>();

export const useIconCatalog = (resource: IconResource): IconCatalog => {
    const { get } = useHttpClient();
    const configuration = useConfiguration();
    const { session } = useSession();
    const scope = `${configuration.getBaseUrl().href}\n${session.authenticated}\n${session.accessToken}\n${resource}`;
    const [retryCount, setRetryCount] = useState(0);
    const [state, setState] = useState({
        scope: "",
        keys: [] as string[],
        loading: true,
        error: "",
    });

    useEffect(() => {
        let active = true;
        setState({ scope, keys: [], loading: session.authenticated, error: "" });

        if (!session.authenticated) {
            catalogs.clear();
            return;
        }

        let catalog = catalogs.get(resource);
        if (catalog?.scope !== scope) {
            const request = (async () => {
                const response = await get(`v1/${resource}/icons`);
                if (!response.isSuccess || !response.response)
                    throw new Error("Catalog unavailable");
                const keys: unknown = await response.response.json();
                if (
                    !Array.isArray(keys) ||
                    keys.length === 0 ||
                    !keys.every((key) => typeof key === "string" && key.trim().length > 0) ||
                    new Set(keys).size !== keys.length
                ) {
                    throw new Error("Invalid icon catalog");
                }
                return keys as string[];
            })();
            catalog = { scope, request };
            catalogs.set(resource, catalog);
        }

        const entry = catalog;
        entry.request.then(
            (keys) => {
                if (active) setState({ scope, keys, loading: false, error: "" });
            },
            () => {
                if (catalogs.get(resource) === entry) catalogs.delete(resource);
                if (active) {
                    setState({
                        scope,
                        keys: [],
                        loading: false,
                        error: "Could not load icons. Retry to choose an icon.",
                    });
                }
            },
        );

        return () => {
            active = false;
        };
    }, [get, resource, scope, session.authenticated, retryCount]);

    const current =
        state.scope === scope ? state : { keys: [], loading: session.authenticated, error: "" };
    return {
        keys: current.keys,
        loading: current.loading,
        error: current.error,
        retry: () => setRetryCount((count) => count + 1),
    };
};
