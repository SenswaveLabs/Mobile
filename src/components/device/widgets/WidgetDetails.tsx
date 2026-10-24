import React, { FC, useCallback, useEffect, useId, useRef, useState } from "react";
import { Modal, ScrollView, StyleSheet, View } from "react-native";
import { PortalHost } from "@rn-primitives/portal";
import { useFocusEffect, useRouter } from "expo-router";
import { CircleAlert, Info } from "lucide-react-native";
import Button from "@/components/common/Button";
import ContentSection from "@/components/common/ContentSection";
import Loading from "@/components/common/Loading";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { useWidgetDetails } from "@/contexts/custom/WidgetDetailsProvider";
import { useDevice } from "@/contexts/custom/DeviceProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import WidgetForm from "./WidgetForm";

interface WidgetDetailsProps {
    widgetId: string;
    deviceId?: string;
}

const WidgetDetails: FC<WidgetDetailsProps> = ({ widgetId, deviceId }) => {
    const details = useWidgetDetails();
    const { initializeForDisplay } = details;
    const httpClient = useHttpClient();
    const router = useRouter();
    const device = useDevice();
    const home = useHomes();
    const [showDialog, setShowDialog] = useState(false);
    const [pending, setPending] = useState(false);
    const [deleted, setDeleted] = useState(false);
    const [feedback, setFeedback] = useState("");
    const locked = useRef(false);
    const accepted = useRef(false);
    const returning = useRef(false);
    const focused = useRef(false);
    const canManage = useRef(false);
    canManage.current =
        !home.loading && (home.current?.isOwner === true || home.current?.canManage === true);
    const widgetRef = useRef(details.widget);
    widgetRef.current = details.widget;
    const deviceRef = useRef(device);
    deviceRef.current = device;
    const dialogHost = useId();

    const returnToWidgets = useCallback(async () => {
        if (!focused.current || !accepted.current || returning.current) return;
        returning.current = true;
        try {
            const originDeviceId = deviceId || widgetRef.current?.deviceId;
            if (router.canGoBack()) await router.back();
            else if (originDeviceId)
                await router.replace({
                    pathname: "/device/widget/list",
                    params: { deviceId: originDeviceId },
                });
            else await router.replace("/");
            setFeedback("");
        } catch {
            returning.current = false;
            setFeedback("Widget deleted. Return to your widgets to continue.");
        }
    }, [deviceId, router]);

    useFocusEffect(
        useCallback(() => {
            focused.current = true;
            if (accepted.current) void returnToWidgets();
            return () => {
                focused.current = false;
            };
        }, [returnToWidgets]),
    );
    useEffect(() => {
        void initializeForDisplay(widgetId);
    }, [widgetId, initializeForDisplay]);

    const matchingWidget = () =>
        widgetRef.current?.id === widgetId &&
        (!deviceId || widgetRef.current.deviceId === deviceId);
    const deleteWidget = async () => {
        if (
            !focused.current ||
            !canManage.current ||
            locked.current ||
            accepted.current ||
            !matchingWidget()
        )
            return;
        locked.current = true;
        setShowDialog(false);
        setPending(true);
        setFeedback("");
        try {
            const response = await httpClient.delete(`v1/devices/widgets/${widgetId}`);
            if (!response.isSuccess) throw new Error("Widget deletion failed");
            accepted.current = true;
            setDeleted(true);
            if (deviceRef.current.deviceId === widgetRef.current?.deviceId) {
                try {
                    void deviceRef.current.refresh(false).catch(() => {});
                } catch {
                    /* Deletion remains accepted if the dashboard cannot refresh. */
                }
            }
            await returnToWidgets();
        } catch {
            if (!accepted.current && focused.current)
                setFeedback("Couldn't delete this widget. Try again.");
        } finally {
            locked.current = false;
            setPending(false);
        }
    };

    if (details.loading) return <Loading />;
    if (details.loadError || !matchingWidget() || !details.operation)
        return (
            <View style={styles.recovery}>
                <Alert icon={CircleAlert} variant="destructive" accessibilityRole="alert">
                    <AlertDescription>
                        {details.loadError ||
                            "Couldn't load this widget for the selected device. Try again."}
                    </AlertDescription>
                </Alert>
                <Button
                    name="Retry"
                    type="auth"
                    loading={false}
                    onPress={() => void details.initializeForDisplay(widgetId)}
                />
            </View>
        );

    const openDialog = () => {
        if (
            !focused.current ||
            !canManage.current ||
            locked.current ||
            accepted.current ||
            !matchingWidget()
        )
            return;
        setFeedback("");
        setShowDialog(true);
    };
    return (
        <AlertDialog
            open={showDialog}
            onOpenChange={(open) => (open ? openDialog() : setShowDialog(false))}
            asChild>
            <View style={styles.screen}>
                <Modal
                    visible={showDialog}
                    transparent
                    statusBarTranslucent
                    navigationBarTranslucent
                    accessibilityViewIsModal
                    onRequestClose={() => setShowDialog(false)}>
                    <PortalHost name={dialogHost} />
                </Modal>
                <AlertDialogContent
                    portalHost={dialogHost}
                    accessibilityViewIsModal
                    className="max-w-md"
                    style={styles.dialog}>
                    <ScrollView style={styles.dialogBody}>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete “{details.widget?.name}”?</AlertDialogTitle>
                            <AlertDialogDescription>
                                The widget definition will be permanently deleted. Its placements on
                                dashboards may stop working. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                    </ScrollView>
                    <AlertDialogFooter className="flex-col">
                        <AlertDialogCancel asChild>
                            <Button
                                name="Cancel"
                                type="brand-outline"
                                loading={false}
                                onPress={() => setShowDialog(false)}
                            />
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <Button
                                name="Delete widget"
                                type="brand-destructive"
                                loading={pending}
                                disabled={pending || deleted}
                                onPress={deleteWidget}
                            />
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                <WidgetForm edit disabled={pending || deleted}>
                    <ContentSection
                        title="Delete widget"
                        helper="Remove this widget definition from the device."
                        separated
                        actions={
                            deleted ? (
                                <Button
                                    name="Return to widgets"
                                    type="brand-outline"
                                    loading={false}
                                    onPress={() => void returnToWidgets()}
                                />
                            ) : (
                                <AlertDialogTrigger asChild>
                                    <Button
                                        name="Delete widget"
                                        type="brand-destructive"
                                        loading={pending}
                                        disabled={pending}
                                        onPress={openDialog}
                                    />
                                </AlertDialogTrigger>
                            )
                        }>
                        {!!feedback && (
                            <Alert
                                icon={deleted ? Info : CircleAlert}
                                variant={deleted ? "default" : "destructive"}
                                accessibilityRole="alert"
                                accessibilityLiveRegion="polite">
                                <AlertDescription>{feedback}</AlertDescription>
                            </Alert>
                        )}
                    </ContentSection>
                </WidgetForm>
            </View>
        </AlertDialog>
    );
};

export default WidgetDetails;
const styles = StyleSheet.create({
    screen: { flex: 1 },
    recovery: {
        flex: 1,
        justifyContent: "center",
        gap: 16,
        padding: 16,
        maxWidth: 480,
        width: "100%",
        alignSelf: "center",
    },
    dialog: { maxHeight: "85%" },
    dialogBody: { flexShrink: 1 },
});
