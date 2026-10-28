import React, { FC, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from "react-native";
import { X } from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeProvider";

export interface WidgetCommandSnackbarProps {
    widgetName: string;
    message: string;
    onRetry: () => Promise<boolean>;
    onDismiss: () => void;
}
const WidgetCommandSnackbar: FC<WidgetCommandSnackbarProps> = ({
    widgetName,
    message,
    onRetry,
    onDismiss,
}) => {
    const { colors } = useTheme().current;
    const { height } = useWindowDimensions();
    const [retrying, setRetrying] = useState(false);
    const lock = useRef(false);
    const dismissed = useRef(false);
    const active = useRef(true);
    useEffect(
        () => () => {
            active.current = false;
        },
        [],
    );
    const dismiss = () => {
        if (dismissed.current) return;
        dismissed.current = true;
        onDismiss();
    };
    const retry = async () => {
        if (lock.current || dismissed.current) return;
        lock.current = true;
        setRetrying(true);
        try {
            if (await onRetry()) dismiss();
        } catch {
            // Keep the message available for another retry.
        } finally {
            lock.current = false;
            if (active.current) setRetrying(false);
        }
    };
    return (
        <View
            style={[styles.container, { backgroundColor: colors.secondary }]}
            accessibilityLiveRegion="polite">
            <ScrollView style={{ maxHeight: Math.max(48, Math.min(160, height * 0.25)) }}>
                <Text
                    accessibilityRole="alert"
                    style={[styles.message, { color: colors.textOnSecondary }]}>
                    {widgetName}: {message}
                </Text>
            </ScrollView>
            <View style={styles.actions}>
                <Pressable
                    cssInterop={false}
                    accessibilityRole="button"
                    accessibilityLabel="Retry widget command"
                    accessibilityState={{ disabled: retrying, busy: retrying }}
                    disabled={retrying}
                    onPress={retry}
                    style={styles.retry}>
                    {retrying ? (
                        <ActivityIndicator size="small" color={colors.authPrimary} />
                    ) : (
                        <Text style={[styles.retryText, { color: colors.authPrimary }]}>Retry</Text>
                    )}
                </Pressable>
                <Pressable
                    cssInterop={false}
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss widget error"
                    onPress={dismiss}
                    style={styles.close}>
                    <X size={20} color={colors.textOnSecondary} accessible={false} />
                </Pressable>
            </View>
        </View>
    );
};
export default WidgetCommandSnackbar;
const styles = StyleSheet.create({
    container: {
        width: "100%",
        maxWidth: 448,
        alignSelf: "center",
        borderRadius: 8,
        paddingTop: 12,
        paddingHorizontal: 16,
        paddingBottom: 4,
        gap: 4,
    },
    message: { fontSize: 14, lineHeight: 20 },
    actions: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end" },
    retry: {
        minWidth: 64,
        minHeight: 48,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 8,
    },
    retryText: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
    close: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
});
