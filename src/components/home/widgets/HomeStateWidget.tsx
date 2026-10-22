import Button from "../../common/Button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { useRouter } from "expo-router";
import { CircleAlert, Info, Unplug } from "lucide-react-native";
import React, { FC } from "react";
import { StyleSheet, Text, View } from "react-native";

const HomeStateWidget: FC = () => {
    const { current: home } = useHomes();
    const { colors } = useTheme().current;
    const router = useRouter();
    if (!home) return null;

    const source = home.dataSource;
    const sourceId = source?.id;
    const hasSource = Boolean(sourceId);
    const state = source?.state;
    if (hasSource && (state === "Working" || state === "Connected")) return null;

    if (hasSource && (state === "Connecting" || state === "Restarting"))
        return (
            <Text
                accessible
                accessibilityRole="text"
                accessibilityLiveRegion="polite"
                style={[styles.pending, { color: colors.authMuted }]}>
                {state === "Connecting" ? "Connecting to data source…" : "Restarting data source…"}
            </Text>
        );

    const missing = !hasSource;
    const disconnected =
        hasSource && (state === "NotStarted" || state === "Stopped" || state === "Disconnected");
    const error = hasSource && state === "Error";
    const copy = missing
        ? `No data source connected. ${home.isOwner ? "Connect a data source to add devices." : "Ask the home owner to connect a data source."}`
        : error
          ? "Data source error. Device values may be out of date."
          : disconnected
            ? "Data source disconnected. Device values may be out of date."
            : "Connection status unavailable. Device values may be out of date.";
    const needsOwner = !home.isOwner && (error || disconnected);
    const message = needsOwner ? `${copy} Contact the home owner if this continues.` : copy;
    const canAct = home.isOwner && (missing || disconnected || error);

    return (
        <View style={styles.feedback}>
            <Alert
                variant={error ? "destructive" : undefined}
                icon={error ? CircleAlert : disconnected ? Unplug : Info}
                accessibilityRole="alert"
                accessibilityLiveRegion="polite">
                <AlertDescription>{message}</AlertDescription>
            </Alert>
            {canAct && (
                <Button
                    name={missing ? "Connect data source" : "Connection details"}
                    type="brand-outline"
                    loading={false}
                    onPress={() => {
                        if (hasSource && sourceId) {
                            router.push({
                                pathname: "dataSource/details",
                                params: { id: sourceId },
                            });
                            return;
                        }
                        router.push({
                            pathname: "home/dataSource/select",
                            params: { homeId: home.id },
                        });
                    }}
                />
            )}
        </View>
    );
};

export default HomeStateWidget;

const styles = StyleSheet.create({
    feedback: { gap: 12 },
    pending: { fontSize: 14, lineHeight: 20 },
});
