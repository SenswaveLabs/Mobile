import Button from "@/components/common/Button";
import DashboardForm, { DashboardFormHandle } from "@/components/device/dashboards/DashboardForm";
import { useDevice } from "@/contexts/custom/DeviceProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useToast } from "@/contexts/ToastProvider";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { View } from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";

function Add() {
    const toast = useToast();
    const router = useRouter();
    const httpClient = useHttpClient();
    const dashboards = useDevice();
    const { deviceId } = useLocalSearchParams();
    const formRef = useRef<DashboardFormHandle>(null);
    const [loading, setLoading] = useState(false);
    const [isFormValid, setIsFormValid] = useState(false);

    const addClicked = async (values: any) => {
        setLoading(true);

        const response = await httpClient.post("v1/devices/dashboards", values);

        if (response.isSuccess) {
            toast.success("Dashboard added successfully.");
            await dashboards.refresh(true);
            router.back();
        } else {
            toast.httpError(response);
        }

        setLoading(false);
    };

    return (
        <View style={{ flex: 1 }}>
            <DashboardForm
                ref={formRef}
                edit={false}
                onSubmit={addClicked}
                deviceId={deviceId as string}
                onValidChange={setIsFormValid}
            />

            <KeyboardStickyView style={{ paddingHorizontal: 15, paddingVertical: 12 }}>
                <Button
                    name="Create Dashboard"
                    loading={loading}
                    onPress={() => formRef.current?.triggerSave()}
                    style={!isFormValid ? { opacity: 0.4 } : undefined}
                />
            </KeyboardStickyView>
        </View>
    );
}

export default Add;
