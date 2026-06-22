import CurrentHome from "@/components/home/lists/CurrentHome";
import HomeList from "@/components/home/lists/HomeList";
import FAB from "@/components/common/FAB";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useRouter } from "expo-router";
import { View } from "react-native";

function Homes() {
    const router = useRouter();
    const homes = useHomes();

    if (!homes.current) {
        router.replace("/");
        return null;
    }

    const fabActions = [
        {
            icon: "log-in-outline",
            label: "Join",
            onPress: () => router.push("home/join"),
        },
        {
            icon: "home-outline",
            label: "Create",
            onPress: () => router.push("home/add"),
        },
    ];

    return (
        <View style={{ flex: 1 }}>
            <View style={{ paddingHorizontal: 15 }}>
                <CurrentHome />
            </View>

            <HomeList />

            <FAB actions={fabActions} />
        </View>
    );
}

export default Homes;
