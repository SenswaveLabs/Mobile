import Button from "@/components/common/Button";
import ContentSection from "@/components/common/ContentSection";
import Icon from "@/components/common/Icon";
import Loading from "@/components/common/Loading";
import SectionHeaderAction from "@/components/common/SectionHeaderAction";
import { WhatsNewModal } from "@/components/common/WhatsNewModal";
import DeviceList from "@/components/device/DeviceList";
import DeviceLayoutToggle from "@/components/device/DeviceLayoutToggle";
import NoHomeScreen from "@/components/home/NoHomeScreen";
import HomeStateWidget from "@/components/home/widgets/HomeStateWidget";
import RoomsView from "@/components/room/RoomsView";
import { useDeviceList } from "@/contexts/custom/DeviceListProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { useDeviceLayout } from "@/hooks/useDeviceLayout";
import { useFocusEffect, useRouter } from "expo-router";
import React, { FC, useCallback, useId, useState } from "react";
import { PortalHost } from "@rn-primitives/portal";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BackHandler, Modal as NativeModal, StyleSheet, Text, View } from "react-native";

const Index: FC = () => {
    const router = useRouter();
    const homes = useHomes();
    const devices = useDeviceList();
    const { layout, setLayout } = useDeviceLayout();
    const { colors } = useTheme().current;
    const [showExitDialog, setShowExitDialog] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const dialogHost = useId();

    useFocusEffect(
        useCallback(() => {
            const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
                setShowExitDialog(true);
                return true;
            });
            return () => subscription.remove();
        }, []),
    );

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await homes.initializeCurrentHome();
        } finally {
            setRefreshing(false);
        }
    };

    if (homes.loading) return <Loading activityColor="textOnBackground" />;
    if (!homes.current)
        return (
            <NoHomeScreen
                onCreateHome={() =>
                    router.push({ pathname: "home/add", params: { firstHome: "first" } })
                }
                onJoinHome={() => router.push({ pathname: "home/join" })}
                refreshing={refreshing}
                onRefresh={onRefresh}
            />
        );

    const canManage = homes.current.isOwner || homes.current.canManage;
    const hasDataSource = Boolean(homes.current.dataSource?.id);

    return (
        <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog} asChild>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <NativeModal
                    visible={showExitDialog}
                    transparent
                    statusBarTranslucent
                    navigationBarTranslucent
                    accessibilityViewIsModal
                    onRequestClose={() => setShowExitDialog(false)}>
                    <PortalHost name={dialogHost} />
                </NativeModal>
                <AlertDialogContent
                    portalHost={dialogHost}
                    accessibilityViewIsModal
                    className="max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Exit App</AlertDialogTitle>
                        <AlertDialogDescription>
                            Do you want to exit Senswave?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col">
                        <AlertDialogCancel asChild>
                            <Button
                                name="Cancel"
                                type="brand-outline"
                                loading={false}
                                onPress={() => setShowExitDialog(false)}
                            />
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <Button
                                name="Exit"
                                type="auth"
                                loading={false}
                                onPress={() => BackHandler.exitApp()}
                            />
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                <WhatsNewModal />
                <DeviceList
                    layout={layout}
                    header={
                        <View style={styles.intro}>
                            <HomeStateWidget />
                            <View style={styles.automationAction}>
                                <SectionHeaderAction
                                    label="Automations"
                                    accessibilityLabel="Automations"
                                    icon={<Icon icon="flash-outline" size={18} color="brand" />}
                                    onPress={() => router.navigate("automation/list")}
                                />
                            </View>
                            <View style={styles.heading}>
                                <ContentSection
                                    title="Devices"
                                    headerAction={
                                        <View style={styles.headingActions}>
                                            {canManage &&
                                            hasDataSource &&
                                            (devices.loading ||
                                                devices.error ||
                                                devices.devices.length > 0) ? (
                                                <SectionHeaderAction
                                                    label="Add device"
                                                    accessibilityLabel="Add device"
                                                    icon={
                                                        <Icon
                                                            icon="add-outline"
                                                            size={18}
                                                            color="brand"
                                                        />
                                                    }
                                                    onPress={() => router.navigate("device/add")}
                                                />
                                            ) : null}
                                            <DeviceLayoutToggle
                                                layout={layout}
                                                onChange={setLayout}
                                            />
                                        </View>
                                    }
                                />
                                {canManage && devices.devices.length > 0 && (
                                    <Text style={[styles.helper, { color: colors.authMuted }]}>
                                        {homes.current.rooms.length > 0
                                            ? "Hold a room or device for settings."
                                            : "Hold a device for settings."}
                                    </Text>
                                )}
                            </View>
                            <RoomsView />
                        </View>
                    }
                    footer={
                        <View style={styles.note}>
                            <Icon icon="information-circle-outline" size={18} color="brand" />
                            <Text style={[styles.noteText, { color: colors.authMuted }]}>
                                Device state shown on all pages is informational only. It may not
                                reflect the actual device condition.
                            </Text>
                        </View>
                    }
                />
            </View>
        </AlertDialog>
    );
};

export default Index;

const styles = StyleSheet.create({
    container: { flex: 1 },
    intro: { gap: 16, marginBottom: 20 },
    automationAction: { alignItems: "flex-end" },
    heading: { marginTop: 8, gap: 2 },
    helper: { fontSize: 14, lineHeight: 20 },
    headingActions: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 4,
        maxWidth: "65%",
    },
    note: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 24 },
    noteText: { flex: 1, fontSize: 14, lineHeight: 20 },
});
