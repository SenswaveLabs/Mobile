import React, { FC } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { CircleAlert } from "lucide-react-native";
import { Switch } from "@/components/common/Switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDeviceTileAction } from "@/hooks/useDeviceTileAction";
import { useTheme } from "@/contexts/ThemeProvider";
import { DeviceLayout } from "@/hooks/useDeviceLayout";

interface SwitchDeviceTileProps {
    name: string;
    action: ReturnType<typeof useDeviceTileAction>;
    disablePress: boolean;
    inactive?: boolean;
    layout?: DeviceLayout;
}

const SwitchDeviceTile: FC<SwitchDeviceTileProps> = ({
    name,
    action,
    disablePress,
    inactive = false,
    layout = "grid",
}) => {
    const { colors } = useTheme().current;
    const isOn = action.value === true;
    return (
        <View style={styles.content}>
            <View style={styles.row}>
                {!inactive && (
                    <View style={styles.progress} accessibilityLiveRegion="polite">
                        {action.feedback === "spinner" && (
                            <ActivityIndicator
                                size="small"
                                color={colors.authForeground}
                                accessible
                                accessibilityRole="progressbar"
                                accessibilityLabel={`Saving change to ${name}`}
                            />
                        )}
                    </View>
                )}
                <Text
                    style={[
                        styles.label,
                        layout === "list" && styles.listLabel,
                        { color: inactive ? colors.authMuted : colors.authForeground },
                    ]}>
                    {inactive
                        ? "—"
                        : action.value === true
                          ? "On"
                          : action.value === false
                            ? "Off"
                            : "—"}
                </Text>
                {!inactive && (
                    <>
                        <Switch
                            value={{ value: isOn }}
                            onPress={() => action.send(!isOn)}
                            orientation="horizontal"
                            accessibilityLabel={name}
                            disabled={disablePress || action.pending}
                            trackColors={{ on: colors.authPrimary, off: colors.authBorder }}
                            thumbColor={isOn ? colors.authOnPrimary : colors.authFieldBackground}
                            style={{ width: 52, height: 32 }}
                        />
                    </>
                )}
            </View>
            {!!action.error && (
                <Alert
                    icon={CircleAlert}
                    variant="destructive"
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite">
                    <AlertDescription>{action.error}</AlertDescription>
                </Alert>
            )}
        </View>
    );
};
export default SwitchDeviceTile;
const styles = StyleSheet.create({
    content: { gap: 4 },
    row: {
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    label: { flex: 1, textAlign: "right", fontSize: 22, lineHeight: 28, fontWeight: "500" },
    listLabel: { fontSize: 17, lineHeight: 24 },
    progress: { width: 20, height: 20, alignItems: "center", justifyContent: "center" },
});
