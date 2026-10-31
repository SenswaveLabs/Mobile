import BottomSheetSelect from "@/components/common/BottomSheetSelect";
import Button from "@/components/common/Button";
import FormSection from "@/components/common/FormSection";
import Input from "@/components/common/Input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Text } from "@/components/ui/text";
import { useDeviceList, OperationListDto } from "@/contexts/custom/DeviceListProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import {
    AutomationConditionDraft,
    ConditionType,
    OperationToConditionMap,
} from "@/types/AutomationsTypes";
import { ListResponse } from "@/utils/httpClient";
import { CircleAlert, Check } from "lucide-react-native";
import React, { FC, useRef, useState } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Pressable, StyleSheet, View } from "react-native";
import { keyboardOffset } from "@/styles/defaultStyles";

interface AutomationConditionFormProps {
    pending: boolean;
    accepted: boolean;
    actionError?: string;
    onSubmit(value: AutomationConditionDraft): Promise<void>;
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

const AutomationConditionForm: FC<AutomationConditionFormProps> = ({
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
    const [conditionType, setConditionType] =
        useState<Exclude<ConditionType, "InvalidCondition">>();
    const [isOn, setIsOn] = useState(true);
    const [minValue, setMinValue] = useState("");
    const [maxValue, setMaxValue] = useState("");
    const [requiredValue, setRequiredValue] = useState("");
    const [loadStatus, setLoadStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
    const [deviceError, setDeviceError] = useState("");
    const [operationError, setOperationError] = useState("");
    const [minError, setMinError] = useState("");
    const [maxError, setMaxError] = useState("");
    const [requiredError, setRequiredError] = useState("");
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
    const lastSubmitted = useRef<AutomationConditionDraft | undefined>(undefined);

    const locked = () => pendingRef.current || submittingRef.current || acceptedRef.current;
    const resetConfiguration = () => {
        setOperationId("");
        setConditionType(undefined);
        setIsOn(true);
        setMinValue("");
        setMaxValue("");
        setRequiredValue("");
        setOperationError("");
        setMinError("");
        setMaxError("");
        setRequiredError("");
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
        resetConfiguration();
        if (currentDevices.current.some((device) => device.id === nextDeviceId))
            void loadOperations(nextDeviceId);
        else setLoadStatus("idle");
    };

    const selectOperation = (nextOperationId: string) => {
        if (locked()) return;
        const operation = currentOperations.current.find((item) => item.id === nextOperationId);
        if (!operation) return;
        setOperationId(operation.id);
        setConditionType(OperationToConditionMap[operation.type]);
        setOperationError("");
        setMinValue("");
        setMaxValue("");
        setRequiredValue("");
        setIsOn(true);
        setMinError("");
        setMaxError("");
        setRequiredError("");
        setLocalActionError("");
    };

    const changeValue = (setValue: (value: string) => void, value: string, clear: () => void) => {
        if (locked()) return;
        setValue(value);
        clear();
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
        setMinError("");
        setMaxError("");
        setRequiredError("");

        const device = currentDevices.current.find((item) => item.id === selectedDevice.current);
        const operation = currentOperations.current.find((item) => item.id === operationId);
        let valid = true;
        if (!device) {
            setDeviceError("Select a current device.");
            valid = false;
        }
        if (!operation) {
            setOperationError("Select an operation for this device.");
            valid = false;
        }
        if (!device || !operation || !conditionType) return;

        if (conditionType === "NumberCondition") {
            const min = minValue.trim() ? Number(minValue) : Number.NaN;
            const max = maxValue.trim() ? Number(maxValue) : Number.NaN;
            if (!Number.isFinite(min)) {
                setMinError("Enter a finite number.");
                valid = false;
            }
            if (!Number.isFinite(max)) {
                setMaxError("Enter a finite number.");
                valid = false;
            }
            if (Number.isFinite(min) && Number.isFinite(max) && min >= max) {
                setMinError("Minimum must be less than maximum.");
                setMaxError("Maximum must be greater than minimum.");
                valid = false;
            }
            if (!valid) return;
        } else if (conditionType === "TextCondition" && requiredValue.length === 0) {
            setRequiredError("Enter a required value.");
            return;
        }
        if (!valid) return;

        let value: AutomationConditionDraft;
        switch (conditionType) {
            case "BooleanCondition":
                value = {
                    operationId: operation.id,
                    operationName: operation.name,
                    conditionType,
                    conditionConfiguration: { isOn },
                };
                break;
            case "NumberCondition":
                value = {
                    operationId: operation.id,
                    operationName: operation.name,
                    conditionType,
                    conditionConfiguration: {
                        minValue: Number(minValue),
                        maxValue: Number(maxValue),
                    },
                };
                break;
            case "TextCondition":
                value = {
                    operationId: operation.id,
                    operationName: operation.name,
                    conditionType,
                    conditionConfiguration: { requiredValue },
                };
                break;
        }
        lastSubmitted.current = value;
        submitLock.current = true;
        submittingRef.current = true;
        setSubmitting(true);
        setLocalActionError("");
        try {
            await onSubmit(value);
        } catch {
            setLocalActionError("Couldn't add this condition. Try again.");
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
    const choiceStyle = (selected: boolean) => [
        styles.choice,
        {
            backgroundColor: selected ? colors.authPrimary : colors.authFieldBackground,
            borderColor: selected ? colors.authOnPrimary : colors.authBorder,
            borderWidth: selected ? 2 : 1,
        },
    ];

    return (
        <KeyboardAwareScrollView
            bottomOffset={keyboardOffset}
            keyboardShouldPersistTaps="handled"
            style={[styles.screen, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.content}>
            <View style={styles.layout}>
                <FormSection
                    title="Add condition"
                    helper="Choose a device operation and define when its value meets this condition.">
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
                    {conditionType === "BooleanCondition" && (
                        <View style={styles.booleanField}>
                            <Text style={[styles.label, { color: colors.authForeground }]}>
                                Condition requirement
                            </Text>
                            <View
                                accessibilityRole="radiogroup"
                                accessibilityLabel="Condition requirement"
                                style={styles.choices}>
                                {[true, false].map((value) => {
                                    const label = value ? "On" : "Off";
                                    const selected = isOn === value;
                                    return (
                                        <Pressable
                                            key={label}
                                            accessibilityRole="radio"
                                            accessibilityLabel={label}
                                            accessibilityState={{
                                                checked: selected,
                                                selected,
                                                disabled: effectivePending || accepted,
                                            }}
                                            disabled={effectivePending || accepted}
                                            onPress={() => {
                                                if (locked()) return;
                                                setIsOn(value);
                                                setLocalActionError("");
                                            }}
                                            style={choiceStyle(selected)}>
                                            {selected && (
                                                <Check
                                                    size={18}
                                                    color={colors.authOnPrimary}
                                                    accessible={false}
                                                />
                                            )}
                                            <Text
                                                style={{
                                                    color: selected
                                                        ? colors.authOnPrimary
                                                        : colors.authForeground,
                                                }}>
                                                {label}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>
                    )}
                    {conditionType === "NumberCondition" && (
                        <View style={styles.numericFields}>
                            <Input
                                title="Min value"
                                placeholder="0"
                                value={minValue}
                                setValue={(value) =>
                                    changeValue(setMinValue, value, () => setMinError(""))
                                }
                                error={minError}
                                variant="auth"
                                keyboardType="numeric"
                                editable={!accepted}
                            />
                            <Input
                                title="Max value"
                                placeholder="100"
                                value={maxValue}
                                setValue={(value) =>
                                    changeValue(setMaxValue, value, () => setMaxError(""))
                                }
                                error={maxError}
                                variant="auth"
                                keyboardType="numeric"
                                editable={!accepted}
                            />
                        </View>
                    )}
                    {conditionType === "TextCondition" && (
                        <Input
                            title="Required value"
                            placeholder="Enter exact text"
                            value={requiredValue}
                            setValue={(value) =>
                                changeValue(setRequiredValue, value, () => setRequiredError(""))
                            }
                            error={requiredError}
                            variant="auth"
                            editable={!accepted}
                            returnKeyType="done"
                            submitBehavior="submit"
                            onSubmitEditing={submit}
                        />
                    )}
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
                        name={accepted ? "Return to automation" : "Add condition"}
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

export default AutomationConditionForm;

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
    choices: { flexDirection: "row", gap: 8 },
    choice: {
        flex: 1,
        minWidth: 0,
        minHeight: 48,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
    },
    booleanField: { gap: 8 },
    numericFields: { gap: 24 },
    label: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
    message: { fontSize: 14, lineHeight: 20 },
    feedback: { gap: 12 },
});
