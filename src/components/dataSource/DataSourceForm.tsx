import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { View, StyleSheet } from "react-native";
import Input from "../common/Input";
import PasswordInput from "../common/PasswordInput";
import DataSourceTile from "./tile/DataSourceTile";
import Dropdown, { Option } from "../common/Dropdown";
import SwitchDropdown from "../common/SwitchDropdown";
import { MqttVersion } from "@/types/DataSourcesTypes";
import UserNote from "@/components/common/UserNote";
import Divider from "../common/Divider";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { keyboardOffset } from "@/styles/defaultStyles";

const mqttVersionOptions: Option[] = [
    { name: "5.0.0", value: "MqttV5" },
    { name: "3.1.1", value: "MqttV311" },
    { name: "3.1.0", value: "MqttV310" },
];

export interface DataSourceFormHandle {
    isDirty: boolean;
    isValid: boolean;
    triggerSave: () => void;
    triggerReset: () => void;
}

interface DataSourceFormProps {
    edit?: boolean;
    onClick: (values: any) => Promise<void>;
    onDirtyChange?: (dirty: boolean) => void;
    onValidChange?: (valid: boolean) => void;

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
            edit,
            onClick,
            onDirtyChange,
            onValidChange,
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
        const [loading, setLoading] = useState(false);

        const [server, setServer] = useState(initServer ?? "");
        const [serverError, setServerError] = useState("");

        const [name, setName] = useState(initName ?? "");
        const [nameError, setNameError] = useState("");

        const [clientName, setClientName] = useState(initClientName ?? "");
        const [clientNameError, setClientNameError] = useState("");

        const [port, setPort] = useState(initPort ? initPort : 8883);
        const [portError, setPortError] = useState("");

        const [mqttVersion, setMqttVersion] = useState(
            initMqttVersion ? initMqttVersion : "MqttV5",
        );
        const [tls, setTls] = useState(initTls ?? true);

        const [username, setUsername] = useState("");
        const [usernameError, setUsernameError] = useState("");

        const [password, setPassword] = useState("");
        const [passwordError, setPasswordError] = useState("");

        const isDirty =
            server !== (initServer ?? "") ||
            name !== (initName ?? "") ||
            clientName !== (initClientName ?? "") ||
            port !== (initPort ?? 8883) ||
            mqttVersion !== (initMqttVersion ?? "MqttV5") ||
            tls !== (initTls ?? true) ||
            (!edit && (username !== "" || password !== ""));

        const isValid =
            name.length >= 3 &&
            name.length <= 64 &&
            server.length >= 3 &&
            server.length <= 256 &&
            clientName.length >= 3 &&
            clientName.length <= 64 &&
            port >= 1 &&
            port <= 65535 &&
            username.length >= 3 &&
            username.length <= 128 &&
            password.length >= 3 &&
            password.length <= 64;

        const isAuthVisible = !edit || isDirty;

        const validateForm = (): boolean => {
            let valid: boolean = true;

            if (name === "") {
                valid = false;
                setNameError("");
            } else if (name.length > 64) {
                valid = false;
                setNameError("Name is too long.");
            } else if (name.length < 3) {
                valid = false;
                setNameError("Name is too short.");
            } else {
                setNameError("");
            }

            if (server === "") {
                valid = false;
                setServerError("");
            } else if (server.length > 256) {
                valid = false;
                setServerError("Server url is too long.");
            } else if (server.length < 3) {
                valid = false;
                setServerError("Server url is too short.");
            } else {
                setServerError("");
            }

            if (clientName === "") {
                valid = false;
                setClientNameError("");
            } else if (clientName.length > 64) {
                valid = false;
                setClientNameError("Client name is too long.");
            } else if (clientName.length < 3) {
                valid = false;
                setClientNameError("Client name is too short.");
            } else {
                setClientNameError("");
            }

            if (port < 1 || port > 65535) {
                valid = false;
                setPortError("Port is not valid.");
            } else {
                setPortError("");
            }

            if (username === "") {
                valid = false;
                setUsernameError("");
            } else if (username.length > 128) {
                valid = false;
                setUsernameError("Username is too long.");
            } else if (username.length < 3) {
                valid = false;
                setUsernameError("Username is too short.");
            } else {
                setUsernameError("");
            }

            if (password === "") {
                valid = false;
                setPasswordError("");
            } else if (password.length > 64) {
                valid = false;
                setPasswordError("Password is too long.");
            } else if (password.length < 3) {
                valid = false;
                setPasswordError("Password is too short.");
            } else {
                setPasswordError("");
            }

            return valid;
        };

