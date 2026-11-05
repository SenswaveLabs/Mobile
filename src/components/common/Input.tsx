import { useTheme } from "@/contexts/ThemeProvider";
import React, { FC, useId, useState } from "react";
import { Input as ReusableInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text as NativeText } from "@/components/ui/text";
import { TextInput, TextInputProps, View, StyleSheet, StyleProp, ViewStyle } from "react-native";

export interface InputProps extends Omit<TextInputProps, "value" | "onChangeText" | "style"> {
    value: string | number;
    setValue: (value: string) => void;
    error: string;
    title?: string;
    placeholder: string;
    style?: StyleProp<ViewStyle>;
    password?: boolean;
    trim?: boolean;
    variant?: "auth";
    inputRef?: React.Ref<TextInput>;
    endAdornment?: React.ReactNode;
}

const Input: FC<InputProps> = ({
    value,
    setValue,
    error,
    title = "",
    placeholder,
    style,
    password = false,
    numberOfLines = 1,
    keyboardType = "default",
    editable = true,
    trim = false,
    variant: _variant,
    inputRef,
    endAdornment,
    onFocus,
    onBlur,
    ...inputProps
}) => {
    const { colors } = useTheme().current;
    const labelId = useId();
    const [focused, setFocused] = useState(false);
    const foreground = colors.authForeground;

    return (
        <View style={[styles.container, style]}>
            {!!title && (
                <Label
                    nativeID={labelId}
                    onPress={() => {
                        if (inputRef && typeof inputRef !== "function") inputRef.current?.focus();
                    }}
                    style={[styles.label, { color: colors.authForeground }]}>
                    {title}
                </Label>
            )}
            <View
                style={[
                    styles.field,
                    {
                        backgroundColor: colors.authFieldBackground,
                        borderColor: error
                            ? colors.error
                            : focused
                              ? colors.authFocus
                              : colors.authBorder,
                    },
                ]}>
                <ReusableInput
                    className="h-auto w-auto rounded-none border-0 bg-transparent p-0 shadow-none dark:bg-transparent placeholder:text-muted-foreground"
                    {...inputProps}
                    ref={inputRef}
                    accessibilityLabel={inputProps.accessibilityLabel ?? (title || placeholder)}
                    accessibilityLabelledBy={title ? labelId : undefined}
                    accessibilityHint={error || inputProps.accessibilityHint}
                    accessibilityState={{ ...inputProps.accessibilityState, disabled: !editable }}
                    keyboardType={keyboardType}
                    secureTextEntry={password}
                    style={[styles.input, { color: foreground }]}
                    placeholder={placeholder}
                    placeholderTextColor={colors.authMuted}
                    onChangeText={(text) => setValue(trim ? text.trim() : text)}
                    onFocus={(event) => {
                        setFocused(true);
                        onFocus?.(event);
                    }}
                    onBlur={(event) => {
                        setFocused(false);
                        onBlur?.(event);
                    }}
                    value={value.toString()}
                    multiline={numberOfLines !== 1}
                    numberOfLines={numberOfLines}
                    editable={editable}
                />
                {endAdornment}
            </View>
            {!!error && (
                <NativeText
                    style={[
                        styles.error,
                        {
                            color: colors.error,
                            fontSize: 14,
                            lineHeight: 20,
                        },
                    ]}
                    accessibilityLiveRegion="polite">
                    {error}
                </NativeText>
            )}
        </View>
    );
};

export default Input;

const styles = StyleSheet.create({
    container: { width: "100%" },
    label: { fontSize: 14, lineHeight: 20, fontWeight: "500", marginBottom: 8 },
    field: {
        minHeight: 52,
        borderRadius: 8,
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
    },
    input: { flex: 1, minHeight: 50, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
    error: { marginTop: 6 },
});
