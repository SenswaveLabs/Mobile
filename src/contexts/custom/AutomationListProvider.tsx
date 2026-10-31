import React, {
    createContext,
    useState,
    useEffect,
    useContext,
    PropsWithChildren,
    FC,
    useRef,
} from "react";
import { useHttpClient } from "../HttpClientProvider";
import { useHomes } from "../domain/HomeProvider";
import { ListResponse } from "@/utils/httpClient";
import { AutomationDto } from "@/types/AutomationsTypes";

const AutomationListUrl: string = "v1/automations/display?homeId=";
const loadError = "Couldn't load automations. Try again.";

interface AutomationListContextProps {
    homeId?: string;
    automations: AutomationDto[];
    loading: boolean;
    error?: string;
    refresh(expectedHomeId?: string): Promise<boolean>;
}

interface AutomationListState {
    homeId?: string;
    automations: AutomationDto[];
    loading: boolean;
    error?: string;
}

const AutomationListContext = createContext<AutomationListContextProps>({
    homeId: undefined,
    automations: [],
    loading: false,
    error: undefined,
    refresh: async () => false,
});

export const useAutomationList = () => useContext(AutomationListContext);

const AutomationListProvider: FC<PropsWithChildren> = ({ children }) => {
    const homes = useHomes();
    const httpClient = useHttpClient();
    const homeId = homes.current?.id;
    const homeIdRef = useRef(homeId);
    homeIdRef.current = homeId;
    const requestId = useRef(0);
    const [state, setState] = useState<AutomationListState>({
        automations: [],
        loading: false,
    });

    const refresh = async (expectedHomeId?: string): Promise<boolean> => {
        const currentHomeId = homeIdRef.current;
        if (!currentHomeId || (expectedHomeId !== undefined && expectedHomeId !== currentHomeId))
            return false;

        const currentRequestId = ++requestId.current;
        const isCurrent = () =>
            currentRequestId === requestId.current && homeIdRef.current === currentHomeId;
        setState((previous) => ({
            homeId: currentHomeId,
            automations: previous.homeId === currentHomeId ? previous.automations : [],
            loading: true,
        }));

        try {
            const response = await httpClient.get(AutomationListUrl + currentHomeId);
            let items: AutomationDto[];
            if (response.statusCode === 404) {
                items = [];
            } else {
                if (!response.isSuccess || !response.response) throw new Error(loadError);
                const payload = (await response.response.json()) as ListResponse<AutomationDto>;
                if (
                    !Array.isArray(payload?.items) ||
                    !payload.items.every((item) => {
                        if (!item || typeof item !== "object") return false;
                        return (
                            typeof item.id === "string" &&
                            item.id.length > 0 &&
                            item.homeId === currentHomeId &&
                            typeof item.name === "string" &&
                            typeof item.icon === "string" &&
                            (item.conditionConnector === "And" ||
                                item.conditionConnector === "Or") &&
                            typeof item.isEnabled === "boolean" &&
                            (item.conditions === undefined || Array.isArray(item.conditions)) &&
                            (item.results === undefined || Array.isArray(item.results))
                        );
                    })
                )
                    throw new Error(loadError);
                items = payload.items;
            }

            if (!isCurrent()) return false;
            setState((previous) => ({
                ...previous,
                homeId: currentHomeId,
                automations: items,
                error: undefined,
            }));
            return true;
        } catch {
            if (isCurrent())
                setState((previous) => ({ ...previous, homeId: currentHomeId, error: loadError }));
            return false;
        } finally {
            if (isCurrent())
                setState((previous) => ({ ...previous, homeId: currentHomeId, loading: false }));
        }
    };

    useEffect(() => {
        if (homeId) {
            void refresh(homeId);
        } else {
            requestId.current++;
            setState({ automations: [], loading: false });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [homeId]);

    return (
        <AutomationListContext.Provider
            value={{
                homeId,
                automations: state.homeId === homeId ? state.automations : [],
                loading: Boolean(homeId) && (state.homeId !== homeId || state.loading),
                error: state.homeId === homeId ? state.error : undefined,
                refresh,
            }}>
            {children}
        </AutomationListContext.Provider>
    );
};

export { AutomationListProvider, AutomationListContext };
