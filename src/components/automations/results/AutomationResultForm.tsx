import BottomSheetSelect from "@/components/common/BottomSheetSelect";
import Button from "@/components/common/Button";
import FormSection from "@/components/common/FormSection";
import Input from "@/components/common/Input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Text } from "@/components/ui/text";
import { useDeviceList, OperationListDto } from "@/contexts/custom/DeviceListProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { AutomationResultDraft } from "@/types/AutomationsTypes";
import { OperationToConditionMap } from "@/types/AutomationsTypes";
import { ListResponse } from "@/utils/httpClient";
import { CircleAlert } from "lucide-react-native";
import React, { FC, useRef, useState } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { StyleSheet, View } from "react-native";
import { keyboardOffset } from "@/styles/defaultStyles";

interface AutomationResultFormProps {
    pending: boolean;
    accepted: boolean;
    actionError?: string;
    onSubmit(value: AutomationResultDraft): Promise<void>;
}

const isOperation = (value: unknown): value is OperationListDto => {
    if (!value || typeof value !== "object") return false;
    const operation = value as OperationListDto;
    return (
        typeof operation.id === "string" &&
        operation.id.length > 0 &&
        typeof operation.name === "string" &&
        typeof operation.type === "string" &&
        Object.prototype.hasOwnProperty.call(OperationToConditionMap, operation.type)
    );
};

