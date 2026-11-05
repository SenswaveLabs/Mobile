import React, { FC } from "react";
import { StyleSheet, Text as NativeText, View } from "react-native";
import { useTheme } from "@/contexts/ThemeProvider";
import Icon from "@/components/common/Icon";
import { useRouter } from "expo-router";
import ListRow from "@/components/common/ListRow";

interface AutomationTileProps {
    automationId: string;
    automationIcon: string;
    automationName: string;
    automationIsEnabled?: boolean;

    isPressDisabled: boolean;
    variant?: "list";
    separator?: boolean;
}

const AutomationTile: FC<AutomationTileProps> = ({
    automationId,
    automationIcon,
    automationName,
    automationIsEnabled,
    isPressDisabled,
    separator = false,
}: AutomationTileProps) => {
    const theme = useTheme();
    const router = useRouter();

    const onPress = () => {
        if (isPressDisabled) return;
        router.push({ pathname: "automation/details", params: { automationId } });
    };

    return (
        <ListRow
            title={automationName}
            separator={separator}
            description={
                <View style={styles.statusDescription}>
                    <View
                        style={[
                            styles.statusDot,
                            {
                                backgroundColor: automationIsEnabled
                                    ? theme.current.colors.success
                                    : theme.current.colors.error,
                            },
                        ]}
                    />
                    <NativeText
                        style={{
                            fontSize: 14,
                            lineHeight: 20,
                            color: theme.current.colors.authMuted,
                        }}>
                        {automationIsEnabled ? "Enabled" : "Disabled"}
                    </NativeText>
                </View>
            }
            leading={<Icon icon={automationIcon} size={24} color="brand" />}
            onPress={onPress}
            disabled={isPressDisabled}
            accessibilityLabel={automationName}
        />
    );
};

export default AutomationTile;

const styles = StyleSheet.create({
    statusDescription: { flexDirection: "row", alignItems: "center", gap: 8 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
});
