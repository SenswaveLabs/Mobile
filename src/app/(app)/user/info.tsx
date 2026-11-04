import SimlpleItemList, { SimpleListItem } from "@/components/common/SimpleItemList";
import { FC } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Constants from "expo-constants";
import { useRouter } from "expo-router";

const AppInfo: FC = () => {
    const router = useRouter();

    const itemList: SimpleListItem[] = [
        {
            icon: "phone-portrait-outline",
            name: "App Version",
            value: Constants.expoConfig?.version,
        },
        {
            icon: "git-branch-outline",
            name: "Min. Api Version",
            value: process.env.EXPO_PUBLIC_MINIMAL_API_VERSION,
        },
        { icon: "mail-outline", name: "Email", value: process.env.EXPO_PUBLIC_CONTACT_EMAIL },
        {
            icon: "document-text-outline",
            name: "Terms And Conditions",
            onClick: () => {
                router.push("user/terms");
            },
        },
        {
            icon: "alert-circle-outline",
            name: "Privacy Policy",
            onClick: () => {
                router.push("user/privacy");
            },
        },
    ];

    return (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
            <View style={styles.content}>
                <SimlpleItemList items={itemList} />
            </View>
        </ScrollView>
    );
};

export default AppInfo;

const styles = StyleSheet.create({
    scroll: { flex: 1 },
    container: {
        flexGrow: 1,
        alignItems: "center",
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    content: { width: "100%", maxWidth: 448 },
});
