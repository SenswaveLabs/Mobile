import { useEffect, useRef, useState } from "react";
import { Device, useDeviceList } from "@/contexts/custom/DeviceListProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useLiveUpdate } from "@/contexts/domain/LiveUpdateProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useOptimisticActions } from "@/contexts/OptimisticActionProvider";

interface DeviceTileActionProps {
    deviceId: string;
    tile: Device["tile"];
    disabled: boolean;
    inactive?: boolean;
}

export type ActionFeedback = "none" | "spinner";

export const useDeviceTileAction = ({
    deviceId,
    tile,
    disabled,
    inactive = false,
}: DeviceTileActionProps) => {
    const homeId = useHomes().current?.id;
    const devices = useDeviceList();
    const httpClient = useHttpClient();
    const liveUpdate = useLiveUpdate();
    const actions = useOptimisticActions();
    const [reported, setReported] = useState(tile.value);
    const [feedback, setFeedback] = useState<ActionFeedback>("none");
    const [error, setError] = useState("");
    const submitting = useRef(false);
    const version = useRef(0);
    const identity = `${homeId}:${deviceId}:${tile.type}`;
    const pending = actions.values[identity] !== undefined;
    const value = pending ? actions.values[identity] : reported;
    const currentIdentity = useRef(identity);
    currentIdentity.current = identity;
    const canSend = useRef(false);
    canSend.current = !disabled && !inactive && Boolean(deviceId);

    useEffect(() => {
        setReported(tile.value);
        setError("");
    }, [tile]);

    useEffect(() => {
        if (!pending) {
            setFeedback("none");
            return;
        }
        const spinner = setTimeout(() => setFeedback("spinner"), 300);
        return () => clearTimeout(spinner);
    }, [pending]);

    useEffect(() => {
        currentIdentity.current = identity;
        if (disabled || !deviceId) return;
        let active = true;
        liveUpdate.addDeviceTileCallback(deviceId, async () => {
            if (!active) return;
            const requestedVersion = version.current;
            try {
                const result = await httpClient.get(`v1/devices/${deviceId}/display`);
                if (!result.isSuccess || !result.response) throw new Error("Device update failed");
                const response = (await result.response.json()) as Device;
                if (!active || requestedVersion !== version.current) return;
                setReported(response.tile.value);
                devices.updateDeviceOperation(response);
                setError("");
            } catch {
                if (active && requestedVersion === version.current)
                    setError("Couldn't update this device. Pull to refresh.");
            }
        });
        return () => {
            active = false;
            if (currentIdentity.current === identity) currentIdentity.current = "";
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [identity, disabled]);

    const send = (next: boolean | number | string) => {
        if (
            !canSend.current ||
            currentIdentity.current !== identity ||
            submitting.current ||
            next === value
        )
            return;
        submitting.current = true;
        version.current++;
        setError("");
        return actions.run(identity, next, async () => {
            try {
                const result = await httpClient.post(`v1/devices/${deviceId}/tile/action`, {
                    value: next,
                });
                if (!result.isSuccess) throw new Error("Device action failed");
                const response = result.response
                    ? ((await result.response.json()) as Device)
                    : null;
                if (currentIdentity.current !== identity) return;
                setReported(next);
                if (response)
                    devices.updateDeviceOperation({
                        ...response,
                        tile: { ...response.tile, value: next },
                    });
            } catch {
                if (currentIdentity.current === identity)
                    setError("Couldn't change this device. Previous value restored. Try again.");
            } finally {
                version.current++;
                submitting.current = false;
            }
        });
    };

    return {
        value,
        pending,
        feedback: pending ? feedback : ("none" as ActionFeedback),
        error,
        send,
    };
};
