import { useTheme } from "@/contexts/ThemeProvider";
import React, { FC, useState } from "react";
import { StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Input, { InputProps } from "./Input";

interface PasswordInputProps extends Omit<InputProps, "password" | "endAdornment"> {
    autoCapitalize?: "none";
    autoCorrect?: false;
}

const PasswordInput: FC<PasswordInputProps> = ({
    editable = true,
    variant = "default",
    ...props
}) => {
    const { colors } = useTheme().current;
    const [secure, setSecure] = useState(true);

    return (
        <Input
            {...props}
            variant={variant}
            editable={editable}
            password={secure}
            autoCapitalize="none"
            autoCorrect={false}
            endAdornment={
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={secure ? "Show password" : "Hide password"}
                    accessibilityState={{ disabled: !editable }}
                    disabled={!editable}
                    onPress={() => setSecure((value) => !value)}
                    style={({ pressed }) => [styles.eyeButton, pressed && styles.pressed]}>
                    <Ionicons
                        name={secure ? "eye-outline" : "eye-off-outline"}
                        size={variant === "auth" ? 16 : 20}
                        color={variant === "auth" ? colors.authForeground : colors.textOnPrimary}
                    />
                </Pressable>
            }
        />
    );
};

export default PasswordInput;

const styles = StyleSheet.create({
    eyeButton: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
    pressed: { opacity: 0.7 },
});
