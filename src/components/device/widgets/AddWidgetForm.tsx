import React, { FC, useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { CircleAlert, Info } from "lucide-react-native";
import Button from "@/components/common/Button";
import Loading from "@/components/common/Loading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useWidgetDetails, type AddWidgetDto } from "@/contexts/custom/WidgetDetailsProvider";
import { useDevice } from "@/contexts/custom/DeviceProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import WidgetForm from "./WidgetForm";

interface AddWidgetFormProps {
    operationId: string;
    deviceId?: string;
}

const AddWidgetForm: FC<AddWidgetFormProps> = ({ operationId, deviceId }) => {
    const details = useWidgetDetails();
    const { initializeForAdd } = details;
    const httpClient = useHttpClient();
    const device = useDevice();
    const home = useHomes();
    const router = useRouter();
    const [pending, setPending] = useState(false);
    const [feedback, setFeedback] = useState("");
    const [created, setCreated] = useState(false);
    const locked = useRef(false);
    const accepted = useRef(false);
    const returning = useRef(false);
    const focused = useRef(false);
    const canManage = useRef(false);
    canManage.current =
        !home.loading && (home.current?.isOwner === true || home.current?.canManage === true);
    const deviceRef = useRef(device);
    deviceRef.current = device;

    const returnToWidgets = useCallback(async () => {
        if (!focused.current || returning.current || !accepted.current) return;
        returning.current = true;
        try {
            if (router.canGoBack()) await router.back();
            else if (deviceId)
                await router.replace({ pathname: "/device/widget/list", params: { deviceId } });
            else await router.replace("/");
            setFeedback("");
        } catch {
            returning.current = false;
            setFeedback("Widget created. Return to your widgets to continue.");
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
        void initializeForAdd(operationId);
    }, [operationId, initializeForAdd]);

    const clearFeedback = useCallback(() => setFeedback(""), []);
    const submit = async (values: AddWidgetDto) => {
        if (
            locked.current ||
            accepted.current ||
            !focused.current ||
            !canManage.current ||
            values.operationId !== operationId
        )
            return;
        locked.current = true;
        setPending(true);
        setFeedback("");
        try {
            const result = await httpClient.post("v1/devices/widgets", values);
            if (!result.isSuccess) throw new Error("Widget creation failed");
            accepted.current = true;
            setCreated(true);
            if (deviceId && deviceRef.current.deviceId === deviceId) {
                try {
                    void deviceRef.current.refresh(false).catch(() => {});
                } catch {
                    /* Creation remains accepted if the dashboard cannot refresh. */
                }
            }
            await returnToWidgets();
        } catch {
            if (!accepted.current && focused.current)
                setFeedback("Couldn't create this widget. Check your connection and try again.");
        } finally {
            locked.current = false;
            setPending(false);
        }
    };

    if (details.loading) return <Loading />;
    if (details.loadError || !details.widget || !details.operation)
        return (
            <View style={styles.recovery}>
                <Alert icon={CircleAlert} variant="destructive" accessibilityRole="alert">
                    <AlertDescription>
                        {details.loadError || "Couldn't load the operation. Try again."}
                    </AlertDescription>
                </Alert>
                <Button
                    name="Retry"
                    type="auth"
                    loading={false}
                    onPress={() => void details.initializeForAdd(operationId)}
                />
            </View>
        );

    return (
        <WidgetForm
            onSubmit={submit}
            pending={pending}
            disabled={created}
            onChange={clearFeedback}
            feedback={
                feedback ? (
                    <Alert
                        icon={created ? Info : CircleAlert}
                        variant={created ? "default" : "destructive"}
                        accessibilityRole="alert"
                        accessibilityLiveRegion="polite">
                        <AlertDescription>{feedback}</AlertDescription>
                    </Alert>
                ) : undefined
            }
            returnAction={
                created ? (
                    <Button
                        name="Return to widgets"
                        type="brand-outline"
                        loading={false}
                        onPress={() => void returnToWidgets()}
                    />
                ) : undefined
            }
        />
    );
};

export default AddWidgetForm;
const styles = StyleSheet.create({
    recovery: {
        flex: 1,
        justifyContent: "center",
        gap: 16,
        padding: 16,
        maxWidth: 480,
        width: "100%",
        alignSelf: "center",
    },
});
