import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Pressable, View, StyleSheet } from "react-native";
import Input from "../common/Input";
import PasswordInput from "../common/PasswordInput";
import DataSourceTile from "./tile/DataSourceTile";
import { MqttVersion } from "@/types/DataSourcesTypes";
import UserNote from "@/components/common/UserNote";
import Divider from "../common/Divider";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { keyboardOffset } from "@/styles/defaultStyles";
import Button from "@/components/common/Button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/contexts/ThemeProvider";
import { CircleAlert, Info } from "lucide-react-native";

const mqttVersionOptions: { label: string; value: MqttVersion }[] = [
    { label: "5.0.0", value: "MqttV5" },
    { label: "3.1.1", value: "MqttV311" },
    { label: "3.1.0", value: "MqttV310" },
];

export interface DataSourceFormValues {
    name: string;
    url: string;
    clientName: string;
    port: number;
    protocolVersion: MqttVersion;
    useTls: boolean;
    username: string;
    password: string;
}

interface BrokerSettings {
    name: string;
    server: string;
    clientName: string;
    port: number;
    mqttVersion: MqttVersion;
    tls: boolean;
}

export interface DataSourceFormHandle {
    isDirty: boolean;
    isValid: boolean;
    triggerSave: () => void;
    triggerReset: () => void;
}

interface DataSourceFormProps {
    edit?: boolean;
    onClick: (values: DataSourceFormValues) => Promise<void>;
    onDirtyChange?: (dirty: boolean) => void;
    onValidChange?: (valid: boolean) => void;
    children?: React.ReactNode;

    id?: string;
    initServer?: string;
    initName?: string;
    initClientName?: string;
    initPort?: number;
    initMqttVersion?: MqttVersion;
    initTls?: boolean;
}

