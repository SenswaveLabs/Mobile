import Loading from "@/components/common/Loading";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { FC, useEffect } from "react";

const List: FC = () => {
    const router = useRouter();
    const { deviceId: deviceParam } = useLocalSearchParams<{ deviceId?: string | string[] }>();
    const requestedDeviceId = Array.isArray(deviceParam) ? deviceParam[0] : deviceParam;
    const deviceId =
        typeof requestedDeviceId === "string" && requestedDeviceId.trim()
            ? requestedDeviceId
            : undefined;

    useEffect(() => {
        router.replace(
            deviceId
                ? { pathname: "/device/widget/list", params: { deviceId } }
                : { pathname: "/device/widget/list" },
        );
        // The route only needs to replace itself when its bound device changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deviceId]);

    return <Loading />;
};

export default List;
