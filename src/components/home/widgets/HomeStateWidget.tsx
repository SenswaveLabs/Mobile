import Icon from "@/components/common/Icon";
import DataSourceState, {
    getDataSourceStateLabel,
} from "@/components/dataSource/state/DataSourceState";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { useRouter } from "expo-router";
import React, { FC } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const HomeStateWidget: FC = () => {
    const { current: home } = useHomes();
    const { colors } = useTheme().current;
    const router = useRouter();
    if (!home) return null;
    const hasSource = Boolean(home.dataSource?.id);
    const content = (
        <>
            <View style={styles.identity}>
                <Text style={[styles.label, { color: colors.authMuted }]}>
                    {hasSource
                        ? home.dataSource.name
                        : home.isOwner
                          ? "Select data source"
                          : "No data source"}
                </Text>
                {!hasSource && (
                    <Text style={[styles.helper, { color: colors.authMuted }]}>
                        {home.isOwner
                            ? "Connect a data source to add devices."
                            : "Ask the owner to connect this home."}
                    </Text>
                )}
            </View>
            {hasSource && <DataSourceState connectionStatus={home.dataSource.state} />}
            {home.isOwner && <Icon icon="chevron-forward-outline" size={16} color="brand" />}
        </>
    );
    if (!home.isOwner) return <View style={styles.row}>{content}</View>;
    return (
        <Pressable
            cssInterop={false}
            accessibilityRole="button"
            accessibilityLabel={
                hasSource
                    ? `Data source details: ${home.dataSource.name}, ${getDataSourceStateLabel(home.dataSource.state)}`
                    : "Select data source"
            }
            onPress={() =>
                router.push(
                    hasSource
                        ? { pathname: "dataSource/details", params: { id: home.dataSource.id } }
                        : { pathname: "home/dataSource/select", params: { homeId: home.id } },
                )
            }
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            {content}
        </Pressable>
    );
};
export default HomeStateWidget;
const styles = StyleSheet.create({
    row: {
        minHeight: 48,
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
        paddingVertical: 4,
    },
    identity: { flex: 1, minWidth: 120, gap: 4 },
    label: { fontSize: 14, lineHeight: 20 },
    helper: { fontSize: 14, lineHeight: 20 },
    pressed: { opacity: 0.72 },
});
