import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import SenswaveModal from "./SenswaveModal";
import Text from "./Text";
import Icon from "./Icon";
import { useWhatsNew } from "@/hooks/useWhatsNew";

type ChangeEntry = {
    icon: string;
    title: string;
    description: string;
};

const CHANGES: ChangeEntry[] = [
    {
        icon: "wifi-outline",
        title: "Device Presence",
        description:
            "Devices now show live online/offline status so you always know what's reachable.",
    },
    {
        icon: "phone-portrait-outline",
        title: "Display Device Tile",
        description: "New tile type for display devices shows their current output at a glance.",
    },
    {
        icon: "refresh-outline",
        title: "Pull to Refresh",
        description: "Swipe down on device dashboards to instantly reload device data.",
    },
    {
        icon: "toggle-outline",
        title: "Enhanced Boolean Operations",
        description: "Boolean operations can now send substitutions of true/false values.",
    },
    {
        icon: "grid-outline",
        title: "Room Management",
        description: "Add rooms and assign devices to rooms directly from the device screen.",
    },
    {
        icon: "ellipsis-vertical",
        title: "Floating Action Button",
        description: "Quick-access FAB button for common actions is now available on main screens.",
    },
    {
        icon: "home-outline",
        title: "Improved Home Onboarding",
        description:
            "New screen guides you when no home is set up yet, with options to create or join.",
    },
    {
        icon: "code-outline",
        title: "Join Home via Code",
        description: "Joining a shared home with an invite code is faster and more reliable.",
    },
    {
        icon: "server-outline",
        title: "Broker Subscriptions",
        description:
            "Manage data source broker subscriptions directly from the data source details.",
    },
    {
        icon: "flash-outline",
        title: "Save on User Action",
        description:
            "Controls whether actions (pressing tile / widget) update state instantly in system or wait for the device to retransmit (confirm). Useful for fast feedback on reliable connections.",
    },
    {
        icon: "chevron-down-outline",
        title: "Improved Dropdowns",
        description: "Dropdowns throughout the app are more consistent and easier to use.",
    },
    {
        icon: "shield-checkmark-outline",
        title: "Session Stability",
        description: "Fixed an issue where expired sessions weren't refreshed correctly.",
    },
];

export function WhatsNewModal() {
    const { show, dismiss } = useWhatsNew();

    return (
        <SenswaveModal visible={show} onClose={dismiss} title="What's New">
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {CHANGES.map((entry) => (
                    <View key={entry.title} style={styles.entry}>
                        <Icon icon={entry.icon} size={28} color="onBackground" />
                        <View style={styles.entryText}>
                            <Text size="medium" bold color="onBackground" numberOfLines={1}>
                                {entry.title}
                            </Text>
                            <Text size="small" color="onBackground" numberOfLines={3}>
                                {entry.description}
                            </Text>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </SenswaveModal>
    );
}

const styles = StyleSheet.create({
    content: {
        paddingTop: 8,
        gap: 24,
    },
    entry: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 14,
    },
    entryText: {
        flex: 1,
        gap: 4,
    },
});
