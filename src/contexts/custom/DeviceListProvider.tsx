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
    const toast = useToast();
    const httpClient = useHttpClient();
    const [filter, setFilter] = useState<string>("all");
    const [devices, setDevices] = useState<Device[]>([]);
    const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshKey, setRefreshKey] = useState(0);

    const refresh = async () => {
        setRefreshKey((k) => k + 1);
        return true;
    };

    const setFilterFunc = (roomId: string) => {
        setFilter(roomId);
    };

    const updateDeviceOperation = async (device: Device) => {
        const newDevices = devices.map((d) => {
            if (d.id === device.id) {
                return device;
            }
            return d;
        });

        setDevices(newDevices);
    };

    const refreshDevice = async (deviceId: string) => {
        const result = await httpClient.get(`v1/devices/${deviceId}/display`);

        if (result.isSuccess) {
            const updated = (await result.response!.json()) as Device;
            setDevices((prev) => prev.map((d) => (d.id === deviceId ? updated : d)));
            console.info(`[DeviceListProvider] Refreshed device: ${deviceId}`);
        } else {
            console.error(`[DeviceListProvider] Failed to refresh device: ${deviceId}`, result);
        }
    };

    useEffect(() => {
        const filtered =
            filter === "all" ? devices : devices.filter((device) => device.roomId === filter);
        setFilteredDevices(filtered);
    }, [devices, filter]);

    useEffect(() => {
        const getDevices = async () => {
            if (!homes.current?.id) {
                console.debug("[DeviceListProvider] No home selected.");
                return;
            }

            setLoading(true);
            setFilter("all");

            const result = await httpClient.get("v1/devices/display?homeId=" + homes.current?.id);

            if (result.isSuccess) {
                const data = (await result.response!.json()) as ListResponse<Device>;

                setDevices(data.items);
                setFilteredDevices(data.items);

                console.info("[DeviceListProvider] Successfully fetched devices.");
            } else if (result.statusCode === 404) {
                console.warn("[DeviceListProvider] No devices found for the current home.");
                setDevices([]);
                setFilteredDevices([]);
            } else {
                toast.httpError(result);
                setDevices([]);
            }

            setLoading(false);
        };

        getDevices();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [homes.current?.id, refreshKey]);

    console.info("[DeviceListProvider] Initialized.");

    return (
        <DeviceListContext.Provider
            value={{
                devices,
                filteredDevices,
                filter,
                loading,
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
