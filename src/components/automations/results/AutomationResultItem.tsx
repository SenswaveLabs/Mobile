import React from "react";
import Text from "@/components/common/Text";
import { View, StyleSheet } from "react-native";
import { AutomationResultDto } from "@/types/AutomationsTypes";
import { useTheme } from "@/contexts/ThemeProvider";
import Icon from "@/components/common/Icon";
import { useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";

interface AutomationResultItemProps {
    item: AutomationResultDto | undefined; // Allow undefined for the "Add item" case
    automationId?: string;
}

export default function AutomationResultItem({ item, automationId }: AutomationResultItemProps) {
    const theme = useTheme();
    const router = useRouter();

    const loadAddResultPage = () => {
        router.push({
            pathname: "automation/results/add",
            params: { automationId: automationId },
        });
    };

    if (!item) {
        return (
            <View style={{ backgroundColor: theme.current.colors.primary, ...styles.wrapper }}>
                <TouchableOpacity
                    onPress={loadAddResultPage}
                    style={{ alignItems: "center", flexDirection: "row" }}>
                    <View style={{ width: "70%" }}>
                        <Text size={"medium"} color={"onPrimary"}>
                            Add Automation Result
                        </Text>
                    </View>
                    <View style={{ width: "10%" }}></View>
                    <View style={{ width: "20%" }}>
                        <Icon icon="add-outline" size={20} color="onPrimary" />
                    </View>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={{ backgroundColor: theme.current.colors.primary, ...styles.wrapper }}>
            <View style={{ width: "50%" }}>
                <Text size={"medium"} color={"onPrimary"}>
                    {item?.operationName}
                </Text>
            </View>
            <View style={{ width: "30%" }}></View>
            <View style={{ width: "10%" }}>
                <Icon icon="rocket-outline" size={20} color="onPrimary" />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        display: "flex",
        flexDirection: "row",
        paddingVertical: 8,
        paddingHorizontal: 30,
    },
});
