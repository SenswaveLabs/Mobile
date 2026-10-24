import Button from "@/components/common/Button";
import FormSection from "@/components/common/FormSection";
import IconSelector from "@/components/common/IconSelector";
import Input from "@/components/common/Input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { useDevice } from "@/contexts/custom/DeviceProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { keyboardOffset } from "@/styles/defaultStyles";
import { useFocusEffect, useRouter } from "expo-router";
import { CircleAlert, Info } from "lucide-react-native";
import React, { FC, useCallback, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

interface AddDashboardFormProps {
    deviceId: string;
}

const DefaultDashboardIcons = [
    "grid-outline",
    "apps-outline",
    "layers-outline",
    "albums-outline",
    "pie-chart-outline",
    "stats-chart-outline",
    "analytics-outline",
    "bar-chart-outline",
    "list-outline",
    "clipboard-outline",
    "document-text-outline",
    "options-outline",
    "settings-outline",
    "construct-outline",
    "briefcase-outline",
    "filter-outline",
];

const parseDimension = (draft: string, min: number, max: number): number | undefined => {
    const value = draft.trim();
    if (!/^\d+$/.test(value)) return undefined;

    const number = Number(value);
    return Number.isFinite(number) && Number.isInteger(number) && number >= min && number <= max
        ? number
        : undefined;
};

const AddDashboardForm: FC<AddDashboardFormProps> = ({ deviceId }) => {
    const httpClient = useHttpClient();
    const device = useDevice();
    const home = useHomes();
    const router = useRouter();
    const { colors } = useTheme().current;

    const [name, setName] = useState("");
    const [icon, setIcon] = useState("grid-outline");
    const [rows, setRows] = useState("6");
    const [columns, setColumns] = useState("4");
    const [nameError, setNameError] = useState("");
    const [rowsError, setRowsError] = useState("");
    const [columnsError, setColumnsError] = useState("");
    const [pending, setPending] = useState(false);
    const [actionFeedback, setActionFeedback] = useState<{
        message: string;
        variant: "default" | "destructive";
    } | null>(null);

    const nameRef = useRef<TextInput>(null);
    const rowsRef = useRef<TextInput>(null);
    const columnsRef = useRef<TextInput>(null);
    const deviceRef = useRef(device);
    deviceRef.current = device;
    const canManageRef = useRef(home.current?.isOwner === true || home.current?.canManage === true);
    canManageRef.current = home.current?.isOwner === true || home.current?.canManage === true;
    const submitLock = useRef(false);
    const accepted = useRef(false);
    const returning = useRef(false);
    const focused = useRef(false);

    const returnToDevice = useCallback(() => {
        if (!focused.current || !accepted.current || returning.current) return;

        returning.current = true;
        try {
            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace({ pathname: "/device/device", params: { deviceId } });
            }
            setActionFeedback(null);
        } catch {
            returning.current = false;
            setActionFeedback({
                message: "Dashboard created. Return to the device to view it.",
                variant: "default",
            });
        }
    }, [deviceId, router]);

    useFocusEffect(
        useCallback(() => {
            focused.current = true;
            if (accepted.current) returnToDevice();
            return () => {
                focused.current = false;
            };
        }, [returnToDevice]),
    );

    const changeName = (value: string) => {
        if (submitLock.current || accepted.current || !focused.current || !canManageRef.current)
            return;
        setName(value);
        setNameError("");
        setActionFeedback(null);
    };

    const changeRows = (value: string) => {
        if (submitLock.current || accepted.current || !focused.current || !canManageRef.current)
            return;
        setRows(value);
        setRowsError("");
        setActionFeedback(null);
    };

    const changeColumns = (value: string) => {
        if (submitLock.current || accepted.current || !focused.current || !canManageRef.current)
            return;
        setColumns(value);
        setColumnsError("");
        setActionFeedback(null);
    };

    const submit = async () => {
        if (submitLock.current || accepted.current || !focused.current || !canManageRef.current)
            return;
        submitLock.current = true;
        setActionFeedback(null);

        const normalizedName = name.trim();
        const nextNameError =
            normalizedName.length === 0
                ? "Name is required."
                : normalizedName.length < 3 || normalizedName.length > 64
                  ? "Use 3–64 characters."
                  : "";
        const rowsValue = parseDimension(rows, 1, 10);
        const columnsValue = parseDimension(columns, 1, 5);
        const nextRowsError = rowsValue === undefined ? "Use a whole number from 1 to 10." : "";
        const nextColumnsError =
            columnsValue === undefined ? "Use a whole number from 1 to 5." : "";

        setNameError(nextNameError);
        setRowsError(nextRowsError);
        setColumnsError(nextColumnsError);

        if (nextNameError || rowsValue === undefined || columnsValue === undefined) {
            if (nextNameError) nameRef.current?.focus();
            else if (rowsValue === undefined) rowsRef.current?.focus();
            else columnsRef.current?.focus();
            submitLock.current = false;
            return;
        }

        setPending(true);
        try {
            const result = await httpClient.post("v1/devices/dashboards", {
                deviceId,
                name: normalizedName,
                icon,
                configuration: { rows: rowsValue, columns: columnsValue },
            });
            if (!result.isSuccess) {
                if (focused.current) {
                    setActionFeedback({
                        message:
                            "Couldn't create the dashboard. Check your connection and try again.",
                        variant: "destructive",
                    });
                }
                return;
            }

            accepted.current = true;
            const currentDevice = deviceRef.current;
            if (currentDevice.deviceId === deviceId) {
                try {
                    await currentDevice.refresh(false);
                } catch {
                    // A refresh failure cannot undo an accepted dashboard creation.
                }
            }
            returnToDevice();
        } catch {
            if (!accepted.current && focused.current) {
                setActionFeedback({
                    message: "Couldn't create the dashboard. Check your connection and try again.",
                    variant: "destructive",
                });
            }
        } finally {
            submitLock.current = false;
            setPending(false);
        }
    };

    return (
        <KeyboardAwareScrollView
            bottomOffset={keyboardOffset}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            <View style={styles.content}>
                <FormSection
                    title="Create dashboard"
                    helper="Choose a name, icon and grid size for this device's dashboard.">
                    <Input
                        title="Name"
                        placeholder="Living room controls"
                        value={name}
                        setValue={changeName}
                        error={nameError}
                        variant="auth"
                        inputRef={nameRef}
                        returnKeyType="next"
                        submitBehavior="submit"
                        accessibilityState={{ busy: pending }}
                        onSubmitEditing={() => rowsRef.current?.focus()}
                    />
                    <IconSelector
                        defaultIcon={icon}
                        iconList={DefaultDashboardIcons}
                        variant="brand"
                        onIconSelected={(value) => {
                            if (
                                !submitLock.current &&
                                !accepted.current &&
                                focused.current &&
                                canManageRef.current
                            ) {
                                setIcon(value);
                                setActionFeedback(null);
                            }
                        }}
                        disabled={pending || accepted.current}
                    />
                    <View style={styles.dimensions}>
                        <View style={styles.dimensionField}>
                            <Input
                                title="Rows"
                                placeholder="Number of rows"
                                value={rows}
                                setValue={changeRows}
                                error={rowsError}
                                variant="auth"
                                keyboardType="numeric"
                                inputRef={rowsRef}
                                returnKeyType="next"
                                submitBehavior="submit"
                                accessibilityState={{ busy: pending }}
                                onSubmitEditing={() => columnsRef.current?.focus()}
                            />
                            <Text style={[styles.range, { color: colors.authMuted }]}>
                                1–10 rows
                            </Text>
                        </View>
                        <View style={styles.dimensionField}>
                            <Input
                                title="Columns"
                                placeholder="Number of columns"
                                value={columns}
                                setValue={changeColumns}
                                error={columnsError}
                                variant="auth"
                                keyboardType="numeric"
                                inputRef={columnsRef}
                                returnKeyType="go"
                                submitBehavior="submit"
                                accessibilityState={{ busy: pending }}
                                onSubmitEditing={submit}
                            />
                            <Text style={[styles.range, { color: colors.authMuted }]}>
                                1–5 columns
                            </Text>
                        </View>
                    </View>
                </FormSection>
                <View style={styles.actions}>
                    {!!actionFeedback && (
                        <Alert
                            icon={actionFeedback.variant === "destructive" ? CircleAlert : Info}
                            variant={actionFeedback.variant}>
                            <AlertDescription>{actionFeedback.message}</AlertDescription>
                        </Alert>
                    )}
                    {actionFeedback?.variant === "default" ? (
                        <Button
                            name="Return to device"
                            type="brand-outline"
                            loading={false}
                            onPress={returnToDevice}
                            style={styles.actionButton}
                        />
                    ) : (
                        <Button
                            name="Create dashboard"
                            type="auth"
                            loading={pending}
                            disabled={pending || accepted.current}
                            onPress={submit}
                            style={styles.actionButton}
                        />
                    )}
                </View>
            </View>
        </KeyboardAwareScrollView>
    );
};

export default AddDashboardForm;

const styles = StyleSheet.create({
    scrollContent: {
        flexGrow: 1,
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 16,
    },
    content: {
        flexGrow: 1,
        width: "100%",
        maxWidth: 448,
    },
    actions: { paddingTop: 32, gap: 12, marginTop: "auto" },
    dimensions: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 16,
    },
    dimensionField: {
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: 160,
        minWidth: 160,
        gap: 4,
    },
    range: {
        fontSize: 12,
        lineHeight: 16,
    },
    actionButton: {
        width: "100%",
    },
});
