import Icon from "@/components/common/Icon";
import SectionHeaderAction from "@/components/common/SectionHeaderAction";
import Text from "@/components/common/Text";
import { useTheme } from "@/contexts/ThemeProvider";
import { AutomationConditionDto } from "@/types/AutomationsTypes";
import React, { FC } from "react";
import { StyleSheet, View } from "react-native";

interface AutomationConditionItemProps {
    item: AutomationConditionDto;
    canRemove: boolean;
    onRemove: () => void;
}

const AutomationConditionItem: FC<AutomationConditionItemProps> = ({
    item,
    canRemove,
    onRemove,
}) => {
    const { colors } = useTheme().current;
    const configuration = item.conditionConfiguration;
    let summary = "Configuration unavailable";

    if (item.conditionType === "BooleanCondition" && typeof configuration?.isOn === "boolean") {
        summary = configuration.isOn ? "Is on" : "Is off";
    } else if (
        item.conditionType === "TextCondition" &&
        typeof configuration?.requiredValue === "string"
    ) {
        summary = `Equals ${configuration.requiredValue}`;
    } else if (item.conditionType === "NumberCondition") {
        const hasMin = typeof configuration?.minValue === "number";
        const hasMax = typeof configuration?.maxValue === "number";
        if (hasMin && hasMax)
            summary = `Between ${configuration.minValue} and ${configuration.maxValue}`;
        else if (hasMin) summary = `At least ${configuration.minValue}`;
        else if (hasMax) summary = `At most ${configuration.maxValue}`;
    }

    return (
        <View style={[styles.row, { borderBottomColor: colors.authBorder }]}>
            <View style={styles.text}>
                <Text color="onBackground" bold numberOfLines={0}>
                    {item.operationName}
                </Text>
                <Text color="onBackground" numberOfLines={0}>
                    {summary}
                </Text>
            </View>
            {canRemove && (
                <SectionHeaderAction
                    label="Remove"
                    accessibilityLabel={`Remove ${item.operationName} condition`}
                    icon={<Icon icon="trash-outline" size={18} color="onBackground" />}
                    onPress={onRemove}
                />
            )}
        </View>
    );
};

export default AutomationConditionItem;

const styles = StyleSheet.create({
    row: {
        width: "100%",
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    text: { flex: 1, minWidth: 0, gap: 2 },
});
