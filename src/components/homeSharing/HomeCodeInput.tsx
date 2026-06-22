import React, { FC, useRef } from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { useTheme } from "@/contexts/ThemeProvider";
import Text from "@/components/common/Text";
import { shadowStyles } from "@/styles/shadowStyles";

interface HomeCodeInputProps {
    value: string;
    onChange: (value: string) => void;
    error?: boolean;
}

const CODE_LENGTH = 8;

const HomeCodeInput: FC<HomeCodeInputProps> = ({ value, onChange, error = false }) => {
    const theme = useTheme();
    const inputRefs = useRef<(TextInput | null)[]>([]);

    const chars = value.split("").concat(Array(CODE_LENGTH).fill("")).slice(0, CODE_LENGTH);

    const handleChange = (text: string, index: number) => {
        if (text === "") {
            const newChars = chars.map((c, i) => (i === index ? "" : c));
            onChange(newChars.join(""));
            if (index > 0) {
                inputRefs.current[index - 1]?.focus();
            }
            return;
        }

        const char = text.slice(-1).toUpperCase();
        const newChars = chars.map((c, i) => (i === index ? char : c));
        onChange(newChars.join(""));

        if (index < CODE_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (key: string, index: number) => {
        if (key === "Backspace" && !chars[index] && index > 0) {
            const newChars = chars.map((c, i) => (i === index - 1 ? "" : c));
            onChange(newChars.join(""));
            inputRefs.current[index - 1]?.focus();
        }
    };

    return (
        <View style={styles.wrapper}>
            <View style={styles.row}>
                {Array.from({ length: CODE_LENGTH }).map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.box,
                            {
                                backgroundColor: theme.current.colors.primary,
                                borderWidth: 1,
                                borderColor: chars[index]
                                    ? theme.current.colors.complementary
                                    : error
                                      ? theme.current.colors.error
                                      : "transparent",
                            },
                            shadowStyles.default,
                        ]}>
                        <TextInput
                            ref={(ref) => {
                                inputRefs.current[index] = ref;
                            }}
                            value={chars[index]}
                            onChangeText={(text) => handleChange(text, index)}
                            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                            maxLength={2}
                            autoCapitalize="characters"
                            autoCorrect={false}
                            style={[
                                styles.textInput,
                                { color: theme.current.colors.textOnPrimary },
                            ]}
                        />
                    </View>
                ))}
            </View>

            <Text size="small" color="onBackground" style={styles.hint}>
                To join an existing home, enter the 8-character invite code provided by the home
                owner. Remember that invitation expires within 15 minutes.
            </Text>
        </View>
    );
};

export default HomeCodeInput;

const styles = StyleSheet.create({
    wrapper: {
        alignItems: "center",
        width: "100%",
    },
    title: {
        marginBottom: 24,
    },
    row: {
        flexDirection: "row",
        gap: 8,
    },
    box: {
        width: 38,
        height: 50,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
    },
    textInput: {
        width: "100%",
        height: "100%",
        textAlign: "center",
        fontSize: 20,
        fontWeight: "bold",
        padding: 0,
    },
    hint: {
        marginTop: 14,
        textAlign: "center",
        opacity: 0.7,
    },
});
