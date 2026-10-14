import HomeForm, { HomeFormValues } from "@/components/home/HomeForm";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { FC, useCallback, useRef } from "react";
import { AccessibilityInfo } from "react-native";

const Add: FC = () => {
    const router = useRouter();
    const httpClient = useHttpClient();
    const homes = useHomes();
    const { firstHome } = useLocalSearchParams();
    const active = useRef(true);
    const created = useRef(false);

    useFocusEffect(
        useCallback(() => {
            active.current = true;
            if (created.current) {
                AccessibilityInfo.announceForAccessibility(
                    "Home created. Select it from your homes.",
                );
                router.replace("/home/list");
            }
            return () => {
                active.current = false;
            };
        }, [router]),
    );

    const addClicked = async (values: Partial<HomeFormValues>) => {
        if (created.current) return;
        const response = await httpClient.post("v1/homes", values);
        if (!response.isSuccess)
            throw new Error("Couldn't create your home. Check your connection and try again.");
        created.current = true;
        if (!active.current) return;

        if (firstHome === "first" || !homes.current) {
            let ready = false;
            try {
                ready = await homes.initializeCurrentHome({ silent: true });
            } catch {
                ready = false;
            }
            if (!active.current) return;
            if (!ready) {
                AccessibilityInfo.announceForAccessibility(
                    "Home created. Select it from your homes.",
                );
                router.replace("/home/list");
                return;
            }
        }

        AccessibilityInfo.announceForAccessibility("Home created.");
        if (router.canGoBack()) router.back();
        else router.replace("/");
    };

    return <HomeForm onSubmit={addClicked} />;
};

export default Add;
