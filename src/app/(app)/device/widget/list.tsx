import React, { FC, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CircleAlert } from "lucide-react-native";
import Button from "@/components/common/Button";
import ContentSection from "@/components/common/ContentSection";
import Loading from "@/components/common/Loading";
import SectionHeaderAction from "@/components/common/SectionHeaderAction";
import Icon from "@/components/common/Icon";
import WidgetList from "@/components/device/widgets/WidgetList";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDevice } from "@/contexts/custom/DeviceProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useTheme } from "@/contexts/ThemeProvider";

const List: FC = () => {
    const router = useRouter();
    const params = useLocalSearchParams<{ deviceId?: string | string[] }>();
    const device = useDevice();
    const rawDeviceId = Array.isArray(params.deviceId) ? params.deviceId[0] : params.deviceId;
    const deviceId = rawDeviceId?.trim() ? rawDeviceId : device.deviceId;
    const home = useHomes();
    const { colors } = useTheme().current;
    const canManage = home.current?.isOwner === true || home.current?.canManage === true;
    const current = useRef({ canManage, deviceId, loading: home.loading });
    current.current = { canManage, deviceId, loading: home.loading };

    if (home.loading) return <Loading />;
    return (
        <View style={[styles.screen, { backgroundColor: colors.background }]}>
            {canManage && deviceId ? (
                <>
                    <View style={styles.header}>
                        <ContentSection
                            title="Device widgets"
                            helper="Add a widget to an operation, or open a widget to view its configuration."
                            headerAction={
                                <SectionHeaderAction
                                    label="Add operation"
                                    accessibilityLabel="Add operation"
                                    icon={<Icon icon="add-outline" size={20} color="brand" />}
                                    onPress={() => {
                                        if (
                                            !current.current.canManage ||
                                            current.current.loading ||
                                            current.current.deviceId !== deviceId
                                        )
                                            return;
                                        router.push({
                                            pathname: "device/operation/add",
                                            params: { deviceId },
                                        });
                                    }}
                                />
                            }
                        />
                    </View>
                    <WidgetList deviceId={deviceId} />
                </>
            ) : (
                <View style={styles.recovery}>
                    <Alert icon={CircleAlert} variant="destructive" accessibilityRole="alert">
                        <AlertDescription>
                            {canManage
                                ? "Choose a device to manage its widgets."
                                : "You don't have permission to manage this device."}
                        </AlertDescription>
                    </Alert>
                    <Button
                        name="Return to device"
                        type="auth"
                        loading={false}
                        onPress={() => {
                            if (router.canGoBack()) router.back();
                            else if (deviceId)
                                router.replace({
                                    pathname: "/device/device",
                                    params: { deviceId },
                                });
                            else router.replace("/");
                        }}
                    />
                </View>
            )}
        </View>
    );
};

export default List;
const styles = StyleSheet.create({
    screen: { flex: 1 },
    header: { padding: 16, paddingBottom: 8 },
    recovery: {
        flex: 1,
        justifyContent: "center",
        gap: 16,
        padding: 16,
        maxWidth: 480,
        width: "100%",
        alignSelf: "center",
    },
});
