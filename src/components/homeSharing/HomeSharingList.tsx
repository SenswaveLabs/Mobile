import React, { FC, useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text as NativeText, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { CircleAlert, Plus } from "lucide-react-native";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { HomeSharingDto } from "@/types/HomeTypes";
import { ListResponse } from "@/utils/httpClient";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Text } from "@/components/ui/text";
import Button from "@/components/common/Button";
import HomeSharingListItem from "./HomeSharingListItem";

interface HomeSharingListProps {
    disabled?: boolean;
}

const HomeSharingList: FC<HomeSharingListProps> = ({ disabled = false }) => {
    const httpClient = useHttpClient();
    const router = useRouter();
    const home = useHomes().current;
    const { colors } = useTheme().current;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [sharings, setSharings] = useState<HomeSharingDto[]>([]);
    const [reload, setReload] = useState(0);
    const homeId = home?.id;
    const isOwner = !!home?.isOwner;
    const inviteDisabled = disabled || !isOwner;

    useFocusEffect(
        useCallback(() => {
            let current = true;
            setSharings([]);
            setError("");
            if (!homeId || !home?.isOwner) {
                setLoading(false);
                return;
            }
            setLoading(true);
            const load = async () => {
                try {
                    const response = await httpClient.get("v1/homes/sharings?homeId=" + homeId);
                    if (response.statusCode === 404) return;
                    if (!response.isSuccess || !response.response) throw new Error();
                    const data = (await response.response.json()) as ListResponse<HomeSharingDto>;
                    if (!Array.isArray(data.items)) throw new Error();
                    if (current) setSharings(data.items);
                } catch {
                    if (current) setError("Couldn't load home access. Try again.");
                } finally {
                    if (current) setLoading(false);
                }
            };
            void load();
            return () => {
                current = false;
            };
            // The client changes identity on renders; focus and the home own loading.
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [homeId, home?.isOwner, reload]),
    );

    return (
        <View style={styles.section}>
            <View style={styles.header}>
                <View style={styles.headingRow}>
                    <NativeText
                        accessibilityRole="header"
                        style={[styles.title, { color: colors.authForeground }]}>
                        Sharing
                    </NativeText>
                    <Pressable
                        cssInterop={false}
                        accessibilityRole="button"
                        accessibilityLabel="Invite someone"
                        accessibilityState={{
                            disabled: inviteDisabled,
                            busy: disabled && isOwner,
                        }}
                        disabled={inviteDisabled}
                        onPress={() => {
                            if (!inviteDisabled && homeId)
                                router.push({ pathname: "home/share", params: { id: homeId } });
                        }}
                        android_ripple={{ color: colors.authBorder }}
                        style={({ pressed }) => [styles.inviteAction, pressed && styles.pressed]}>
                        <Plus size={18} color={colors.authForeground} accessible={false} />
                        <NativeText style={[styles.inviteLabel, { color: colors.authForeground }]}>
                            Invite
                        </NativeText>
                    </Pressable>
                </View>
                <NativeText style={[styles.description, { color: colors.authMuted }]}>
                    Invite someone and manage their access to this home.
                </NativeText>
            </View>
            {loading && (
                <View
                    accessible
                    accessibilityRole="progressbar"
                    accessibilityLabel="Loading home access"
                    accessibilityState={{ busy: true }}
                    style={styles.loading}>
                    <ActivityIndicator accessible={false} color={colors.authMuted} />
                    <Text
                        style={[
                            styles.description,
                            styles.loadingText,
                            { color: colors.authMuted },
                        ]}>
                        Loading home access…
                    </Text>
                </View>
            )}
            {!!error && (
                <>
                    <Alert
                        icon={CircleAlert}
                        variant="destructive"
                        accessibilityRole="alert"
                        accessibilityLiveRegion="polite">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                    <Button
                        name="Retry loading access"
                        type="brand-outline"
                        loading={loading}
                        disabled={disabled}
                        onPress={() => setReload((value) => value + 1)}
                    />
                </>
            )}
            {!loading && !error && sharings.length === 0 && (
                <Text style={[styles.description, { color: colors.authMuted }]}>
                    No one has access yet.
                </Text>
            )}
            {!loading && !error && sharings.length > 0 && (
                <View style={styles.list}>
                    {sharings.map((sharing) => (
                        <HomeSharingListItem
                            key={sharing.sharingId}
                            id={sharing.sharingId}
                            email={sharing.friendEmail}
                            type={sharing.sharingType}
                            disabled={disabled || !isOwner}
                            onRemove={() => setReload((value) => value + 1)}
                        />
                    ))}
                </View>
            )}
        </View>
    );
};

export default HomeSharingList;

const styles = StyleSheet.create({
    section: { gap: 12 },
    header: { gap: 4 },
    headingRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    title: { fontSize: 20, lineHeight: 26, fontWeight: "600", flexShrink: 1 },
    description: { fontSize: 14, lineHeight: 20 },
    inviteAction: {
        minWidth: 72,
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    inviteLabel: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
    pressed: { opacity: 0.72 },
    loading: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16 },
    loadingText: { flex: 1 },
    list: { gap: 4 },
});
