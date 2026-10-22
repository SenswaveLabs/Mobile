import DeviceForm from "@/components/device/DeviceForm";
import { useDeviceList } from "@/contexts/custom/DeviceListProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useRef } from "react";
import { View } from "react-native";

function Add() {
    const router = useRouter();
    const httpClient = useHttpClient();
    const devices = useDeviceList();
    const active = useRef(true);
    const pending = useRef(false);
    const created = useRef(false);
    const leaveRoute = useCallback(() => {
        if (router.canGoBack()) router.back();
        else router.replace("/");
    }, [router]);

    useFocusEffect(
        useCallback(() => {
            active.current = true;
            if (created.current) leaveRoute();
            return () => {
                active.current = false;
            };
        }, [leaveRoute]),
    );

    const addClicked = async (values: any) => {
        if (pending.current || created.current || !active.current) return;
        pending.current = true;
        try {
            const response = await httpClient.post("v1/devices", values);
            if (!response.isSuccess)
                throw new Error(
                    "Couldn't create this device. Check your connection and try again.",
                );
            created.current = true;
            try {
                await devices.refresh();
            } catch {
                // The device exists; returning to the list lets it reload without another POST.
            }
            if (!active.current) return;
            leaveRoute();
        } finally {
            pending.current = false;
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <DeviceForm edit={false} onSubmit={addClicked} />
        </View>
    );
}

export default Add;
