import React, { FC, ReactNode, useCallback, useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { CircleAlert, Info } from "lucide-react-native";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/contexts/ThemeProvider";
import { useIconCatalog } from "@/hooks/useIconCatalog";
import { keyboardOffset } from "@/styles/defaultStyles";
import Input from "../common/Input";
import Button from "../common/Button";
import IconSelector from "../common/IconSelector";
import LocalizationSelector from "../common/LocalizationSelector";

const defaultIcon = "home-outline";

export interface HomeFormValues {
    name: string;
    icon: string;
    latitude?: number;
    longitude?: number;
}

interface HomeFormProps {
    initName?: string;
    initIcon?: string;
    initLongitude?: number;
    initLatitude?: number;
    onSubmit: (values: Partial<HomeFormValues>) => Promise<string | void>;
    edit?: boolean;
    disabled?: boolean;
    children?: ReactNode;
}

const HomeForm: FC<HomeFormProps> = ({
    initName = "",
    initIcon = defaultIcon,
    initLongitude,
    initLatitude,
    onSubmit,
    edit = false,
    disabled = false,
    children,
}) => {
    const catalog = useIconCatalog("homes");
    const { colors } = useTheme().current;
    const initial = {
        name: initName,
        icon: initIcon,
        latitude: initLatitude,
        longitude: initLongitude,
    };
    const [values, setValues] = useState<HomeFormValues>(initial);
    const [saved, setSaved] = useState<HomeFormValues>(initial);
    const [nameError, setNameError] = useState("");
    const [submitError, setSubmitError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);
    const pending = useRef(false);
    const locationPending = useRef(false);
    const active = useRef(true);
    const nameInput = useRef<TextInput>(null);
    const unavailable = loading || disabled;
    const isIconValid =
        (edit && values.icon === saved.icon) ||
        (!catalog.loading && !catalog.error && catalog.keys.includes(values.icon));
    const dirty =
        values.name.trim() !== saved.name ||
        values.icon !== saved.icon ||
        values.latitude !== saved.latitude ||
        values.longitude !== saved.longitude;

    useFocusEffect(
        useCallback(() => {
            active.current = true;
            return () => {
                active.current = false;
            };
        }, []),
    );

    const change = (patch: Partial<HomeFormValues>) => {
        if (pending.current || unavailable) return;
        setValues((previous) => ({ ...previous, ...patch }));
        if ("name" in patch) setNameError("");
        setSubmitError("");
        setSuccess("");
    };

    const updateLocationLoading = useCallback((busy: boolean) => {
        locationPending.current = busy;
        setLocationLoading(busy);
    }, []);

    const submit = async () => {
        if (
            pending.current ||
            locationPending.current ||
            disabled ||
            !active.current ||
            (edit && !dirty)
        )
            return;
        const name = values.name.trim();
        if (name.length < 3 || name.length > 64) {
            setNameError(
                !name
                    ? "Enter a home name."
                    : name.length < 3
                      ? "Use at least 3 characters."
                      : "Use no more than 64 characters.",
            );
            nameInput.current?.focus();
            return;
        }

        if (!isIconValid) return;

        const snapshot = { ...values, name };
        const request: Partial<HomeFormValues> = {};
        if (edit) {
            if (name !== saved.name) request.name = name;
            if (values.icon !== saved.icon) request.icon = values.icon;
            if (values.latitude !== saved.latitude) request.latitude = values.latitude;
            if (values.longitude !== saved.longitude) request.longitude = values.longitude;
        }
        pending.current = true;
        setLoading(true);
        setNameError("");
        setSubmitError("");
        setSuccess("");
        try {
            const message = await onSubmit(edit ? request : snapshot);
            setValues(snapshot);
            setSaved(snapshot);
            if (edit) setSuccess(message || "Home saved.");
        } catch (error) {
            if (active.current)
                setSubmitError(
                    error instanceof Error ? error.message : "Couldn't save your home. Try again.",
                );
        } finally {
            pending.current = false;
            setLoading(false);
        }
    };

    return (
        <KeyboardAwareScrollView
            bottomOffset={keyboardOffset}
            keyboardShouldPersistTaps="handled"
            style={styles.screen}
            contentContainerStyle={styles.content}>
            <View style={styles.fields}>
                <View style={styles.intro}>
                    <Text
                        accessibilityRole="header"
                        style={[styles.title, { color: colors.authForeground }]}>
                        {edit ? "Home settings" : "Create a home"}
                    </Text>
                    <Text style={[styles.description, { color: colors.authMuted }]}>
                        {edit
                            ? "Manage your home's name, icon and location."
                            : "Give your smart home a name. You can add rooms and devices next."}
                    </Text>
                </View>
                <Input
                    title="Name"
                    placeholder="e.g. My home"
                    value={values.name}
                    setValue={(name) => change({ name })}
                    error={nameError}
                    variant="auth"
                    inputRef={nameInput}
                    editable={!unavailable}
                    returnKeyType="done"
                    onSubmitEditing={submit}
                />
                <IconSelector
                    defaultIcon={values.icon}
                    catalog={catalog}
                    resource="homes"
                    onIconSelected={(icon) => change({ icon })}
                    variant="brand"
                    disabled={unavailable}
                />
                {!catalog.loading && !catalog.error && !isIconValid && (
                    <Text style={{ color: colors.error }} accessibilityRole="alert">
                        Select an available icon.
                    </Text>
                )}
                <LocalizationSelector
                    initLocation={values}
                    onSelectLocation={(latitude, longitude) => change({ latitude, longitude })}
                    disabled={unavailable}
                    onLoadingChange={updateLocationLoading}
                />
            </View>
            <View style={[styles.actions, !edit && styles.createActions]}>
                {(!!submitError || !!success) && (
                    <Alert
                        icon={submitError ? CircleAlert : Info}
                        variant={submitError ? "destructive" : "default"}
                        accessibilityRole="alert"
                        accessibilityLiveRegion="polite">
                        <AlertDescription>{submitError || success}</AlertDescription>
                    </Alert>
                )}
                <Button
                    name={edit ? "Save changes" : "Create home"}
                    onPress={submit}
                    type="auth"
                    loading={loading}
                    disabled={disabled || locationLoading || !isIconValid || (edit && !dirty)}
                />
            </View>
            {!!children && <View style={styles.settings}>{children}</View>}
        </KeyboardAwareScrollView>
    );
};

export default HomeForm;

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
    fields: { gap: 24 },
    intro: { gap: 12, marginBottom: 8 },
    title: { fontSize: 30, lineHeight: 36, fontWeight: "600" },
    description: { fontSize: 16, lineHeight: 24 },
    actions: { paddingTop: 32, gap: 12 },
    createActions: { marginTop: "auto" },
    settings: { paddingTop: 24, gap: 24 },
});
