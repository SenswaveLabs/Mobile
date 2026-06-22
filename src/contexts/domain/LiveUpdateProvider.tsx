import React, { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { useSignalR } from "../SignalRProvider";
import { useHomes } from "./HomeProvider";
import { useDevice } from "../custom/DeviceProvider";
import { useDeviceList } from "../custom/DeviceListProvider";

interface LiveUpdateProperties {
    addDeviceTileCallback: (deviceId: string, callback: (message: string) => Promise<any>) => void;
    addHomeDataSourceCallback: (callback: (message: string) => Promise<any>) => void;
}

const LiveUpdateContext = createContext<LiveUpdateProperties>({
    addDeviceTileCallback: () => {},
    addHomeDataSourceCallback: () => {},
});

export const useLiveUpdate = () => useContext(LiveUpdateContext);

export const LiveUpdateProvider = ({ children }: any) => {
    const signalR = useSignalR();
    const home = useHomes();
    const device = useDevice();
    const deviceList = useDeviceList();

    const addDeviceTileCallback = useCallback(
        (deviceId: string, callback: (message: string) => Promise<any>) => {
            devicesCallbacks.current.set(deviceId, callback);
            console.debug(`[Live Update] Callback set for device: ${deviceId}`);
        },
        [],
    );

    const addHomeDataSourceCallback = useCallback((callback: (message: string) => Promise<any>) => {
        homeDataSourceCallback.current = callback;
        console.debug(`[Live Update] Callback set for home data source`);
    }, []);

    const devicesCallbacks = useRef<Map<string, (message: string) => Promise<any>>>(new Map());
    const homeDataSourceCallback = useRef<(message: string) => Promise<any>>(() =>
        Promise.resolve(),
    );

    const widgetUpdate = async (deviceId: string) => {
        try {
            console.info("[Live Update] Widget update for device:", deviceId);
            await device.smartRefresh(deviceId);
        } catch (error) {
            console.error("[Live Update] Error executing deviceTileActionUpdate", error);
        }
    };

    const homeDataSourceUpdate = async (dataSourceId: string, state: string) => {
        try {
            console.info("[Live Update] DataSource update in home.");
            home.updateHomeDataSourceState(dataSourceId, state);
        } catch (error) {
            console.error("[Live Update] Error executing dataSourceStateUpdate", error);
        }
    };

    useEffect(() => {
        if (signalR.data.connection) {
            signalR.data.connection.off("Update");

            signalR.data.connection.on("Update", (updateType: string, data: any) => {
                console.info(`[Live Update] Received update: ${updateType}`);

                if (updateType === "deviceTileActionUpdate") {
                    try {
                        const deviceId = data.deviceId;
                        const callback = devicesCallbacks.current.get(deviceId);
                        if (callback) {
                            callback(data);
                        }
                    } catch (error) {
                        console.error(
                            "[Live Update] Error executing deviceTileActionUpdate",
                            error,
                        );
                    }
                } else if (updateType === "widgetsActionUpdate") {
                    widgetUpdate(data.deviceId);
                } else if (updateType === "dataSourceStateUpdate") {
                    homeDataSourceUpdate(data.dataSourceId, data.state);
                } else if (updateType === "devicePresenceUpdate") {
                    deviceList.refreshDevice(data.deviceId);
                } else {
                    console.info(`[Live Update] Unknown update type: ${updateType}`);
                }
            });

            signalR.data.connection.on(
                "AccessNotGrantedToHome",
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                (homeId: string, message: string) => {
                    console.error("[Live Update] Access not granted to home:", homeId);
                },
            );
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [signalR.data.connection]);

    useEffect(() => {
        if (home.current && signalR.data.connection) {
            console.info(`[Live Update] Observing updates for new home: ${home.current.id}`);
            signalR.data.connection.invoke("Initialize", home.current.id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [home.current, signalR.data.connection]);

    const value = {
        addDeviceTileCallback,
        addHomeDataSourceCallback,
    };

    return <LiveUpdateContext.Provider value={value}>{children}</LiveUpdateContext.Provider>;
};
