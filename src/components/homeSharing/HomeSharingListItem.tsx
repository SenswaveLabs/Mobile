import React, { FC, useCallback, useId, useRef, useState } from "react";
import {
    ActivityIndicator,
    Modal as NativeModal,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { PortalHost } from "@rn-primitives/portal";
import { CircleAlert, Trash2 } from "lucide-react-native";
import Button from "@/components/common/Button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Text } from "@/components/ui/text";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { HomeRolesToName } from "@/types/HomeTypes";

interface HomeSharingListItemProps {
    id: string;
    email: string;
    type: string;
    onRemove: () => void;
    disabled?: boolean;
}

const HomeSharingListItem: FC<HomeSharingListItemProps> = ({
    id,
    email,
    type,
    onRemove,
    disabled = false,
}) => {
    const { colors } = useTheme().current;
    const httpClient = useHttpClient();
    const [showRemoveDialog, setShowRemoveDialog] = useState(false);
    const dialogHost = useId();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const pending = useRef(false);
    const active = useRef(true);

    useFocusEffect(
        useCallback(() => {
            active.current = true;
            return () => {
                active.current = false;
            };
        }, []),
    );

    const removeSharing = async () => {
        if (pending.current || disabled || !active.current) return;
        pending.current = true;
        setLoading(true);
        setError("");
        setShowRemoveDialog(false);
        try {
            const response = await httpClient.delete("/v1/homes/sharings/" + id);
            if (!response.isSuccess) throw new Error();
            if (active.current) onRemove();
        } catch {
            if (active.current) setError("Couldn't remove access. Try again.");
        } finally {
            pending.current = false;
            setLoading(false);
        }
    };

    return (
        <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog} asChild>
            <View style={styles.container}>
                <NativeModal
                    visible={showRemoveDialog}
                    transparent
                    statusBarTranslucent
                    navigationBarTranslucent
                    accessibilityViewIsModal
                    onRequestClose={() => setShowRemoveDialog(false)}>
                    <PortalHost name={dialogHost} />
                </NativeModal>
                <AlertDialogContent
                    portalHost={dialogHost}
                    accessibilityViewIsModal
                    className="max-w-md"
                    style={styles.dialogContent}>
                    <ScrollView style={styles.dialogBody}>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Remove access</AlertDialogTitle>
                            <AlertDialogDescription>
                                {email +
                                    " will lose access to this home and all its devices. This action cannot be undone."}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                    </ScrollView>
                    <AlertDialogFooter className="sm:flex-col-reverse">
                        <AlertDialogCancel asChild>
                            <Button
                                name="Cancel"
                                type="brand-outline"
                                loading={false}
                                onPress={() => setShowRemoveDialog(false)}
                            />
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <Button
                                name="Remove"
                                type="brand-destructive"
                                loading={false}
                                disabled={disabled || loading}
                                onPress={() => void removeSharing()}
                            />
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                <View style={styles.row}>
                    <View accessible style={styles.identity}>
                        <Text style={[styles.email, { color: colors.authForeground }]}>
                            {email}
                        </Text>
                        <Text style={[styles.role, { color: colors.authMuted }]}>
                            {HomeRolesToName.get(type) || "Unknown role"}
                        </Text>
                    </View>
                    <AlertDialogTrigger asChild disabled={disabled || loading}>
                        <Pressable
                            cssInterop={false}
                            accessibilityRole="button"
                            accessibilityLabel={"Remove access for " + email}
                            accessibilityState={{ disabled: disabled || loading, busy: loading }}
                            disabled={disabled || loading}
                            onPress={() => {
                                setError("");
                                setShowRemoveDialog(true);
                            }}
                            android_ripple={{ color: colors.authBorder }}
                            style={({ pressed }) => [
                                styles.removeAction,
                                pressed && styles.pressed,
                            ]}>
                            {loading ? (
                                <ActivityIndicator size="small" color={colors.error} />
                            ) : (
                                <Trash2 size={20} color={colors.error} accessible={false} />
                            )}
                        </Pressable>
                    </AlertDialogTrigger>
                </View>
                {!!error && (
                    <Alert
                        icon={CircleAlert}
                        variant="destructive"
                        accessibilityRole="alert"
                        accessibilityLiveRegion="polite">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
            </View>
        </AlertDialog>
    );
};

export default HomeSharingListItem;

const styles = StyleSheet.create({
    container: { gap: 8 },
    row: {
        minHeight: 64,
        paddingVertical: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    identity: { flexGrow: 1, flexBasis: 0, minWidth: 0, gap: 4 },
    email: { fontSize: 16, lineHeight: 24, fontWeight: "600", flexShrink: 1 },
    role: { fontSize: 14, lineHeight: 20 },
    removeAction: {
        width: 48,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
    },
    pressed: { opacity: 0.72 },
    dialogContent: { maxHeight: "90%" },
    dialogBody: { flexShrink: 1 },
});
