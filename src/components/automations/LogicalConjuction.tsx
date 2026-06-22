import { ConditionConnector } from "@/types/AutomationsTypes";
import { View, StyleSheet, Pressable } from "react-native";
import Icon from "@/components/common/Icon";
import { useTheme } from "@/contexts/ThemeProvider";
import Text from "@/components/common/Text";
import { shadowStyles } from "@/styles/shadowStyles";

interface LogicalConjuctionProps {
    logicalConjuction: ConditionConnector;
    onPress: (e?: any) => void;
}

const logicalConjunctionMap: Record<ConditionConnector, string> = {
    And: "All",
    Or: "Any",
};

export default function LogicalConjuction({ logicalConjuction, onPress }: LogicalConjuctionProps) {
    const theme = useTheme();

    // TODO: Add proper icon for logical conjunction
    return (
        <View
            style={[
                { backgroundColor: theme.current.colors.primary },
                styles.logicalConjuctionButtonWrapper,
                shadowStyles.default,
            ]}>
            <Pressable onPress={onPress} style={{ flexDirection: "row", alignItems: "center" }}>
                <Text size={"medium"} bold={true} color={"onPrimary"}>
                    {logicalConjunctionMap[logicalConjuction]}
                </Text>
                <View style={{ width: "20%" }} />
                <Icon icon="albums-outline" size={20} />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    logicalConjuctionButtonWrapper: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        marginLeft: 15,
        width: "65%",
    },
});
