import { useTheme } from "@/contexts/ThemeProvider";
import React from "react";
import Text from "@/components/common/Text";
import { FC } from "react";
import { TextInput, View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { shadowStyles } from "@/styles/shadowStyles";

interface InputProps {
    value: string | number;
    setValue: (value: string) => void;
    error: string;
    title?: string;
    placeholder: string;
    style?: StyleProp<ViewStyle>;
    password?: boolean;
    numberOfLines?: number;
    keyboardType?: "numeric" | "default";
    editable?: boolean;
    trim?: boolean;
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
}: InputProps) => {
    const theme = useTheme();

    const onChangeText = (text: string) => {
        if (trim) {
            setValue(text.trim());
        } else {
            setValue(text);
        }
    };

    return (
        <View style={[styles.container, style]}>
            {title !== "" && (
                <Text size="medium" bold={true} color="onBackground" style={styles.text}>
                    {title}
                </Text>
            )}
            <View
                style={[
                    {
                        marginTop: 0,
                        marginBottom: 5,
                        borderRadius: 12,
                        backgroundColor: theme.current.colors.primary,
                    },
                    shadowStyles.default,
                ]}>
                <TextInput
                    keyboardType={keyboardType}
                    secureTextEntry={password}
                    style={[
                        {
                            padding: 10,
                            margin: 0,
                            color: theme.current.colors.textOnPrimary,
                        },
                    ]}
                    placeholder={placeholder}
                    placeholderTextColor={theme.current.colors.textOnPrimary + "99"}
                    onChangeText={onChangeText}
                    value={value.toString()}
                    multiline={numberOfLines && numberOfLines !== 1 ? true : false}
                    numberOfLines={numberOfLines ?? 1}
                    editable={editable}
                />
            </View>

            {error && (
                <Text style={styles.error} size={"small"} color={"error"}>
                    {error}
                </Text>
            )}
        </View>
    );
};

export default Input;

const styles = StyleSheet.create({
    container: {
        width: "100%",
        padding: 0,
        margin: 0,
    },
    text: {
        marginTop: 0,
        marginBottom: 5,
    },
    error: {
        marginTop: 0,
        marginBottom: 5,
    },
});
