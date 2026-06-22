import React from "react";
import { FlatList, StyleSheet } from "react-native";
import { AutomationResultDto } from "@/types/AutomationsTypes";
import AutomationResultItem from "./AutomationResultItem";
import { shadowStyles } from "@/styles/shadowStyles";

interface AutomationResultProps {
    results: AutomationResultDto[];
    automationId?: string;
}

const AutomationResult: React.FC<AutomationResultProps> = ({ results, automationId }) => {
    return (
        <FlatList
            data={results}
            renderItem={({ item }) => <AutomationResultItem item={item} />}
            keyExtractor={(item) => `${item.operationId}-${String(item.valueToSend)}`}
            scrollEnabled={false}
            style={[styles.flatListWrapper, shadowStyles.default]}
            ListFooterComponent={
                <AutomationResultItem automationId={automationId} item={undefined} />
            }
        />
    );
};

const styles = StyleSheet.create({
    flatListWrapper: {
        borderRadius: 12,
    },
});

export default AutomationResult;
