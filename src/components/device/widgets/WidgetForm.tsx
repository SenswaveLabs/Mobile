import React, { FC, ReactNode, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import BottomSheetSelect from "@/components/common/BottomSheetSelect";
import Button from "@/components/common/Button";
import FormSection from "@/components/common/FormSection";
import Input from "@/components/common/Input";
import {
    useWidgetDetails,
    supportedWidgetTypes,
    type AddWidgetDto,
} from "@/contexts/custom/WidgetDetailsProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { keyboardOffset } from "@/styles/defaultStyles";
import type { WidgetType } from "@/types/DeviceTypes";
import ButtonForm from "./forms/ButtonForm";
import DisplayForm from "./forms/DisplayForms";
import SliderForm from "./forms/SliderForm";
import RadioForm from "./forms/Radio/RadioForm";
import SwitchForm from "./forms/SwitchForm";
import ColorForm from "./forms/ColorForm";

interface WidgetFormProps {
    onSubmit?: (values: AddWidgetDto) => Promise<void>;
    edit?: boolean;
    pending?: boolean;
    disabled?: boolean;
    feedback?: ReactNode;
    returnAction?: ReactNode;
    onChange?: () => void;
    children?: ReactNode;
}

const WidgetForm: FC<WidgetFormProps> = ({
    onSubmit,
    edit = false,
    pending = false,
    disabled = false,
    feedback,
    returnAction,
    onChange,
    children,
}) => {
    const details = useWidgetDetails();
    const { colors } = useTheme().current;
    const nameRef = useRef<TextInput>(null);
    const submitting = useRef(false);
    const [submittingState, setSubmittingState] = useState(false);
    const busy = pending || submittingState;
    const widget = details.widget;
    const operation = details.operation;
    const types = operation ? (supportedWidgetTypes[operation.type] ?? []) : [];

    useEffect(() => {
        if (!edit) details.validateDto();
        // The provider owns validation; only changed base fields trigger it here.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [widget?.name, widget?.type, edit]);

    useEffect(() => {
        if (!edit) onChange?.();
    }, [widget?.configuration, edit, onChange]);

    const submit = async () => {
        if (edit || disabled || pending || submitting.current || !onSubmit) return;
        if (!details.validateDto(true)) {
            const length = widget?.name.trim().length ?? 0;
            if (length < 3 || length > 64) nameRef.current?.focus();
            return;
        }
        submitting.current = true;
        setSubmittingState(true);
        try {
            await onSubmit(details.toAddDto());
        } finally {
            submitting.current = false;
            setSubmittingState(false);
        }
    };

    const changeType = (type: WidgetType) => {
        if (edit || disabled || busy || submitting.current || !widget || type === widget.type)
            return;
        details.setAdditionalValidation(null);
        details.setWidget({ ...widget, type, configuration: {} });
        onChange?.();
    };

    if (!widget || !operation) return null;

    const field = (label: string, value: string, helper?: string) => (
        <View style={styles.summary}>
            <Text style={[styles.label, { color: colors.authForeground }]}>{label}</Text>
            <Text style={[styles.value, { color: colors.authForeground }]}>{value}</Text>
            {!!helper && <Text style={[styles.helper, { color: colors.authMuted }]}>{helper}</Text>}
        </View>
    );

    const formProps = { edit, disabled: disabled || busy };

    return (
        <KeyboardAwareScrollView
            bottomOffset={keyboardOffset}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            <View style={styles.content}>
                <FormSection
                    title={edit ? "Widget details" : "Create widget"}
                    helper={
                        edit
                            ? "View the saved configuration for this widget."
                            : "Choose how this operation appears on your dashboards."
                    }
                    actions={
                        edit ? undefined : (
                            <>
                                {feedback}
                                {returnAction ?? (
                                    <Button
                                        name="Create widget"
                                        type="auth"
                                        loading={busy}
                                        disabled={busy || disabled}
                                        onPress={submit}
                                    />
                                )}
                            </>
                        )
                    }>
                    {field("Operation", operation.name, operation.type)}
                    {edit ? (
                        field("Name", widget.name)
                    ) : (
                        <Input
                            title="Name"
                            placeholder="Widget name"
                            value={widget.name}
                            error={details.errors.nameError}
                            variant="auth"
                            inputRef={nameRef}
                            editable={!disabled}
                            accessibilityState={{ busy }}
                            returnKeyType="go"
                            submitBehavior="submit"
                            onSubmitEditing={submit}
                            setValue={(name) => {
                                if (disabled || busy || submitting.current) return;
                                details.setWidget({ ...widget, name });
                                onChange?.();
                            }}
                        />
                    )}
                    {edit ? (
                        field("Widget type", widget.type)
                    ) : (
                        <BottomSheetSelect
                            title="Widget type"
                            sheetTitle="Choose widget type"
                            value={widget.type}
                            disabled={disabled || busy}
                            options={types.map((type) => ({
                                label: type,
                                selected: widget.type === type,
                                onPress: () => changeType(type),
                            }))}
                        />
                    )}
                    {edit && field("Status", widget.enabled ? "Enabled" : "Disabled")}
                    <View key={widget.type}>
                        {widget.type === "Button" && <ButtonForm {...formProps} />}
                        {widget.type === "Display" && <DisplayForm {...formProps} />}
                        {widget.type === "Slider" && <SliderForm {...formProps} />}
                        {widget.type === "Radio" && <RadioForm {...formProps} />}
                        {widget.type === "Switch" && <SwitchForm {...formProps} />}
                        {widget.type === "Color" && <ColorForm {...formProps} />}
                    </View>
                </FormSection>
                {children}
            </View>
        </KeyboardAwareScrollView>
    );
};

export default WidgetForm;

const styles = StyleSheet.create({
    scrollContent: {
        flexGrow: 1,
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 24,
    },
    content: { width: "100%", maxWidth: 448 },
    summary: { gap: 4 },
    label: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
    value: { fontSize: 16, lineHeight: 24 },
    helper: { fontSize: 14, lineHeight: 20 },
});
