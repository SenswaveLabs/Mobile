import React, { FC, useRef, useState } from "react";
import { Platform, StyleSheet, TextInput, View, useWindowDimensions } from "react-native";
import { InputProps } from "@/components/common/Input";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
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
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const inputs = useRef<(TextInput | null)[]>([]);
    const code = useRef({ prop: value, current: value });
    if (code.current.prop !== value) code.current = { prop: value, current: value };
    const groupWidth = 4 * Math.max(48, 12 * fontScale + 12) + 18;
    const focus = (index: number) => inputs.current[Math.max(0, Math.min(index, 7))]?.focus();
    const updateCode = (next: string) => {
        code.current.current = next;
        setValue(next);
    };

    const changeCharacter = (index: number, text: string) => {
        const entered = text.replace(/\s+/g, "").toUpperCase();
        const current = code.current.current;
        // Full-code paste/autofill replaces the invitation, regardless of the focused cell.
        // Preserve overlong pastes so the form can reject them instead of silently truncating.
        const next =
            entered.length >= 8
                ? entered
                : current.slice(0, index) +
                  entered +
                  current.slice(index + Math.max(1, entered.length));
        updateCode(next);
        focus(entered ? index + entered.length : index - 1);
    };

    return (
        <View style={styles.field}>
            <Text style={[styles.label, { color: colors.authForeground }]}>Invite code</Text>
            <View style={styles.groups}>
                {[0, 4].map((start) => (
                    <View key={start} style={[styles.group, { minWidth: groupWidth }]}>
                        {[0, 1, 2, 3].map((offset) => {
                            const index = start + offset;
                            const focused = editable && focusedIndex === index;
                            return (
                                <Input
                                    key={index}
                                    className="w-auto rounded-none border-0 bg-transparent p-0 opacity-100 shadow-none dark:bg-transparent"
                                    ref={(input) => {
                                        inputs.current[index] = input;
                                        if (index === 0) {
                                            if (typeof inputRef === "function") inputRef(input);
                                            else if (inputRef) inputRef.current = input;
                                        }
                                    }}
                                    value={value[index] || ""}
                                    onChangeText={(text) => changeCharacter(index, text)}
                                    onFocus={() => {
                                        const next = Math.min(
                                            index,
                                            code.current.current.length,
                                            7,
                                        );
                                        if (next !== index) focus(next);
                                        else setFocusedIndex(index);
                                    }}
                                    onBlur={() =>
                                        setFocusedIndex((current) =>
                                            current === index ? null : current,
                                        )
                                    }
                                    onKeyPress={({ nativeEvent }) => {
                                        if (
                                            nativeEvent.key === "Backspace" &&
                                            !code.current.current[index] &&
                                            index > 0
                                        ) {
                                            updateCode(
                                                code.current.current.slice(0, index - 1) +
                                                    code.current.current.slice(index),
                                            );
                                            focus(index - 1);
                                        }
                                    }}
                                    onSubmitEditing={(event) => {
                                        if (index < 7) focus(index + 1);
                                        else onSubmitEditing?.(event);
                                    }}
                                    accessibilityLabel={`Invite code, character ${index + 1} of 8`}
                                    accessibilityHint={
                                        error || "8 letters or numbers from the home owner."
                                    }
                                    accessibilityState={{ disabled: !editable }}
                                    editable={editable}
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                    spellCheck={false}
                                    autoComplete={index === 0 ? "one-time-code" : "off"}
                                    selectTextOnFocus
                                    selection={
                                        focused
                                            ? { start: 0, end: value[index] ? 1 : 0 }
                                            : undefined
                                    }
                                    caretHidden
                                    maxLength={64}
                                    returnKeyType={index === 7 ? "go" : "next"}
                                    submitBehavior="submit"
                                    selectionColor="transparent"
                                    selectionHandleColor="transparent"
                                    style={[
                                        styles.slot,
                                        {
                                            color: colors.authForeground,
                                            backgroundColor: colors.authFieldBackground,
                                            borderColor: focused
                                                ? colors.authFocus
                                                : error
                                                  ? colors.error
                                                  : colors.authBorder,
                                        },
                                    ]}
                                />
                            );
                        })}
                    </View>
                ))}
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
    label: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
    groups: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    group: { flexDirection: "row", flexGrow: 1, flexBasis: "45%", gap: 6 },
    slot: {
        flex: 1,
        minHeight: 56,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 4,
        paddingVertical: 12,
        fontSize: 20,
        lineHeight: 28,
        textAlign: "center",
        textAlignVertical: "center",
        fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    },
    error: { fontSize: 14, lineHeight: 20 },
});
