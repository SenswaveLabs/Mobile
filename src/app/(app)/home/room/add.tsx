import Loading from "@/components/common/Loading";
import RoomForm, { RoomFormValues } from "@/components/room/RoomForm";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useFocusEffect, useRouter } from "expo-router";
import React, { FC, useCallback, useRef } from "react";
import { AccessibilityInfo } from "react-native";

const Add: FC = () => {
    const router = useRouter();
    const homes = useHomes();
    const httpClient = useHttpClient();
    const active = useRef(true);
    const pending = useRef(false);
    const created = useRef<string | undefined>(undefined);
    const home = homes.current;
    const homeRef = useRef(home);
    homeRef.current = home;
    const homeId = home?.id;
    const canManage = home?.isOwner === true || home?.canManage === true;

    useFocusEffect(
        useCallback(() => {
            active.current = true;
            if (!homeId && !homes.loading) router.replace("/home/list");
            else if (homeId && !canManage) router.replace("/home/details");
            else if (homeId && created.current === homeId) {
                if (router.canGoBack()) router.back();
                else router.replace("/home/details");
            }
            return () => {
                active.current = false;
            };
        }, [homeId, canManage, homes.loading, router]),
    );

    const addClicked = async (values: RoomFormValues) => {
        const current = homeRef.current;
        if (
            !homeId ||
            current?.id !== homeId ||
            (!current.isOwner && !current.canManage) ||
            pending.current ||
            created.current === homeId ||
            !active.current
        )
            return;
        pending.current = true;
        try {
            const response = await httpClient.post(`v1/homes/${homeId}/rooms`, values);
            if (!response.isSuccess) throw new Error("Couldn't create this room. Try again.");
            created.current = homeId;
            if (homeRef.current?.id !== homeId) return;
            try {
                await homes.refreshRooms({ silent: true });
            } catch {
                // Creation already succeeded; the parent can reload its rooms.
            }
            if (!active.current || homeRef.current?.id !== homeId) return;
            AccessibilityInfo.announceForAccessibility("Room created.");
            if (router.canGoBack()) router.back();
            else router.replace("/home/details");
        } finally {
            pending.current = false;
        }
    };

    if (!home || !canManage) return <Loading activityColor="textOnBackground" />;

    return <RoomForm key={home.id} homeName={home.name} onSubmit={addClicked} />;
};

export default Add;
