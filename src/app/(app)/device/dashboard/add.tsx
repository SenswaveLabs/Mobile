import Button from "@/components/common/Button";
import { Text } from "@/components/ui/text";
import AddDashboardForm from "@/components/device/dashboards/AddDashboardForm";
import { useTheme } from "@/contexts/ThemeProvider";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { FC } from "react";
import { StyleSheet, View } from "react-native";

const Add: FC = () => {
    const params = useLocalSearchParams();
    const router = useRouter();
    const { colors } = useTheme().current;
    const rawDeviceId = Array.isArray(params.deviceId) ? params.deviceId[0] : params.deviceId;
    const deviceId = typeof rawDeviceId === "string" ? rawDeviceId : undefined;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {deviceId?.trim() ? (
                <AddDashboardForm key={deviceId} deviceId={deviceId} />
            ) : (
                <View style={styles.recovery}>
                    <View style={styles.recoveryContent}>
                        <Text
                            accessibilityRole="header"
                            style={[styles.recoveryTitle, { color: colors.authForeground }]}>
                            Device not found
                        </Text>
                        <Text style={[styles.recoveryHelper, { color: colors.authMuted }]}>
                            Return to your home and choose a device.
                        </Text>
                        <Button
                            name="Return to home"
                            type="auth"
                            loading={false}
                            onPress={() => router.replace("/")}
                            style={styles.recoveryButton}
                        />
                    </View>
                </View>
            )}
        </View>
    );
};

export default Add;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    recovery: {
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 16,
    },
    recoveryContent: {
        width: "100%",
        maxWidth: 448,
        alignSelf: "center",
        gap: 12,
    },
    recoveryTitle: {
        fontSize: 24,
        lineHeight: 32,
        fontWeight: "600",
    },
    recoveryHelper: {
        fontSize: 14,
        lineHeight: 20,
    },
    recoveryButton: {
        width: "100%",
    },
});
