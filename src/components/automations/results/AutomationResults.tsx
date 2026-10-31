import ContentSection from "@/components/common/ContentSection";
import Icon from "@/components/common/Icon";
import SectionHeaderAction from "@/components/common/SectionHeaderAction";
import Text from "@/components/common/Text";
import AutomationResultItem from "@/components/automations/results/AutomationResultItem";
import { useAutomation } from "@/contexts/custom/AutomationProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { AutomationResultDto } from "@/types/AutomationsTypes";
import { useRouter } from "expo-router";
import React, { FC, useRef } from "react";
import { FlatList, StyleSheet, View } from "react-native";

interface AutomationResultsProps {
    results: AutomationResultDto[];
    sessionToken: string;
    automationId?: string;
    mode: "create" | "details";
    canAdd: boolean;
    disabled: boolean;
}

const AutomationResults: FC<AutomationResultsProps> = ({
    results,
    sessionToken,
    automationId,
    mode,
    canAdd,
    disabled,
}) => {
    const automation = useAutomation();
    const homes = useHomes();
    const router = useRouter();
    const automationRef = useRef(automation);
    const homesRef = useRef(homes);
    const canAddRef = useRef(canAdd);
    const disabledRef = useRef(disabled);
    automationRef.current = automation;
    homesRef.current = homes;
    canAddRef.current = canAdd;
    disabledRef.current = disabled;
    const allowed = () =>
        canAddRef.current &&
        !disabledRef.current &&
        automationRef.current.isCurrentSession(sessionToken) &&
        (automationId === undefined
            ? homesRef.current.current?.isOwner === true ||
              homesRef.current.current?.canManage === true
            : homesRef.current.current?.isOwner === true);
    const add = () => {
        if (!allowed() || (mode === "create" && results.length >= 7)) return;
        router.push({
            pathname: "/automation/results/add",
            params: { sessionToken, ...(automationId && { automationId }) },
        });
    };
    const remove = (index: number) => {
        if (mode !== "create" || !allowed()) return;
        automationRef.current.removeDraftResult(sessionToken, index);
    };
    const count =
        mode === "create" ? `${results.length} of 7 results added` : `${results.length} results`;

    return (
        <ContentSection
            title="Results"
            helper={count}
            headerAction={
                canAdd ? (
                    <SectionHeaderAction
                        label="Add result"
                        accessibilityLabel="Add result"
                        icon={<Icon icon="add-outline" size={20} color="onBackground" />}
                        disabled={disabled || (mode === "create" && results.length >= 7)}
                        onPress={add}
                    />
                ) : undefined
            }>
            {results.length === 0 ? (
                <Text color="onBackground">No results yet.</Text>
            ) : (
                <FlatList
                    data={results}
                    renderItem={({ item, index }) => (
                        <AutomationResultItem
                            item={item}
                            canRemove={mode === "create" && allowed()}
                            onRemove={() => remove(index)}
                        />
                    )}
                    keyExtractor={(item, index) => `${item.operationId}-${index}`}
                    scrollEnabled={false}
                    style={styles.list}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
            )}
        </ContentSection>
    );
};

export default AutomationResults;

const styles = StyleSheet.create({
    list: { width: "100%" },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: "transparent" },
});
