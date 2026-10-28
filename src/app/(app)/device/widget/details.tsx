import React, { FC } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CircleAlert } from "lucide-react-native";
import Button from "@/components/common/Button";
import Loading from "@/components/common/Loading";
import WidgetDetails from "@/components/device/widgets/WidgetDetails";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WidgetDetailsProvider } from "@/contexts/custom/WidgetDetailsProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useTheme } from "@/contexts/ThemeProvider";

const Details: FC = () => {
    const params = useLocalSearchParams<{
        widgetId?: string | string[];
        deviceId?: string | string[];
    }>();
    const rawWidgetId = Array.isArray(params.widgetId) ? params.widgetId[0] : params.widgetId;
    const widgetId = rawWidgetId?.trim() ? rawWidgetId : undefined;
    const rawDeviceId = Array.isArray(params.deviceId) ? params.deviceId[0] : params.deviceId;
    const deviceId = rawDeviceId?.trim() ? rawDeviceId : undefined;
    const home = useHomes();
    const router = useRouter();
    const { colors } = useTheme().current;
    const canManage = home.current?.isOwner === true || home.current?.canManage === true;

    if (home.loading) return <Loading />;
    return (
        <View style={[styles.screen, { backgroundColor: colors.background }]}>
            {canManage && widgetId ? (
                <WidgetDetailsProvider key={`${deviceId}:${widgetId}`}>
                    <WidgetDetails widgetId={widgetId} deviceId={deviceId} />
                </WidgetDetailsProvider>
            ) : (
                <View style={styles.recovery}>
                    <Alert icon={CircleAlert} variant="destructive" accessibilityRole="alert">
                        <AlertDescription>
                            {canManage
                                ? "Widget not found. Choose a widget from your device."
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

export default Details;
const styles = StyleSheet.create({
    screen: { flex: 1 },
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
