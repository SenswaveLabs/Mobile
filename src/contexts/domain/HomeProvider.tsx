import React, {
    createContext,
    useState,
    useContext,
    ReactNode,
    FC,
    useEffect,
    useRef,
} from "react";
import { useHttpClient } from "../HttpClientProvider";
import { useToast } from "../ToastProvider";
import { Home, Room } from "@/types/HomeTypes";
import { ListResponse } from "@/utils/httpClient";
import { getCurrentLocation } from "@/utils/location";

interface InitializeHomeOptions {
    silent?: boolean;
    removedHomeId?: string;
}

interface RefreshRoomsOptions {
    silent?: boolean;
}

export interface RefreshCurrentHomeOptions {
    homeId?: string;
    background?: boolean;
}

interface HomesContextProps {
    loading: boolean;
    current: Home | undefined;
    setCurrent: (homeId: string) => Promise<boolean>;
    refreshCurrent: (options?: RefreshCurrentHomeOptions) => Promise<boolean>;
    refreshRooms: (options?: RefreshRoomsOptions) => Promise<boolean>;
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
        return false;
    },
    initializeCurrentHome: async () => {
        console.error("[HomesContext] Not initialized.");
        return false;
    },
    refreshCurrent: async () => {
        console.error("[HomesContext] Not initialized.");
        return false;
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
    const currentHomeRef = useRef(currentHome);
    currentHomeRef.current = currentHome;
    const roomsRequest = useRef(0);

    const setCurrent = async (homeId: string) => {
        const response = await httpClient.get(`v1/homes/${homeId}`);

        if (response.isSuccess) {
            const data = await response.response!.json();
            const home = data as Home;
            currentHomeRef.current = home;
            setCurrentHome(home);
            console.info("[HomesProvider] Current home loaded.");
            return true;
        } else {
            console.error("[HomesProvider] Failed to set current home.");
            return false;
        }
    };

    const refreshRooms = async ({ silent = false }: RefreshRoomsOptions = {}) => {
        console.info("[HomesProvider] Triggering rooms refresh.");

        const homeId = currentHome?.id;
        if (!homeId) {
            console.debug("[Rooms View] No home selected.");
            return false;
        }

        const requestId = ++roomsRequest.current;
        try {
            const result = await httpClient.get(`v1/homes/${homeId}/rooms/display`);
            const rooms = result.isSuccess
                ? ((await result.response!.json()) as ListResponse<Room>).items || []
                : result.statusCode === 404
                  ? []
                  : undefined;
            if (rooms === undefined) {
                if (!silent && requestId === roomsRequest.current) toast.httpError(result);
                return false;
            }
            if (requestId !== roomsRequest.current) return false;
            const current = currentHomeRef.current;
            if (current?.id !== homeId) return false;
            const updated = { ...current, rooms };
            currentHomeRef.current = updated;
            setCurrentHome(updated);
            return true;
        } catch {
            if (!silent && requestId === roomsRequest.current)
                toast.error("Couldn't load rooms. Try again.");
            return false;
        }
    };

    const initializeCurrentHome = async ({
        silent = false,
        removedHomeId,
    }: InitializeHomeOptions = {}) => {
        setLoading(true);
        if (removedHomeId && currentHomeRef.current?.id === removedHomeId) {
            currentHomeRef.current = undefined;
            setCurrentHome(undefined);
        }
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
                const current = currentHomeRef.current;
                if (!removedHomeId || !current || current.id === removedHomeId) {
                    currentHomeRef.current = undefined;
                    setCurrentHome(undefined);
                }
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
            if (home.id === removedHomeId) throw new Error("Removed home returned as current");
            const current = currentHomeRef.current;
            if (!removedHomeId || !current || current.id === removedHomeId) {
                currentHomeRef.current = home;
                setCurrentHome(home);
            }
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

    const refreshCurrent = async ({
        homeId: requestedHomeId,
        background = false,
    }: RefreshCurrentHomeOptions = {}) => {
        if (!background) setLoading(true);
        const homeId = requestedHomeId ?? currentHomeRef.current?.id;
        try {
            if (!homeId || currentHomeRef.current?.id !== homeId) return false;
            const response = await httpClient.get(`v1/homes/${homeId}`);
            if (!response.isSuccess || !response.response) return false;
            const home = (await response.response.json()) as Home;
            if (!home || typeof home !== "object" || Array.isArray(home) || home.id !== homeId)
                return false;
            if (currentHomeRef.current?.id !== homeId) return false;
            currentHomeRef.current = home;
            setCurrentHome(home);
            console.info("[HomesProvider] Current home loaded.");
            return true;
        } catch {
            console.error("[HomesProvider] Failed to set current home.");
            return false;
        } finally {
            if (!background) setLoading(false);
        }
    };

    const updateHomeDataSourceState = async (dataSourceId: string, state: string) => {
        const current = currentHomeRef.current;
        if (current?.dataSource?.id === dataSourceId) {
            const updated = {
                ...current,
                dataSource: {
                    ...current.dataSource,
                    state: state,
                },
            };
            currentHomeRef.current = updated;
            setCurrentHome(updated);
            console.info(
                "[HomesProvider] Home data source state updated. DataSource:" +
                    dataSourceId +
                    " New state: " +
                    state,
            );
        } else {
            console.info(
                "[HomesProvider] Data source ID does not match current home's data source. No update performed. Current: " +
                    current?.dataSource?.id +
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
