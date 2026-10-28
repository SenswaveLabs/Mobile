import Button from "@/components/common/Button";
import Loading from "@/components/common/Loading";
import OperationForm from "@/components/device/operation/OperationForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDevice } from "@/contexts/custom/DeviceProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { CircleAlert, Info } from "lucide-react-native";
import React, { FC, useCallback, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

const firstRouteValue = (value?: string | string[]) => {
    const first = Array.isArray(value) ? value[0] : value;
    return typeof first === "string" && first.trim() ? first : undefined;
};

const Add: FC = () => {
    const router = useRouter();
    const device = useDevice();
    const home = useHomes();
    const httpClient = useHttpClient();
    const { colors } = useTheme().current;
    const { deviceId: deviceParam } = useLocalSearchParams<{ deviceId?: string | string[] }>();
    const deviceId = firstRouteValue(deviceParam) ?? firstRouteValue(device.deviceId);
    const canManage = home.current?.isOwner === true || home.current?.canManage === true;
    const identity = `${home.current?.id ?? ""}:${deviceId ?? ""}`;
    const current = useRef({ identity, canManage });
    current.current = { identity, canManage };
    const focused = useRef(false);
    const submitting = useRef(false);
    const accepted = useRef(new Set<string>());
    const returning = useRef<string | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<{
        identity: string;
        message: string;
        accepted: boolean;
    }>();
    const currentFeedback = feedback?.identity === identity ? feedback : undefined;

    const returnToWidgets = useCallback(() => {
        if (
            !focused.current ||
            current.current.identity !== identity ||
            !current.current.canManage ||
            !accepted.current.has(identity) ||
            returning.current === identity ||
            !deviceId
        )
            return;
        returning.current = identity;
        try {
            if (router.canGoBack()) router.back();
            else router.replace({ pathname: "/device/widget/list", params: { deviceId } });
            setFeedback(undefined);
        } catch {
            returning.current = undefined;
            setFeedback({
                identity,
                message: "Operation created. Return to widgets to continue.",
                accepted: true,
            });
        }
    }, [deviceId, identity, router]);

    useFocusEffect(
        useCallback(() => {
            focused.current = true;
            if (accepted.current.has(identity)) returnToWidgets();
            return () => {
                focused.current = false;
            };
        }, [identity, returnToWidgets]),
    );

    const addClicked = async (values: Record<string, unknown>) => {
        if (
            !deviceId ||
            !focused.current ||
            !current.current.canManage ||
            current.current.identity !== identity ||
            submitting.current ||
            accepted.current.has(identity)
        )
            return;
        submitting.current = true;
        setLoading(true);
        setFeedback(undefined);
        try {
            const response = await httpClient.post("v1/devices/operations", {
                ...values,
                deviceId,
            });
            if (!response.isSuccess) {
                if (focused.current && current.current.identity === identity)
                    setFeedback({
                        identity,
                        message:
                            "Couldn't create the operation. Check your connection and try again.",
                        accepted: false,
                    });
                return;
            }
            accepted.current.add(identity);
            if (
                current.current.identity !== identity ||
                !current.current.canManage ||
                !focused.current
            )
                return;
            if (device.deviceId === deviceId) {
                try {
                    await device.refresh(false);
                } catch {
                    if (focused.current && current.current.identity === identity)
                        setFeedback({
                            identity,
                            message: "Operation created. Return to widgets to continue.",
                            accepted: true,
                        });
                    return;
                }
            }
            returnToWidgets();
        } catch {
            if (
                !accepted.current.has(identity) &&
                focused.current &&
                current.current.identity === identity
            )
                setFeedback({
                    identity,
                    message: "Couldn't create the operation. Check your connection and try again.",
                    accepted: false,
                });
        } finally {
            submitting.current = false;
            setLoading(false);
        }
    };

    const returnToDevice = () => {
        if (router.canGoBack()) router.back();
        else if (deviceId) router.replace({ pathname: "/device/device", params: { deviceId } });
        else router.replace("/");
    };

    if (home.loading) return <Loading />;
    if (!canManage || !deviceId)
        return (
            <View style={[styles.recovery, { backgroundColor: colors.background }]}>
                <Alert
                    icon={CircleAlert}
                    variant="destructive"
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite">
                    <AlertDescription>
                        {canManage
                            ? "Device not found. Choose a device to continue."
                            : "You don't have permission to manage this device."}
                    </AlertDescription>
                </Alert>
                <Button
                    name="Return to device"
                    type="brand-outline"
                    loading={false}
                    onPress={returnToDevice}
                />
            </View>
        );

    return (
        <View style={[styles.screen, { backgroundColor: colors.background }]}>
            <OperationForm
                key={identity}
                edit={false}
                onSubmit={addClicked}
                deviceId={deviceId}
                pending={loading}
                disabled={accepted.current.has(identity)}
                onChange={() => {
                    if (!submitting.current && !accepted.current.has(identity))
                        setFeedback(undefined);
                }}
                feedback={
                    currentFeedback && (
                        <Alert
                            icon={currentFeedback.accepted ? Info : CircleAlert}
                            variant={currentFeedback.accepted ? "default" : "destructive"}
                            accessibilityRole="alert"
                            accessibilityLiveRegion="polite">
                            <AlertDescription>{currentFeedback.message}</AlertDescription>
                        </Alert>
                    )
                }
                returnAction={
                    currentFeedback?.accepted && (
                        <Button
                            name="Return to widgets"
                            type="brand-outline"
                            loading={false}
                            onPress={returnToWidgets}
                        />
                    )
                }
            />
        </View>
    );
};

export default Add;

const styles = StyleSheet.create({
    screen: { flex: 1 },
    recovery: {
        flex: 1,
        justifyContent: "center",
        padding: 16,
        gap: 16,
        maxWidth: 480,
        width: "100%",
        alignSelf: "center",
    },
});
