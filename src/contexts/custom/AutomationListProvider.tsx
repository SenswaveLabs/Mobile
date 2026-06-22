import React, {
    createContext,
    useState,
    useEffect,
    useContext,
    PropsWithChildren,
    FC,
} from "react";
import { useHttpClient } from "../HttpClientProvider";
import { useHomes } from "../domain/HomeProvider";
import { ListResponse } from "@/utils/httpClient";
import { useToast } from "../ToastProvider";
import { AutomationDto } from "@/types/AutomationsTypes";

const AutomationListUrl: string = "v1/automations/display/?homeId=";

interface AutomationListContextProps {
    loading: boolean;
    automations: AutomationDto[];

    refresh(): Promise<boolean>;
}

const AutomationListContext = createContext<AutomationListContextProps>({
    loading: false,
    automations: [],

    refresh: async () => {
        console.warn("refresh not implemented.");
        return false;
    },
});

export const useAutomationList = () => useContext(AutomationListContext);

const AutomationListProvider: FC<PropsWithChildren> = ({ children }) => {
    const homes = useHomes();
    const toast = useToast();
    const httpClient = useHttpClient();
    const [automations, setAutomations] = useState<AutomationDto[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    const fetchAutomations = async (): Promise<boolean> => {
        if (!homes.current?.id) {
            console.debug("[AutomationListProvider] No home selected.");
            return false;
        }
        const result = await httpClient.get(AutomationListUrl + homes.current?.id);
        if (result.isSuccess) {
            const data = (await result.response!.json()) as ListResponse<AutomationDto>;
            setAutomations(data.items);
            console.info("[AutomationListProvider] Successfully fetched automations.");
            return true;
        } else if (result.statusCode === 404) {
            console.warn("[AutomationListProvider] No automations found for the current home.");
            setAutomations([]);
            return false;
        } else {
            toast.httpError(result);
            setAutomations([]);
            return false;
        }
    };

    const refresh = async () => {
        setLoading(true);

        try {
            return fetchAutomations();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAutomations();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [homes.current?.id]);

    console.info("[AutomationListProvider] Initialized.");

    return (
        <AutomationListContext.Provider
            value={{
                automations,
                loading,
                refresh,
            }}>
            {children}
        </AutomationListContext.Provider>
    );
};

export { AutomationListProvider, AutomationListContext };
