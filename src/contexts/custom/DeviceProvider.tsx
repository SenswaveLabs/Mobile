import React, {
    createContext,
    useEffect,
    useContext,
    PropsWithChildren,
    FC,
    useState,
    useRef,
} from "react";
import { useHttpClient } from "../HttpClientProvider";
import { ListResponse } from "@/utils/httpClient";
import { useToast } from "../ToastProvider";

export type ListDashboardDto = {
    id: string;
    name: string;
    icon: string;
    type: string;
};

type DashhoardDto = {
    type: "grid";
    configuration: any;
};

interface DeviceContextProps {
    loading: boolean;
    deviceId: string;
    dashboards: ListDashboardDto[];
    currentDashboard?: DashhoardDto;
    currentDashboardId: string;
    setDeviceId: (id: string) => void;
    setCurrentDashboardId: (id: string) => void;
    refresh: (useLoading: boolean) => Promise<void>;
    smartRefresh: (incomingDeviceId: string) => Promise<void>;
}

const DeviceContext = createContext<DeviceContextProps>({
    loading: false,
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

const DeviceProvider: FC<PropsWithChildren> = ({ children }) => {
    const httpClient = useHttpClient();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [deviceId, setDeviceId] = useState("");
    const [dashboards, setDashboards] = useState<ListDashboardDto[]>([]);
    const [currentDashboardId, setCurrentDashboardId] = useState("");
    const [currentDashboard, setCurrentDashboard] = useState<DashhoardDto | undefined>(undefined);
    const currentDashboardIdRef = useRef(currentDashboardId);
    const deviceIdRef = useRef(deviceId);

    useEffect(() => {
        deviceIdRef.current = deviceId;
    }, [deviceId]);

    useEffect(() => {
        currentDashboardIdRef.current = currentDashboardId;
    }, [currentDashboardId]);

    const smartRefresh = async (incomingDeviceId: string) => {
        if (deviceIdRef.current === incomingDeviceId) {
            console.info(`[DeviceProvider] Data refresh for ${incomingDeviceId}.`);
            await baseLoadingLogic();
        } else {
            console.info(
                `[DeviceProvider] Data refresh skipped. Expected deviceId: ${deviceIdRef.current}, received: ${incomingDeviceId}`,
            );
        }
    };

    const baseLoadingLogic = async () => {
        const result = await httpClient.get(
            `v1/devices/dashboards/display?deviceId=${deviceIdRef.current}`,
        );

        if (result.isSuccess) {
            const content = (await result.response!.json()) as ListResponse<ListDashboardDto>;
            setDashboards(content.items);

            if (content.items.length === 0) {
                setCurrentDashboardId("");
                console.info("[DeviceProvider] Refreshing resulted in no dashboards.");
                return;
            }

            let tmpDashboardId = currentDashboardIdRef.current;

            if (content.items.find((d) => d.id === currentDashboardIdRef.current) === undefined) {
                tmpDashboardId = content.items[0].id;
                console.info(`[DeviceProvider] Current dashboard not found in refreshed list.`);
            }

            const dashboardResult = await httpClient.get(
                `v1/devices/dashboards/${tmpDashboardId}/display`,
            );

            if (dashboardResult.isSuccess) {
                const content = (await dashboardResult.response!.json()) as DashhoardDto;
                setCurrentDashboardId(tmpDashboardId);
                setCurrentDashboard(content);
                console.info("[DeviceProvider] Fetched dashboard details.");
            } else {
                const text = await dashboardResult.response!.text();
                console.error(
                    "[DeviceProvider] Failed to fetch dashboard details.",
                    dashboardResult,
                    text,
                );
            }

            console.info("[DeviceProvider] Fetched dashboards for device.");
        } else if (result.statusCode === 404) {
            setDashboards([]);
            setCurrentDashboardId("");
            console.info("[DeviceProvider] No dashboards found for device.");
        } else {
            console.error("[DeviceProvider] Failed to fetch dashboards.", result);
            toast.httpError(result);
            setDashboards([]);
            setCurrentDashboardId("");
        }
    };

    const refresh = async (useLoading: boolean = true) => {
        if (deviceIdRef.current === "") {
            console.info("[DeviceProvider] Device Id is empty.");
            return;
        }

        if (loading) {
            console.info("[DeviceProvider] Already loading.");
            return;
        }

        if (useLoading) {
            setLoading(true);
        }

        await baseLoadingLogic();

        if (useLoading) {
            setLoading(false);
        }
    };

    const setDeviceIdHandler = (id: string) => {
        console.info("[DeviceProvider] Device Id set to: " + id);
        setDeviceId(id);
        deviceIdRef.current = id;
    };

    const setCurrentDashboardIdHandler = (id: string) => {
        console.info("[DeviceProvider] Current Dashboard Id set to: " + id);
        setCurrentDashboardId(id);
        currentDashboardIdRef.current = id;
    };

    useEffect(() => {
        if (deviceIdRef.current === "") {
            console.info("[DeviceProvider] Device Id is empty.");
            return;
        }

        const getDashboards = async () => {
            setLoading(true);
            const result = await httpClient.get(
                `v1/devices/dashboards/display?deviceId=${deviceIdRef.current}`,
            );

            if (result.isSuccess) {
                const content = (await result.response!.json()) as ListResponse<ListDashboardDto>;
                setDashboards(content.items);
                if (content.items.length > 0) {
                    setCurrentDashboardId(content.items[0].id);
                } else {
                    setCurrentDashboardId("");
                }
                console.info("[DeviceProvider] Fetched dashboards for device. In useEffect.");
            } else if (result.statusCode === 404) {
                setDashboards([]);
                setCurrentDashboardId("");
                console.info("[DeviceProvider] No dashboards found for device.");
            } else {
                console.error("[DeviceProvider] Failed to fetch dashboards.", result);
                toast.httpError(result);
                setDashboards([]);
                setCurrentDashboardId("");
            }
            setLoading(false);
        };

        getDashboards();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deviceIdRef, deviceId]);

    useEffect(() => {
        const getDashboardDetails = async (id: string) => {
            setLoading(true);

            const result = await httpClient.get(`v1/devices/dashboards/${id}/display`);

            if (result.isSuccess) {
                const content = (await result.response!.json()) as DashhoardDto;
                setCurrentDashboard(content);
                console.info("[DeviceProvider] Fetched dashboard details.");
            } else {
                const text = await result.response!.text();
                console.error("[DeviceProvider] Failed to fetch dashboard details.", result, text);
            }

            setLoading(false);
        };

        if (currentDashboardIdRef.current) {
            getDashboardDetails(currentDashboardIdRef.current);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentDashboardIdRef, currentDashboardId]);

    return (
        <DeviceContext.Provider
            value={{
                loading,
                dashboards,
                currentDashboard,
                currentDashboardId,
                setCurrentDashboardId: setCurrentDashboardIdHandler,
                deviceId,
                setDeviceId: setDeviceIdHandler,
                refresh,
                smartRefresh,
            }}>
            {children}
        </DeviceContext.Provider>
    );
};

export { DeviceProvider };
