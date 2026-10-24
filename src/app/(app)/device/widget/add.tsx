import Button from "@/components/common/Button";
import Loading from "@/components/common/Loading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDevice } from "@/contexts/custom/DeviceProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useToast } from "@/contexts/ToastProvider";
import { useWidgetDetails, WidgetDetailsProvider } from "@/contexts/custom/WidgetDetailsProvider";
import WidgetForm, { WidgetFormHandle } from "@/components/device/widgets/WidgetForm";
import { CircleAlert } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";

function InternalAdd() {
    const widgetDetails = useWidgetDetails();
    const httpClient = useHttpClient();
    const toast = useToast();
    const router = useRouter();
    const home = useHomes();
    const { operationId } = useLocalSearchParams<{ operationId: string }>();
    const formRef = useRef<WidgetFormHandle>(null);
    const submitting = useRef(false);
    const canManage = home.current?.isOwner === true || home.current?.canManage === true;
    const canManageRef = useRef(canManage);
    canManageRef.current = canManage;
    const [loading, setLoading] = useState(false);

    const addClicked = async (values: any) => {
        if (!canManageRef.current || submitting.current) return;
        submitting.current = true;
        setLoading(true);
        try {
            const response = await httpClient.post("v1/devices/widgets", values);

            if (response.isSuccess) {
                toast.success("Widget added successfully.");
                router.back();
            } else {
                toast.httpError(response);
            }
        } catch {
            toast.error("Couldn't add this widget. Try again.");
        } finally {
            submitting.current = false;
            setLoading(false);
        }
    };

    useEffect(() => {
        widgetDetails.initializeForAdd(operationId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!widgetDetails || widgetDetails.loading) {
        return <Loading />;
    }

    return (
        <View style={{ flex: 1 }}>
            <WidgetForm ref={formRef} onSubmit={addClicked} edit={false} hideButton={true} />

            <KeyboardStickyView style={{ paddingHorizontal: 15, paddingVertical: 12 }}>
                <Button
                    name="Add Widget"
                    loading={loading}
                    onPress={() => formRef.current?.triggerSave()}
                    style={!widgetDetails.isValid ? { opacity: 0.4 } : undefined}
                />
            </KeyboardStickyView>
        </View>
    );
}

export default function Add() {
    const home = useHomes();
    const device = useDevice();
    const router = useRouter();
    const canManage = home.current?.isOwner === true || home.current?.canManage === true;
    const returnToDevice = () => {
        if (router.canGoBack()) router.back();
        else if (device.deviceId)
            router.replace({ pathname: "/device/device", params: { deviceId: device.deviceId } });
        else router.replace("/");
    };

    if (home.loading) return <Loading />;
    if (!canManage)
        return (
            <View style={styles.recovery}>
                <Alert
                    icon={CircleAlert}
                    variant="destructive"
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite">
                    <AlertDescription>
                        You don't have permission to manage this device.
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
        <WidgetDetailsProvider>
            <InternalAdd />
        </WidgetDetailsProvider>
    );
}

const styles = StyleSheet.create({
    recovery: { flex: 1, justifyContent: "center", padding: 16, gap: 16 },
});
