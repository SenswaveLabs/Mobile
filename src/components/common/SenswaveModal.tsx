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
    variant?: "default" | "brand";
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
    brandContainer: { paddingHorizontal: 24 },
    brandHeader: { height: "auto", minHeight: 64, paddingTop: 8, paddingBottom: 8 },
    brandCenter: { justifyContent: "flex-start", overflow: "visible" },
    brandClose: { minHeight: 48, minWidth: 48, alignItems: "center", justifyContent: "center" },
});

const SenswaveModal: FC<SenswaveModalProps> = ({
    children,
    title,
    visible,
    onClose,
    variant = "default",
}) => {
    const theme = useTheme();
    const modal = useModal();
    const insets = useSafeAreaInsets();
    const brand = variant === "brand";

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
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}>
                    <View
                        style={[
                            styles.container,
                            brand && styles.brandContainer,
                            {
                                backgroundColor: theme.current.colors.background,
                                paddingTop: insets.top,
                                paddingBottom: insets.bottom,
                            },
                        ]}>
                        {/* Header — mirrors DefaultHeader layout */}
                        <View style={[styles.header, brand && styles.brandHeader]}>
                            <View style={styles.left}>
                                <Pressable
                                    cssInterop={false}
                                    accessibilityRole="button"
                                    accessibilityLabel="Close dialog"
                                    onPress={handleClose}
                                    style={({ pressed }) => [
                                        styles.iconButton,
                                        brand && styles.brandClose,
                                        pressed && styles.pressed,
                                    ]}>
                                    <Icon
                                        icon="close-outline"
                                        size={brand ? 20 : 28}
                                        color={brand ? "brand" : "onBackground"}
                                    />
                                </Pressable>
                            </View>

                            <View style={[styles.center, brand && styles.brandCenter]}>
                                {typeof title === "string" ? (
                                    <Text
                                        size="medium"
                                        bold
                                        color="onBackground"
                                        style={
                                            brand && { color: theme.current.colors.authForeground }
                                        }
                                        numberOfLines={brand ? undefined : 1}>
                                        {title}
                                    </Text>
                                ) : (
                                    (title ?? null)
                                )}
                            </View>

                            {!brand && <View style={styles.right} />}
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
