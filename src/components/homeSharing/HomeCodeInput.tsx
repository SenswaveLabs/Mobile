import React, { FC, useId, useRef, useState } from "react";
import {
    LayoutRectangle,
    NativeTouchEvent,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    View,
    useWindowDimensions,
} from "react-native";
import { InputProps } from "@/components/common/Input";
import { useTheme } from "@/contexts/ThemeProvider";

interface HomeCodeInputProps extends Pick<
    InputProps,
    "setValue" | "error" | "inputRef" | "editable" | "onSubmitEditing"
> {
    value: string;
}

const HomeCodeInput: FC<HomeCodeInputProps> = ({
    value,
    setValue,
    error,
    inputRef,
    editable = true,
    onSubmitEditing,
}) => {
    const { colors } = useTheme().current;
    const { fontScale } = useWindowDimensions();
    const labelId = useId();
    const [focused, setFocused] = useState(false);
    const [cursor, setCursor] = useState(0);
    const nativeInput = useRef<TextInput>(null);
    const groups = useRef<LayoutRectangle[]>([]);
    const slots = useRef<LayoutRectangle[]>([]);
    const touchStart = useRef<NativeTouchEvent | null>(null);
    const groupWidth = 4 * Math.max(28, 12 * fontScale + 12) + 18;

    return (
        <View style={styles.field}>
            <Text nativeID={labelId} style={[styles.label, { color: colors.authForeground }]}>
                Invite code
            </Text>
            <View>
                <View
                    style={styles.groups}
                    pointerEvents="none"
                    accessible={false}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants">
                    {[0, 4].map((start) => (
                        <View
                            key={start}
                            style={[styles.group, { minWidth: groupWidth }]}
                            onLayout={({ nativeEvent }) => {
                                groups.current[start / 4] = nativeEvent.layout;
                            }}>
                            {[0, 1, 2, 3].map((offset) => {
                                const index = start + offset;
                                const selected = focused && editable && cursor === index;
                                return (
                                    <View
                                        key={index}
                                        onLayout={({ nativeEvent }) => {
                                            slots.current[index] = nativeEvent.layout;
                                        }}
                                        style={[
                                            styles.slot,
                                            {
                                                backgroundColor: colors.authFieldBackground,
                                                borderColor: error
                                                    ? colors.error
                                                    : selected
                                                      ? colors.authFocus
                                                      : colors.authBorder,
                                            },
                                        ]}>
                                        <Text
                                            style={[
                                                styles.character,
                                                {
                                                    color: colors.authForeground,
                                                },
                                            ]}>
                                            {value[index] || (selected ? "|" : "\u00a0")}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    ))}
                </View>
                <TextInput
                    ref={(input) => {
                        nativeInput.current = input;
                        if (typeof inputRef === "function") inputRef(input);
                        else if (inputRef) inputRef.current = input;
                    }}
                    value={value}
                    onChangeText={setValue}
                    onSubmitEditing={onSubmitEditing}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onTouchStart={({ nativeEvent }) => {
                        touchStart.current = nativeEvent.touches?.length > 1 ? null : nativeEvent;
                    }}
                    onTouchMove={({ nativeEvent }) => {
                        const start = touchStart.current;
                        if (
                            start &&
                            (Math.abs(nativeEvent.locationX - start.locationX) > 8 ||
                                Math.abs(nativeEvent.locationY - start.locationY) > 8)
                        )
                            touchStart.current = null;
                    }}
                    onTouchCancel={() => {
                        touchStart.current = null;
                    }}
                    onTouchEnd={({ nativeEvent }) => {
                        const start = touchStart.current;
                        touchStart.current = null;
                        // Leave long presses and native selection drags/context menus untouched.
                        if (!editable || !start || nativeEvent.timestamp - start.timestamp > 250)
                            return;
                        const index = slots.current.findIndex((slot, index) => {
                            const group = groups.current[Math.floor(index / 4)];
                            return (
                                slot &&
                                group &&
                                nativeEvent.locationX >= group.x + slot.x &&
                                nativeEvent.locationX < group.x + slot.x + slot.width &&
                                nativeEvent.locationY >= group.y + slot.y &&
                                nativeEvent.locationY < group.y + slot.y + slot.height
                            );
                        });
                        if (index < 0) return;
                        const position = Math.min(index, value.length);
                        nativeInput.current?.setSelection?.(
                            position,
                            Math.min(position + 1, value.length),
                        );
                        setCursor(position);
                    }}
                    onSelectionChange={({ nativeEvent }) =>
                        setCursor(Math.min(nativeEvent.selection.start, 7))
                    }
                    accessibilityLabel="Invite code"
                    accessibilityLabelledBy={labelId}
                    accessibilityHint={error || "8 letters or numbers from the home owner."}
                    accessibilityState={{ disabled: !editable }}
                    editable={editable}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    spellCheck={false}
                    autoComplete="one-time-code"
                    maxLength={64}
                    returnKeyType="go"
                    caretHidden
                    style={styles.input}
                />
            </View>
            {!!error && (
                <Text
                    accessibilityLiveRegion="polite"
                    style={[styles.error, { color: colors.error }]}>
                    {error}
                </Text>
            )}
        </View>
    );
};

export default HomeCodeInput;

const styles = StyleSheet.create({
    field: { width: "100%", gap: 12 },
    label: { fontSize: 14, fontWeight: "500" },
    groups: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    group: { flexDirection: "row", flexGrow: 1, flexBasis: "45%", gap: 6 },
    slot: {
        flex: 1,
        minHeight: 56,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 4,
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    character: {
        fontSize: 20,
        lineHeight: 28,
        fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    },
    // One native editing surface owns paste, selection, Backspace and accessibility.
    // Only its text is transparent; the native view remains touchable and accessible.
    input: { ...StyleSheet.absoluteFillObject, color: "transparent", fontSize: 20 },
    error: { fontSize: 14, lineHeight: 20 },
});
