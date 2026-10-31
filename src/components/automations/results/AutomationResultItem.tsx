import Icon from "@/components/common/Icon";
import SectionHeaderAction from "@/components/common/SectionHeaderAction";
import Text from "@/components/common/Text";
import { useTheme } from "@/contexts/ThemeProvider";
import { AutomationResultDto } from "@/types/AutomationsTypes";
import React, { FC } from "react";
import { StyleSheet, View } from "react-native";

interface AutomationResultItemProps {
    item: AutomationResultDto;
    canRemove: boolean;
    onRemove: () => void;
}

const AutomationResultItem: FC<AutomationResultItemProps> = ({ item, canRemove, onRemove }) => {
    const { colors } = useTheme().current;

    return (
        <View style={[styles.row, { borderBottomColor: colors.authBorder }]}>
            <View style={styles.text}>
                <Text color="onBackground" bold numberOfLines={0}>
                    {item.operationName}
                </Text>
                <Text color="onBackground" numberOfLines={0}>
                    Value: {String(item.valueToSend)}
                </Text>
            </View>
            {canRemove && (
                <SectionHeaderAction
                    label="Remove"
                    accessibilityLabel={`Remove ${item.operationName} result`}
                    icon={<Icon icon="trash-outline" size={18} color="onBackground" />}
                    onPress={onRemove}
                />
            )}
        </View>
    );
};

export default AutomationResultItem;

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
