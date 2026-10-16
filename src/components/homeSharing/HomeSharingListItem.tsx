import React, { FC, useCallback, useId, useRef, useState } from "react";
import { Modal as NativeModal, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { PortalHost } from "@rn-primitives/portal";
import { CircleAlert } from "lucide-react-native";
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
            <View style={[styles.container, { borderColor: colors.authBorder + "55" }]}>
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
                <View accessible style={styles.identity}>
                    <Text style={[styles.email, { color: colors.authForeground }]}>{email}</Text>
                    <Text style={[styles.role, { color: colors.authMuted }]}>
                        {HomeRolesToName.get(type) || "Unknown role"}
                    </Text>
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
                <AlertDialogTrigger asChild disabled={disabled || loading}>
                    <Button
                        name="Remove access"
                        accessibilityLabel={"Remove access for " + email}
                        type="brand-destructive"
                        style={styles.removeButton}
                        loading={loading}
                        disabled={disabled}
                        onPress={() => {
                            setError("");
                            setShowRemoveDialog(true);
                        }}
                    />
                </AlertDialogTrigger>
            </View>
        </AlertDialog>
    );
};

export default HomeSharingListItem;

const styles = StyleSheet.create({
    container: { borderBottomWidth: 1, paddingBottom: 16, gap: 12 },
    identity: { gap: 4 },
    email: { fontSize: 16, lineHeight: 24, fontWeight: "600" },
    role: { fontSize: 14, lineHeight: 20 },
    removeButton: { width: "auto", alignSelf: "flex-start", maxWidth: "100%" },
    dialogContent: { maxHeight: "90%" },
    dialogBody: { flexShrink: 1 },
});
