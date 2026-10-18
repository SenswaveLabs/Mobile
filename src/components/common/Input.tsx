import { useTheme } from "@/contexts/ThemeProvider";
import React, { FC, useId, useState } from "react";
import { Input as ReusableInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text as NativeText } from "@/components/ui/text";
import { TextInput, TextInputProps, View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { shadowStyles } from "@/styles/shadowStyles";

export interface InputProps extends Omit<TextInputProps, "value" | "onChangeText" | "style"> {
    value: string | number;
    setValue: (value: string) => void;
    error: string;
    title?: string;
    placeholder: string;
    style?: StyleProp<ViewStyle>;
    password?: boolean;
    trim?: boolean;
    variant?: "default" | "auth";
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
    variant = "default",
    inputRef,
    endAdornment,
    onFocus,
    onBlur,
    ...inputProps
}) => {
    const { colors } = useTheme().current;
    const labelId = useId();
    const [focused, setFocused] = useState(false);
    const auth = variant === "auth";
    const foreground = auth ? colors.authForeground : colors.textOnPrimary;

    return (
        <View style={[styles.container, style]}>
            {!!title && (
                <Label
                    nativeID={labelId}
                    onPress={() => {
                        if (inputRef && typeof inputRef !== "function") inputRef.current?.focus();
                    }}
                    style={[
                        styles.label,
                        auth && styles.authLabel,
                        { color: auth ? colors.authForeground : colors.textOnBackground },
                    ]}>
                    {title}
                </Label>
            )}
            <View
                style={[
                    styles.field,
                    auth && styles.authField,
                    !auth && shadowStyles.default,
                    {
                        backgroundColor: auth ? colors.authFieldBackground : colors.primary,
                        borderColor: error
                            ? colors.error
                            : focused
                              ? colors.authFocus
                              : auth
                                ? colors.authBorder
                                : "transparent",
                    },
                ]}>
                <ReusableInput
                    className="h-auto w-auto rounded-none border-0 bg-transparent p-0 shadow-none dark:bg-transparent"
                    {...inputProps}
                    ref={inputRef}
                    accessibilityLabel={inputProps.accessibilityLabel ?? (title || placeholder)}
                    accessibilityLabelledBy={title ? labelId : undefined}
                    accessibilityHint={error || inputProps.accessibilityHint}
                    accessibilityState={{ ...inputProps.accessibilityState, disabled: !editable }}
                    keyboardType={keyboardType}
                    secureTextEntry={password}
                    style={[styles.input, auth && styles.authInput, { color: foreground }]}
                    placeholder={placeholder}
                    placeholderTextColor={auth ? colors.authMuted : foreground + "99"}
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
                            fontSize: auth ? 14 : 12,
                            lineHeight: auth ? 20 : 16,
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
    label: { fontSize: 16, fontWeight: "bold", marginBottom: 5 },
    authLabel: { fontSize: 14, lineHeight: 20, fontWeight: "500", marginBottom: 8 },
    field: {
        minHeight: 48,
        borderRadius: 12,
        borderWidth: 2,
        flexDirection: "row",
        alignItems: "center",
    },
    input: { flex: 1, minHeight: 48, padding: 10, fontSize: 14 },
    authField: { minHeight: 52, borderRadius: 8, borderWidth: 1 },
    authInput: { minHeight: 50, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
    error: { marginTop: 6 },
});
