import SimlpleItemList, { SimpleListItem } from "@/components/common/SimpleItemList";
import { View } from "react-native";
import Constants from "expo-constants";
import { useRouter } from "expo-router";

function AppInfo() {
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
        { icon: "mail-outline", name: "Contact", value: process.env.EXPO_PUBLIC_CONTACT_EMAIL },
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
        <View style={{ flex: 1, padding: 15 }}>
            <SimlpleItemList items={itemList} />
        </View>
    );
}

export default AppInfo;
