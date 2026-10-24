import Button from "@/components/common/Button";
import Loading from "@/components/common/Loading";
import OperationForm, { OperationFormHandle } from "@/components/device/operation/OperationForm";
import { useDevice } from "@/contexts/custom/DeviceProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CircleAlert } from "lucide-react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import React, { FC, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

const firstRouteValue = (value?: string | string[]) => {
    const first = Array.isArray(value) ? value[0] : value;
    return typeof first === "string" && first.trim() ? first : undefined;
};

const Add: FC = () => {
    const toast = useToast();
    const router = useRouter();
    const device = useDevice();
    const home = useHomes();
    const httpClient = useHttpClient();
    const { deviceId: deviceParam } = useLocalSearchParams<{ deviceId?: string | string[] }>();
    const deviceId = firstRouteValue(deviceParam) ?? firstRouteValue(device.deviceId);
    const canManage = home.current?.isOwner === true || home.current?.canManage === true;
    const canManageRef = useRef(canManage);
    canManageRef.current = canManage;
    const formRef = useRef<OperationFormHandle>(null);
    const submitting = useRef(false);
    const [loading, setLoading] = useState(false);
    const [isFormValid, setIsFormValid] = useState(false);

    const addClicked = async (values: any) => {
        if (!canManageRef.current || submitting.current || !deviceId) return;
        submitting.current = true;
        setLoading(true);
        try {
            const response = await httpClient.post("v1/devices/operations", values);

            if (response.isSuccess) {
                toast.success("Operation added successfully.");
                router.back();
            } else {
                toast.httpError(response);
            }
        } catch {
            toast.error("Couldn't add this operation. Try again.");
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
        <View style={{ flex: 1 }}>
            <OperationForm
                ref={formRef}
                edit={false}
                onSubmit={addClicked}
                onValidChange={setIsFormValid}
                deviceId={deviceId}
            />

            <KeyboardStickyView style={{ paddingHorizontal: 15, paddingVertical: 12 }}>
                <Button
                    name="Create Operation"
                    loading={loading}
                    onPress={() => formRef.current?.triggerSave()}
                    style={!isFormValid ? { opacity: 0.4 } : undefined}
                />
            </KeyboardStickyView>
        </View>
    );
};

export default Add;

const styles = StyleSheet.create({
    recovery: { flex: 1, justifyContent: "center", padding: 16, gap: 16 },
});
