import Divider from "@/components/common/Divider";
import IconSelector from "@/components/common/IconSelector";
import Input from "@/components/common/Input";
import RoomTile from "@/components/room/tiles/RoomTile";
import { keyboardOffset } from "@/styles/defaultStyles";
import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { View, StyleSheet } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

const DefaultHomeIcon: string = "grid-outline";

const DefaultIcons = [
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
] as string[];

export interface DashboardFormHandle {
    isDirty: boolean;
    isValid: boolean;
    triggerSave: () => void;
    triggerReset: () => void;
}

interface DashboardFormProps {
    deviceId: string;

    initName?: string;
    initIcon?: string;
    initConfiguration?: any;

    onSubmit: (values: any) => Promise<void>;
    onDirtyChange?: (dirty: boolean) => void;
    onValidChange?: (valid: boolean) => void;
    edit?: boolean;
}

const DashboardForm = forwardRef<DashboardFormHandle, DashboardFormProps>(function DashboardForm(
    {
        deviceId,
        initName,
        initIcon,
        initConfiguration,
        onSubmit,
        onDirtyChange,
        onValidChange,
        edit = false,
    },
    ref,
) {
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState<string>(initName ?? "");
    const [nameError, setNameError] = useState<string>("");
    const [icon, setIcon] = useState(initIcon ?? DefaultHomeIcon);

    const [rows, setRows] = useState(initConfiguration?.rows ?? 6);
    const [rowsError, setRowsError] = useState<string>("");
    const [columns, setColumns] = useState(initConfiguration?.columns ?? 4);
    const [columnsError, setColumnsError] = useState<string>("");

    const isValid = name.length >= 3 && name.length <= 64;

    const isDirty = name !== (initName ?? "") || icon !== (initIcon ?? DefaultHomeIcon) || !edit;

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

        if (rows < 1) {
            valid = false;
            setRowsError("Must be at least 1.");
        } else if (rows > 10) {
            valid = false;
            setRowsError("Must be at most 10.");
        } else {
            setRowsError("");
        }

        if (columns < 1) {
            valid = false;
            setColumnsError("Must be at least 1.");
        } else if (columns > 5) {
            valid = false;
            setColumnsError("Must be at most 5.");
        } else {
            setColumnsError("");
        }

        return valid;
    };

    const triggerSave = async () => {
        if (loading) {
            console.info("[DashboardForm] Form is processing");
            return;
        }

        if (!validateForm()) {
            console.info("[DashboardForm] Form is invalid");
            return;
        }

        setLoading(true);

        const values: any = {};

        if (name !== initName) {
            values.name = name;
        }

        if (icon !== initIcon) {
            values.icon = icon;
        }

        if (!edit) {
            values.deviceId = deviceId;
            values.configuration = { rows, columns };
        }

        await onSubmit(values);

        setLoading(false);
    };

    const triggerReset = () => {
        setName(initName ?? "");
        setIcon(initIcon ?? DefaultHomeIcon);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useImperativeHandle(ref, () => ({ isDirty, isValid, triggerSave, triggerReset }), [
        isDirty,
        isValid,
        loading,
        name,
        icon,
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
    }, [name]);

    return (
        <View style={styles.container}>
            <View style={styles.displayContainer}>
                <RoomTile name={name} id={""} disableClicks={true} />
            </View>

            <Divider style={{ paddingHorizontal: 15 }} />

            <KeyboardAwareScrollView
                bottomOffset={keyboardOffset}
                style={styles.scrollContainer}
                contentContainerStyle={{ paddingBottom: edit ? 80 : 16 }}>
                <Input
                    error={nameError}
                    value={name}
                    title="Name"
                    placeholder="Your home name"
                    setValue={setName}
                />

                <IconSelector
                    defaultIcon={DefaultHomeIcon}
                    onIconSelected={setIcon}
                    iconList={DefaultIcons}
                />

                <View style={{ flexDirection: "row" }}>
                    <View style={{ width: "50%", paddingRight: 8 }}>
                        <Input
                            error={rowsError}
                            value={rows.toString()}
                            title="Rows"
                            placeholder="Number of rows"
                            setValue={(value) => setRows(Number(value))}
                            keyboardType="numeric"
                            editable={!edit}
                        />
                    </View>

                    <View style={{ width: "50%", paddingLeft: 8 }}>
                        <Input
                            error={columnsError}
                            value={columns.toString()}
                            title="Columns"
                            placeholder="Number of columns"
                            setValue={(value) => setColumns(Number(value))}
                            keyboardType="numeric"
                            editable={!edit}
                        />
                    </View>
                </View>
            </KeyboardAwareScrollView>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 0,
        margin: 0,
        marginTop: 0,
    },
    displayContainer: {
        paddingHorizontal: 15,
        paddingTop: 5,
    },
    scrollContainer: {
        paddingHorizontal: 15,
        margin: 0,
    },
});

export default DashboardForm;