export const DataSourceForm = forwardRef<DataSourceFormHandle, DataSourceFormProps>(
    function DataSourceForm(
        {
            edit = false,
            onClick,
            onDirtyChange,
            onValidChange,
            children,
            id,
            initServer,
            initName,
            initClientName,
            initMqttVersion,
            initPort,
            initTls = true,
        },
        ref,
    ) {
        const { colors } = useTheme().current;
        const initial: BrokerSettings = {
            server: initServer ?? "",
            name: initName ?? "",
            clientName: initClientName ?? "",
            port: initPort ? initPort : 8883,
            mqttVersion: initMqttVersion ?? "MqttV5",
            tls: initTls,
        };
        const [saved, setSaved] = useState(initial);
        const [values, setValues] = useState(initial);
        const [errors, setErrors] = useState({
            server: "",
            name: "",
            clientName: "",
            port: "",
            username: "",
            password: "",
        });
        const [username, setUsername] = useState("");
        const [password, setPassword] = useState("");
        const [loading, setLoading] = useState(false);
        const [submitError, setSubmitError] = useState("");
        const [success, setSuccess] = useState("");
        const pending = useRef(false);

        const isDirty =
            values.server !== saved.server ||
            values.name !== saved.name ||
            values.clientName !== saved.clientName ||
            values.port !== saved.port ||
            values.mqttVersion !== saved.mqttVersion ||
            values.tls !== saved.tls ||
            (!edit && (username !== "" || password !== ""));
        const isAuthVisible = !edit || isDirty;
        const isValid =
            values.name.length >= 3 &&
            values.name.length <= 64 &&
            values.server.length >= 3 &&
            values.server.length <= 256 &&
            values.clientName.length >= 3 &&
            values.clientName.length <= 64 &&
            values.port >= 1 &&
            values.port <= 65535 &&
            username.length >= 3 &&
            username.length <= 128 &&
            password.length >= 3 &&
            password.length <= 64;

        const validateForm = (): boolean => {
            const nextErrors = {
                server: "",
                name: "",
                clientName: "",
                port: "",
                username: "",
                password: "",
            };
            let valid = true;

            if (values.name.length > 64) {
                valid = false;
                nextErrors.name = "Name is too long.";
            } else if (values.name.length > 0 && values.name.length < 3) {
                valid = false;
                nextErrors.name = "Name is too short.";
            }

            if (values.server.length > 256) {
                valid = false;
                nextErrors.server = "Server url is too long.";
            } else if (values.server.length > 0 && values.server.length < 3) {
                valid = false;
                nextErrors.server = "Server url is too short.";
            }

            if (values.clientName.length > 64) {
                valid = false;
                nextErrors.clientName = "Client name is too long.";
            } else if (values.clientName.length > 0 && values.clientName.length < 3) {
                valid = false;
                nextErrors.clientName = "Client name is too short.";
            }

            if (values.port < 1 || values.port > 65535) {
                valid = false;
                nextErrors.port = "Port is not valid.";
            }

            if (isAuthVisible) {
                if (username.length > 128) {
                    valid = false;
                    nextErrors.username = "Username is too long.";
                } else if (username.length < 3) {
                    valid = false;
                    nextErrors.username = username
                        ? "Username is too short."
                        : "Username is required.";
                }

                if (password.length > 64) {
                    valid = false;
                    nextErrors.password = "Password is too long.";
                } else if (password.length < 3) {
                    valid = false;
                    nextErrors.password = password
                        ? "Password is too short."
                        : "Password is required.";
                }
            }

            if (!values.name || !values.server || !values.clientName) valid = false;
            setErrors(nextErrors);
            return valid;
        };

        const triggerSave = async () => {
            if (pending.current || (edit && !isDirty)) return;
            pending.current = true;
            setLoading(true);
            setSubmitError("");
            setSuccess("");

            try {
                if (!validateForm()) return;
                const snapshot = { ...values };
                await onClick({
                    name: snapshot.name,
                    url: snapshot.server,
                    clientName: snapshot.clientName,
                    port: snapshot.port,
                    protocolVersion: snapshot.mqttVersion,
                    useTls: snapshot.tls,
                    username,
                    password,
                });
                if (edit) {
                    setSaved(snapshot);
                    setUsername("");
                    setPassword("");
                    setSuccess("Settings saved.");
                }
            } catch (error) {
                setSubmitError(
                    error instanceof Error
                        ? error.message
                        : "Couldn't save broker settings. Try again.",
                );
            } finally {
                pending.current = false;
                setLoading(false);
            }
        };

        const triggerReset = () => {
            if (pending.current) return;
            setValues(saved);
            setUsername("");
            setPassword("");
            setErrors({
                server: "",
                name: "",
                clientName: "",
                port: "",
                username: "",
                password: "",
            });
            setSubmitError("");
            setSuccess("");
        };

        useImperativeHandle(ref, () => ({ isDirty, isValid, triggerSave, triggerReset }));

        useEffect(() => {
            onDirtyChange?.(isDirty);
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [isDirty]);

        useEffect(() => {
            onValidChange?.(isValid);
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [isValid]);

        useEffect(() => {
            validateForm();
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [values, username, password, isAuthVisible]);

        const renderChoiceOption = (
            field: string,
            label: string,
            selected: boolean,
            onSelect: () => void,
        ) => (
            <Pressable
                key={`${field}-${label}`}
                accessibilityRole="radio"
                accessibilityLabel={`${field}, ${label}`}
                accessibilityHint={`Choose one ${field} option.`}
                accessibilityState={{ checked: selected, selected, disabled: loading }}
                disabled={loading}
                onPress={onSelect}
                style={[
                    styles.choiceOption,
                    {
                        backgroundColor: selected ? colors.authPrimary : colors.authBackground,
                        borderColor: selected ? colors.authPrimary : colors.authBorder,
                    },
                ]}>
                <View
                    style={[
                        styles.choiceIndicator,
                        {
                            borderColor: selected ? colors.authOnPrimary : colors.authBorder,
                        },
                    ]}>
                    {selected && (
                        <View
                            style={[
                                styles.choiceIndicatorSelected,
                                { backgroundColor: colors.authOnPrimary },
                            ]}
                        />
                    )}
                </View>
                <Text
                    style={[
                        styles.choiceLabel,
                        {
                            color: selected ? colors.authOnPrimary : colors.authForeground,
                        },
                    ]}>
                    {label}
                </Text>
            </Pressable>
        );

        return (
            <View style={styles.container}>
                {!edit && (
                    <>
                        <View style={styles.displayContainer}>
                            <UserNote
                                text="One data source belongs only to one user account. Make sure not to share broker information with anyone else."
                                style={{ paddingHorizontal: 0, paddingBottom: 15 }}
                            />
                            <DataSourceTile
                                id={id ?? ""}
                                name={values.name}
                                server={values.server}
                                onClickDisabled={true}
                                style={{ margin: 0 }}
                            />
                        </View>
                        <Divider style={{ paddingHorizontal: 15 }} />
                    </>
                )}

                <KeyboardAwareScrollView
                    style={[styles.scrollContainer, edit && styles.settingsScroll]}
                    bottomOffset={keyboardOffset}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={edit ? styles.settingsContent : styles.createContent}>
                    {edit && (
                        <View style={styles.intro}>
                            <Text
                                accessibilityRole="header"
                                style={[styles.heading, { color: colors.authForeground }]}>
                                Connection
                            </Text>
                            <Text style={[styles.description, { color: colors.authMuted }]}>
                                Update broker details. Credentials verify the connection and are not
                                saved.
                            </Text>
                        </View>
                    )}
                    <Input
                        error={errors.name}
                        value={values.name}
                        setValue={(name) => setValues((current) => ({ ...current, name }))}
                        title="Name"
                        placeholder="My Cloud Broker"
                        variant={edit ? "auth" : "default"}
                        editable={!loading}
                    />
                    <Input
                        error={errors.server}
                        value={values.server}
                        setValue={(server) => setValues((current) => ({ ...current, server }))}
                        title="Server"
                        placeholder="example.com"
                        trim={true}
                        variant={edit ? "auth" : "default"}
                        editable={!loading}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    <Input
                        error={errors.clientName}
                        value={values.clientName}
                        setValue={(clientName) =>
                            setValues((current) => ({ ...current, clientName }))
                        }
                        title="Client name"
                        placeholder="Mobile App Client"
                        variant={edit ? "auth" : "default"}
                        editable={!loading}
                    />

                    <View style={styles.inlineContainer}>
                        <View style={styles.inlineField}>
                            <View style={styles.choiceGroup}>
                                <Text
                                    style={[styles.choiceTitle, { color: colors.authForeground }]}>
                                    TLS
                                </Text>
                                <View style={styles.choiceOptions}>
                                    {[
                                        { label: "Use TLS", value: true },
                                        { label: "Don't use TLS", value: false },
                                    ].map((option) => {
                                        const selected = values.tls === option.value;
                                        return renderChoiceOption(
                                            "TLS",
                                            option.label,
                                            selected,
                                            () =>
                                                setValues((current) => ({
                                                    ...current,
                                                    tls: option.value,
                                                })),
                                        );
                                    })}
                                </View>
                            </View>
                        </View>
                        <View style={styles.inlineField}>
                            <View style={styles.choiceGroup}>
                                <Text
                                    style={[styles.choiceTitle, { color: colors.authForeground }]}>
                                    MQTT version
                                </Text>
                                <View style={styles.choiceOptions}>
                                    {mqttVersionOptions.map((option) => {
                                        const selected = values.mqttVersion === option.value;
                                        return renderChoiceOption(
                                            "MQTT version",
                                            option.label,
                                            selected,
                                            () =>
                                                setValues((current) => ({
                                                    ...current,
                                                    mqttVersion: option.value,
                                                })),
                                        );
                                    })}
                                </View>
                            </View>
                        </View>
                    </View>

                    <View style={styles.portField}>
                        <Input
                            title="Port"
                            placeholder="1883"
                            value={values.port.toString()}
                            setValue={(value) =>
                                setValues((current) => ({ ...current, port: Number(value) }))
                            }
                            error={errors.port}
                            keyboardType="numeric"
                            variant={edit ? "auth" : "default"}
                            editable={!loading}
                        />
                    </View>

                    {isAuthVisible && (
                        <View style={styles.authSection}>
                            {edit && (
                                <View style={styles.intro}>
                                    <Text
                                        accessibilityRole="header"
                                        style={[styles.heading, { color: colors.authForeground }]}>
                                        Connection verification
                                    </Text>
                                    <Text style={[styles.description, { color: colors.authMuted }]}>
                                        Enter broker credentials to verify changed connection
                                        settings.
                                    </Text>
                                </View>
                            )}
                            {!edit && (
                                <UserNote
                                    text="Credentials are used only for verification purposes."
                                    style={{ paddingHorizontal: 0, paddingVertical: 10 }}
                                />
                            )}
                            <Input
                                error={errors.username}
                                value={username}
                                setValue={setUsername}
                                title="Username"
                                placeholder="Username"
                                variant={edit ? "auth" : "default"}
                                editable={!loading}
                                autoCapitalize="none"
                            />
                            <PasswordInput
                                error={errors.password}
                                value={password}
                                setValue={setPassword}
                                title="Password"
                                placeholder="Password"
                                variant={edit ? "auth" : "default"}
                                editable={!loading}
                            />
                        </View>
                    )}

                    {edit && (
                        <View style={styles.actions}>
                            {(!!submitError || !!success) && (
                                <Alert
                                    accessibilityRole={submitError ? "alert" : undefined}
                                    accessibilityLiveRegion="polite"
                                    variant={submitError ? "destructive" : "default"}
                                    icon={submitError ? CircleAlert : Info}>
                                    <AlertDescription>{submitError || success}</AlertDescription>
                                </Alert>
                            )}
                            <Button
                                name="Save changes"
                                type="auth"
                                loading={loading}
                                disabled={!isDirty}
                                onPress={triggerSave}
                            />
                            <Button
                                name="Reset"
                                type="brand-outline"
                                loading={false}
                                disabled={!isDirty || loading}
                                onPress={triggerReset}
                            />
                            {children}
                        </View>
                    )}
                    {!edit && children}
                </KeyboardAwareScrollView>
            </View>
        );
    },
);

const styles = StyleSheet.create({
    container: { flex: 1 },
    displayContainer: { paddingHorizontal: 15, paddingTop: 5 },
    scrollContainer: { paddingHorizontal: 15, margin: 0 },
    settingsScroll: { flex: 1, paddingHorizontal: 0 },
    settingsContent: { gap: 20, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
    createContent: { gap: 14, paddingBottom: 16 },
    intro: { gap: 6 },
    heading: { fontSize: 20, lineHeight: 26, fontWeight: "600" },
    description: { fontSize: 14, lineHeight: 20 },
    inlineContainer: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    inlineField: { flexGrow: 1, flexBasis: 150 },
    choiceGroup: { gap: 8 },
    choiceTitle: { marginBottom: 2, fontSize: 16, lineHeight: 22, fontWeight: "600" },
    choiceOptions: { gap: 8 },
    choiceOption: {
        minHeight: 48,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    choiceIndicator: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
    },
    choiceIndicatorSelected: { width: 10, height: 10, borderRadius: 5 },
    choiceLabel: { flexShrink: 1, lineHeight: 22 },
    portField: { maxWidth: 260, width: "100%" },
    authSection: { gap: 16, paddingTop: 8 },
    actions: { gap: 12, paddingTop: 12 },
});
