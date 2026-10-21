import React, { FC } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text as NativeText, View } from "react-native";
import { useTheme } from "@/contexts/ThemeProvider";
import Icon from "@/components/common/Icon";
import ListRow from "@/components/common/ListRow";
import { Home } from "@/types/HomeTypes";

interface HomeListItemProps {
    home: Home;
    onPress: () => void;
    selected?: boolean;
    disabled?: boolean;
    loading?: boolean;
    error?: string;
    onDetails?: () => void;
    separator?: boolean;
}

const HomeListItem: FC<HomeListItemProps> = ({
    home,
    onPress,
    selected = false,
    disabled = false,
    loading = false,
    error,
    onDetails,
    separator = false,
}) => {
    const { colors } = useTheme().current;
    return (
        <ListRow
            title={home.name}
            separator={separator}
            description={home.isOwner ? "Owned by you" : "Shared with you"}
            leading={<Icon icon={home.icon} resource="homes" size={24} color="brand" />}
            trailing={
                <View style={styles.trailing}>
                    {onDetails && (
                        <Pressable
                            cssInterop={false}
                            accessibilityRole="button"
                            accessibilityLabel="Home details"
                            accessibilityState={{ disabled }}
                            disabled={disabled}
                            onPress={onDetails}
                            android_ripple={{ color: colors.authBorder }}
                            style={({ pressed }) => [styles.details, pressed && styles.pressed]}>
                            <NativeText
                                style={[styles.detailsText, { color: colors.authForeground }]}>
                                Details
                            </NativeText>
                        </Pressable>
                    )}
                    {loading ? (
                        <ActivityIndicator accessible={false} color={colors.authForeground} />
                    ) : (
                        <Icon
                            icon={selected ? "checkmark-outline" : "chevron-forward-outline"}
                            size={20}
                            color="brand"
                        />
                    )}
                </View>
            }
            accessibilityLabel={`${home.name}, ${home.isOwner ? "owned by you" : "shared with you"}${selected ? ", current home" : ""}`}
            accessibilityHint={
                error ||
                (selected ? "Return to this home's dashboard" : "Switch to this home's dashboard")
            }
            onPress={onPress}
            disabled={disabled}
            selected={selected}
            loading={loading}>
            {!!error && (
                <NativeText
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite"
                    style={[styles.error, { color: colors.error }]}>
                    {error}
                </NativeText>
            )}
        </ListRow>
    );
};

export default HomeListItem;

const styles = StyleSheet.create({
    trailing: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    details: {
        minWidth: 48,
        minHeight: 48,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    detailsText: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
    error: { fontSize: 14, lineHeight: 20 },
    pressed: { opacity: 0.72 },
});
