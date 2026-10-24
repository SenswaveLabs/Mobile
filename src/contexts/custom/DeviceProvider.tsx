import React, {
    createContext,
    useEffect,
    useContext,
    PropsWithChildren,
    FC,
    useRef,
    useState,
} from "react";
import { useHttpClient } from "../HttpClientProvider";

export type ListDashboardDto = {
    id: string;
    name: string;
    icon: string;
    type: string;
};

type DashboardDto = {
    type: string;
    configuration: any;
};

interface DeviceContextProps {
    loading: boolean;
    loadError: string | null;
    deviceId: string;
    dashboards: ListDashboardDto[];
    currentDashboard?: DashboardDto;
    currentDashboardId: string;
    setDeviceId: (id: string) => void;
    setCurrentDashboardId: (id: string) => void;
    refresh: (useLoading: boolean) => Promise<void>;
    smartRefresh: (incomingDeviceId: string) => Promise<void>;
}

const DeviceContext = createContext<DeviceContextProps>({
    loading: false,
    loadError: null,
    deviceId: "",
    dashboards: [],
    currentDashboardId: "",
    currentDashboard: undefined,
    setDeviceId: () => {},
    setCurrentDashboardId: () => {},
    refresh: async () => {},
    smartRefresh: async () => {},
});

export const useDevice = () => useContext(DeviceContext);

const isDashboardList = (value: unknown): value is ListDashboardDto[] =>
    Array.isArray(value) &&
    value.every(
        (dashboard) =>
            dashboard &&
            typeof dashboard.id === "string" &&
            dashboard.id.length > 0 &&
            typeof dashboard.name === "string" &&
            typeof dashboard.icon === "string" &&
            typeof dashboard.type === "string",
    );

const isDashboard = (value: unknown): value is DashboardDto =>
    Boolean(
        value &&
        typeof value === "object" &&
        typeof (value as DashboardDto).type === "string" &&
        (value as DashboardDto).configuration &&
        typeof (value as DashboardDto).configuration === "object",
    );

