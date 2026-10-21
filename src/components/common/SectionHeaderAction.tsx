import React, { FC, ReactNode } from "react";
import { Pressable, StyleSheet, Text as NativeText } from "react-native";
import { useTheme } from "@/contexts/ThemeProvider";

interface SectionHeaderActionProps {
    label: string;
    accessibilityLabel: string;
    icon: ReactNode;
    disabled?: boolean;
    busy?: boolean;
    onPress: () => void;
}

const SectionHeaderAction: FC<SectionHeaderActionProps> = ({
    label,
    accessibilityLabel,
    icon,
    disabled = false,
    busy = false,
    onPress,
}) => {
    const { colors } = useTheme().current;
    return (
        <Pressable
            cssInterop={false}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ disabled, busy }}
            disabled={disabled}
            onPress={onPress}
            android_ripple={{ color: colors.authBorder }}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
            {icon}
            <NativeText style={[styles.label, { color: colors.authForeground }]}>
                {label}
            </NativeText>
        </Pressable>
    );
};

export default SectionHeaderAction;

const styles = StyleSheet.create({
    action: {
        minWidth: 72,
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    label: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
    pressed: { opacity: 0.72 },
});
