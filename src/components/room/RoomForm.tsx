import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { View, StyleSheet } from "react-native";
import Input from "../common/Input";
import RoomTile from "./tiles/RoomTile";
import Divider from "../common/Divider";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { keyboardOffset } from "@/styles/defaultStyles";

export interface RoomFormHandle {
    isDirty: boolean;
    isValid: boolean;
    triggerSave: () => void;
    triggerReset: () => void;
}

interface RoomFormProps {
    initName?: string;

    onSubmit: (values: any) => Promise<void>;
    onDirtyChange?: (dirty: boolean) => void;
    onValidChange?: (valid: boolean) => void;
    edit?: boolean;
}

const RoomForm = forwardRef<RoomFormHandle, RoomFormProps>(function RoomForm(
    { initName, onSubmit, onDirtyChange, onValidChange, edit = false },
    ref,
) {
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState<string>(initName ?? "");
    const [nameError, setNameError] = useState<string>("");

    const isValid = name.length >= 3 && name.length <= 64;

    const isDirty = name !== (initName ?? "") || !edit;

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

        return valid;
    };

    const triggerSave = async () => {
        if (loading) {
            console.info("[RoomForm] Form is processing");
            return;
        }

        if (!validateForm()) {
            console.info("[RoomForm] Form is invalid");
            return;
        }

        setLoading(true);

        await onSubmit({ name });

        setLoading(false);
    };

    const triggerReset = () => {
        setName(initName ?? "");
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useImperativeHandle(ref, () => ({ isDirty, isValid, triggerSave, triggerReset }), [
        isDirty,
        isValid,
        loading,
        name,
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
                <RoomTile id={""} name={name ?? ""} disableClicks={true} />
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

export default RoomForm;
