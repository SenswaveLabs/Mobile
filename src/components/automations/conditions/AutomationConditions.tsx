import ContentSection from "@/components/common/ContentSection";
import Icon from "@/components/common/Icon";
import SectionHeaderAction from "@/components/common/SectionHeaderAction";
import Text from "@/components/common/Text";
import AutomationConditionItem from "@/components/automations/conditions/AutomationConditionItem";
import { useAutomation } from "@/contexts/custom/AutomationProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { AutomationConditionDto } from "@/types/AutomationsTypes";
import { useRouter } from "expo-router";
import React, { FC, useRef } from "react";
import { FlatList, StyleSheet, View } from "react-native";

interface AutomationConditionsProps {
    conditions: AutomationConditionDto[];
    sessionToken: string;
    automationId?: string;
    mode: "create" | "details";
    canAdd: boolean;
    disabled: boolean;
}

const AutomationConditions: FC<AutomationConditionsProps> = ({
    conditions,
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
        if (!allowed() || (mode === "create" && conditions.length >= 7)) return;
        router.push({
            pathname: "/automation/conditions/add",
            params: { sessionToken, ...(automationId && { automationId }) },
        });
    };
    const remove = (index: number) => {
        if (mode !== "create" || !allowed()) return;
        automationRef.current.removeDraftCondition(sessionToken, index);
    };
    const count =
        mode === "create"
            ? `${conditions.length} of 7 conditions added`
            : `${conditions.length} conditions`;

    return (
        <ContentSection
            title="Conditions"
            helper={count}
            headerAction={
                canAdd ? (
                    <SectionHeaderAction
                        label="Add condition"
                        accessibilityLabel="Add condition"
                        icon={<Icon icon="add-outline" size={20} color="onBackground" />}
                        disabled={disabled || (mode === "create" && conditions.length >= 7)}
                        onPress={add}
                    />
                ) : undefined
            }>
            {conditions.length === 0 ? (
                <Text color="onBackground">No conditions yet.</Text>
            ) : (
                <FlatList
                    data={conditions}
                    renderItem={({ item, index }) => (
                        <AutomationConditionItem
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

export default AutomationConditions;

const styles = StyleSheet.create({
    list: { width: "100%" },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: "transparent" },
});
