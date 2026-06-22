import { useTheme } from "@/contexts/ThemeProvider";
import React, { FC, useEffect, useRef, useState } from "react";
import Text from "@/components/common/Text";
import { TextInput, View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { shadowStyles } from "@/styles/shadowStyles";

interface InputNumberProps {
    value: number | undefined;
    onChange: (value: number | undefined) => void;
    min?: number;
    max?: number;
    integer?: boolean;
    title?: string;
    placeholder?: string;
    error?: string;
    required?: boolean;
    editable?: boolean;
    style?: StyleProp<ViewStyle>;
}

const FLOAT_RE = /^-?\d+\.?\d*$|^-?\d*\.?\d+$/;
const INT_RE = /^-?\d+$/;

const InputNumber: FC<InputNumberProps> = ({
    value,
    onChange,
    min,
    max,
    integer = false,
    title = "",
    placeholder = "",
    error: externalError = "",
    required = false,
    editable = true,
    style,
}) => {
    const theme = useTheme();
    const focused = useRef(false);

    const [text, setText] = useState<string>(value !== undefined ? String(value) : "");
    const [localError, setLocalError] = useState<string>("");

    useEffect(() => {
        if (!focused.current) {
            setText(value !== undefined ? String(value) : "");
        }
    }, [value]);

    const onChangeText = (raw: string) => {
        setText(raw);

        if (raw === "" || raw === "-") {
            setLocalError("");
            onChange(undefined);
            return;
        }

        const re = integer ? INT_RE : FLOAT_RE;
        const parsed = integer ? parseInt(raw, 10) : parseFloat(raw);

        if (!re.test(raw) || isNaN(parsed) || !isFinite(parsed)) {
            setLocalError(integer ? "Whole numbers only" : "Numbers only");
            onChange(undefined);
            return;
        }

        if (min !== undefined && parsed < min) {
            setLocalError(`Minimum: ${min}`);
            onChange(undefined);
            return;
        }

        if (max !== undefined && parsed > max) {
            setLocalError(`Maximum: ${max}`);
            onChange(undefined);
            return;
        }

        setLocalError("");
        onChange(parsed);
    };

    const onFocus = () => {
        focused.current = true;
    };

    const onBlur = () => {
        focused.current = false;
        if (text === "-" || text === "") {
            setText("");
            if (required) setLocalError("Required");
            return;
        }
        const parsed = parseFloat(text);
        if (!isNaN(parsed)) {
            setText(String(parsed));
        }
    };

    const displayError = localError || externalError;

    return (
        <View style={[styles.container, style]}>
            {title !== "" && (
                <Text size="medium" bold={true} color="onBackground" style={styles.label}>
                    {title}
                </Text>
            )}
            <View
                style={[
                    {
                        marginBottom: 5,
                        borderRadius: 12,
                        backgroundColor: theme.current.colors.primary,
                    },
                    shadowStyles.default,
                ]}>
                <TextInput
                    keyboardType="numeric"
                    style={{
                        padding: 10,
                        color: theme.current.colors.textOnPrimary,
                    }}
                    placeholder={placeholder}
                    placeholderTextColor={theme.current.colors.textOnPrimary + "99"}
                    onChangeText={onChangeText}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    value={text}
                    editable={editable}
                />
            </View>
            {displayError !== "" && (
                <Text style={styles.error} size="small" color="error">
                    {displayError}
                </Text>
            )}
        </View>
    );
};

export default InputNumber;

const styles = StyleSheet.create({
    container: {
        width: "100%",
    },
    label: {
        marginBottom: 5,
    },
    error: {
        marginBottom: 5,
    },
});
