import React, { FC, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Button from "@/components/common/Button";
import BottomSheetSelect from "@/components/common/BottomSheetSelect";
import IconSelector from "@/components/common/IconSelector";
import Input from "@/components/common/Input";
import FormSection from "@/components/common/FormSection";
import { useWidgetDetails } from "@/contexts/custom/WidgetDetailsProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { keyboardOffset } from "@/styles/defaultStyles";
import type { RadioOption } from "./RadioForm";
import type { OptionInfo } from "@/contexts/custom/OperationFormProvider";
import { getRadioOptionErrors } from "./radioValidation";

interface Props {
    onAddOption: (option: RadioOption) => void;
    currentRadioOptions: RadioOption[];
    onClose: () => void;
    edit?: boolean;
    disabled?: boolean;
}

const DefaultIcons = [
    "bulb-outline",
    "flash-outline",
    "power-outline",
    "checkmark-outline",
    "close-outline",
    "play-outline",
    "pause-outline",
    "stop-outline",
    "moon-outline",
    "sunny-outline",
    "snow-outline",
    "flame-outline",
    "thermometer-outline",
    "water-outline",
    "leaf-outline",
];

const RadioOptionFormModal: FC<Props> = ({
    onAddOption,
    currentRadioOptions,
    onClose,
    edit = false,
    disabled = false,
}) => {
    const widgetDetails = useWidgetDetails();
    const { colors } = useTheme().current;
    const operationOptions = Array.isArray(widgetDetails.operation?.configuration?.options)
        ? (widgetDetails.operation.configuration.options as OptionInfo[])
        : [];
    const availableOptions = operationOptions.filter(
        (option) => !currentRadioOptions.some((current) => current.optionName === option.name),
    );
    const [draft, setDraft] = useState<RadioOption>({
        optionName: availableOptions[0]?.name ?? "",
        displayName: "",
        icon: "bulb-outline",
    });
    const draftRef = useRef(draft);
    const [errors, setErrors] = useState({ displayName: "", optionName: "", icon: "" });
    const acceptedRef = useRef(false);
    const lockedRef = useRef(edit || disabled);
    lockedRef.current = edit || disabled;
    const currentOptionsRef = useRef(currentRadioOptions);
    currentOptionsRef.current = currentRadioOptions;

    const changeDraft = (field: keyof RadioOption, value: string) => {
        if (lockedRef.current || acceptedRef.current) return;
        const next = { ...draftRef.current, [field]: value };
        draftRef.current = next;
        setDraft(next);
        const nextErrors = getRadioOptionErrors(
            { ...next, displayName: next.displayName.trim() },
            operationOptions,
            currentOptionsRef.current,
        );
        setErrors((current) => ({ ...current, [field]: nextErrors[field] }));
    };

    const addOption = () => {
        if (lockedRef.current || acceptedRef.current) return;
        const option = { ...draftRef.current, displayName: draftRef.current.displayName.trim() };
        const nextErrors = getRadioOptionErrors(
            option,
            operationOptions,
            currentOptionsRef.current,
        );
        if (currentOptionsRef.current.length >= 10)
            nextErrors.optionName = "Use at most 10 options.";
        setErrors(nextErrors);
        if (Object.values(nextErrors).some(Boolean)) return;
        acceptedRef.current = true;
        onAddOption(option);
        onClose();
    };

    return (
        <KeyboardAwareScrollView
            bottomOffset={keyboardOffset}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}>
            <FormSection
                title="Option details"
                helper="Choose the operation option, then give it a short name for the dashboard.">
                <View style={styles.field}>
                    <BottomSheetSelect
                        title="Operation option"
                        value={draft.optionName || "No options available"}
                        disabled={edit || disabled || availableOptions.length === 0}
                        options={availableOptions.map((option) => ({
                            label: option.name,
                            selected: draft.optionName === option.name,
                            onPress: () => changeDraft("optionName", option.name),
                        }))}
                    />
                    {!!errors.optionName && (
                        <Text
                            style={[styles.support, { color: colors.error }]}
                            accessibilityLiveRegion="polite">
                            {errors.optionName}
                        </Text>
                    )}
                    {availableOptions.length === 0 && (
                        <Text style={[styles.support, { color: colors.authMuted }]}>
                            No unused operation options are available.
                        </Text>
                    )}
                </View>
                <Input
                    variant="auth"
                    value={draft.displayName}
                    setValue={(value) => changeDraft("displayName", value)}
                    error={errors.displayName}
                    title="Display name"
                    placeholder="For example, On"
                    editable={!edit}
                    accessibilityState={{ busy: disabled }}
                    returnKeyType="done"
                    onSubmitEditing={addOption}
                />
                <View style={styles.field}>
                    <IconSelector
                        variant="brand"
                        onIconSelected={(value) => changeDraft("icon", value)}
                        iconList={DefaultIcons}
                        defaultIcon={draft.icon}
                        disabled={edit || disabled}
                    />
                    {!!errors.icon && (
                        <Text
                            style={[styles.support, { color: colors.error }]}
                            accessibilityLiveRegion="polite">
                            {errors.icon}
                        </Text>
                    )}
                </View>
            </FormSection>
            <View style={styles.actions}>
                <Button
                    name="Add option"
                    loading={false}
                    type="auth"
                    disabled={
                        edit || disabled || acceptedRef.current || availableOptions.length === 0
                    }
                    onPress={addOption}
                />
            </View>
        </KeyboardAwareScrollView>
    );
};

export default RadioOptionFormModal;

const styles = StyleSheet.create({
    content: {
        flexGrow: 1,
        paddingTop: 24,
        paddingBottom: 24,
        width: "100%",
        maxWidth: 448,
        alignSelf: "center",
    },
    actions: { paddingTop: 32, marginTop: "auto" },
    field: { gap: 6 },
    support: { fontSize: 14, lineHeight: 20 },
});
