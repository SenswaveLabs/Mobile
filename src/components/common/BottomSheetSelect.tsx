import React, { FC, useEffect, useRef, useState } from "react";
import {
    AccessibilityInfo,
    InteractionManager,
    Keyboard,
    Modal as NativeModal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    findNodeHandle,
    useWindowDimensions,
} from "react-native";
import { Check, ChevronDown, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeProvider";

interface BottomSheetSelectOption {
    label: string;
    selected: boolean;
    onPress: () => void;
}

export interface BottomSheetSelectProps {
    title: string;
    value: string;
    options: BottomSheetSelectOption[];
    disabled?: boolean;
}

const focusNativeElement = (element: View | Text | null) => {
    const tag = findNodeHandle(element);
    if (tag !== null) AccessibilityInfo.setAccessibilityFocus(tag);
};

const BottomSheetSelect: FC<BottomSheetSelectProps> = ({
    title,
    value,
    options,
    disabled = false,
}) => {
    const { colors } = useTheme().current;
    const insets = useSafeAreaInsets();
    const { height } = useWindowDimensions();
    const [visible, setVisible] = useState(false);
    const [focused, setFocused] = useState(false);
    const wasVisible = useRef(false);
    const triggerRef = useRef<View>(null);
    const titleRef = useRef<Text>(null);
    const selectedOptionRef = useRef<View>(null);

    useEffect(() => {
        if (!visible && wasVisible.current && Platform.OS === "android") {
            InteractionManager.runAfterInteractions(() => focusNativeElement(triggerRef.current));
        }
        wasVisible.current = visible;
    }, [visible]);

    const open = () => {
        if (disabled) return;
        Keyboard.dismiss();
        setVisible(true);
    };
    const close = () => setVisible(false);

    return (
        <View style={styles.container}>
            <Text style={[styles.label, { color: colors.authForeground }]}>{title}</Text>
            <Pressable
                ref={triggerRef}
                cssInterop={false}
                disabled={disabled}
                onPress={open}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                accessibilityRole="button"
                accessibilityLabel={`${title}, ${value}`}
                accessibilityHint={`Opens ${title} options`}
                accessibilityState={{ disabled }}
                style={({ pressed }) => [
                    styles.trigger,
                    {
                        backgroundColor: colors.authFieldBackground,
                        borderColor: focused ? colors.authFocus : colors.authBorder,
                        opacity: disabled ? 0.55 : 1,
                    },
                    pressed && !disabled && styles.pressed,
                ]}>
                <Text style={[styles.value, { color: colors.authForeground }]}>{value}</Text>
                <ChevronDown size={20} color={colors.authMuted} accessible={false} />
            </Pressable>

            <NativeModal
                visible={visible}
                transparent
                animationType="slide"
                statusBarTranslucent
                navigationBarTranslucent
                accessibilityViewIsModal
                onRequestClose={close}
                onShow={() => focusNativeElement(selectedOptionRef.current ?? titleRef.current)}
                onDismiss={
                    Platform.OS === "ios" ? () => focusNativeElement(triggerRef.current) : undefined
                }>
                <View style={styles.overlay}>
                    <Pressable
                        cssInterop={false}
                        accessible={false}
                        onPress={close}
                        style={styles.scrim}
                    />
                    <View
                        style={[
                            styles.sheet,
                            {
                                backgroundColor: colors.authFieldBackground,
                                borderColor: colors.authBorder,
                                maxHeight: Math.min(height * 0.9, height - insets.top),
                                paddingBottom: insets.bottom,
                            },
                        ]}>
                        <View style={styles.header}>
                            <Text
                                ref={titleRef}
                                accessibilityRole="header"
                                style={[styles.heading, { color: colors.authForeground }]}>
                                {title}
                            </Text>
                            <Pressable
                                cssInterop={false}
                                onPress={close}
                                accessibilityRole="button"
                                accessibilityLabel="Close selector"
                                style={({ pressed }) => [
                                    styles.closeButton,
                                    pressed && styles.pressed,
                                ]}>
                                <X size={20} color={colors.authForeground} accessible={false} />
                            </Pressable>
                        </View>
                        <ScrollView
                            style={[styles.options, { maxHeight: height * 0.68 }]}
                            keyboardShouldPersistTaps="handled">
                            {options.map((option) => (
                                <Pressable
                                    key={option.label}
                                    ref={option.selected ? selectedOptionRef : undefined}
                                    cssInterop={false}
                                    disabled={disabled}
                                    onPress={() => {
                                        if (disabled) return;
                                        close();
                                        if (option.label !== value) option.onPress();
                                    }}
                                    accessibilityRole="radio"
                                    accessibilityLabel={option.label}
                                    accessibilityState={{
                                        disabled,
                                        selected: option.selected,
                                        checked: option.selected,
                                    }}
                                    style={({ pressed }) => [
                                        styles.option,
                                        option.selected && {
                                            backgroundColor: colors.authPrimary,
                                        },
                                        pressed && !disabled && styles.pressed,
                                    ]}>
                                    <Text
                                        style={[
                                            styles.optionLabel,
                                            {
                                                color: option.selected
                                                    ? colors.authOnPrimary
                                                    : colors.authForeground,
                                            },
                                        ]}>
                                        {option.label}
                                    </Text>
                                    {option.selected && (
                                        <Check
                                            size={20}
                                            color={colors.authOnPrimary}
                                            accessible={false}
                                        />
                                    )}
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </NativeModal>
        </View>
    );
};

export default BottomSheetSelect;

const styles = StyleSheet.create({
    container: { width: "100%" },
    label: { fontSize: 14, fontWeight: "500", marginBottom: 8 },
    trigger: {
        minHeight: 52,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    value: { flex: 1, fontSize: 16 },
    overlay: { flex: 1, justifyContent: "flex-end" },
    scrim: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: "rgba(0,0,0,0.48)",
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderTopWidth: 1,
        paddingTop: 8,
        paddingHorizontal: 16,
    },
    header: {
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingLeft: 4,
    },
    heading: { flex: 1, fontSize: 20, fontWeight: "600" },
    closeButton: {
        minWidth: 48,
        minHeight: 48,
        alignItems: "center",
        justifyContent: "center",
    },
    options: { flexGrow: 0, flexShrink: 1 },
    option: {
        minHeight: 48,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    optionLabel: { flex: 1, fontSize: 16 },
    pressed: { opacity: 0.72 },
});
