import { useTheme } from "@/contexts/ThemeProvider";
import React, { FC, useId, useState } from "react";
import {
    Text as NativeText,
    TextInput,
    TextInputProps,
    View,
    StyleSheet,
    StyleProp,
    ViewStyle,
} from "react-native";
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
                <NativeText
                    nativeID={labelId}
                    style={[
                        styles.label,
                        auth && styles.authLabel,
                        { color: auth ? colors.authForeground : colors.textOnBackground },
                    ]}>
                    {title}
                </NativeText>
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
                <TextInput
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
                    style={[styles.error, { color: colors.error, fontSize: auth ? 14 : 12 }]}
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
    authLabel: { fontSize: 14, fontWeight: "500", marginBottom: 12 },
    field: {
        minHeight: 48,
        borderRadius: 12,
        borderWidth: 2,
        flexDirection: "row",
        alignItems: "center",
    },
    input: { flex: 1, minHeight: 48, padding: 10 },
    authField: { minHeight: 52, borderRadius: 8, borderWidth: 1 },
    authInput: { minHeight: 50, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
    error: { marginTop: 6 },
});
