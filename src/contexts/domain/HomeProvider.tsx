import React, { createContext, useState, useContext, ReactNode, FC, useEffect } from "react";
import { useHttpClient } from "../HttpClientProvider";
import { useToast } from "../ToastProvider";
import { Home, Room } from "@/types/HomeTypes";
import { ListResponse } from "@/utils/httpClient";
import { getCurrentLocation } from "@/utils/location";

interface InitializeHomeOptions {
    silent?: boolean;
}

interface HomesContextProps {
    loading: boolean;
    current: Home | undefined;
    setCurrent: (homeId: string) => Promise<boolean>;
    refreshCurrent: () => Promise<void>;
    refreshRooms: () => Promise<void>;
    initializeCurrentHome: (options?: InitializeHomeOptions) => Promise<boolean>;
    updateHomeDataSourceState: (dataSourceId: string, state: string) => Promise<void>;
}

const HomesContext = createContext<HomesContextProps>({
    loading: true,
    current: undefined,
    setCurrent: async () => {
        console.error("[HomesContext] Not initialized.");
        return false;
    },
    refreshRooms: async () => {
        console.error("[HomesContext] Not initialized.");
    },
    initializeCurrentHome: async () => {
        console.error("[HomesContext] Not initialized.");
        return false;
    },
    refreshCurrent: async () => {
        console.error("[HomesContext] Not initialized.");
    },
    updateHomeDataSourceState: async () => {
        console.error("[HomesContext] Not initialized.");
    },
});

export const useHomes = (): HomesContextProps => useContext(HomesContext);

export const HomeProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const toast = useToast();
    const httpClient = useHttpClient();
    const [loading, setLoading] = useState<boolean>(true);
    const [currentHome, setCurrentHome] = useState<Home | undefined>(undefined);

    const setCurrent = async (homeId: string) => {
        const response = await httpClient.get(`v1/homes/${homeId}`);

        if (response.isSuccess) {
            const data = await response.response!.json();
            const home = data as Home;
            setCurrentHome(home);
            console.info("[HomesProvider] Current home loaded.");
            return true;
        } else {
            console.error("[HomesProvider] Failed to set current home.");
            return false;
        }
    };

    const refreshRooms = async () => {
        console.info("[HomesProvider] Triggering rooms refresh.");

        if (!currentHome?.id) {
            console.debug("[Rooms View] No home selected.");
            return;
        }

        const result = await httpClient.get(`v1/homes/${currentHome?.id}/rooms/display`);

        if (result.isSuccess) {
            const rooms = (await result.response!.json()) as ListResponse<Room>;

            setCurrentHome((prev) => ({
                ...prev!,
                rooms: rooms.items || [],
            }));

            console.debug("[Rooms View] Rooms refreshed.");
        } else if (result.statusCode === 404) {
            console.debug("[Rooms View] No rooms found.");
            setCurrentHome((prev) => ({
                ...prev!,
                rooms: [],
            }));
        } else {
            toast.httpError(result);
        }
    };

    const initializeCurrentHome = async ({ silent = false }: InitializeHomeOptions = {}) => {
        setLoading(true);
        try {
            let path = "";
            const currentLocation = await getCurrentLocation();

            if (currentLocation) {
                const { latitude, longitude } = currentLocation;
                path = `?latitude=${latitude}&longitude=${longitude}`;
            }

            const response = await httpClient.get(`v1/homes/current${path}`);

            if (response.statusCode === 404) {
                if (!silent) toast.info("Create your first home!");
                console.info("[HomesProvider] Homes not found.");
                setCurrentHome(undefined);
                return false;
            } else if (!response.isSuccess || !response.response) {
                if (!silent) toast.httpError(response);
                return false;
            }

            const currentHome = (await response.response.json()) as Home;
            if (!currentHome?.id) throw new Error("Invalid current home response");
            const homeResponse = await httpClient.get(`v1/homes/${currentHome.id}`);
            if (!homeResponse.isSuccess || !homeResponse.response) {
                if (!silent) toast.httpError(homeResponse);
                return false;
            }

            const home = (await homeResponse.response.json()) as Home;
            if (!home?.id) throw new Error("Invalid home response");
            setCurrentHome(home);
            console.info("[HomesProvider] Current home loaded.");
            return true;
        } catch {
            console.error("[HomesProvider] Failed to initialize current home.");
            if (!silent) toast.error("Couldn't load your home. Please try again.");
            return false;
        } finally {
            setLoading(false);
        }
    };

    const refreshCurrent = async () => {
        setLoading(true);

        const response2 = await httpClient.get(`v1/homes/${currentHome?.id}`);

        if (response2.isSuccess) {
            const data = await response2.response!.json();
            const home = data as Home;
            setCurrentHome(home);
            console.info("[HomesProvider] Current home loaded.");
            setLoading(false);
        } else {
            console.error("[HomesProvider] Failed to set current home.");
            setLoading(false);
        }
    };

    const updateHomeDataSourceState = async (dataSourceId: string, state: string) => {
        if (currentHome?.dataSource?.id === dataSourceId) {
            setCurrentHome((prev) => ({
                ...prev!,
                dataSource: {
                    ...prev!.dataSource!,
                    state: state,
                },
            }));
            console.info(
                "[HomesProvider] Home data source state updated. DataSource:" +
                    dataSourceId +
                    " New state: " +
                    state,
            );
        } else {
            console.info(
                "[HomesProvider] Data source ID does not match current home's data source. No update performed. Current: " +
                    currentHome?.dataSource?.id +
                    ", Given: " +
                    dataSourceId,
            );
        }
    };

    useEffect(() => {
        initializeCurrentHome();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <HomesContext.Provider
            value={{
                loading: loading,
                current: currentHome,
                setCurrent,
                refreshRooms,
                initializeCurrentHome,
                refreshCurrent,
                updateHomeDataSourceState,
            }}>
            {children}
        </HomesContext.Provider>
    );
};
