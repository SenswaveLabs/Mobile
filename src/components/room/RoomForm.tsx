import React, { FC, ReactNode, useCallback, useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { CircleAlert } from "lucide-react-native";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/contexts/ThemeProvider";
import { keyboardOffset } from "@/styles/defaultStyles";
import Button from "../common/Button";
import FormSection from "../common/FormSection";
import Input from "../common/Input";

export interface RoomFormValues {
    name: string;
}

interface RoomFormProps {
    homeName: string;
    initName?: string;
    onSubmit: (values: RoomFormValues) => Promise<void>;
    edit?: boolean;
    disabled?: boolean;
    children?: ReactNode;
}

const RoomForm: FC<RoomFormProps> = ({
    homeName,
    initName = "",
    onSubmit,
    edit = false,
    disabled = false,
    children,
}) => {
    const { colors } = useTheme().current;
    const [name, setName] = useState(initName);
    const [saved, setSaved] = useState(initName.trim());
    const [nameError, setNameError] = useState("");
    const [submitError, setSubmitError] = useState("");
    const [loading, setLoading] = useState(false);
    const pending = useRef(false);
    const active = useRef(true);
    const nameInput = useRef<TextInput>(null);
    const dirty = name.trim() !== saved;

    useFocusEffect(
        useCallback(() => {
            active.current = true;
            return () => {
                active.current = false;
            };
        }, []),
    );

    const submit = async () => {
        if (pending.current || disabled || !active.current || (edit && !dirty)) return;
        const value = name.trim();
        if (value.length < 3 || value.length > 64) {
            setNameError(
                !value
                    ? "Enter a room name."
                    : value.length < 3
                      ? "Use at least 3 characters."
                      : "Use no more than 64 characters.",
            );
            nameInput.current?.focus();
            return;
        }
        pending.current = true;
        setLoading(true);
        setNameError("");
        setSubmitError("");
        try {
            await onSubmit({ name: value });
            setName(value);
            setSaved(value);
        } catch (error) {
            if (active.current)
                setSubmitError(
                    error instanceof Error ? error.message : "Couldn't save this room. Try again.",
                );
        } finally {
            pending.current = false;
            setLoading(false);
        }
    };

    const field = (
        <Input
            title="Name"
            placeholder="e.g. Living room"
            value={name}
            setValue={(value) => {
                if (pending.current || disabled) return;
                setName(value);
                setNameError("");
                setSubmitError("");
            }}
            error={nameError}
            variant="auth"
            inputRef={nameInput}
            editable={!loading && !disabled}
            returnKeyType="done"
            onSubmitEditing={submit}
        />
    );
    const actions = (
        <>
            {!!submitError && (
                <Alert
                    icon={CircleAlert}
                    variant="destructive"
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite">
                    <AlertDescription>{submitError}</AlertDescription>
                </Alert>
            )}
            <Button
                name={edit ? "Save changes" : "Create room"}
                type="auth"
                loading={loading}
                disabled={disabled || (edit && !dirty)}
                onPress={submit}
            />
        </>
    );

    return (
        <KeyboardAwareScrollView
            bottomOffset={keyboardOffset}
            keyboardShouldPersistTaps="handled"
            style={styles.screen}
            contentContainerStyle={[styles.content, edit && styles.editContent]}>
            {edit ? (
                <FormSection
                    title="Room details"
                    helper={`Update this room's name in “${homeName}”.`}
                    actions={actions}>
                    {field}
                </FormSection>
            ) : (
                <>
                    <View style={styles.fields}>
                        <View style={styles.intro}>
                            <Text
                                accessibilityRole="header"
                                style={[styles.title, { color: colors.authForeground }]}>
                                Create a room
                            </Text>
                            <Text style={[styles.helper, { color: colors.authMuted }]}>
                                Organize devices in “{homeName}” by room.
                            </Text>
                        </View>
                        {field}
                    </View>
                    <View style={styles.actions}>{actions}</View>
                </>
            )}
            {children}
        </KeyboardAwareScrollView>
    );
};

export default RoomForm;

const styles = StyleSheet.create({
    screen: { flex: 1 },
    content: {
        flexGrow: 1,
        width: "100%",
        maxWidth: 448,
        alignSelf: "center",
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 16,
    },
    editContent: { paddingHorizontal: 16 },
    fields: { gap: 24 },
    intro: { gap: 8 },
    title: { fontSize: 30, lineHeight: 36, fontWeight: "600" },
    helper: { fontSize: 16, lineHeight: 24 },
    actions: { paddingTop: 32, gap: 12, marginTop: "auto" },
});
