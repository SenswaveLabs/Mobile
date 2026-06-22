import React, { createContext, useState, useContext, ReactNode, FC, useEffect } from "react";
import { useHttpClient } from "../HttpClientProvider";
import { useToast } from "../ToastProvider";
import { Home, Room } from "@/types/HomeTypes";
import { ListResponse } from "@/utils/httpClient";
import { getCurrentLocation } from "@/utils/location";

interface HomesContextProps {
    loading: boolean;
    current: Home | undefined;
    setCurrent: (homeId: string) => Promise<boolean>;
    refreshCurrent: () => Promise<void>;
    refreshRooms: () => Promise<void>;
    initializeCurrentHome: () => Promise<boolean>;
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

    const initializeCurrentHome = async () => {
        let path = "";
        const currentLocation = await getCurrentLocation();
        setLoading(true);

        if (currentLocation) {
            const { latitude, longitude } = currentLocation;
            path = `?latitude=${latitude}&longitude=${longitude}`;
        }

        const response = await httpClient.get(`v1/homes/current${path}`);

        if (response.statusCode === 404) {
            toast.info("Create your first home!");
            console.info("[HomesProvider] Homes not found.");
            setCurrentHome(undefined);
            setLoading(false);
            return false;
        } else if (response.statusCode >= 300) {
            toast.httpError(response);
            setLoading(false);
            return false;
        }

        const data = await response.response!.json();
        const currentHome = data as Home;

        const homeResponse = await httpClient.get(`v1/homes/${currentHome.id}`);

        if (homeResponse.isSuccess) {
            const data = await homeResponse.response!.json();
            const home = data as Home;
            setCurrentHome(home);
            console.info("[HomesProvider] Current home loaded.");
            setLoading(false);
            return true;
        } else {
            toast.httpError(homeResponse);
            setLoading(false);
            return false;
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
