import React, { FC, useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { CircleAlert } from "lucide-react-native";
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
        <View style={styles.container}>
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
            {sharings.map((sharing) => (
                <HomeSharingListItem
                    key={sharing.sharingId}
                    id={sharing.sharingId}
                    email={sharing.friendEmail}
                    type={sharing.sharingType}
                    disabled={disabled || !home?.isOwner}
                    onRemove={() => setReload((value) => value + 1)}
                />
            ))}
            <Button
                name="Invite someone"
                type="brand-outline"
                loading={false}
                disabled={disabled || !home?.isOwner}
                onPress={() => router.push({ pathname: "home/share", params: { id: homeId } })}
            />
        </View>
    );
};

export default HomeSharingList;

const styles = StyleSheet.create({
    container: { gap: 16 },
    loading: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16 },
    loadingText: { flex: 1 },
    description: { fontSize: 14, lineHeight: 20 },
});
