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
import Button from "@/components/common/Button";
import ContentSection from "@/components/common/ContentSection";
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
    const empty = !loading && !error && sharings.length === 0;
    const invite = () => {
        if (!inviteDisabled && homeId)
            router.push({ pathname: "home/share", params: { id: homeId } });
    };

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
        <ContentSection
            title="Sharing"
            helper="People with access to this home."
            separated
            headerAction={
                sharings.length > 0 && (
                    <Pressable
                        cssInterop={false}
                        accessibilityRole="button"
                        accessibilityLabel="Invite someone"
                        accessibilityState={{ disabled: inviteDisabled, busy: disabled && isOwner }}
                        disabled={inviteDisabled}
                        onPress={invite}
                        android_ripple={{ color: colors.authBorder }}
                        style={({ pressed }) => [styles.inviteAction, pressed && styles.pressed]}>
                        <Plus size={18} color={colors.authForeground} accessible={false} />
                        <NativeText style={[styles.inviteLabel, { color: colors.authForeground }]}>
                            Invite
                        </NativeText>
                    </Pressable>
                )
            }
            actions={
                empty && (
                    <View style={styles.actionSlot}>
                        <Button
                            name="Invite"
                            accessibilityLabel="Invite someone"
                            type="brand-outline"
                            loading={false}
                            disabled={inviteDisabled}
                            onPress={invite}
                        />
                    </View>
                )
            }>
            {loading && (
                <View
                    accessible
                    accessibilityRole="progressbar"
                    accessibilityLabel="Loading home access"
                    accessibilityState={{ busy: true }}
                    style={styles.loading}>
                    <ActivityIndicator accessible={false} color={colors.authMuted} />
                    <NativeText style={[styles.loadingText, { color: colors.authMuted }]}>
                        Loading home access…
                    </NativeText>
                </View>
            )}
            {!!error && (
                <View style={styles.error}>
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
                </View>
            )}
            {!loading && !error && sharings.length > 0 && (
                <View style={styles.list}>
                    {sharings.map((sharing, index) => (
                        <HomeSharingListItem
                            key={sharing.sharingId}
                            id={sharing.sharingId}
                            email={sharing.friendEmail}
                            type={sharing.sharingType}
                            separator={index < sharings.length - 1}
                            disabled={disabled || !isOwner}
                            onRemove={() => setReload((value) => value + 1)}
                        />
                    ))}
                </View>
            )}
        </ContentSection>
    );
};

export default HomeSharingList;

const styles = StyleSheet.create({
    error: { gap: 16 },
    actionSlot: { minHeight: 72, justifyContent: "center" },
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
    loading: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 12 },
    loadingText: { flex: 1, fontSize: 14, lineHeight: 20 },
    list: { gap: 0 },
});
