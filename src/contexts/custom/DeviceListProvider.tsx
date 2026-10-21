import React, {
    createContext,
    useState,
    useEffect,
    useContext,
    useRef,
    PropsWithChildren,
    FC,
} from "react";
import { useHttpClient } from "../HttpClientProvider";
import { useHomes } from "../domain/HomeProvider";
import { ListResponse } from "@/utils/httpClient";
import { DevicePresenceType, OperationType } from "@/types/DeviceTypes";

export interface OperationListDto {
    id: string;
    name: string;
    type: OperationType;
}

interface DeviceTile {
    type: string;
    operationId?: string;
    displayableOperationId?: string;
    value: any;
    configuration?: any;
}

interface DevicePresence {
    type: DevicePresenceType;
    operationId?: string;
    value?: boolean | null;
    lastSeenAtUtc?: string | null;
}

interface Device {
    id: string;
    roomId?: string;
    icon: string;
    name: string;
    tile: DeviceTile;
    display: any;
    presence?: DevicePresence;
    createdAtUtc: string;
    updatedAtUtc: string;
}

interface DevicesContextProps {
    loading: boolean;
    error: string | null;
    devices: Device[];
    filteredDevices: Device[];
    filter: string;

    refresh(): Promise<boolean>;
    refreshDevice(deviceId: string): Promise<void>;
    setFilter(roomId: string): void;
    updateDeviceOperation(device: Device): void;
}

const DeviceListContext = createContext<DevicesContextProps>({
    loading: false,
    error: null,
    devices: [],
    filteredDevices: [],
    filter: "",

    refresh: async () => {
        console.warn("refresh not implemented.");
        return false;
    },
    refreshDevice: async () => {
        console.warn("refreshDevice not implemented.");
    },
    setFilter: () => {
        console.warn("setFilter not implemented.");
    },
    updateDeviceOperation: () => {
        console.warn("updateDeviceOperation not implemented.");
    },
});

export const useDeviceList = () => useContext(DeviceListContext);

const DeviceListProvider: FC<PropsWithChildren> = ({ children }) => {
    const homes = useHomes();
    const currentHomeId = useRef(homes.current?.id);
    currentHomeId.current = homes.current?.id;
    const httpClient = useHttpClient();
    const [filter, setFilter] = useState<string>("all");
    const [collection, setCollection] = useState<{ homeId?: string; items: Device[] }>({
        items: [],
    });
    const devices = collection.homeId === homes.current?.id ? collection.items : [];
    const activeFilter =
        filter === "all" || homes.current?.rooms.some((room) => room.id === filter)
            ? filter
            : "all";
    const filteredDevices =
        activeFilter === "all"
            ? devices
            : devices.filter((device) => device.roomId === activeFilter);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const refresh = async () => {
        setRefreshKey((k) => k + 1);
        return true;
    };

    const setFilterFunc = (roomId: string) => {
        setFilter(roomId);
    };

    const updateDeviceOperation = (device: Device) => {
        setCollection((previous) =>
            previous.homeId === currentHomeId.current
                ? {
                      ...previous,
                      items: previous.items.map((item) => (item.id === device.id ? device : item)),
                  }
                : previous,
        );
    };

    const refreshDevice = async (deviceId: string) => {
        const homeId = currentHomeId.current;
        const result = await httpClient.get(`v1/devices/${deviceId}/display`);

        if (result.isSuccess) {
            const updated = (await result.response!.json()) as Device;
            if (homeId === currentHomeId.current) updateDeviceOperation(updated);
            console.info(`[DeviceListProvider] Refreshed device: ${deviceId}`);
        } else {
            console.error(`[DeviceListProvider] Failed to refresh device: ${deviceId}`, result);
        }
    };

    useEffect(() => {
        setFilter("all");
    }, [homes.current?.id]);

    useEffect(() => {
        let active = true;
        const homeId = homes.current?.id;
        const getDevices = async () => {
            if (!homeId) {
                setCollection({ items: [] });
                setError(null);
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            try {
                // V1 defaults to ten items; int.MaxValue requests the full home collection.
                const result = await httpClient.get(
                    "v1/devices/display?size=2147483647&homeId=" + homeId,
                );
                if (!active) return;
                if (result.statusCode === 404) {
                    setCollection({ homeId, items: [] });
                } else {
                    if (!result.isSuccess || !result.response)
                        throw new Error("Device request failed");
                    const data = (await result.response.json()) as ListResponse<Device>;
                    if (!Array.isArray(data.items)) throw new Error("Invalid device list");
                    if (active) setCollection({ homeId, items: data.items });
                }
            } catch {
                if (active) setError("Couldn't load devices. Please try again.");
            } finally {
                if (active) setLoading(false);
            }
        };

        void getDevices();
        return () => {
            active = false;
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [homes.current?.id, refreshKey]);

    console.info("[DeviceListProvider] Initialized.");

    return (
        <DeviceListContext.Provider
            value={{
                devices,
                filteredDevices,
                filter: activeFilter,
                loading,
                error,
                refresh,
                refreshDevice,
                setFilter: setFilterFunc,
                updateDeviceOperation,
            }}>
            {children}
        </DeviceListContext.Provider>
    );
};

export { DeviceListProvider, DeviceListContext, Device, DevicePresence };
export type { OperationType } from "@/types/DeviceTypes";