        const triggerSave = async () => {
            if (loading) return;

            setLoading(true);

            if (!validateForm()) {
                console.info("[Data Source Form] Form is not valid.");
                setLoading(false);
                return;
            }

            const values = {
                name,
                url: server,
                clientName,
                port,
                protocolVersion: mqttVersion,
                useTls: tls,
                username,
                password,
            };

            await onClick(values);

            setLoading(false);
        };

        const triggerReset = () => {
            setServer(initServer ?? "");
            setName(initName ?? "");
            setClientName(initClientName ?? "");
            setPort(initPort ?? 8883);
            setMqttVersion(initMqttVersion ?? "MqttV5");
            setTls(initTls ?? true);
            setUsername("");
            setPassword("");
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
        useImperativeHandle(ref, () => ({ isDirty, isValid, triggerSave, triggerReset }), [
            isDirty,
            isValid,
            loading,
            server,
            name,
            clientName,
            port,
            mqttVersion,
            tls,
            username,
            password,
        ]);

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
        }, [server, name, clientName, port, username, password]);

        return (
            <View style={styles.container}>
                <View style={styles.displayContainer}>
                    <UserNote
                        text="One data source belongs only to one user account. Make sure to not share your broker informations with anyone else."
                        style={{ paddingHorizontal: 0, paddingBottom: 15 }}
                    />
                    <DataSourceTile
                        id={id ?? ""}
                        name={name}
                        server={server}
                        onClickDisabled={true}
                        style={{ margin: 0 }}
                    />
                </View>

                <Divider style={{ paddingHorizontal: 15 }} />

                <KeyboardAwareScrollView
                    style={styles.scrollContainer}
                    bottomOffset={keyboardOffset}
                    contentContainerStyle={{ paddingBottom: edit ? 90 : 16 }}>
                    <Input
                        error={nameError}
                        value={name}
                        setValue={setName}
                        title="Name"
                        placeholder="My Cloud Broker"
                    />

                    <Input
                        error={serverError}
                        value={server}
                        setValue={setServer}
                        title="Server"
                        placeholder="example.com"
                        trim={true}
                    />

                    <Input
                        error={clientNameError}
                        value={clientName}
                        setValue={setClientName}
                        title="Client Name"
                        placeholder="Mobile App Client"
                    />

                    <View style={styles.inlineContainer}>
                        <View
                            style={{ width: "50%", padding: 5, paddingRight: 10, paddingLeft: 0 }}>
                            <SwitchDropdown
                                title="Tls"
                                value={tls}
                                onSelected={setTls}
                                trueLabel="Use tls"
                                falseLabel="Don't use tls"
                            />
                        </View>

                        <View
                            style={{ width: "50%", padding: 5, paddingLeft: 10, paddingRight: 0 }}>
                            <Dropdown
                                title="Mqtt Version"
                                options={mqttVersionOptions}
                                selectedValue={mqttVersion}
                                onSelected={(value: string) => {
                                    console.warn("Mqtt version selected: " + value);
                                    return setMqttVersion(value as MqttVersion);
                                }}
                            />
                        </View>
                    </View>

                    <View style={styles.inlineContainer}>
                        <View style={{ width: "50%", padding: 5, paddingLeft: 0 }}>
                            <Input
                                title="Port"
                                placeholder="1883"
                                value={port.toString()}
                                setValue={(value) => setPort(Number(value))}
                                error={portError}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    {isAuthVisible && (
                        <>
                            <UserNote
                                text="Credentials are used only for verification purposes."
                                style={{ paddingHorizontal: 0, paddingVertical: 10 }}
                            />

                            <Input
                                style={{ marginTop: 5 }}
                                error={usernameError}
                                value={username}
                                setValue={setUsername}
                                title="Username"
                                placeholder="Username"
                            />
                            <PasswordInput
                                error={passwordError}
                                value={password}
                                setValue={setPassword}
                                title="Password"
                                placeholder="Password"
                            />
                        </>
                    )}
                </KeyboardAwareScrollView>
            </View>
        );
    },
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 0,
        margin: 0,
    },
    displayContainer: {
        paddingHorizontal: 15,
        paddingTop: 5,
    },
    scrollContainer: {
        paddingHorizontal: 15,
        margin: 0,
    },
    inlineContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        paddingTop: 10,
    },
});
