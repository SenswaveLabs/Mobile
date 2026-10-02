import React, { FC, ReactNode, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useTheme } from "@/contexts/ThemeProvider";
import { keyboardOffset } from "@/styles/defaultStyles";
import { useKeyboardVisible } from "@/hooks/useKeyboardVisible";

interface FormScreenProps {
    children: ReactNode;
    actions: ReactNode;
    header?: ReactNode;
}

const FormScreen: FC<FormScreenProps> = ({ children, actions, header }) => {
    const { colors } = useTheme().current;
    const keyboardVisible = useKeyboardVisible();
    const [keyboardVerticalOffset, setKeyboardVerticalOffset] = useState(0);
    const [actionHeight, setActionHeight] = useState(0);
    const container = useRef<View>(null);

    return (
        <KeyboardAvoidingView
            ref={container}
            behavior="padding"
            keyboardVerticalOffset={keyboardVerticalOffset}
            onLayout={() =>
                container.current?.measureInWindow((_x, y) => setKeyboardVerticalOffset(y))
            }
            style={[styles.screen, { backgroundColor: colors.background }]}>
            {header && <View style={styles.header}>{header}</View>}
            <KeyboardAwareScrollView
                bottomOffset={keyboardOffset + (keyboardVisible ? 0 : actionHeight)}
                keyboardShouldPersistTaps="handled"
                style={styles.scroll}
                contentContainerStyle={styles.content}>
                {children}
            </KeyboardAwareScrollView>
            {!keyboardVisible && (
                <View
                    onLayout={({ nativeEvent }) => setActionHeight(nativeEvent.layout.height)}
                    style={styles.actions}>
                    {actions}
                </View>
            )}
        </KeyboardAvoidingView>
    );
};

export default FormScreen;

const styles = StyleSheet.create({
    screen: { flex: 1 },
    header: {
        width: "100%",
        maxWidth: 448,
        alignSelf: "center",
        paddingHorizontal: 24,
        paddingVertical: 8,
    },
    scroll: { flex: 1 },
    content: {
        flexGrow: 1,
        width: "100%",
        maxWidth: 448,
        alignSelf: "center",
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 16,
    },
    actions: {
        flexShrink: 0,
        width: "100%",
        maxWidth: 448,
        alignSelf: "center",
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 32,
    },
});
