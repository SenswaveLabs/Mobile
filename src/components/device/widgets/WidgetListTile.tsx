import React, { FC, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { CircleAlert, Power } from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import ListRow from "@/components/common/ListRow";
import Icon from "@/components/common/Icon";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WidgetListTileProps {
    id: string;
    name: string;
    type: string;
    enabled: boolean;
    deviceId?: string;
    overrideOnClick?: (widgetId: string) => Promise<void>;
    selected?: boolean;
    disablePress?: boolean;
    canManage?: boolean;
    separator?: boolean;
}

const WidgetListTile: FC<WidgetListTileProps> = ({
    id,
    name,
    type,
    enabled,
    deviceId,
    overrideOnClick,
    selected = false,
    disablePress = false,
    canManage = true,
    separator = false,
}) => {
    const router = useRouter();
    const { colors } = useTheme().current;
    const httpClient = useHttpClient();
    const [loading, setLoading] = useState(false);
    const [enabledState, setEnabledState] = useState(enabled);
    const [error, setError] = useState("");
    const locked = useRef(false);
    const active = useRef(true);
    const current = useRef({ id, disablePress, canManage, overrideOnClick });
    current.current = { id, disablePress, canManage, overrideOnClick };

    useEffect(() => {
        setEnabledState(enabled);
        setError("");
    }, [id, enabled]);
    useEffect(() => {
        active.current = true;
        return () => {
            active.current = false;
        };
    }, []);

    const handleTileClick = async () => {
        if (current.current.id !== id || current.current.disablePress) return;
        if (current.current.overrideOnClick) {
            await current.current.overrideOnClick(id);
            return;
        }
        if (!current.current.canManage) return;
        router.push({
            pathname: "device/widget/details",
            params: { widgetId: id, ...(deviceId ? { deviceId } : {}) },
        });
    };

    const onStateClicked = async () => {
        if (
            !active.current ||
            locked.current ||
            current.current.id !== id ||
            current.current.disablePress ||
            !current.current.canManage ||
            current.current.overrideOnClick
        )
            return;
        locked.current = true;
        setLoading(true);
        setError("");
        const nextEnabled = !enabledState;
        try {
            const result = await httpClient.put(`v1/devices/widgets/${id}/state`, {
                enabled: nextEnabled,
            });
            if (!result.isSuccess) throw new Error("Widget state update failed");
            if (active.current && current.current.id === id) setEnabledState(nextEnabled);
        } catch {
            if (active.current && current.current.id === id)
                setError("Couldn't change this widget's status. Try again.");
        } finally {
            locked.current = false;
            if (active.current) setLoading(false);
        }
    };

    return (
        <View>
            <ListRow
                title={name}
                description={`${type} · ${enabledState ? "Enabled" : "Disabled"}`}
                separator={separator}
                onPress={handleTileClick}
                disabled={disablePress}
                selected={selected}
                accessibilityLabel={
                    overrideOnClick ? `${name}, ${selected ? "selected" : "not selected"}` : name
                }
                accessibilityHint={
                    overrideOnClick
                        ? "Selects this widget for dashboard placement"
                        : "View widget configuration"
                }
                trailing={
                    overrideOnClick ? (
                        selected ? (
                            <Icon icon="checkmark-outline" size={24} color="complementary" />
                        ) : null
                    ) : canManage ? (
                        <Pressable
                            cssInterop={false}
                            accessibilityRole="switch"
                            accessibilityLabel={`${name} enabled`}
                            accessibilityState={{
                                checked: enabledState,
                                disabled: disablePress || loading,
                                busy: loading,
                            }}
                            disabled={disablePress || loading}
                            onPress={() => void onStateClicked()}
                            android_ripple={{ color: colors.authBorder }}
                            style={[
                                styles.toggle,
                                {
                                    borderColor: enabledState
                                        ? colors.authPrimary
                                        : colors.authBorder,
                                    backgroundColor: enabledState
                                        ? colors.authPrimary
                                        : colors.deviceTileSurface,
                                },
                                disablePress && styles.dimmed,
                            ]}>
                            {loading ? (
                                <ActivityIndicator
                                    color={
                                        enabledState ? colors.authOnPrimary : colors.authForeground
                                    }
                                    size="small"
                                />
                            ) : (
                                <Power
                                    size={22}
                                    color={
                                        enabledState ? colors.authOnPrimary : colors.authForeground
                                    }
                                />
                            )}
                        </Pressable>
                    ) : null
                }
            />
            {!!error && (
                <View style={styles.feedback}>
                    <Alert
                        icon={CircleAlert}
                        compact
                        variant="destructive"
                        accessibilityRole="alert"
                        accessibilityLiveRegion="polite">
                        <AlertDescription compact>{error}</AlertDescription>
                    </Alert>
                </View>
            )}
        </View>
    );
};

export default WidgetListTile;
const styles = StyleSheet.create({
    toggle: {
        width: 48,
        height: 48,
        borderWidth: 1,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    dimmed: { opacity: 0.6 },
    feedback: { paddingHorizontal: 12, paddingBottom: 12 },
});
