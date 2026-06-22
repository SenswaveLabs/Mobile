import { useEffect, useState } from "react";
import { View } from "react-native";
import React from "react";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useToast } from "@/contexts/ToastProvider";
import Loading from "@/components/common/Loading";
import Text from "@/components/common/Text";
import DataSourceState from "./DataSourceState";

type BrokerClientStateResponse = {
    connectionStatus: string;
    latestSessionId: string;
};

interface BrokerClientStateGetProperties {
    id: string;
}

function BrokerClientStateGet({ id }: BrokerClientStateGetProperties) {
    const httpClient = useHttpClient();
    const toast = useToast();

    const [loading, setLoading] = useState(true);
    const [state, setState] = useState<BrokerClientStateResponse | undefined>(undefined);

    const fetchBrokerClientState = async () => {
        setLoading(true);

        try {
            const result = await httpClient.get(`v1/datasources/brokers/${id}/clients`);

            if (result.isSuccess) {
                const response = (await result.response!.json()) as BrokerClientStateResponse;
                setState(response as BrokerClientStateResponse);
            } else {
                toast.httpError(result);
            }
        } catch (error) {
            toast.error("Failed to fetch broker client state.");
            console.error("Failed to fetch broker client state", error);
        }

        setLoading(false);
    };

    useEffect(() => {
        if (!id) {
            setLoading(false);
            return;
        }

        fetchBrokerClientState();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    return (
        <View style={{ width: "100%", alignItems: "center" }}>
            {loading ? (
                <>
                    <View style={{ height: 28 }}>
                        <Loading size={28} useBackgroundColor={false} />
                    </View>
                    <Text size={"medium"} color={"onPrimary"}>
                        Loading...
                    </Text>
                </>
            ) : (
                <DataSourceState connectionStatus={state?.connectionStatus} />
            )}
        </View>
    );
}

export default BrokerClientStateGet;
