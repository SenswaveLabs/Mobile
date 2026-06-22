import Text from "@/components/common/Text";
import { View, Image, ScrollView, RefreshControl } from "react-native";
import Tile from "@/components/common/Tile";
import { useRouter } from "expo-router";
import { useSession } from "@/contexts/SessionProvider";
import { useState } from "react";

function ForceUpgradePage() {
    const router = useRouter();
    const session = useSession();

    const [refreshing, setRefreshing] = useState<boolean>(false);

    const onRefresh = async () => {
        setRefreshing(true);

        try {
            await session.initialize();

            if (session.maintenance) {
                console.warn("Maintenance is ongoing.");
                return;
            }

            console.info("Exiting maintenance page.");
            router.replace("start");
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <ScrollView
                contentContainerStyle={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                <View>
                    <Tile backgroundColor="primary" padding={0}>
                        <Image
                            source={require("../assets/icon.png")}
                            style={{
                                width: 128,
                                height: 128,
                                borderRadius: 16,
                            }}
                        />
                    </Tile>
                </View>

                <Text
                    size="large"
                    color="complementary"
                    style={{ paddingTop: 15, paddingHorizontal: 20, textAlign: "center" }}>
                    Senswave is under maintenance
                </Text>

                <Text
                    size="small"
                    color="onBackground"
                    style={{ paddingTop: 10, paddingHorizontal: 20, textAlign: "center" }}>
                    Please check for updates in store or try pull to refresh.
                </Text>
            </ScrollView>
        </View>
    );
}

export default ForceUpgradePage;
