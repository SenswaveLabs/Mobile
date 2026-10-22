import React, { FC, useEffect, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import Input from "../common/Input";
import PasswordInput from "../common/PasswordInput";
import BottomSheetSelect from "@/components/common/BottomSheetSelect";
import { MqttVersion } from "@/types/DataSourcesTypes";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { keyboardOffset } from "@/styles/defaultStyles";
import Button from "@/components/common/Button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/contexts/ThemeProvider";
import { CircleAlert, Info } from "lucide-react-native";
import FormSection from "@/components/common/FormSection";

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

interface DataSourceFormProps {
    edit?: boolean;
    header?: React.ReactNode;
    onClick: (values: DataSourceFormValues) => Promise<void>;
    children?: React.ReactNode;

    initServer?: string;
    initName?: string;
    initClientName?: string;
    initPort?: number;
    initMqttVersion?: MqttVersion;
    initTls?: boolean;
}

export const DataSourceForm: FC<DataSourceFormProps> = ({
    edit = false,
    header,
    onClick,
    children,
    initServer,
    initName,
    initClientName,
    initMqttVersion,
    initPort,
    initTls = true,
}: DataSourceFormProps) => {
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
    const attemptedSubmit = useRef(false);

    const isDirty =
        values.server !== saved.server ||
        values.name !== saved.name ||
        values.clientName !== saved.clientName ||
        values.port !== saved.port ||
        values.mqttVersion !== saved.mqttVersion ||
        values.tls !== saved.tls ||
        (!edit && (username !== "" || password !== ""));
    const isAuthVisible = !edit || isDirty;
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

        if (!values.name) {
            valid = false;
            if (!edit && attemptedSubmit.current) nextErrors.name = "Name is required.";
        } else if (values.name.length > 64) {
            valid = false;
            nextErrors.name = "Name is too long.";
        } else if (values.name.length < 3) {
            valid = false;
            nextErrors.name = "Name is too short.";
        }

        if (!values.server) {
            valid = false;
            if (!edit && attemptedSubmit.current) nextErrors.server = "Server is required.";
        } else if (values.server.length > 256) {
            valid = false;
            nextErrors.server = "Server url is too long.";
        } else if (values.server.length < 3) {
            valid = false;
            nextErrors.server = "Server url is too short.";
        }

        if (!values.clientName) {
            valid = false;
            if (!edit && attemptedSubmit.current)
                nextErrors.clientName = "Client name is required.";
        } else if (values.clientName.length > 64) {
            valid = false;
            nextErrors.clientName = "Client name is too long.";
        } else if (values.clientName.length < 3) {
            valid = false;
            nextErrors.clientName = "Client name is too short.";
        }

        if (!Number.isInteger(values.port) || values.port < 1 || values.port > 65535) {
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
                    : edit || attemptedSubmit.current
                      ? "Username is required."
                      : "";
            }

            if (password.length > 64) {
                valid = false;
                nextErrors.password = "Password is too long.";
            } else if (password.length < 3) {
                valid = false;
                nextErrors.password = password
                    ? "Password is too short."
                    : edit || attemptedSubmit.current
                      ? "Password is required."
                      : "";
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
        attemptedSubmit.current = true;

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

    useEffect(() => {
        validateForm();
        if (!pending.current) setSubmitError("");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [values, username, password, isAuthVisible]);

    const nameField = (
        <Input
            error={errors.name}
            value={values.name}
            setValue={(name) => setValues((current) => ({ ...current, name }))}
            title="Name"
            placeholder="My Cloud Broker"
            variant="auth"
            editable={!loading}
        />
    );
    const serverField = (
        <Input
            error={errors.server}
            value={values.server}
            setValue={(server) => setValues((current) => ({ ...current, server }))}
            title="Server"
            placeholder="example.com"
            trim={true}
            variant="auth"
            editable={!loading}
            autoCapitalize="none"
            autoCorrect={false}
        />
    );
    const clientNameField = (
        <Input
            error={errors.clientName}
            value={values.clientName}
            setValue={(clientName) => setValues((current) => ({ ...current, clientName }))}
            title="Client name"
            placeholder="Mobile App Client"
            variant="auth"
            editable={!loading}
        />
    );
    const portInput = (
        <Input
            title="Port"
            placeholder="1883"
            value={values.port.toString()}
            setValue={(value) => setValues((current) => ({ ...current, port: Number(value) }))}
            error={errors.port}
            keyboardType="numeric"
            variant="auth"
            editable={!loading}
        />
    );
    const selectors = (
        <View style={[styles.inlineContainer, edit && styles.editInlineContainer]}>
            <View style={styles.inlineField}>
                <BottomSheetSelect
                    title="TLS"
                    value={values.tls ? "Enabled" : "Disabled"}
                    disabled={loading}
                    options={[
                        {
                            label: "Enabled",
                            selected: values.tls,
                            onPress: () => setValues((current) => ({ ...current, tls: true })),
                        },
                        {
                            label: "Disabled",
                            selected: !values.tls,
                            onPress: () => setValues((current) => ({ ...current, tls: false })),
                        },
                    ]}
                />
            </View>
            <View style={styles.inlineField}>
                <BottomSheetSelect
                    title="MQTT version"
                    value={
                        mqttVersionOptions.find((option) => option.value === values.mqttVersion)
                            ?.label ?? mqttVersionOptions[0].label
                    }
                    disabled={loading}
                    options={mqttVersionOptions.map((option) => ({
                        label: option.label,
                        selected: values.mqttVersion === option.value,
                        onPress: () =>
                            setValues((current) => ({
                                ...current,
                                mqttVersion: option.value,
                            })),
                    }))}
                />
            </View>
        </View>
    );
    const verificationFields = isAuthVisible && (
        <View
            style={[styles.authSection, edit ? styles.editAuthSection : styles.createAuthSection]}>
            {edit ? (
                <View style={styles.intro}>
                    <Text
                        accessibilityRole="header"
                        style={[styles.heading, { color: colors.authForeground }]}>
                        Connection verification
                    </Text>
                    <Text style={[styles.description, { color: colors.authMuted }]}>
                        Enter broker credentials to verify changed connection settings.
                    </Text>
                </View>
            ) : (
                <View style={styles.intro}>
                    <Text
                        accessibilityRole="header"
                        style={[styles.heading, { color: colors.authForeground }]}>
                        Connection verification
                    </Text>
                    <Text style={[styles.description, { color: colors.authMuted }]}>
                        Username and password are required to verify this connection.
                    </Text>
                    <Text style={[styles.description, { color: colors.authMuted }]}>
                        Credentials are used only for verification purposes.
                    </Text>
                </View>
            )}
            <Input
                error={errors.username}
                value={username}
                setValue={setUsername}
                title="Username"
                placeholder="Username"
                variant="auth"
                editable={!loading}
                autoCapitalize="none"
            />
            <PasswordInput
                error={errors.password}
                value={password}
                setValue={setPassword}
                title="Password"
                placeholder="Password"
                variant="auth"
                editable={!loading}
                onSubmitEditing={edit ? undefined : triggerSave}
                returnKeyType={edit ? undefined : "done"}
            />
        </View>
    );

    return (
        <View style={styles.container}>
            <KeyboardAwareScrollView
                style={styles.scrollContainer}
                bottomOffset={keyboardOffset}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={
                    edit ? styles.settingsContentContainer : styles.createContent
                }>
                {edit ? (
                    <View style={styles.settingsContent}>
                        {header}
                        <FormSection
                            title="Connection"
                            helper="Update broker details. Credentials verify the connection and are not saved."
                            separated
                            actions={
                                <>
                                    {(!!submitError || !!success) && (
                                        <Alert
                                            accessibilityRole={submitError ? "alert" : undefined}
                                            accessibilityLiveRegion="polite"
                                            variant={submitError ? "destructive" : "default"}
                                            icon={submitError ? CircleAlert : Info}>
                                            <AlertDescription>
                                                {submitError || success}
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                    <Button
                                        name="Save changes"
                                        type="auth"
                                        loading={loading}
                                        disabled={!isDirty}
                                        onPress={triggerSave}
                                    />
                                </>
                            }>
                            {nameField}
                            {serverField}
                            <View style={[styles.inlineContainer, styles.editInlineContainer]}>
                                <View style={styles.clientNameField}>{clientNameField}</View>
                                <View style={styles.editPortField}>{portInput}</View>
                            </View>
                            {selectors}
                            {verificationFields}
                        </FormSection>
                        {children}
                    </View>
                ) : (
                    <>
                        <View style={styles.createIntro}>
                            <Text
                                accessibilityRole="header"
                                style={[styles.createHeading, { color: colors.authForeground }]}>
                                Create data source
                            </Text>
                            <Text style={[styles.createDescription, { color: colors.authMuted }]}>
                                Add broker details and verify the connection.
                            </Text>
                        </View>
                        <Text style={[styles.createNotice, { color: colors.authMuted }]}>
                            One data source belongs only to one user account. Make sure not to share
                            broker information with anyone else.
                        </Text>
                        <View style={styles.createFields}>
                            {nameField}
                            {serverField}
                            <View style={[styles.inlineContainer, styles.editInlineContainer]}>
                                <View style={styles.clientNameField}>{clientNameField}</View>
                                <View style={styles.editPortField}>{portInput}</View>
                            </View>
                            {selectors}
                        </View>
                        {verificationFields}
                        <View style={styles.createActions}>
                            {!!submitError && (
                                <Alert
                                    accessibilityRole="alert"
                                    accessibilityLiveRegion="polite"
                                    variant="destructive"
                                    icon={CircleAlert}>
                                    <AlertDescription>{submitError}</AlertDescription>
                                </Alert>
                            )}
                            <Button
                                name="Create data source"
                                type="auth"
                                loading={loading}
                                onPress={triggerSave}
                            />
                        </View>
                    </>
                )}
            </KeyboardAwareScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContainer: { flex: 1, margin: 0 },
    settingsContentContainer: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16 },
    settingsContent: { width: "100%" },
    createContent: {
        flexGrow: 1,
        width: "100%",
        maxWidth: 448,
        alignSelf: "center",
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 24,
        gap: 24,
    },
    createIntro: { gap: 8 },
    createHeading: { fontSize: 30, lineHeight: 36, fontWeight: "600" },
    createDescription: { fontSize: 16, lineHeight: 24 },
    createNotice: { fontSize: 14, lineHeight: 20 },
    createFields: { gap: 24 },
    createActions: { gap: 12, marginTop: "auto" },
    intro: { gap: 8 },
    heading: { fontSize: 20, lineHeight: 28, fontWeight: "600" },
    description: { fontSize: 14, lineHeight: 20 },
    inlineContainer: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    editInlineContainer: { rowGap: 24 },
    inlineField: { flexGrow: 1, flexBasis: 150 },
    clientNameField: { flexGrow: 2, flexBasis: 200 },
    editPortField: { flexGrow: 1, flexBasis: 96 },
    authSection: { gap: 16 },
    editAuthSection: { gap: 24 },
    createAuthSection: { gap: 24 },
});
