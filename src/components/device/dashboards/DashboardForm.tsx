import Button from "@/components/common/Button";
import FormSection from "@/components/common/FormSection";
import IconSelector from "@/components/common/IconSelector";
import Input from "@/components/common/Input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/contexts/ThemeProvider";
import { keyboardOffset } from "@/styles/defaultStyles";
import type { DashboardDto } from "@/components/device/dashboards/DashboardView";
import { CircleAlert, Info } from "lucide-react-native";
import React, { FC, ReactNode, useCallback, useRef, useState } from "react";
import { AccessibilityInfo, StyleSheet, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

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

export interface DashboardFormValues {
    name?: string;
    icon?: string;
}

export interface DashboardFormProps {
    dashboard: DashboardDto;
    disabled?: boolean;
    onSubmit: (values: DashboardFormValues) => Promise<void>;
    children?: ReactNode;
}

const DashboardForm: FC<DashboardFormProps> = ({
    dashboard,
    disabled = false,
    onSubmit,
    children,
}) => {
    const { colors } = useTheme().current;
    const [name, setName] = useState(dashboard.name);
    const [icon, setIcon] = useState(dashboard.icon);
    const [nameError, setNameError] = useState("");
    const [feedback, setFeedback] = useState("");
    const [loading, setLoading] = useState(false);
    const saved = useRef({ name: dashboard.name.trim(), icon: dashboard.icon });
    const pending = useRef(false);
    const disabledRef = useRef(disabled);
    disabledRef.current = disabled;
    const active = useRef(true);
    const nameInput = useRef<TextInput>(null);
    const dirty = name.trim() !== saved.current.name || icon !== saved.current.icon;
    const rows = dashboard.configuration?.rows;
    const columns = dashboard.configuration?.columns;
    const gridSize =
        Number.isInteger(rows) && rows > 0 && Number.isInteger(columns) && columns > 0
            ? `Rows: ${rows} · Columns: ${columns}`
            : "Grid size unavailable.";

    useFocusEffect(
        useCallback(() => {
            active.current = true;
            return () => {
                active.current = false;
            };
        }, []),
    );

    const submit = async () => {
        if (pending.current || disabledRef.current || !active.current || !dirty) return;
        setFeedback("");
        const trimmedName = name.trim();
        if (!trimmedName || trimmedName.length < 3 || trimmedName.length > 64) {
            setNameError(!trimmedName ? "Name is required." : "Use 3–64 characters.");
            nameInput.current?.focus();
            return;
        }

        const values: DashboardFormValues = {};
        if (trimmedName !== saved.current.name) values.name = trimmedName;
        if (icon !== saved.current.icon) values.icon = icon;
        if (Object.keys(values).length === 0) return;

        pending.current = true;
        setLoading(true);
        try {
            await onSubmit(values);
            saved.current = {
                name: values.name ?? saved.current.name,
                icon: values.icon ?? saved.current.icon,
            };
            setName(saved.current.name);
            setIcon(saved.current.icon);
            if (active.current) {
                setFeedback("Dashboard saved.");
                AccessibilityInfo?.announceForAccessibility?.("Dashboard saved.");
            }
        } catch {
            if (active.current) setFeedback("Couldn't save this dashboard. Try again.");
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
            <FormSection
                title="Dashboard details"
                helper="Update the name and icon for this dashboard."
                actions={
                    <>
                        {!!feedback && (
                            <Alert
                                icon={feedback === "Dashboard saved." ? Info : CircleAlert}
                                variant={
                                    feedback === "Dashboard saved." ? "default" : "destructive"
                                }
                                accessibilityRole="alert"
                                accessibilityLiveRegion="polite">
                                <AlertDescription>{feedback}</AlertDescription>
                            </Alert>
                        )}
                        <Button
                            name="Save changes"
                            type="auth"
                            loading={loading}
                            disabled={disabled || loading || !dirty}
                            onPress={submit}
                        />
                    </>
                }>
                <Input
                    title="Name"
                    placeholder="Living room controls"
                    value={name}
                    setValue={(value) => {
                        if (pending.current || disabledRef.current) return;
                        setName(value);
                        setNameError("");
                        setFeedback("");
                    }}
                    error={nameError}
                    variant="auth"
                    inputRef={nameInput}
                    editable={!disabled}
                    accessibilityState={{ busy: loading, disabled }}
                    returnKeyType="done"
                    submitBehavior="submit"
                    onSubmitEditing={submit}
                />
                <IconSelector
                    defaultIcon={icon}
                    iconList={DefaultIcons}
                    disabled={disabled || loading}
                    onIconSelected={(value) => {
                        if (pending.current || disabledRef.current) return;
                        setIcon(value);
                        setFeedback("");
                    }}
                />
                <View style={styles.grid}>
                    <Text
                        accessibilityRole="header"
                        style={[styles.gridTitle, { color: colors.authForeground }]}>
                        Grid layout
                    </Text>
                    <Text style={[styles.gridValue, { color: colors.authForeground }]}>
                        {gridSize}
                    </Text>
                    <Text style={[styles.gridHelper, { color: colors.authMuted }]}>
                        Grid size is fixed after creation.
                    </Text>
                </View>
            </FormSection>
            {children}
        </KeyboardAwareScrollView>
    );
};

export default DashboardForm;

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
    grid: { gap: 4 },
    gridTitle: { fontSize: 16, lineHeight: 24, fontWeight: "600" },
    gridValue: { fontSize: 16, lineHeight: 24, fontWeight: "500" },
    gridHelper: { fontSize: 14, lineHeight: 20 },
});
