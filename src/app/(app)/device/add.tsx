import DeviceForm from "@/components/device/DeviceForm";
import { useDeviceList } from "@/contexts/custom/DeviceListProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useToast } from "@/contexts/ToastProvider";
import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";

function Add() {
    const toast = useToast();
    const router = useRouter();
    const httpClient = useHttpClient();
    const devices = useDeviceList();
    const addClicked = async (values: any) => {
        const response = await httpClient.post("v1/devices", values);

        if (response.isSuccess) {
            toast.success("Device added successfully.");
            await devices.refresh();
            router.back();
        } else {
            toast.error("Failed to add device.");

            const data = await response.response?.text();
            console.error(data);
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <DeviceForm edit={false} onSubmit={addClicked} />
        </View>
    );
}

export default Add;
