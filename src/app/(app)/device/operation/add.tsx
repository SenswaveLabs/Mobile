import Button from "@/components/common/Button";
import OperationForm, { OperationFormHandle } from "@/components/device/operation/OperationForm";
import { useDevice } from "@/contexts/custom/DeviceProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useToast } from "@/contexts/ToastProvider";
import { useRouter } from "expo-router";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import React, { useRef, useState } from "react";
import { View } from "react-native";

function Add() {
    const toast = useToast();
    const router = useRouter();
    const device = useDevice();
    const httpClient = useHttpClient();
    const formRef = useRef<OperationFormHandle>(null);
    const [loading, setLoading] = useState(false);
    const [isFormValid, setIsFormValid] = useState(false);

    const addClicked = async (values: any) => {
        setLoading(true);

        const response = await httpClient.post("v1/devices/operations", values);

        if (response.isSuccess) {
            toast.success("Operation added successfully.");
            router.back();
        } else {
            toast.httpError(response);
        }

        setLoading(false);
    };

    return (
        <View style={{ flex: 1 }}>
            <OperationForm
                ref={formRef}
                edit={false}
                onSubmit={addClicked}
                onValidChange={setIsFormValid}
                deviceId={device.deviceId}
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
}

export default Add;
