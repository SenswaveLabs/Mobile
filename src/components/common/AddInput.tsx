import { useTheme } from "@/contexts/ThemeProvider";
import React from "react";
import Text from "@/components/common/Text";
import { FC } from "react";
import { TextInput, View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { shadowStyles } from "@/styles/shadowStyles";
import ImageButton from "./ImageButton";

interface AddInputProps {
    value: string | number;
    setValue: (value: string) => void;
    error: string;
    title?: string;
    placeholder: string;
    onPressAdd: () => void;
    style?: StyleProp<ViewStyle>;
    password?: boolean;
    numberOfLines?: number;
    keyboardType?: "numeric" | "default";
    editable?: boolean;
}

const AddInput: FC<AddInputProps> = ({
    value,
    setValue,
    error,
    title = "",
    placeholder,
    onPressAdd,
    style,
    password = false,
    numberOfLines = 1,
    keyboardType = "default",
    editable = true,
}: AddInputProps) => {
    const theme = useTheme();

    return (
        <View style={[styles.container, style]}>
            {title !== "" && (
                <Text size="medium" bold={true} color="onBackground" style={styles.text}>
                    {title}
                </Text>
            )}

            <View style={{ flexDirection: "row", width: "100%" }}>
                <View
                    style={[
                        {
                            marginTop: 0,
                            marginBottom: 5,
                            borderRadius: 12,
                            backgroundColor: theme.current.colors.primary,
                            flex: 1,
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
                        placeholderTextColor={theme.current.colors.textOnBackground}
                        onChangeText={editable ? setValue : undefined}
                        value={value.toString()}
                        multiline={numberOfLines && numberOfLines !== 1 ? true : false}
                        numberOfLines={numberOfLines ?? 1}
                        editable={editable}
                    />
                </View>
                <View
                    style={{
                        alignItems: "flex-end",
                        display: "flex",
                        flexDirection: "row",
                        marginLeft: 10,
                    }}>
                    <ImageButton size={24} icon="add-outline" onPress={onPressAdd} />
                </View>
            </View>

            {error && (
                <Text style={styles.error} size={"small"} color={"error"}>
                    {error}
                </Text>
            )}
        </View>
    );
};

export default AddInput;

const styles = StyleSheet.create({
    container: {
        width: "100%",
        padding: 0,
        margin: 0,
        flexDirection: "column",
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
