import React, { FC } from "react";
import { ActivityIndicator, Pressable, View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/contexts/ThemeProvider";
import Icon from "@/components/common/Icon";
import { Home } from "@/types/HomeTypes";

interface HomeListItemProps {
    home: Home;
    onPress: () => void;
    selected?: boolean;
    disabled?: boolean;
    loading?: boolean;
    error?: string;
}

const HomeListItem: FC<HomeListItemProps> = ({
    home,
    onPress,
    selected = false,
    disabled = false,
    loading = false,
    error,
}) => {
    const { colors } = useTheme().current;
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${home.name}, ${home.isOwner ? "owned by you" : "shared with you"}${selected ? ", current home" : ""}`}
            accessibilityHint={
                error ||
                (selected ? "Return to this home's dashboard" : "Switch to this home's dashboard")
            }
            accessibilityState={{ selected, disabled, busy: loading }}
            disabled={disabled}
            onPress={onPress}
            style={({ pressed }) => [
                styles.row,
                {
                    borderColor: selected ? colors.authFocus : colors.authBorder + "55",
                    backgroundColor: selected ? colors.authFieldBackground : colors.authBackground,
                },
                !selected && styles.alternative,
                (pressed || (disabled && !loading)) && styles.dimmed,
            ]}>
            <Icon icon={home.icon} size={24} color="brand" />
            <View style={styles.description}>
                <Text style={[styles.name, { color: colors.authForeground }]}>{home.name}</Text>
                <Text style={[styles.ownership, { color: colors.authMuted }]}>
                    {home.isOwner ? "Owned by you" : "Shared with you"}
                </Text>
                {!!error && (
                    <Text
                        accessibilityRole="alert"
                        accessibilityLiveRegion="polite"
                        style={[styles.ownership, { color: colors.error }]}>
                        {error}
                    </Text>
                )}
                {selected && (
                    <Text style={[styles.current, { color: colors.authForeground }]}>
                        Current home
                    </Text>
                )}
            </View>
            {loading ? (
                <ActivityIndicator accessible={false} color={colors.authForeground} />
            ) : (
                <Icon
                    icon={selected ? "checkmark-outline" : "chevron-forward-outline"}
                    size={20}
                    color="brand"
                />
            )}
        </Pressable>
    );
};

export default HomeListItem;

const styles = StyleSheet.create({
    row: {
        width: "100%",
        minHeight: 80,
        borderWidth: 1,
        borderRadius: 8,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    alternative: { borderWidth: 0, borderBottomWidth: 1, borderRadius: 0 },
    description: { flex: 1, minWidth: 0, gap: 4 },
    name: { fontSize: 16, fontWeight: "600" },
    ownership: { fontSize: 14, lineHeight: 20 },
    current: { fontSize: 14, fontWeight: "500", marginTop: 4 },
    dimmed: { opacity: 0.6 },
});
