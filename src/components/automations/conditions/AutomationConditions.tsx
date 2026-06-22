import React from "react";
import { FlatList, StyleSheet } from "react-native";
import { AutomationConditionDto } from "@/types/AutomationsTypes";
import AutomationConditionItem from "@/components/automations/conditions/AutomationConditionItem";
import { shadowStyles } from "@/styles/shadowStyles";

interface AutomationConditionsProps {
    conditions: AutomationConditionDto[];
    automationId?: string;
}

const AutomationConditions: React.FC<AutomationConditionsProps> = ({
    conditions,
    automationId,
}) => {
    return (
        <FlatList
            data={conditions}
            renderItem={({ item }) => (
                <AutomationConditionItem item={item} automationId={automationId} />
            )}
            keyExtractor={(item, index) => `${item.operationId}-${index}`}
            scrollEnabled={false}
            style={[styles.flatListWrapper, shadowStyles.default]}
            ListFooterComponent={
                <AutomationConditionItem automationId={automationId} item={undefined} />
            }
        />
    );
};

const styles = StyleSheet.create({
    flatListWrapper: {
        borderRadius: 12,
    },
});

export default AutomationConditions;
