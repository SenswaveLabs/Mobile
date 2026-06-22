import { useEffect, useState } from "react";
import { FlatList, View, StyleSheet, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useToast } from "@/contexts/ToastProvider";
import HomeSharingListItem from "./HomeSharingListItem";
import Button from "@/components/common/Button";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { HomeSharingDto } from "@/types/HomeTypes";
import { ListResponse } from "@/utils/httpClient";

function HomeSharingList() {
    const httpClient = useHttpClient();
    const toast = useToast();
    const router = useRouter();
    const homes = useHomes();
    const [refresh, setRefresh] = useState<boolean>(false);
    const [homeSharings, setHomeSharings] = useState<HomeSharingDto[]>([]);
    const [reloadKey, setReloadKey] = useState(0);

    const onRefresh = async () => {
        setRefresh(true);

        if (refresh || !homes.current?.id) return;

        try {
            const result = await httpClient.get(`v1/homes/sharings?homeId=${homes.current?.id}`);

            if (result.isSuccess) {
                const data = (await result.response!.json()) as ListResponse<HomeSharingDto>;
                setHomeSharings(data.items);
            } else if (result.statusCode === 404) {
                console.warn("[HomeSharingList] Home not shared.");
            } else {
                toast.httpError(result);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load home sharings.");
        } finally {
            setRefresh(false);
        }
    };

    useEffect(() => {
        onRefresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [homes.current?.id, reloadKey]);

    const handleItemRemoved = () => {
        setReloadKey((prevKey) => prevKey + 1); // Increment reloadKey to trigger useEffect
    };

    const handleShareHome = () => {
        router.push({
            pathname: "home/share",
            params: {
                id: homes.current?.id,
            },
        });
    };

    return (
        <View style={styles.containerHeight}>
            <FlatList
                data={homeSharings}
                renderItem={({ item }) => (
                    <View style={styles.itemContainer}>
                        <HomeSharingListItem
                            id={item.sharingId}
                            email={item.friendEmail}
                            type={item.sharingType}
                            onRemove={handleItemRemoved}
                        />
                    </View>
                )}
                keyExtractor={(item) => item.sharingId}
                contentContainerStyle={{
                    paddingBottom: 20,
                    padding: 5,
                    paddingTop: 0,
                }}
                ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
                ListFooterComponent={
                    <View style={styles.footerContainer}>
                        <Button name="Invite" onPress={handleShareHome} loading={false} />
                    </View>
                }
                removeClippedSubviews={false}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
                refreshControl={<RefreshControl refreshing={refresh} onRefresh={onRefresh} />}
            />
        </View>
    );
}

export default HomeSharingList;

const styles = StyleSheet.create({
    containerHeight: {
        height: " 100%",
    },
    itemContainer: {
        width: "100%",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 8,
    },
    itemText: {
        fontSize: 16,
    },
    footerContainer: {
        marginTop: 10,
        alignItems: "center",
    },
    itemSeparator: {
        height: 10,
    },
});
