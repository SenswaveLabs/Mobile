import ContentSection from "@/components/common/ContentSection";
import Icon from "@/components/common/Icon";
import SectionHeaderAction from "@/components/common/SectionHeaderAction";
import { useAutomationList } from "@/contexts/custom/AutomationListProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { useRouter } from "expo-router";
import React, { FC, useCallback } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import AutomationTile from "./AutomationTile";

const AutomationList: FC = () => {
    const {
        homeId,
        automations: automationItems,
        loading,
        error,
        refresh: refreshAutomations,
    } = useAutomationList();
    const homes = useHomes();
    const router = useRouter();
    const { colors } = useTheme().current;
    const home = homes.current;
    const canManage = home?.isOwner === true || home?.canManage === true;

    const refresh = useCallback(() => {
        void refreshAutomations(homeId);
    }, [homeId, refreshAutomations]);

    const header = (
        <View>
            <ContentSection
                title="Automations"
                helper={home?.name}
                headerAction={
                    canManage && homeId ? (
                        <SectionHeaderAction
                            label="Add automation"
                            accessibilityLabel="Add automation"
                            icon={<Icon icon="add-outline" size={18} color="brand" />}
                            onPress={() => router.navigate("automation/add")}
                        />
                    ) : undefined
                }
            />
            {error ? (
                <View style={styles.error} accessibilityRole="alert">
                    <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                    <SectionHeaderAction
                        label="Retry"
                        accessibilityLabel="Retry loading automations"
                        icon={<Icon icon="refresh-outline" size={18} color="brand" />}
                        onPress={refresh}
                    />
                </View>
            ) : null}
        </View>
    );

    const empty = (
        <View style={styles.empty}>
            {loading ? (
                <ActivityIndicator accessible={false} color={colors.authPrimary} />
            ) : !error ? (
                homeId ? (
                    <Text style={[styles.emptyText, { color: colors.authMuted }]}>
                        {canManage
                            ? "No automations yet. Add one to get started."
                            : "No automations are configured for this home yet."}
                    </Text>
                ) : (
                    <View style={styles.noHome}>
                        <Text style={[styles.emptyText, { color: colors.authMuted }]}>
                            Select a home to view automations.
                        </Text>
                        <SectionHeaderAction
                            label="Select home"
                            accessibilityLabel="Select home"
                            icon={<Icon icon="home-outline" size={18} color="brand" />}
                            onPress={() => router.navigate("home/list")}
                        />
                    </View>
                )
            ) : null}
        </View>
    );

    return (
        <FlatList
            style={[styles.list, { backgroundColor: colors.background }]}
            data={automationItems}
            renderItem={({ item, index }) => (
                <AutomationTile
                    automationId={item.id}
                    automationName={item.name}
                    automationIcon={item.icon}
                    automationIsEnabled={item.isEnabled}
                    isPressDisabled={false}
                    variant="list"
                    separator={index < automationItems.length - 1}
                />
            )}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={header}
            ListEmptyComponent={empty}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={false}
            contentContainerStyle={styles.content}
        />
    );
};

export default AutomationList;

const styles = StyleSheet.create({
    list: { flex: 1 },
    content: { paddingHorizontal: 16, flexGrow: 1 },
    error: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    errorText: { flex: 1, fontSize: 14, lineHeight: 20 },
    empty: { minHeight: 96, alignItems: "center", justifyContent: "center" },
    noHome: { alignItems: "center", gap: 8 },
    emptyText: { fontSize: 14, lineHeight: 20, textAlign: "center" },
});
