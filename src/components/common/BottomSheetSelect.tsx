import React, { FC, useEffect, useRef, useState } from "react";
import {
    AccessibilityInfo,
    ActivityIndicator,
    InteractionManager,
    Keyboard,
    Modal as NativeModal,
    Platform,
    Pressable,
    PressableProps,
    ScrollView,
    StyleSheet,
    Text,
    View,
    findNodeHandle,
    useWindowDimensions,
} from "react-native";
import { Check, ChevronDown, Circle, CircleDot, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, {
    cancelAnimation,
    Easing,
    ReduceMotion,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeProvider";

interface BottomSheetSelectOption {
    label: string;
    selected: boolean;
    onPress: () => void;
}

export interface BottomSheetSelectProps {
    title: string;
    sheetTitle?: string;
    value: string;
    options: BottomSheetSelectOption[];
    leading?: React.ReactNode;
    renderOptions?: (close: () => boolean) => React.ReactNode;
    initialFocusRef?: React.RefObject<View | null>;
    disabled?: boolean;
    onClosed?: () => void;
    variant?: "field" | "tile";
    busy?: boolean;
    dismissDisabled?: boolean | (() => boolean);
    keyboardAware?: boolean;
    triggerProps?: Pick<
        PressableProps,
        "onLongPress" | "accessibilityActions" | "onAccessibilityAction"
    >;
}

const focusNativeElement = (element: View | Text | null) => {
    const tag = findNodeHandle(element);
    if (tag !== null) AccessibilityInfo.setAccessibilityFocus(tag);
};

const BottomSheetSelect: FC<BottomSheetSelectProps> = ({
    title,
    sheetTitle,
    value,
    options,
    leading,
    renderOptions,
    initialFocusRef,
    disabled = false,
    onClosed,
    variant = "field",
    busy = false,
    dismissDisabled = false,
    keyboardAware = false,
    triggerProps,
}) => {
    const { colors } = useTheme().current;
    const insets = useSafeAreaInsets();
    const { height } = useWindowDimensions();
    const [visible, setVisible] = useState(false);
    const [focused, setFocused] = useState(false);
    const [triggerWidth, setTriggerWidth] = useState(0);
    const progress = useSharedValue(0);
    const sheetHeight = useSharedValue(height);
    const dismissing = useRef(false);
    const wasVisible = useRef(false);
    const triggerRef = useRef<View>(null);
    const titleRef = useRef<Text>(null);
    const selectedOptionRef = useRef<View>(null);
    const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: (1 - progress.value) * sheetHeight.value }],
    }));

    useEffect(() => () => cancelAnimation(progress), [progress]);

    useEffect(() => {
        if (!visible && wasVisible.current && Platform.OS === "android") {
            InteractionManager.runAfterInteractions(() => focusNativeElement(triggerRef.current));
        }
        wasVisible.current = visible;
    }, [visible]);

    const open = () => {
        if (disabled) return;
        Keyboard.dismiss();
        dismissing.current = false;
        progress.value = 0;
        setVisible(true);
    };
    const finishClose = () => {
        setVisible(false);
        onClosed?.();
    };
    const focusSelection = () =>
        focusNativeElement(
            initialFocusRef?.current ?? selectedOptionRef.current ?? titleRef.current,
        );
    const show = () => {
        if (dismissing.current) return;
        progress.value = withTiming(
            1,
            { duration: 280, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System },
            (finished) => {
                if (finished) runOnJS(focusSelection)();
            },
        );
    };
    const close = () => {
        if (
            dismissing.current ||
            (typeof dismissDisabled === "function" ? dismissDisabled() : dismissDisabled)
        )
            return false;
        dismissing.current = true;
        progress.value = withTiming(
            0,
            { duration: 180, easing: Easing.in(Easing.quad), reduceMotion: ReduceMotion.System },
            (finished) => {
                if (finished) runOnJS(finishClose)();
            },
        );
        return true;
    };

    const SheetScroll = keyboardAware ? KeyboardAwareScrollView : ScrollView;
    const compactLeading = variant === "tile" && !!leading && triggerWidth < 96;

    return (
        <View style={styles.container}>
            {variant === "field" && (
                <Text style={[styles.label, { color: colors.authForeground }]}>{title}</Text>
            )}
            <Pressable
                {...triggerProps}
                ref={triggerRef}
                cssInterop={false}
                disabled={disabled}
                onPress={open}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onLayout={({ nativeEvent }) => {
                    if (variant === "tile" && leading) setTriggerWidth(nativeEvent.layout.width);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${title}, ${value}`}
                accessibilityHint={`Opens ${title} options`}
                accessibilityState={{ disabled, busy, expanded: visible }}
                style={({ pressed }) => [
                    styles.trigger,
                    leading ? styles.triggerLeading : undefined,
                    {
                        backgroundColor: colors.authFieldBackground,
                        borderColor: focused ? colors.authFocus : colors.authBorder,
                        opacity: disabled ? 0.55 : 1,
                    },
                    variant === "tile" && styles.tileTrigger,
                    variant === "tile" && !!leading && styles.tileLeadingTrigger,
                    pressed && !disabled && styles.pressed,
                ]}>
                {!(compactLeading && busy) && leading}
                {!compactLeading && (
                    <Text
                        numberOfLines={variant === "tile" && !leading ? undefined : 1}
                        style={[
                            styles.value,
                            variant === "tile" && styles.tileValue,
                            variant === "tile" && !!leading && styles.tileLeadingValue,
                            { color: colors.authForeground },
                        ]}>
                        {value}
                    </Text>
                )}
                {variant === "tile" && leading ? (
                    busy ? (
                        <ActivityIndicator size="small" color={colors.authForeground} />
                    ) : null
                ) : variant === "tile" ? (
                    <View
                        style={[
                            styles.tileIcon,
                            {
                                backgroundColor: colors.deviceTileSubtle,
                                borderColor: focused ? colors.authFocus : "transparent",
                            },
                        ]}>
                        {busy ? (
                            <ActivityIndicator size="small" color={colors.authForeground} />
                        ) : (
                            <ChevronDown
                                size={20}
                                color={colors.authForeground}
                                accessible={false}
                            />
                        )}
                    </View>
                ) : (
                    <ChevronDown size={20} color={colors.authMuted} accessible={false} />
                )}
            </Pressable>

            <NativeModal
                visible={visible}
                transparent
                animationType="none"
                statusBarTranslucent
                navigationBarTranslucent
                accessibilityViewIsModal
                onRequestClose={() => {
                    close();
                }}
                onShow={show}
                onDismiss={
                    Platform.OS === "ios" ? () => focusNativeElement(triggerRef.current) : undefined
                }>
                <View style={[styles.overlay, keyboardAware && { paddingTop: insets.top }]}>
                    <Animated.View style={[styles.scrim, scrimStyle]}>
                        <Pressable
                            cssInterop={false}
                            accessible={false}
                            onPress={() => {
                                close();
                            }}
                            style={StyleSheet.absoluteFill}
                        />
                    </Animated.View>
                    <Animated.View
                        onLayout={({ nativeEvent }) => {
                            sheetHeight.value = nativeEvent.layout.height;
                        }}
                        style={[
                            styles.sheet,
                            keyboardAware && styles.keyboardSheet,
                            {
                                backgroundColor: colors.authFieldBackground,
                                maxHeight: Math.min(height * 0.9, height - insets.top),
                                paddingBottom: insets.bottom + 24,
                            },
                            sheetStyle,
                        ]}>
                        <View style={styles.header}>
                            <Text
                                ref={titleRef}
                                accessibilityRole="header"
                                style={[styles.heading, { color: colors.authForeground }]}>
                                {sheetTitle ?? title}
                            </Text>
                            <Pressable
                                cssInterop={false}
                                onPress={() => {
                                    close();
                                }}
                                accessibilityRole="button"
                                accessibilityLabel="Close selector"
                                style={({ pressed }) => [
                                    styles.closeButton,
                                    pressed && styles.pressed,
                                ]}>
                                <X size={20} color={colors.authForeground} accessible={false} />
                            </Pressable>
                        </View>
                        <SheetScroll
                            style={[styles.options, { maxHeight: height * 0.68 }]}
                            contentContainerStyle={styles.optionsContent}
                            keyboardShouldPersistTaps="handled">
                            {renderOptions
                                ? renderOptions(close)
                                : options.map((option) => (
                                      <Pressable
                                          key={option.label}
                                          ref={option.selected ? selectedOptionRef : undefined}
                                          cssInterop={false}
                                          disabled={disabled}
                                          onPress={() => {
                                              if (disabled || !close()) return;
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
                                          {variant === "tile" ? (
                                              option.selected ? (
                                                  <CircleDot
                                                      size={22}
                                                      color={colors.authOnPrimary}
                                                      accessible={false}
                                                  />
                                              ) : (
                                                  <Circle
                                                      size={22}
                                                      color={colors.authMuted}
                                                      accessible={false}
                                                  />
                                              )
                                          ) : (
                                              option.selected && (
                                                  <Check
                                                      size={20}
                                                      color={colors.authOnPrimary}
                                                      accessible={false}
                                                  />
                                              )
                                          )}
                                      </Pressable>
                                  ))}
                        </SheetScroll>
                    </Animated.View>
                </View>
            </NativeModal>
        </View>
    );
};

export default BottomSheetSelect;

const styles = StyleSheet.create({
    container: { width: "100%" },
    label: { fontSize: 14, lineHeight: 20, fontWeight: "500", marginBottom: 8 },
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
    triggerLeading: { paddingVertical: 8 },
    value: { flex: 1, fontSize: 16 },
    tileTrigger: {
        minHeight: 48,
        minWidth: 48,
        borderWidth: 0,
        paddingHorizontal: 0,
        paddingVertical: 0,
        opacity: 1,
        backgroundColor: "transparent",
        gap: 8,
    },
    tileValue: { fontSize: 17, lineHeight: 24, fontWeight: "500", textAlign: "right" },
    tileLeadingValue: { fontSize: 12, lineHeight: 18, fontWeight: "400", flexShrink: 1 },
    tileLeadingTrigger: { justifyContent: "center", gap: 4 },
    tileIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        alignItems: "center",
        justifyContent: "center",
    },
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
        paddingTop: 16,
        paddingHorizontal: 24,
    },
    keyboardSheet: { flexShrink: 1 },
    header: {
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingLeft: 4,
        marginBottom: 8,
    },
    heading: { flex: 1, fontSize: 20, fontWeight: "600" },
    closeButton: {
        minWidth: 48,
        minHeight: 48,
        alignItems: "center",
        justifyContent: "center",
    },
    options: { flexGrow: 0, flexShrink: 1 },
    optionsContent: { gap: 8 },
    option: {
        minHeight: 56,
        paddingHorizontal: 12,
        paddingVertical: 16,
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    optionLabel: { flex: 1, fontSize: 16 },
    pressed: { opacity: 0.72 },
});
