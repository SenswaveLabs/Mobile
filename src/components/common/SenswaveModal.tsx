import { useModal } from "@/contexts/ModalProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import React, { FC, ReactNode } from "react";
import {
    KeyboardAvoidingView,
    Modal as NativeModal,
    Platform,
    Pressable,
    StyleSheet,
    View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "./Icon";
import Text from "./Text";

interface SenswaveModalProps {
    children: ReactNode;
    title?: string | ReactNode;
    /** Controlled mode — skip ModalProvider context */
    visible?: boolean;
    onClose?: () => void;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 15,
    },
    header: {
        width: "100%",
        height: 80,
        paddingTop: 10,
        flexDirection: "row",
        alignItems: "center",
    },
    left: {
        width: 48,
        alignItems: "flex-start",
        justifyContent: "center",
    },
    center: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    right: {
        width: 48,
    },
    iconButton: {
        padding: 4,
    },
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
        <NativeModal visible={isVisible} animationType="slide" onRequestClose={handleClose}>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}>
                    <View
                        style={[
                            styles.container,
                            {
                                backgroundColor: theme.current.colors.background,
                                paddingTop: insets.top,
                                paddingBottom: insets.bottom,
                            },
                        ]}>
                        {/* Header — mirrors DefaultHeader layout */}
                        <View style={styles.header}>
                            <View style={styles.left}>
                                <Pressable
                                    onPress={handleClose}
                                    style={({ pressed }) => [
                                        styles.iconButton,
                                        pressed && styles.pressed,
                                    ]}>
                                    <Icon icon="close-outline" size={28} color="onBackground" />
                                </Pressable>
                            </View>

                            <View style={styles.center}>
                                {typeof title === "string" ? (
                                    <Text size="medium" bold color="onBackground" numberOfLines={1}>
                                        {title}
                                    </Text>
                                ) : (
                                    (title ?? null)
                                )}
                            </View>

                            <View style={styles.right} />
                        </View>

                        {/* Content */}
                        {children}
                    </View>
                </KeyboardAvoidingView>
            </GestureHandlerRootView>
        </NativeModal>
    );
};

export default SenswaveModal;