const DeviceProvider: FC<PropsWithChildren> = ({ children }) => {
    const httpClient = useHttpClient();
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [deviceId, setDeviceIdState] = useState("");
    const [dashboards, setDashboards] = useState<ListDashboardDto[]>([]);
    const [currentDashboardId, setCurrentDashboardIdState] = useState("");
    const [currentDashboard, setCurrentDashboard] = useState<DashboardDto | undefined>(undefined);

    const deviceIdRef = useRef(deviceId);
    const selectedDashboardIdRef = useRef(currentDashboardId);
    const dashboardsRef = useRef(dashboards);
    const dashboardResourceRef = useRef<{ deviceId: string; dashboardId: string } | undefined>(
        undefined,
    );
    const collectionRequestRef = useRef(0);
    const dashboardRequestRef = useRef(0);

    deviceIdRef.current = deviceId;
    selectedDashboardIdRef.current = currentDashboardId;
    dashboardsRef.current = dashboards;

    const clearDashboard = () => {
        dashboardResourceRef.current = undefined;
        setCurrentDashboard(undefined);
    };

    const fetchDashboard = async (
        targetDeviceId: string,
        dashboardId: string,
        collectionRequest?: number,
    ) => {
        const request = ++dashboardRequestRef.current;
        const isCurrent = () =>
            request === dashboardRequestRef.current &&
            targetDeviceId === deviceIdRef.current &&
            dashboardId === selectedDashboardIdRef.current &&
            (collectionRequest === undefined || collectionRequest === collectionRequestRef.current);

        if (!targetDeviceId || !dashboardId) return;
        if (
            dashboardResourceRef.current?.deviceId !== targetDeviceId ||
            dashboardResourceRef.current.dashboardId !== dashboardId
        )
            clearDashboard();
        setLoading(true);
        setLoadError(null);
        try {
            const result = await httpClient.get(`v1/devices/dashboards/${dashboardId}/display`);
            if (!result.isSuccess || !result.response) throw new Error("Dashboard read failed");
            const content: unknown = await result.response.json();
            if (!isDashboard(content)) throw new Error("Dashboard response is invalid");
            if (!isCurrent()) return;
            dashboardResourceRef.current = { deviceId: targetDeviceId, dashboardId };
            setCurrentDashboard(content);
        } catch {
            if (isCurrent()) setLoadError("Couldn't load dashboards. Try again.");
        } finally {
            if (isCurrent()) setLoading(false);
        }
    };

    const fetchDashboards = async (targetDeviceId: string, useLoading: boolean) => {
        if (!targetDeviceId || targetDeviceId !== deviceIdRef.current) return;
        const request = ++collectionRequestRef.current;
        ++dashboardRequestRef.current;
        const isCurrent = () =>
            request === collectionRequestRef.current && targetDeviceId === deviceIdRef.current;
        const cachedSelectionIsCurrent =
            dashboardResourceRef.current?.deviceId === targetDeviceId &&
            dashboardResourceRef.current.dashboardId === selectedDashboardIdRef.current;

        if (useLoading || !cachedSelectionIsCurrent) setLoading(true);
        setLoadError(null);
        try {
            const result = await httpClient.get(
                `v1/devices/dashboards/display?deviceId=${targetDeviceId}`,
            );
            if (result.statusCode === 404 && !result.isSuccess) {
                if (!isCurrent()) return;
                dashboardsRef.current = [];
                setDashboards([]);
                selectedDashboardIdRef.current = "";
                setCurrentDashboardIdState("");
                clearDashboard();
                return;
            }
            if (!result.isSuccess || !result.response) throw new Error("Dashboard list failed");
            const content: unknown = await result.response.json();
            const items =
                content && typeof content === "object" && "items" in content
                    ? (content as { items: unknown }).items
                    : undefined;
            if (!isDashboardList(items)) throw new Error("Dashboard list response is invalid");
            if (!isCurrent()) return;

            dashboardsRef.current = items;
            setDashboards(items);
            if (items.length === 0) {
                selectedDashboardIdRef.current = "";
                setCurrentDashboardIdState("");
                clearDashboard();
                return;
            }

            const selectedDashboardId = items.some(
                (dashboard) => dashboard.id === selectedDashboardIdRef.current,
            )
                ? selectedDashboardIdRef.current
                : items[0].id;
            selectedDashboardIdRef.current = selectedDashboardId;
            setCurrentDashboardIdState(selectedDashboardId);
            if (
                dashboardResourceRef.current?.deviceId !== targetDeviceId ||
                dashboardResourceRef.current.dashboardId !== selectedDashboardId
            )
                clearDashboard();
            await fetchDashboard(targetDeviceId, selectedDashboardId, request);
        } catch {
            if (isCurrent()) setLoadError("Couldn't load dashboards. Try again.");
        } finally {
            if (isCurrent()) setLoading(false);
        }
    };

    const setDeviceId = (id: string) => {
        if (id === deviceIdRef.current) return;
        deviceIdRef.current = id;
        selectedDashboardIdRef.current = "";
        dashboardsRef.current = [];
        ++collectionRequestRef.current;
        ++dashboardRequestRef.current;
        dashboardResourceRef.current = undefined;
        setDeviceIdState(id);
        setDashboards([]);
        setCurrentDashboardIdState("");
        setCurrentDashboard(undefined);
        setLoadError(null);
        setLoading(Boolean(id));
    };

    const setCurrentDashboardId = (id: string) => {
        if (id === selectedDashboardIdRef.current) return;
        selectedDashboardIdRef.current = id;
        setCurrentDashboardIdState(id);
        if (
            dashboardResourceRef.current?.deviceId !== deviceIdRef.current ||
            dashboardResourceRef.current.dashboardId !== id
        )
            clearDashboard();
        setLoadError(null);
        if (dashboardsRef.current.some((dashboard) => dashboard.id === id))
            void fetchDashboard(deviceIdRef.current, id);
    };

    const refresh = async (useLoading: boolean = true) => {
        await fetchDashboards(deviceIdRef.current, useLoading);
    };

    const smartRefresh = async (incomingDeviceId: string) => {
        if (deviceIdRef.current === incomingDeviceId) await refresh(false);
    };

    useEffect(() => {
        if (deviceId) void fetchDashboards(deviceId, true);
        else setLoading(false);
        // Load once per bound device; the callback reads current refs.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deviceId]);

    return (
        <DeviceContext.Provider
            value={{
                loading,
                loadError,
                dashboards,
                currentDashboard,
                currentDashboardId,
                setCurrentDashboardId,
                deviceId,
                setDeviceId,
                refresh,
                smartRefresh,
            }}>
            {children}
        </DeviceContext.Provider>
    );
};

export { DeviceProvider };
