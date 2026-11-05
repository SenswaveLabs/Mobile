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

const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === "object" && !Array.isArray(value);

const isHomeRefreshResponse = (value: unknown, homeId: string): value is Home => {
    if (
        !isRecord(value) ||
        value.id !== homeId ||
        typeof value.name !== "string" ||
        typeof value.icon !== "string" ||
        typeof value.isOwner !== "boolean" ||
        !Array.isArray(value.rooms) ||
        (value.canManage !== undefined && typeof value.canManage !== "boolean")
    )
        return false;

    if (
        value.dataSource !== undefined &&
        value.dataSource !== null &&
        (!isRecord(value.dataSource) ||
            typeof value.dataSource.id !== "string" ||
            typeof value.dataSource.name !== "string" ||
            typeof value.dataSource.state !== "string")
    )
        return false;

    if (
        value.location !== undefined &&
        value.location !== null &&
        (!isRecord(value.location) ||
            !Number.isFinite(value.location.latitude) ||
            !Number.isFinite(value.location.longitude))
    )
        return false;

    return value.rooms.every(
        (room) => isRecord(room) && typeof room.id === "string" && typeof room.name === "string",
    );
};

interface HomesContextProps {
    loading: boolean;
    error: string;
    current: Home | undefined;
    setCurrent: (homeId: string) => Promise<boolean>;
    refreshCurrent: (options?: RefreshCurrentHomeOptions) => Promise<boolean>;
    refreshRooms: (options?: RefreshRoomsOptions) => Promise<boolean>;
    initializeCurrentHome: (options?: InitializeHomeOptions) => Promise<boolean>;
    updateHomeDataSourceState: (dataSourceId: string, state: string) => Promise<void>;
}

const HomesContext = createContext<HomesContextProps>({
    loading: true,
    error: "",
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
    const httpClient = useHttpClient();
    const [loading, setLoading] = useState<boolean>(true);
    const [currentHome, setCurrentHome] = useState<Home | undefined>(undefined);
    const currentHomeRef = useRef(currentHome);
    currentHomeRef.current = currentHome;
    const roomsRequest = useRef(0);
    const homeRequest = useRef(0);
    const [error, setError] = useState("");

    const setCurrent = async (homeId: string) => {
        const response = await httpClient.get(`v1/homes/${homeId}`);

        if (response.isSuccess) {
            const data = await response.response!.json();
            const home = data as Home;
            currentHomeRef.current = home;
            setCurrentHome(home);
            setError("");
            console.info("[HomesProvider] Current home loaded.");
            return true;
        } else {
            console.error("[HomesProvider] Failed to set current home.");
            return false;
        }
    };

    const refreshRooms = async (_options: RefreshRoomsOptions = {}) => {
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
            return false;
        }
    };

    const initializeCurrentHome = async ({ removedHomeId }: InitializeHomeOptions = {}) => {
        const selectedHome = currentHomeRef.current;
        if (removedHomeId && selectedHome && selectedHome.id !== removedHomeId) return true;
        const requestId = ++homeRequest.current;
        setLoading(true);
        setError("");
        if (removedHomeId && currentHomeRef.current?.id === removedHomeId) {
            currentHomeRef.current = undefined;
            setCurrentHome(undefined);
        }
        const startingHomeId = currentHomeRef.current?.id;
        const isCurrent = () =>
            requestId === homeRequest.current && currentHomeRef.current?.id === startingHomeId;
        try {
            let path = "";
            const currentLocation = await getCurrentLocation();
            if (!isCurrent()) return false;
            if (currentLocation) {
                const { latitude, longitude } = currentLocation;
                path = `?latitude=${latitude}&longitude=${longitude}`;
            }
            const response = await httpClient.get(`v1/homes/current${path}`);
            if (!isCurrent()) return false;
            if (response.statusCode === 404) {
                currentHomeRef.current = undefined;
                setCurrentHome(undefined);
                return false;
            }
            if (!response.isSuccess || !response.response) throw new Error("Home read failed");
            const selection: unknown = await response.response.json();
            if (!isCurrent()) return false;
            if (!isRecord(selection) || typeof selection.id !== "string" || !selection.id)
                throw new Error("Invalid current home response");
            const homeResponse = await httpClient.get(`v1/homes/${selection.id}`);
            if (!isCurrent()) return false;
            if (!homeResponse.isSuccess || !homeResponse.response)
                throw new Error("Home read failed");
            const home: unknown = await homeResponse.response.json();
            if (!isCurrent()) return false;
            if (!isHomeRefreshResponse(home, selection.id) || home.id === removedHomeId)
                throw new Error("Invalid home response");
            currentHomeRef.current = home;
            setCurrentHome(home);
            return true;
        } catch {
            if (isCurrent()) setError("Couldn't load your home. Please try again.");
            return false;
        } finally {
            if (requestId === homeRequest.current) setLoading(false);
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
            const body: unknown = await response.response.json();
            if (!isHomeRefreshResponse(body, homeId)) return false;
            const home = body;
            if (currentHomeRef.current?.id !== homeId) return false;
            currentHomeRef.current = home;
            setCurrentHome(home);
            setError("");
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
                error,
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
