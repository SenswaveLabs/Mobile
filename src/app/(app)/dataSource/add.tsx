import { DataSourceForm, DataSourceFormValues } from "@/components/dataSource/DataSourceForm";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useRef } from "react";
import { AccessibilityInfo } from "react-native";

function AddPage() {
    const httpClient = useHttpClient();
    const router = useRouter();
    const active = useRef(false);
    const pending = useRef(false);
    const created = useRef(false);

    const returnToList = useCallback(() => {
        if (router.canGoBack()) router.back();
        else router.replace("/dataSource/list");
    }, [router]);

    useFocusEffect(
        useCallback(() => {
            active.current = true;
            if (created.current) {
                AccessibilityInfo.announceForAccessibility("Data source created.");
                returnToList();
            }
            return () => {
                active.current = false;
            };
        }, [returnToList]),
    );

    const addClicked = async (values: DataSourceFormValues) => {
        if (pending.current || created.current || !active.current) return;
        pending.current = true;

        try {
            let response;
            try {
                response = await httpClient.post("v1/datasources/brokers", values);
            } catch {
                throw new Error("Couldn't create this data source. Try again.");
            }
            if (!response.isSuccess)
                throw new Error("Couldn't create this data source. Try again.");

            created.current = true;
            if (!active.current) return;
            AccessibilityInfo.announceForAccessibility("Data source created.");
            returnToList();
        } finally {
            pending.current = false;
        }
    };

    return <DataSourceForm edit={false} onClick={addClicked} />;
}

export default AddPage;
