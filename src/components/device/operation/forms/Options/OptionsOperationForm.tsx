import React, { FC, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Icon from "@/components/common/Icon";
import ListRow from "@/components/common/ListRow";
import SectionHeaderAction from "@/components/common/SectionHeaderAction";
import SenswaveModal from "@/components/common/SenswaveModal";
import { useTheme } from "@/contexts/ThemeProvider";
import { useOperationForm } from "@/contexts/custom/OperationFormProvider";
import OptionsOperationFormModal from "./OptionsOperationFormModal";

interface OptionOperationFormProps {
    edit?: boolean;
    disabled?: boolean;
    onChange?: () => void;
}
const OptionOperationForm: FC<OptionOperationFormProps> = ({
    edit = false,
    disabled = false,
    onChange,
}) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const operationForm = useOperationForm();
    const { colors } = useTheme().current;
    const options = operationForm.getOptions();
    const locked = useRef(false);
    locked.current = edit || disabled;
    const currentForm = useRef(operationForm);
    currentForm.current = operationForm;
    return (
        <View style={styles.group}>
            {!edit && (
                <SenswaveModal
                    visible={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                    title="Add option"
                    variant="brand">
                    {dialogOpen && (
                        <OptionsOperationFormModal
                            disabled={disabled}
                            onChange={onChange}
                            onClose={() => setDialogOpen(false)}
                        />
                    )}
                </SenswaveModal>
            )}
            <View style={styles.header}>
                <Text
                    accessibilityRole="header"
                    style={[styles.label, { color: colors.authForeground }]}>
                    Options
                </Text>
                {!edit && (
                    <SectionHeaderAction
                        label="Add"
                        accessibilityLabel="Add operation option"
                        icon={<Icon icon="add-outline" size={20} color="brand" />}
                        disabled={disabled || options.length >= 10}
                        onPress={() => {
                            if (!locked.current && currentForm.current.getOptions().length < 10)
                                setDialogOpen(true);
                        }}
                    />
                )}
            </View>
            <Text style={[styles.support, { color: colors.authMuted }]}>
                Choose 2–10 unique names and values.
            </Text>
            {options.length === 0 && (
                <Text style={[styles.support, { color: colors.authMuted }]}>
                    No options configured.
                </Text>
            )}
            {options.map((option, index) => (
                <ListRow
                    key={index}
                    title={option.name}
                    description={String(option.value)}
                    separator={index < options.length - 1}
                    trailing={
                        !edit && (
                            <Pressable
                                cssInterop={false}
                                accessibilityRole="button"
                                accessibilityLabel={`Remove ${option.name}`}
                                accessibilityState={{ disabled, busy: disabled }}
                                disabled={disabled}
                                onPress={() => {
                                    if (locked.current) return;
                                    currentForm.current.removeOption(option.name);
                                    onChange?.();
                                }}
                                style={styles.remove}>
                                <Icon icon="remove-outline" size={24} color="brand" />
                            </Pressable>
                        )
                    }
                />
            ))}
        </View>
    );
};
export default OptionOperationForm;
const styles = StyleSheet.create({
    group: { gap: 8 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    label: { flex: 1, fontSize: 16, lineHeight: 24, fontWeight: "600" },
    support: { fontSize: 14, lineHeight: 20 },
    remove: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
});
