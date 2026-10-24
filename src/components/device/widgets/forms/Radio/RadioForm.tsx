import React, { FC, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/contexts/ThemeProvider";
import { useWidgetDetails } from "@/contexts/custom/WidgetDetailsProvider";
import Icon from "@/components/common/Icon";
import ListRow from "@/components/common/ListRow";
import SectionHeaderAction from "@/components/common/SectionHeaderAction";
import SenswaveModal from "@/components/common/SenswaveModal";
import RadioOptionFormModal from "./RadioOptionFormModal";
import { getRadioOptionErrors, getRadioOptionsError } from "./radioValidation";
import { OperationType } from "@/types/DeviceTypes";
import type { OptionInfo } from "@/contexts/custom/OperationFormProvider";

interface Props {
    edit?: boolean;
    disabled?: boolean;
}

export type RadioOption = {
    optionName: string;
    displayName: string;
    icon: string;
};

export const RadioOperationTypes: OperationType[] = ["Options"];

const RadioForm: FC<Props> = ({ edit = false, disabled = false }) => {
    const { colors } = useTheme().current;
    const widgetDetails = useWidgetDetails();
    const configuredOptions = Array.isArray(widgetDetails.widget?.configuration?.options)
        ? (widgetDetails.widget.configuration.options as RadioOption[])
        : [];
    const operationOptions = Array.isArray(widgetDetails.operation?.configuration?.options)
        ? (widgetDetails.operation.configuration.options as OptionInfo[])
        : [];
    const [options, setOptions] = useState(configuredOptions);
    const optionsRef = useRef(options);
    const [optionsError, setOptionsError] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const lockedRef = useRef(edit || disabled);
    lockedRef.current = edit || disabled;
    const detailsRef = useRef(widgetDetails);
    detailsRef.current = widgetDetails;
    const canAdd =
        options.length < 10 &&
        operationOptions.some(
            (available) => !options.some((option) => option?.optionName === available?.name),
        );

    const validate = () => {
        const availableOptions = detailsRef.current.operation?.configuration?.options;
        const error = getRadioOptionsError(
            optionsRef.current,
            Array.isArray(availableOptions) ? availableOptions : [],
        );
        setOptionsError(error);
        return error === "";
    };
    const validateRef = useRef(validate);
    validateRef.current = validate;

    useEffect(() => {
        const details = detailsRef.current;
        const saved = details.widget?.configuration?.options;
        const initial = Array.isArray(saved) ? saved : [];
        optionsRef.current = initial;
        setOptions(initial);
        details.setAdditionalValidation(() => validateRef.current());
        details.validateDto();
        return () => details.setAdditionalValidation(null);
    }, [widgetDetails.operation?.id, widgetDetails.widget?.id]);

    const updateOptions = (nextOptions: RadioOption[]) => {
        if (lockedRef.current) return;
        optionsRef.current = nextOptions;
        setOptions(nextOptions);
        const details = detailsRef.current;
        details.setWidget({
            ...details.widget!,
            configuration: { ...details.widget?.configuration, options: nextOptions },
        });
        details.validateDto();
    };

    const addOption = (option: RadioOption) => {
        if (lockedRef.current) return;
        const errors = getRadioOptionErrors(option, operationOptions, optionsRef.current);
        const error =
            optionsRef.current.length >= 10
                ? "Use at most 10 options."
                : errors.displayName || errors.optionName || errors.icon;
        if (error) {
            setOptionsError(error);
            return;
        }
        updateOptions([...optionsRef.current, option]);
        setDialogOpen(false);
    };

    return (
        <View style={styles.fields}>
            {!edit && (
                <SenswaveModal
                    visible={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                    title="Add option"
                    variant="brand">
                    {dialogOpen && (
                        <RadioOptionFormModal
                            onAddOption={addOption}
                            currentRadioOptions={options}
                            onClose={() => setDialogOpen(false)}
                            disabled={disabled}
                        />
                    )}
                </SenswaveModal>
            )}
            <View style={styles.group}>
                <View style={styles.header}>
                    <Text style={[styles.label, { color: colors.authForeground }]}>Options</Text>
                    {!edit && (
                        <SectionHeaderAction
                            label="Add"
                            accessibilityLabel="Add radio option"
                            icon={<Icon icon="add-outline" size={20} color="brand" />}
                            disabled={disabled || !canAdd}
                            onPress={() => {
                                if (!lockedRef.current && canAdd) setDialogOpen(true);
                            }}
                        />
                    )}
                </View>
                <Text style={[styles.support, { color: colors.authMuted }]}>
                    Choose 2–10 operation options. Each needs a unique display name.
                </Text>
                {options.length === 0 && (
                    <Text style={[styles.support, { color: colors.authMuted }]}>
                        No options configured.
                    </Text>
                )}
                {options.map((option, index) => (
                    <ListRow
                        key={index}
                        title={option?.displayName || "Unavailable option"}
                        description={option?.optionName || "No operation option"}
                        separator={index < options.length - 1}
                        leading={
                            <Icon icon={option?.icon || "bulb-outline"} size={24} color="brand" />
                        }
                        trailing={
                            !edit && (
                                <Pressable
                                    cssInterop={false}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Remove ${option?.displayName || "option"}`}
                                    accessibilityState={{ disabled, busy: disabled }}
                                    disabled={disabled}
                                    onPress={() => {
                                        if (!lockedRef.current)
                                            updateOptions(
                                                optionsRef.current.filter(
                                                    (_, optionIndex) => optionIndex !== index,
                                                ),
                                            );
                                    }}
                                    style={({ pressed }) => [
                                        styles.remove,
                                        pressed && styles.pressed,
                                    ]}>
                                    <Icon icon="remove-outline" size={24} color="brand" />
                                </Pressable>
                            )
                        }
                    />
                ))}
                {!!optionsError && (
                    <Text
                        style={[styles.support, { color: colors.error }]}
                        accessibilityLiveRegion="polite">
                        {optionsError}
                    </Text>
                )}
                {!edit && !canAdd && options.length > 0 && (
                    <Text style={[styles.support, { color: colors.authMuted }]}>
                        {options.length >= 10
                            ? "The maximum of 10 options is configured."
                            : "All available operation options are configured."}
                    </Text>
                )}
            </View>
        </View>
    );
};

export default RadioForm;

const styles = StyleSheet.create({
    fields: { gap: 24 },
    group: { gap: 8 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    label: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: "500" },
    support: { fontSize: 14, lineHeight: 20 },
    remove: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
    pressed: { opacity: 0.72 },
});
