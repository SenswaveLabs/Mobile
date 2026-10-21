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
import ListRow from "@/components/common/ListRow";
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
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { HomeRolesToName } from "@/types/HomeTypes";

interface HomeSharingListItemProps {
    id: string;
    email: string;
    type: string;
    onRemove: () => void;
    disabled?: boolean;
    separator?: boolean;
}

const HomeSharingListItem: FC<HomeSharingListItemProps> = ({
    id,
    email,
    type,
    onRemove,
    disabled = false,
    separator = false,
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
                    <AlertDialogFooter className="flex-col">
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
                <ListRow
                    title={email}
                    description={HomeRolesToName.get(type) || "Unknown role"}
                    separator={separator}
                    children={
                        error ? (
                            <Alert
                                icon={CircleAlert}
                                variant="destructive"
                                accessibilityRole="alert"
                                accessibilityLiveRegion="polite">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        ) : undefined
                    }
                    trailing={
                        <AlertDialogTrigger asChild disabled={disabled || loading}>
                            <Pressable
                                cssInterop={false}
                                accessibilityRole="button"
                                accessibilityLabel={"Remove access for " + email}
                                accessibilityState={{
                                    disabled: disabled || loading,
                                    busy: loading,
                                }}
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
                    }
                />
            </View>
        </AlertDialog>
    );
};

export default HomeSharingListItem;

const styles = StyleSheet.create({
    container: {},
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
