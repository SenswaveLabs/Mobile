import React from "react";
import Text from "@/components/common/Text";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { AutomationConditionDto } from "@/types/AutomationsTypes";
import { useTheme } from "@/contexts/ThemeProvider";
import Icon from "@/components/common/Icon";
import { useRouter } from "expo-router";

interface AutomationConditionItemProps {
    item: AutomationConditionDto | undefined;
    automationId?: string;
}

const isOnToDisplay = (isOn: boolean) => (isOn ? "On" : "Off");

export default function AutomationConditionItem({
    item,
    automationId,
}: AutomationConditionItemProps) {
    const theme = useTheme();
    const router = useRouter();

    const renderConfigurationDisplay = () => {
        if (!item?.conditionConfiguration) return null;

        if (item?.conditionType === "BooleanCondition") {
            const config = item.conditionConfiguration as { isOn: boolean };
            return (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text size={"medium"} color={"onPrimary"}>
                        Is
                    </Text>
                    <Text size={"medium"} color={"onPrimary"} bold={true}>
                        {isOnToDisplay(config.isOn)}
                    </Text>
                </View>
            );
        } else if (item?.conditionType === "TextCondition") {
            const config = item.conditionConfiguration as { requiredValue: string };
            return (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text size={"medium"} color={"onPrimary"}>
                        equals
                    </Text>
                    <Text
                        size={"medium"}
                        color={"onPrimary"}
                        bold={true}
                        numberOfLines={1}
                        ellipsizeMode="tail">
                        {config.requiredValue}
                    </Text>
                </View>
            );
        } else if (item?.conditionType === "NumberCondition") {
            const config = item.conditionConfiguration as { minValue: number; maxValue: number };
            return (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text
                        size={"medium"}
                        color={"onPrimary"}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={{ flex: 1 }}>
                        between <Text bold={true}>{config.minValue}</Text> and{" "}
                        <Text bold={true}>{config.maxValue}</Text>
                    </Text>
                </View>
            );
        }
        return null;
    };

    const loadAddConditionPage = () => {
        router.push({
            pathname: "automation/conditions/add",
            params: { automationId: automationId },
        });
    };

    if (!item) {
        return (
            <View style={{ backgroundColor: theme.current.colors.primary, ...styles.wrapper }}>
                <TouchableOpacity
                    onPress={loadAddConditionPage}
                    style={{ alignItems: "center", flexDirection: "row" }}>
                    <View style={{ width: "88%" }}>
                        <Text size={"medium"} color={"onPrimary"}>
                            Add Automation Condition
                        </Text>
                    </View>
                    <View style={{ flex: 1, alignItems: "center" }}>
                        <Icon icon="add-outline" size={20} color="onPrimary" />
                    </View>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={{ backgroundColor: theme.current.colors.primary, ...styles.wrapper }}>
            <View style={{ width: "60%" }}>
                <Text size={"medium"} color={"onPrimary"} numberOfLines={1} ellipsizeMode="tail">
                    {item?.operationName}
                </Text>
            </View>
            <View style={{ flex: 1, alignItems: "center" }}>{renderConfigurationDisplay()}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        display: "flex",
        flexDirection: "row",
        paddingVertical: 10,
        paddingHorizontal: 30,
        gap: 20,
    },
});
