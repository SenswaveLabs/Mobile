import { useTheme } from "@/contexts/ThemeProvider";
import React, { FC, useState } from "react";
import Text from "@/components/common/Text";
import { TextInput, View, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from "react-native";
import { shadowStyles } from "@/styles/shadowStyles";
import { Ionicons } from "@expo/vector-icons";

interface PasswordInputProps {
    value: string | number;
    setValue: (value: string) => void;
    error: string;
    title?: string;
    placeholder: string;
    style?: StyleProp<ViewStyle>;
    editable?: boolean;
    trim?: boolean;
}

const PasswordInput: FC<PasswordInputProps> = ({
    value,
    setValue,
    error,
    title = "",
    placeholder,
    style,
    editable = true,
    trim = false,
}) => {
    const theme = useTheme();
    const [secure, setSecure] = useState(true);

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
                <Text size="medium" bold={true} color="onBackground" style={styles.label}>
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
                        flexDirection: "row",
                        alignItems: "center",
                    },
                    shadowStyles.default,
                ]}>
                <TextInput
                    secureTextEntry={secure}
                    style={[
                        {
                            flex: 1,
                            padding: 10,
                            margin: 0,
                            color: theme.current.colors.textOnPrimary,
                        },
                    ]}
                    placeholder={placeholder}
                    placeholderTextColor={theme.current.colors.textOnPrimary + "99"}
                    onChangeText={onChangeText}
                    value={value.toString()}
                    editable={editable}
                />
                <TouchableOpacity onPress={() => setSecure((s) => !s)} style={styles.eyeButton}>
                    <Ionicons
                        name={secure ? "eye-outline" : "eye-off-outline"}
                        size={20}
                        color={theme.current.colors.textOnPrimary}
                    />
                </TouchableOpacity>
            </View>

            {error && (
                <Text style={styles.error} size={"small"} color={"error"}>
                    {error}
                </Text>
            )}
        </View>
    );
};

export default PasswordInput;

const styles = StyleSheet.create({
    container: {
        width: "100%",
        padding: 0,
        margin: 0,
    },
    label: {
        marginTop: 0,
        marginBottom: 5,
    },
    error: {
        marginTop: 0,
        marginBottom: 5,
    },
    eyeButton: {
        paddingHorizontal: 10,
        paddingVertical: 10,
    },
});
