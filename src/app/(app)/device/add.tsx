import Button from "@/components/common/Button";
import Loading from "@/components/common/Loading";
import DeviceForm from "@/components/device/DeviceForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Text } from "@/components/ui/text";
import { useDeviceList } from "@/contexts/custom/DeviceListProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { useFocusEffect, useRouter } from "expo-router";
import { CircleAlert } from "lucide-react-native";
import React, { FC, useCallback, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

const Add: FC = () => {
    const router = useRouter();
    const httpClient = useHttpClient();
    const devices = useDeviceList();
    const homes = useHomes();
    const { colors } = useTheme().current;
    const homeId = homes.current?.id;
    const canManage = homes.current?.isOwner === true || homes.current?.canManage === true;
    const currentHomes = useRef(homes);
    currentHomes.current = homes;
    const boundHomeId = useRef<string | undefined>(undefined);
    if (!boundHomeId.current && !homes.loading && homeId?.trim()) boundHomeId.current = homeId;
    const active = useRef(false);
    const pending = useRef(false);
    const created = useRef(false);
    const returned = useRef(false);
    const [accepted, setAccepted] = useState(false);
    const [returnError, setReturnError] = useState("");
    const leaveRoute = useCallback(() => {
        if (!active.current || returned.current) return;
        try {
            if (router.canGoBack()) router.back();
            else router.replace("/");
            returned.current = true;
            setReturnError("");
        } catch {
            setReturnError("Couldn't return to your home. Try Return again.");
        }
    }, [router]);

    useFocusEffect(
        useCallback(() => {
            active.current = true;
            if (
                created.current &&
                !currentHomes.current.loading &&
                currentHomes.current.current?.id === boundHomeId.current
            )
                leaveRoute();
            return () => {
                active.current = false;
            };
        }, [leaveRoute]),
    );

    const addClicked = async (values: any) => {
        const current = currentHomes.current;
        if (
            pending.current ||
            created.current ||
            !active.current ||
            current.loading ||
            !boundHomeId.current ||
            current.current?.id !== boundHomeId.current ||
            (current.current.isOwner !== true && current.current.canManage !== true) ||
            values.homeId !== boundHomeId.current
        )
            return;
        pending.current = true;
        try {
            const response = await httpClient.post("v1/devices", values);
            if (!response.isSuccess)
                throw new Error(
                    "Couldn't create this device. Check your connection and try again.",
                );
            created.current = true;
            setAccepted(true);
            if (
                currentHomes.current.loading ||
                currentHomes.current.current?.id !== boundHomeId.current
            )
                return;
            try {
                await devices.refresh();
            } catch {
                // The device exists; returning to the list lets it reload without another POST.
            }
            if (
                !active.current ||
                currentHomes.current.loading ||
                currentHomes.current.current?.id !== boundHomeId.current
            )
                return;
            leaveRoute();
        } finally {
            pending.current = false;
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {accepted ? (
                <ScrollView contentContainerStyle={styles.recovery}>
                    <Text
                        accessibilityRole="header"
                        style={[styles.title, { color: colors.authForeground }]}>
                        Device created
                    </Text>
                    <Text style={[styles.helper, { color: colors.authMuted }]}>
                        Your device was created. Return to your home to view it.
                    </Text>
                    {!!returnError && (
                        <Alert icon={CircleAlert} variant="destructive" accessibilityRole="alert">
                            <AlertDescription>{returnError}</AlertDescription>
                        </Alert>
                    )}
                    <Button name="Return" type="auth" loading={false} onPress={leaveRoute} />
                </ScrollView>
            ) : homes.loading ? (
                <Loading />
            ) : !homeId?.trim() || homeId !== boundHomeId.current || !canManage ? (
                <ScrollView contentContainerStyle={styles.recovery}>
                    <Alert icon={CircleAlert} variant="destructive" accessibilityRole="alert">
                        <AlertDescription>
                            {!homeId?.trim()
                                ? "Choose a home before creating a device."
                                : homeId !== boundHomeId.current
                                  ? "Your current home changed. Return home to create a device."
                                  : "You don't have permission to create devices in this home."}
                        </AlertDescription>
                    </Alert>
                    {!!returnError && (
                        <Alert icon={CircleAlert} variant="destructive" accessibilityRole="alert">
                            <AlertDescription>{returnError}</AlertDescription>
                        </Alert>
                    )}
                    <Button
                        name="Return to home"
                        type="auth"
                        loading={false}
                        onPress={leaveRoute}
                    />
                </ScrollView>
            ) : (
                <DeviceForm key={homeId} edit={false} onSubmit={addClicked} />
            )}
        </View>
    );
};

export default Add;

const styles = StyleSheet.create({
    container: { flex: 1 },
    recovery: {
        width: "100%",
        maxWidth: 448,
        alignSelf: "center",
        padding: 24,
        gap: 12,
    },
    title: { fontSize: 24, lineHeight: 32, fontWeight: "600" },
    helper: { fontSize: 14, lineHeight: 20 },
});
