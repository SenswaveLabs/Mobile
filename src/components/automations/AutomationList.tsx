import React, { useCallback } from "react";
import { FlatList, View, StyleSheet, RefreshControl } from "react-native";
import { useAutomationList } from "@/contexts/custom/AutomationListProvider";
import { useToast } from "@/contexts/ToastProvider";
import AutomationTile from "./AutomationTile";

const numColumns = 1;
const topDownSpacing = 5;

export default function AutomationList() {
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
            renderItem={({ item }) => (
                <View style={styles.itemWrapper}>
                    <AutomationTile
                        automationId={item.id}
                        automationName={item.name}
                        automationIcon={item.icon}
                        automationIsEnabled={item.isEnabled}
                        isPressDisabled={false}
                    />
                </View>
            )}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            refreshControl={
                <RefreshControl refreshing={automations.loading} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={false}
        />
    );
}

const styles = StyleSheet.create({
    itemWrapper: {
        marginBottom: topDownSpacing,
    },
});
