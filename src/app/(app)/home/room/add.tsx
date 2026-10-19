import Button from "@/components/common/Button";
import Loading from "@/components/common/Loading";
import RoomForm, { RoomFormHandle } from "@/components/room/RoomForm";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useToast } from "@/contexts/ToastProvider";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { View } from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";

function Add() {
    const router = useRouter();
    const homes = useHomes();
    const httpClient = useHttpClient();
    const toast = useToast();
    const formRef = useRef<RoomFormHandle>(null);
    const active = useRef(true);
    const pending = useRef(false);
    const [loading, setLoading] = useState(false);
    const [isFormValid, setIsFormValid] = useState(false);
    const home = homes.current;
    const hasHome = !!home;
    const canManage = home?.isOwner === true || home?.canManage === true;

    useFocusEffect(
        useCallback(() => {
            active.current = true;
            if (!hasHome && !homes.loading) router.replace("/home/list");
            else if (hasHome && !canManage) router.replace("/home/details");
            return () => {
                active.current = false;
            };
        }, [hasHome, canManage, homes.loading, router]),
    );

    const addClicked = async (values: any) => {
        const homeId = home?.id;
        if (!homeId || !canManage || pending.current || !active.current) return;
        pending.current = true;
        setLoading(true);
        try {
            const response = await httpClient.post(`v1/homes/${homeId}/rooms`, values);
            if (response.isSuccess) {
                if (homes.current?.id === homeId) await homes.refreshRooms({ silent: true });
                if (!active.current || homes.current?.id !== homeId) return;
                toast.success("Room added successfully.");
                router.back();
            } else {
                toast.error("Failed to add room.");
                const data = await response.response?.text();
                console.error(data);
            }
        } finally {
            pending.current = false;
            if (active.current) setLoading(false);
        }
    };

    if (!canManage) return <Loading activityColor="textOnBackground" />;

    return (
        <View style={{ flex: 1 }}>
            <RoomForm
                ref={formRef}
                edit={false}
                onSubmit={addClicked}
                onValidChange={setIsFormValid}
            />
            <KeyboardStickyView style={{ paddingHorizontal: 15, paddingVertical: 12 }}>
                <Button
                    name="Create Room"
                    loading={loading}
                    disabled={!isFormValid}
                    onPress={() => formRef.current?.triggerSave()}
                />
            </KeyboardStickyView>
        </View>
    );
}

export default Add;
