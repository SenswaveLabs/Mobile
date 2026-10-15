import { useEffect, useState } from "react";
import { useConfiguration } from "@/contexts/ConfigurationProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useSession } from "@/contexts/SessionProvider";
import type { IconResource } from "@/utils/resourceIcons";

export interface IconCatalog {
    entries: IconCatalogEntry[];
    keys: string[];
    loading: boolean;
    error: string;
    retry: () => void;
}

export interface IconCatalogEntry {
    key: string;
    labelKey: string;
}

interface CachedCatalog {
    scope: string;
    request: Promise<IconCatalogEntry[]>;
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
        entries: [] as IconCatalogEntry[],
        loading: true,
        error: "",
    });

    useEffect(() => {
        let active = true;
        setState({ scope, entries: [], loading: session.authenticated, error: "" });

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
                const entries: unknown = await response.response.json();
                if (
                    !Array.isArray(entries) ||
                    entries.length === 0 ||
                    !entries.every(
                        (entry) =>
                            !!entry &&
                            typeof entry === "object" &&
                            !Array.isArray(entry) &&
                            Object.prototype.hasOwnProperty.call(entry, "key") &&
                            Object.prototype.hasOwnProperty.call(entry, "labelKey") &&
                            typeof entry.key === "string" &&
                            entry.key.trim().length > 0 &&
                            typeof entry.labelKey === "string" &&
                            entry.labelKey.trim().length > 0,
                    ) ||
                    new Set(entries.map(({ key }) => key)).size !== entries.length
                ) {
                    throw new Error("Invalid icon catalog");
                }
                return entries.map(({ key, labelKey }) => ({ key, labelKey }));
            })();
            catalog = { scope, request };
            catalogs.set(resource, catalog);
        }

        const entry = catalog;
        entry.request.then(
            (entries) => {
                if (active) setState({ scope, entries, loading: false, error: "" });
            },
            () => {
                if (catalogs.get(resource) === entry) catalogs.delete(resource);
                if (active) {
                    setState({
                        scope,
                        entries: [],
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
        state.scope === scope ? state : { entries: [], loading: session.authenticated, error: "" };
    return {
        entries: current.entries,
        keys: current.entries.map(({ key }) => key),
        loading: current.loading,
        error: current.error,
        retry: () => setRetryCount((count) => count + 1),
    };
};
