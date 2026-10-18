import React, { FC, useCallback } from "react";
import { FlatList, RefreshControl } from "react-native";
import { useAutomationList } from "@/contexts/custom/AutomationListProvider";
import { useToast } from "@/contexts/ToastProvider";
import AutomationTile from "./AutomationTile";

const AutomationList: FC = () => {
    const automations = useAutomationList();
    const toast = useToast();

    const onRefresh = useCallback(() => {
        const refresh = async () => {
            const result = await automations.refresh();

            if (!result) {
                toast.error("Failed to load automations.");
            }
        };

        refresh();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <FlatList
            data={automations.automations}
            renderItem={({ item, index }) => (
                <AutomationTile
                    automationId={item.id}
                    automationName={item.name}
                    automationIcon={item.icon}
                    automationIsEnabled={item.isEnabled}
                    isPressDisabled={false}
                    variant="list"
                    separator={index < automations.automations.length - 1}
                />
            )}
            keyExtractor={(item) => item.id}
            refreshControl={
                <RefreshControl refreshing={automations.loading} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
        />
    );
};

export default AutomationList;
