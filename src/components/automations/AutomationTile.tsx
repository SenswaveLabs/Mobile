import React, { FC } from "react";
import { Pressable, StyleSheet, Text as NativeText, View } from "react-native";
import { useTheme } from "@/contexts/ThemeProvider";
import Icon from "@/components/common/Icon";
import { useRouter } from "expo-router";
import { shadowStyles } from "@/styles/shadowStyles";
import Text from "@/components/common/Text";
import ListRow from "@/components/common/ListRow";

const borderRadius = 12;

interface AutomationTileProps {
    automationId: string;
    automationIcon: string;
    automationName: string;
    automationIsEnabled?: boolean;

    isPressDisabled: boolean;
    variant?: "preview" | "list";
    separator?: boolean;
}

const AutomationTile: FC<AutomationTileProps> = ({
    automationId,
    automationIcon,
    automationName,
    automationIsEnabled,
    isPressDisabled,
    variant = "preview",
    separator = false,
}: AutomationTileProps) => {
    const theme = useTheme();
    const router = useRouter();

    const onPress = () => {
        if (isPressDisabled) return;
        router.push({ pathname: "automation/details", params: { automationId } });
    };

    return variant === "list" ? (
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
    ) : (
        <View
            style={[
                styles.wrapper,
                { backgroundColor: theme.current.colors.primary },
                shadowStyles.default,
            ]}>
            <Pressable onPress={onPress} style={styles.presable}>
                <View style={styles.iconContainer}>
                    <Icon icon={automationIcon} size={40} color="onPrimary" />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.textStyle} color="onPrimary" size="large">
                        {automationName}
                    </Text>
                </View>
                <View
                    style={{
                        ...styles.enabledContainer,
                        backgroundColor: automationIsEnabled
                            ? theme.current.colors.success
                            : theme.current.colors.error,
                    }}
                />
            </Pressable>
        </View>
    );
};

export default AutomationTile;

const styles = StyleSheet.create({
    wrapper: {
        display: "flex",
        flexGrow: 1,
        height: 70,
        marginHorizontal: 10,
        marginTop: 10,
        flexDirection: "row",
        borderRadius: borderRadius,
    },
    presable: {
        flexGrow: 1,
        flexDirection: "row",
        borderRadius: borderRadius,
    },
    iconContainer: {
        height: "100%",
        width: "20%",
        alignItems: "center",
        justifyContent: "center",
    },
    textContainer: {
        width: "75%",
        justifyContent: "center",
    },
    textStyle: {
        fontSize: 20,
        fontWeight: 300,
    },
    enabledContainer: {
        width: "5%",
        borderTopRightRadius: borderRadius,
        borderBottomRightRadius: borderRadius,
    },
    statusDescription: { flexDirection: "row", alignItems: "center", gap: 8 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
});