const AutomationResultForm: FC<AutomationResultFormProps> = ({
    pending,
    accepted,
    actionError,
    onSubmit,
}) => {
    const { colors } = useTheme().current;
    const httpClient = useHttpClient();
    const { devices, loading: devicesLoading, error: devicesError, refresh } = useDeviceList();
    const [deviceId, setDeviceId] = useState("");
    const [operations, setOperations] = useState<OperationListDto[]>([]);
    const [operationId, setOperationId] = useState("");
    const [valueToSend, setValueToSend] = useState("");
    const [loadStatus, setLoadStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
    const [deviceError, setDeviceError] = useState("");
    const [operationError, setOperationError] = useState("");
    const [valueError, setValueError] = useState("");
    const [localActionError, setLocalActionError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const requestVersion = useRef(0);
    const selectedDevice = useRef(deviceId);
    selectedDevice.current = deviceId;
    const currentDevices = useRef(devices);
    currentDevices.current = devices;
    const currentOperations = useRef(operations);
    currentOperations.current = operations;
    const pendingRef = useRef(pending);
    pendingRef.current = pending;
    const acceptedRef = useRef(accepted);
    acceptedRef.current = accepted;
    const submittingRef = useRef(false);
    const submitLock = useRef(false);
    const lastSubmitted = useRef<AutomationResultDraft | undefined>(undefined);

    const locked = () => pendingRef.current || submittingRef.current || acceptedRef.current;
    const resetValue = () => {
        setOperationId("");
        setValueToSend("");
        setOperationError("");
        setValueError("");
        setLocalActionError("");
    };

    const loadOperations = async (requestedDeviceId: string) => {
        const version = ++requestVersion.current;
        setLoadStatus("loading");
        setOperations([]);
        currentOperations.current = [];
        try {
            const response = await httpClient.get(
                `v1/devices/operations/display?deviceId=${encodeURIComponent(requestedDeviceId)}&size=2147483647`,
            );
            if (version !== requestVersion.current || selectedDevice.current !== requestedDeviceId)
                return;
            if (!response.isSuccess || !response.response)
                throw new Error("operation request failed");
            const data = (await response.response.json()) as ListResponse<OperationListDto>;
            if (version !== requestVersion.current || selectedDevice.current !== requestedDeviceId)
                return;
            if (!Array.isArray(data?.items) || !data.items.every(isOperation))
                throw new Error("invalid operation collection");
            currentOperations.current = data.items;
            setOperations(data.items);
            setLoadStatus("loaded");
        } catch {
            if (
                version === requestVersion.current &&
                selectedDevice.current === requestedDeviceId
            ) {
                setOperations([]);
                currentOperations.current = [];
                setLoadStatus("error");
            }
        }
    };

    const selectDevice = (nextDeviceId: string) => {
        if (locked()) return;
        selectedDevice.current = nextDeviceId;
        requestVersion.current++;
        setDeviceId(nextDeviceId);
        setOperations([]);
        currentOperations.current = [];
        setLoadStatus(nextDeviceId ? "loading" : "idle");
        setDeviceError("");
        resetValue();
        if (currentDevices.current.some((device) => device.id === nextDeviceId))
            void loadOperations(nextDeviceId);
        else setLoadStatus("idle");
    };

    const selectOperation = (nextOperationId: string) => {
        if (locked()) return;
        const operation = currentOperations.current.find((item) => item.id === nextOperationId);
        if (!operation) return;
        setOperationId(operation.id);
        setValueToSend("");
        setOperationError("");
        setValueError("");
        setLocalActionError("");
    };

    const changeValue = (value: string) => {
        if (locked()) return;
        setValueToSend(value);
        setValueError("");
        setLocalActionError("");
    };

    const submit = async () => {
        if (acceptedRef.current) {
            if (!submitLock.current && lastSubmitted.current) {
                submitLock.current = true;
                try {
                    await onSubmit(lastSubmitted.current);
                } finally {
                    submitLock.current = false;
                }
            }
            return;
        }
        if (locked() || submitLock.current) return;
        setDeviceError("");
        setOperationError("");
        setValueError("");
        const device = currentDevices.current.find((item) => item.id === selectedDevice.current);
        const operation = currentOperations.current.find((item) => item.id === operationId);
        if (!device) setDeviceError("Select a current device.");
        if (!operation) setOperationError("Select an operation for this device.");
        if (valueToSend.length === 0) setValueError("Enter a value to send.");
        if (!device || !operation || valueToSend.length === 0) return;

        const value: AutomationResultDraft = {
            operationId: operation.id,
            operationName: operation.name,
            valueToSend,
        };
        lastSubmitted.current = value;
        submitLock.current = true;
        submittingRef.current = true;
        setSubmitting(true);
        setLocalActionError("");
        try {
            await onSubmit(value);
        } catch {
            setLocalActionError("Couldn't add this result. Try again.");
        } finally {
            submittingRef.current = false;
            submitLock.current = false;
            setSubmitting(false);
        }
    };

    const effectivePending = pending || submitting;
    const activeActionError = actionError || localActionError;
    const deviceOptions = devices.map((device) => ({
        label: device.name,
        selected: device.id === deviceId,
        onPress: () => selectDevice(device.id),
    }));
    const operationOptions = operations.map((operation) => ({
        label: operation.name,
        selected: operation.id === operationId,
        onPress: () => selectOperation(operation.id),
    }));
    const deviceName = devices.find((device) => device.id === deviceId)?.name ?? "Select a device";
    const operationName =
        operations.find((operation) => operation.id === operationId)?.name ?? "Select an operation";

    return (
        <KeyboardAwareScrollView
            bottomOffset={keyboardOffset}
            keyboardShouldPersistTaps="handled"
            style={[styles.screen, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.content}>
            <View style={styles.layout}>
                <FormSection
                    title="Add result"
                    helper="Choose a device operation and enter the exact value it should receive.">
                    <BottomSheetSelect
                        title="Device"
                        value={deviceName}
                        options={deviceOptions}
                        disabled={effectivePending || accepted}
                    />
                    {!!deviceError && (
                        <Text style={[styles.message, { color: colors.error }]}>{deviceError}</Text>
                    )}
                    {devicesLoading && (
                        <Text
                            accessibilityLiveRegion="polite"
                            style={[styles.message, { color: colors.authMuted }]}>
                            Loading devices…
                        </Text>
                    )}
                    {!devicesLoading && !!devicesError && (
                        <View style={styles.feedback}>
                            <Text
                                accessibilityRole="alert"
                                style={[styles.message, { color: colors.error }]}>
                                {devicesError}
                            </Text>
                            <Button
                                name="Retry devices"
                                type="brand-outline"
                                loading={false}
                                disabled={effectivePending || accepted}
                                onPress={() => void refresh()}
                            />
                        </View>
                    )}
                    {!devicesLoading && !devicesError && !devices.length && (
                        <Text style={[styles.message, { color: colors.authMuted }]}>
                            No devices available.
                        </Text>
                    )}
                    {deviceId !== "" && loadStatus === "loading" && (
                        <Text
                            accessibilityLiveRegion="polite"
                            style={[styles.message, { color: colors.authMuted }]}>
                            Loading operations…
                        </Text>
                    )}
                    {deviceId !== "" && loadStatus === "error" && (
                        <View style={styles.feedback}>
                            <Text
                                accessibilityRole="alert"
                                style={[styles.message, { color: colors.error }]}>
                                Couldn't load operations. Try again.
                            </Text>
                            <Button
                                name="Retry"
                                type="brand-outline"
                                loading={false}
                                disabled={effectivePending || accepted}
                                onPress={() => void loadOperations(deviceId)}
                            />
                        </View>
                    )}
                    {deviceId !== "" && loadStatus === "loaded" && operations.length === 0 && (
                        <Text style={[styles.message, { color: colors.authMuted }]}>
                            This device does not have any operations. Select another device or
                            create an operation for it.
                        </Text>
                    )}
                    {deviceId !== "" && loadStatus === "loaded" && operations.length > 0 && (
                        <>
                            <BottomSheetSelect
                                title="Operation"
                                value={operationName}
                                options={operationOptions}
                                disabled={effectivePending || accepted}
                            />
                            {!!operationError && (
                                <Text style={[styles.message, { color: colors.error }]}>
                                    {operationError}
                                </Text>
                            )}
                        </>
                    )}
                    <Input
                        title="Value to send"
                        placeholder="Enter exact value"
                        value={valueToSend}
                        setValue={changeValue}
                        error={valueError}
                        variant="auth"
                        editable={!accepted}
                        returnKeyType="done"
                        submitBehavior="submit"
                        onSubmitEditing={submit}
                    />
                </FormSection>
                <View style={styles.actions}>
                    {!!activeActionError && (
                        <Alert
                            icon={CircleAlert}
                            variant="destructive"
                            accessibilityRole="alert"
                            accessibilityLiveRegion="polite">
                            <AlertDescription>{activeActionError}</AlertDescription>
                        </Alert>
                    )}
                    <Button
                        name={accepted ? "Return to automation" : "Add result"}
                        type="auth"
                        loading={effectivePending}
                        disabled={effectivePending}
                        onPress={submit}
                    />
                </View>
            </View>
        </KeyboardAwareScrollView>
    );
};

export default AutomationResultForm;

const styles = StyleSheet.create({
    screen: { flex: 1 },
    content: {
        flexGrow: 1,
        width: "100%",
        maxWidth: 448,
        alignSelf: "center",
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 16,
    },
    layout: { flexGrow: 1 },
    actions: { marginTop: "auto", paddingTop: 24, gap: 12 },
    message: { fontSize: 14, lineHeight: 20 },
    feedback: { gap: 12 },
});
