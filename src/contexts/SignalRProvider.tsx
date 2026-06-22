import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { HubConnection, HubConnectionBuilder } from "@microsoft/signalr";
import { useSession } from "./SessionProvider";
import { useConfiguration } from "./ConfigurationProvider";

export type SignalRData = {
    connection?: HubConnection;
};

interface SignalRProperties {
    data: SignalRData;
}

const SignalRContext = createContext<SignalRProperties>({
    data: {},
});

export const useSignalR = () => useContext(SignalRContext);

export const SignalRProvider = ({ children }: any) => {
    const session = useSession();
    const configuration = useConfiguration();

    const [reconnectionTrigger, setReconnectionTrigger] = useState(0);
    const [signalRData, setSignalRData] = useState<SignalRData>({});

    const accessTokenRef = useRef(session.session?.accessToken ?? "");
    accessTokenRef.current = session.session?.accessToken ?? "";

    const initializeSignalR = async () => {
        try {
            if (signalRData.connection) {
                await signalRData.connection.stop();
            }

            const hubPath = configuration.getSignalRUrl("signalr/liveupdates/live");

            const connection = new HubConnectionBuilder()
                .withUrl(hubPath.toString(), {
                    accessTokenFactory: () => accessTokenRef.current,
                })
                .build();

            connection.onreconnecting(() => {
                console.debug("[SignalR Provider] Reconnecting...");
                setReconnectionTrigger(reconnectionTrigger + 1);
            });

            connection.onreconnected(() => {
                console.debug("[SignalR Provider] Reconnected.");
            });

            connection.onclose(() => {
                console.debug("[SignalR Provider] Connection closed.");
                setReconnectionTrigger(reconnectionTrigger + 1);
            });

            await connection.start();

            console.debug("[SignalR Provider] Connection started.");

            setSignalRData({
                connection: connection,
            });
        } catch (error) {
            console.error("[SignalR Provider] Error initializing: ", error);
            await new Promise((resolve) => setTimeout(resolve, 15000));
            console.warn("[SignalR Provider] Retrying connection...");
            setReconnectionTrigger(reconnectionTrigger + 1);
        }
    };

    const uninitialize = async () => {
        if (signalRData.connection) {
            await signalRData.connection.stop();
            console.info("[SignalR Provider] Connection stopped.");
            setSignalRData({});
        }
    };

    useEffect(() => {
        if (session.session?.accessToken && session.session?.accessToken !== "") {
            initializeSignalR();
        } else {
            uninitialize();
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session.session?.authenticated, reconnectionTrigger]);

    const value = {
        data: signalRData,
    };

    console.debug("[SignalR Provider] Intialized.");

    return <SignalRContext.Provider value={value}>{children}</SignalRContext.Provider>;
};
