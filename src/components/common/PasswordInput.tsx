import { useTheme } from "@/contexts/ThemeProvider";
import React, { FC, useState } from "react";
import { StyleSheet } from "react-native";
import { Button } from "@/components/ui/button";
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
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-auto w-auto rounded-none p-0 active:opacity-70"
                    accessibilityRole="button"
                    accessibilityLabel={secure ? "Show password" : "Hide password"}
                    accessibilityState={{ disabled: !editable }}
                    disabled={!editable}
                    onPress={() => setSecure((value) => !value)}
                    style={styles.eyeButton}>
                    <Ionicons
                        name={secure ? "eye-outline" : "eye-off-outline"}
                        size={variant === "auth" ? 16 : 20}
                        color={variant === "auth" ? colors.authForeground : colors.textOnPrimary}
                    />
                </Button>
            }
        />
    );
};

export default PasswordInput;

const styles = StyleSheet.create({
    eyeButton: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
});
