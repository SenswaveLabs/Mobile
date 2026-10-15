import React, { FC, useCallback, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { CircleAlert } from "lucide-react-native";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import Button from "@/components/common/Button";
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
        <View style={[styles.container, { borderColor: colors.authBorder }]}>
            <ConfirmDialog
                visible={showRemoveDialog}
                title="Remove access"
                content={
                    email +
                    " will lose access to this home and all its devices. This action cannot be undone."
                }
                onConfirm={() => void removeSharing()}
                onCancel={() => setShowRemoveDialog(false)}
            />
            <Text style={[styles.email, { color: colors.authForeground }]}>{email}</Text>
            <Text style={[styles.role, { color: colors.authMuted }]}>
                {HomeRolesToName.get(type) || "Unknown role"}
            </Text>
            {!!error && (
                <Alert
                    icon={CircleAlert}
                    variant="destructive"
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            <Button
                name="Remove access"
                accessibilityLabel={"Remove access for " + email}
                type="brand-destructive"
                loading={loading}
                disabled={disabled}
                onPress={() => {
                    setError("");
                    setShowRemoveDialog(true);
                }}
            />
        </View>
    );
};

export default HomeSharingListItem;

const styles = StyleSheet.create({
    container: { borderWidth: 1, borderRadius: 8, padding: 16, gap: 8 },
    email: { fontSize: 16, lineHeight: 24, fontWeight: "500" },
    role: { fontSize: 14, lineHeight: 20 },
});
