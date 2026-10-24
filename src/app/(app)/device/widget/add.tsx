import React, { FC } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CircleAlert } from "lucide-react-native";
import Button from "@/components/common/Button";
import Loading from "@/components/common/Loading";
import AddWidgetForm from "@/components/device/widgets/AddWidgetForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WidgetDetailsProvider } from "@/contexts/custom/WidgetDetailsProvider";
import { useDevice } from "@/contexts/custom/DeviceProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useTheme } from "@/contexts/ThemeProvider";

const Add: FC = () => {
    const params = useLocalSearchParams<{
        operationId?: string | string[];
        deviceId?: string | string[];
    }>();
    const rawOperationId = Array.isArray(params.operationId)
        ? params.operationId[0]
        : params.operationId;
    const operationId = rawOperationId?.trim() ? rawOperationId : undefined;
    const device = useDevice();
    const rawDeviceId = Array.isArray(params.deviceId) ? params.deviceId[0] : params.deviceId;
    const deviceId = rawDeviceId?.trim() ? rawDeviceId : device.deviceId;
    const home = useHomes();
    const router = useRouter();
    const { colors } = useTheme().current;
    const canManage = home.current?.isOwner === true || home.current?.canManage === true;

    if (home.loading) return <Loading />;
    return (
        <View style={[styles.screen, { backgroundColor: colors.background }]}>
            {canManage && operationId ? (
                <WidgetDetailsProvider key={`${deviceId}:${operationId}`}>
                    <AddWidgetForm operationId={operationId} deviceId={deviceId} />
                </WidgetDetailsProvider>
            ) : (
                <View style={styles.recovery}>
                    <Alert icon={CircleAlert} variant="destructive" accessibilityRole="alert">
                        <AlertDescription>
                            {canManage
                                ? "Operation not found. Choose an operation from your widgets."
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

export default Add;
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
