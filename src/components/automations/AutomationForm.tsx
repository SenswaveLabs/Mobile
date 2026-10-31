import Button from "@/components/common/Button";
import FormSection from "@/components/common/FormSection";
import IconSelector from "@/components/common/IconSelector";
import Input from "@/components/common/Input";
import AutomationConditions from "@/components/automations/conditions/AutomationConditions";
import AutomationResults from "@/components/automations/results/AutomationResults";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Text } from "@/components/ui/text";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAutomation } from "@/contexts/custom/AutomationProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { keyboardOffset } from "@/styles/defaultStyles";
import { AutomationFormValues } from "@/types/AutomationsTypes";
import { Check, CircleAlert } from "lucide-react-native";
import React, { FC, ReactNode, useEffect, useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

const AutomationIcons = [
    "flash-outline",
    "timer-outline",
    "time-outline",
    "calendar-outline",
    "alarm-outline",
    "sync-outline",
    "shuffle-outline",
    "pulse-outline",
    "swap-horizontal-outline",
    "notifications-outline",
    "cog-outline",
    "moon-outline",
    "sunny-outline",
    "thermometer-outline",
] as string[];

export interface AutomationFormProps {
    mode: "create" | "details";
    sessionToken: string;
    initialValues: AutomationFormValues;
    readOnly: boolean;
    canAddChildren: boolean;
    pending: boolean;
    accepted?: boolean;
    actionError?: string;
    footer?: ReactNode;
    onSubmit(values: AutomationFormValues): Promise<void>;
}

const AutomationForm: FC<AutomationFormProps> = ({
    mode,
    sessionToken,
    initialValues,
    readOnly,
    canAddChildren,
    pending,
    accepted = false,
    actionError,
    footer,
    onSubmit,
}) => {
    const { colors } = useTheme().current;
    const homes = useHomes();
    const automation = useAutomation();
    const [name, setName] = useState(initialValues.name);
    const [icon, setIcon] = useState(initialValues.icon);
    const [conditionConnector, setConditionConnector] = useState(initialValues.conditionConnector);
    const [isEnabled, setIsEnabled] = useState(initialValues.isEnabled);
    const [nameError, setNameError] = useState("");
    const [createAttempted, setCreateAttempted] = useState(false);
    const [localActionError, setLocalActionError] = useState("");
    const automationRef = useRef(automation);
    automationRef.current = automation;
    const draftRef = useRef(initialValues);
    const savedRef = useRef({ ...initialValues, name: initialValues.name.trim() });
    const previousInitialRef = useRef(initialValues);
    const inputRef = useRef<TextInput>(null);
    const submitLock = useRef(false);
    const pendingRef = useRef(pending);
    const acceptedRef = useRef(accepted);
    const readOnlyRef = useRef(readOnly);
    pendingRef.current = pending;
    acceptedRef.current = accepted;
    readOnlyRef.current = readOnly;
    draftRef.current = { name, icon, conditionConnector, isEnabled };

    useEffect(() => {
        if (previousInitialRef.current === initialValues) return;
        const previous = previousInitialRef.current;
        const current = draftRef.current;
        const next = {
            name: current.name === previous.name ? initialValues.name : current.name,
            icon: current.icon === previous.icon ? initialValues.icon : current.icon,
            conditionConnector:
                current.conditionConnector === previous.conditionConnector
                    ? initialValues.conditionConnector
                    : current.conditionConnector,
            isEnabled:
                current.isEnabled === previous.isEnabled
                    ? initialValues.isEnabled
                    : current.isEnabled,
        };
        previousInitialRef.current = initialValues;
        savedRef.current = { ...initialValues, name: initialValues.name.trim() };
        draftRef.current = next;
        setName(next.name);
        setIcon(next.icon);
        setConditionConnector(next.conditionConnector);
        setIsEnabled(next.isEnabled);
    }, [initialValues]);

    const currentSession = () => {
        const value = automationRef.current.session;
        return value?.token === sessionToken && automationRef.current.isCurrentSession(sessionToken)
            ? value
            : undefined;
    };
    const session = currentSession();
    const conditions = session?.conditions ?? [];
    const results = session?.results ?? [];
    const childAddAllowed = canAddChildren && !!session;
    const latest = () => draftRef.current;
    const hasDirtyChanges = () =>
        latest().name.trim() !== savedRef.current.name ||
        latest().icon !== savedRef.current.icon ||
        latest().conditionConnector !== savedRef.current.conditionConnector ||
        latest().isEnabled !== savedRef.current.isEnabled;
    const dirty = hasDirtyChanges();

    const editable = () => !readOnlyRef.current && !pendingRef.current && !acceptedRef.current;
    const change = (field: keyof AutomationFormValues, value: string | boolean) => {
        if (!editable()) return;
        const next = { ...latest(), [field]: value } as AutomationFormValues;
        draftRef.current = next;
        if (field === "name") {
            setName(value as string);
            setNameError("");
        } else if (field === "icon") setIcon(value as string);
        else if (field === "conditionConnector") setConditionConnector(value as "And" | "Or");
        else setIsEnabled(value as boolean);
    };

    const submit = async () => {
        if (submitLock.current || pendingRef.current || readOnlyRef.current) return;
        const activeSession = currentSession();
        if (!activeSession) return;
        if (!acceptedRef.current && mode === "details" && !hasDirtyChanges()) return;

        setLocalActionError("");
        if (!acceptedRef.current) {
            const nextName = latest().name.trim();
            if (nextName.length < 3 || nextName.length > 64) {
                setNameError(nextName.length === 0 ? "Name is required." : "Use 3–64 characters.");
                inputRef.current?.focus();
                return;
            }
            if (
                mode === "create" &&
                (activeSession.conditions.length < 1 ||
                    activeSession.conditions.length > 7 ||
                    activeSession.results.length < 1 ||
                    activeSession.results.length > 7)
            ) {
                setCreateAttempted(true);
                return;
            }
        }

        submitLock.current = true;
        try {
            await onSubmit({ ...latest(), name: latest().name.trim() });
        } catch {
            setLocalActionError("Couldn't save this automation. Try again.");
        } finally {
            submitLock.current = false;
        }
    };

    const formAction = accepted
        ? "Return to automations"
        : mode === "create"
          ? "Create automation"
          : "Save changes";
    const actionFeedback = actionError || localActionError;
    const canSubmit = !!session && (!readOnly || accepted);
    const helper =
        mode === "create"
            ? `Create an automation for ${homes.current?.name ?? "this home"}. New automations start enabled.`
            : readOnly
              ? "Review this automation's name, icon, state, conditions and results."
              : "Update this automation's name, icon, state and condition matching.";
    const viewOnly = readOnly || accepted;
    const formActions = !readOnly && (
        <>
            {!!actionFeedback && (
                <Alert
                    icon={CircleAlert}
                    variant="destructive"
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite">
                    <AlertDescription>{actionFeedback}</AlertDescription>
                </Alert>
            )}
            <Button
                name={formAction}
                type="auth"
                loading={pending}
                disabled={
                    !canSubmit ||
                    (!accepted && mode === "details" && !dirty) ||
                    (accepted && !canSubmit)
                }
                onPress={submit}
            />
        </>
    );
    const choiceStyle = (selected: boolean) => [
        styles.choice,
        {
            backgroundColor: selected ? colors.authPrimary : colors.authBackground,
            borderColor: selected ? colors.authOnPrimary : colors.authBorder,
            borderWidth: selected ? 2 : 1,
        },
    ];
    const choiceLabelStyle = (selected: boolean) => ({
        color: selected ? colors.authOnPrimary : colors.authForeground,
    });

    return (
        <KeyboardAwareScrollView
            bottomOffset={keyboardOffset}
            keyboardShouldPersistTaps="handled"
            style={[styles.screen, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.content}>
            <View style={mode === "create" ? styles.createLayout : undefined}>
                <FormSection
                    title={mode === "create" ? "Create automation" : "Automation details"}
                    helper={helper}
                    actions={mode === "details" ? formActions : undefined}>
                    <Input
                        title="Name"
                        placeholder="Automation name"
                        value={name}
                        setValue={(value) => change("name", value)}
                        error={nameError}
                        variant="auth"
                        inputRef={inputRef}
                        editable={!readOnly && !accepted}
                        returnKeyType="done"
                        submitBehavior="submit"
                        onSubmitEditing={submit}
                    />
                    <IconSelector
                        defaultIcon={icon}
                        iconList={AutomationIcons}
                        disabled={readOnly || pending || accepted}
                        onIconSelected={(value) => change("icon", value)}
                    />
                    {mode === "details" && (
                        <View style={styles.group}>
                            <Text
                                accessibilityRole="header"
                                style={[styles.fieldTitle, { color: colors.authForeground }]}>
                                State
                            </Text>
                            {viewOnly ? (
                                <Text style={{ color: colors.authForeground }}>
                                    {isEnabled ? "Enabled" : "Disabled"}
                                </Text>
                            ) : (
                                <ToggleGroup
                                    type="single"
                                    variant="outline"
                                    value={isEnabled ? "Enabled" : "Disabled"}
                                    accessibilityLabel="Automation state"
                                    className="w-full rounded-lg"
                                    onValueChange={(value) => {
                                        if (value === "Enabled" || value === "Disabled")
                                            change("isEnabled", value === "Enabled");
                                    }}>
                                    {(["Enabled", "Disabled"] as const).map((value, index) => (
                                        <ToggleGroupItem
                                            key={value}
                                            value={value}
                                            isFirst={index === 0}
                                            isLast={index === 1}
                                            className="flex-1"
                                            accessibilityLabel={value}
                                            accessibilityState={{
                                                selected: isEnabled === (value === "Enabled"),
                                            }}
                                            disabled={pending || accepted}
                                            style={choiceStyle(
                                                isEnabled === (value === "Enabled"),
                                            )}>
                                            {isEnabled === (value === "Enabled") && (
                                                <Check size={16} color={colors.authOnPrimary} />
                                            )}
                                            <Text
                                                style={[
                                                    styles.choiceLabel,
                                                    choiceLabelStyle(
                                                        isEnabled === (value === "Enabled"),
                                                    ),
                                                ]}>
                                                {value}
                                            </Text>
                                        </ToggleGroupItem>
                                    ))}
                                </ToggleGroup>
                            )}
                        </View>
                    )}
                    <View style={styles.group}>
                        <Text
                            accessibilityRole="header"
                            style={[styles.fieldTitle, { color: colors.authForeground }]}>
                            Condition matching
                        </Text>
                        {viewOnly ? (
                            <Text style={{ color: colors.authForeground }}>
                                {conditionConnector === "And" ? "All conditions" : "Any condition"}
                            </Text>
                        ) : (
                            <ToggleGroup
                                type="single"
                                variant="outline"
                                value={conditionConnector}
                                accessibilityLabel="Condition matching"
                                className="w-full rounded-lg"
                                onValueChange={(value) => {
                                    if (value === "And" || value === "Or")
                                        change("conditionConnector", value);
                                }}>
                                <ToggleGroupItem
                                    value="And"
                                    isFirst
                                    className="flex-1"
                                    accessibilityLabel="All conditions"
                                    accessibilityState={{ selected: conditionConnector === "And" }}
                                    disabled={pending || accepted}
                                    style={choiceStyle(conditionConnector === "And")}>
                                    {conditionConnector === "And" && (
                                        <Check size={16} color={colors.authOnPrimary} />
                                    )}
                                    <Text
                                        style={[
                                            styles.choiceLabel,
                                            choiceLabelStyle(conditionConnector === "And"),
                                        ]}>
                                        All conditions
                                    </Text>
                                </ToggleGroupItem>
                                <ToggleGroupItem
                                    value="Or"
                                    isLast
                                    className="flex-1"
                                    accessibilityLabel="Any condition"
                                    accessibilityState={{ selected: conditionConnector === "Or" }}
                                    disabled={pending || accepted}
                                    style={choiceStyle(conditionConnector === "Or")}>
                                    {conditionConnector === "Or" && (
                                        <Check size={16} color={colors.authOnPrimary} />
                                    )}
                                    <Text
                                        style={[
                                            styles.choiceLabel,
                                            choiceLabelStyle(conditionConnector === "Or"),
                                        ]}>
                                        Any condition
                                    </Text>
                                </ToggleGroupItem>
                            </ToggleGroup>
                        )}
                    </View>
                    <AutomationConditions
                        conditions={conditions}
                        sessionToken={sessionToken}
                        automationId={session?.automationId}
                        mode={mode}
                        canAdd={childAddAllowed}
                        disabled={pending || accepted || readOnly}
                    />
                    {mode === "create" && createAttempted && conditions.length === 0 && (
                        <Text style={{ color: colors.error }} accessibilityRole="alert">
                            Add at least one condition.
                        </Text>
                    )}
                    {mode === "create" && createAttempted && conditions.length > 7 && (
                        <Text style={{ color: colors.error }} accessibilityRole="alert">
                            Use no more than seven conditions.
                        </Text>
                    )}
                    <AutomationResults
                        results={results}
                        sessionToken={sessionToken}
                        automationId={session?.automationId}
                        mode={mode}
                        canAdd={childAddAllowed}
                        disabled={pending || accepted || readOnly}
                    />
                    {mode === "create" && createAttempted && results.length === 0 && (
                        <Text style={{ color: colors.error }} accessibilityRole="alert">
                            Add at least one result.
                        </Text>
                    )}
                    {mode === "create" && createAttempted && results.length > 7 && (
                        <Text style={{ color: colors.error }} accessibilityRole="alert">
                            Use no more than seven results.
                        </Text>
                    )}
                </FormSection>
                {mode === "create" && formActions && (
                    <View style={styles.createActions}>{formActions}</View>
                )}
            </View>
            {footer}
        </KeyboardAwareScrollView>
    );
};

export default AutomationForm;

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
    group: { gap: 8 },
    fieldTitle: { fontSize: 16, lineHeight: 24, fontWeight: "600" },
    choice: {
        flex: 1,
        minWidth: 0,
        minHeight: 48,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        paddingHorizontal: 8,
        paddingVertical: 10,
    },
    choiceLabel: { flexShrink: 1, textAlign: "center" },
    createLayout: { flexGrow: 1 },
    createActions: { marginTop: "auto", paddingTop: 24, gap: 12 },
});
