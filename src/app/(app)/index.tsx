//import AutomationList from "@/components/automations/AutomationList";
import FAB, { FABAction } from "@/components/common/FAB";
import Loading from "@/components/common/Loading";
import UserNote from "@/components/common/UserNote";
import DeviceList from "@/components/device/DeviceList";
import NoHomeScreen from "@/components/home/NoHomeScreen";
import HomeWidgets from "@/components/home/widgets/HomeWidgets";
import RoomsView from "@/components/room/RoomsView";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { WhatsNewModal } from "@/components/common/WhatsNewModal";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useToast } from "@/contexts/ToastProvider";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { View, BackHandler, StyleSheet } from "react-native";
//import HorizontalSelector from "@/components/common/HorizontalSelector";

const sections: string[] = ["Devices", "Automations"];

function Index() {
    const toast = useToast();
    const [showExitDialog, setShowExitDialog] = useState(false);

    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                setShowExitDialog(true);
                return true; // Prevent default back behavior
            };

            const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);

            return () => subscription.remove(); // Clean up when unfocused
        }, []),
    );

    const router = useRouter();
    const homes = useHomes();

    //enable when autoimatiuons are added

    // eslint ignore @typescript-eslint/no-unused-vars
    //const [section, setSection] = useState(sections[0]);
    const [section] = useState(sections[0]);

    const homeClicked = () => {
        router.navigate("home/details");
    };

    const addClicked = () => {
        if (homes.current?.dataSource === undefined || homes.current.dataSource === null) {
            toast.info("Assign a data source to this home before adding devices or automations.");
            return;
        }

        if (section === "Devices") router.navigate("device/add");
        else if (section === "Automations") router.navigate("automation/add");
        else console.error("[Index] Unknown section selected: " + section);
    };

    const addHomeClicked = () => {
        router.push({ pathname: "home/add", params: { firstHome: "first" } });
    };

    const joinHomeClicked = () => {
        router.push({ pathname: "home/join" });
    };

    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        await homes.initializeCurrentHome(); // or `refreshCurrent()` depending on your logic
        setRefreshing(false);
    };

    if (homes.loading) {
        return <Loading activityColor="textOnBackground" />;
    }

    if (!homes.current) {
        return (
            <NoHomeScreen
                onCreateHome={addHomeClicked}
                onJoinHome={joinHomeClicked}
                refreshing={refreshing}
                onRefresh={onRefresh}
            />
        );
    }

    const fabActions: FABAction[] = [
        { icon: "home-outline", label: "Home Details", onPress: homeClicked },
        {
            icon: "add-outline",
            label: section === "Devices" ? "Add Device" : "Add Automation",
            onPress: addClicked,
        },
    ];

    return (
        <View style={styles.container}>
            <WhatsNewModal />
            <ConfirmDialog
                visible={showExitDialog}
                title="Exit App"
                content="Do you want to exit Senswave?"
                confirmLabel="Exit"
                destructive={false}
                iconName="exit-outline"
                onConfirm={() => BackHandler.exitApp()}
                onCancel={() => setShowExitDialog(false)}
            />
            {/* <HorizontalSelector
                options={sections}
                selected={section}
                onSelect={setSection}
                margin={{ top: 15, left: 15, right: 15, bottom: 15 }}
            /> */}

            <View>
                <HomeWidgets padding={{ top: 0, bottom: 15, left: 15, right: 15 }} />
            </View>

            <View
                style={{
                    flex: 1,
                    alignItems: "center",
                }}>
                {section === "Devices" && (
                    <View style={{ width: "100%" }}>
                        <RoomsView />
                        <UserNote text="Device state shown on all pages is informational only. It may not reflect the actual device condition." />
                        <DeviceList />
                    </View>
                )}

                {/* {section === "Automations" && <AutomationList />} */}
            </View>

            <FAB actions={fabActions} />
        </View>
    );
}

export default Index;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
    },
});
