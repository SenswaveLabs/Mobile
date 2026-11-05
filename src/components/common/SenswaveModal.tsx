import { useModal } from "@/contexts/ModalProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import React, { FC, ReactNode } from "react";
import { Modal as NativeModal, Pressable, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "./Icon";
import { Text } from "react-native";

interface SenswaveModalProps {
    children: ReactNode;
    title?: string | ReactNode;
    /** Controlled mode — skip ModalProvider context */
    visible?: boolean;
    onClose?: () => void;
    variant?: "brand";
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 24 },
    header: {
        width: "100%",
        minHeight: 64,
        paddingVertical: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    left: {
        width: 48,
        alignItems: "flex-start",
        justifyContent: "center",
    },
    center: { flex: 1, flexDirection: "row", alignItems: "center" },
    iconButton: { minHeight: 48, minWidth: 48, alignItems: "center", justifyContent: "center" },
    title: { fontSize: 20, lineHeight: 28, fontWeight: "600", flexShrink: 1 },
    pressed: {
        opacity: 0.7,
        transform: [{ scale: 0.98 }],
    },
});

const SenswaveModal: FC<SenswaveModalProps> = ({ children, title, visible, onClose }) => {
    const theme = useTheme();
    const modal = useModal();
    const insets = useSafeAreaInsets();

    const isVisible = visible !== undefined ? visible : modal.opened;
    const handleClose = onClose ?? modal.close;

    return (
        <NativeModal
            visible={isVisible}
            animationType="slide"
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={handleClose}
            accessibilityViewIsModal>
            <GestureHandlerRootView
                style={{ flex: 1, backgroundColor: theme.current.colors.background }}>
                <View
                    style={[
                        styles.container,
                        {
                            backgroundColor: theme.current.colors.background,
                            paddingTop: insets.top,
                            paddingBottom: insets.bottom,
                            paddingLeft: insets.left + 24,
                            paddingRight: insets.right + 24,
                        },
                    ]}>
                    {/* Header — mirrors DefaultHeader layout */}
                    <View style={styles.header}>
                        <View style={styles.left}>
                            <Pressable
                                cssInterop={false}
                                accessibilityRole="button"
                                accessibilityLabel="Close dialog"
                                onPress={handleClose}
                                style={({ pressed }) => [
                                    styles.iconButton,
                                    pressed && styles.pressed,
                                ]}>
                                <Icon icon="close-outline" size={20} color="brand" />
                            </Pressable>
                        </View>

                        <View style={styles.center}>
                            {typeof title === "string" ? (
                                <Text
                                    accessibilityRole="header"
                                    style={[
                                        styles.title,
                                        { color: theme.current.colors.authForeground },
                                    ]}>
                                    {title}
                                </Text>
                            ) : (
                                (title ?? null)
                            )}
                        </View>
                    </View>

                    {/* Content */}
                    {children}
                </View>
            </GestureHandlerRootView>
        </NativeModal>
    );
};

export default SenswaveModal;
