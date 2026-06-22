import { useTheme } from "@/contexts/ThemeProvider";
import React, { FC, ReactNode } from "react";
import { Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import Text from "@/components/common/Text";

export interface DialogAction {
    label: string;
    onPress: () => void;
    variant?: "text" | "filled";
    destructive?: boolean;
}

interface DialogProps {
    visible: boolean;
    onDismiss: () => void;
    title: string;
    content?: string;
    children?: ReactNode;
    actions: DialogAction[];
    icon?: ReactNode;
}

const DialogActionButton: FC<{ action: DialogAction }> = ({ action }) => {
    const theme = useTheme();
    const { label, onPress, variant = "text", destructive = false } = action;

    const color = destructive ? theme.current.colors.error : theme.current.colors.info;

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.actionButton,
                variant === "filled" && {
                    backgroundColor: color,
                    paddingHorizontal: 24,
                },
                pressed && styles.actionPressed,
            ]}
            accessibilityRole="button">
            <Text
                size="medium"
                bold
                style={{
                    color: variant === "filled" ? "#FFFFFF" : color,
                    letterSpacing: 0.1,
                }}>
                {label}
            </Text>
        </Pressable>
    );
};

const Dialog: FC<DialogProps> = ({
    visible,
    onDismiss,
    title,
    content,
    children,
    actions,
    icon,
}) => {
    const theme = useTheme();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onDismiss}
            accessibilityViewIsModal>
            <Pressable style={styles.scrim} onPress={onDismiss}>
                <Pressable
                    style={[
                        styles.container,
                        { backgroundColor: theme.current.colors.background },
                        dialogElevation,
                    ]}
                    onPress={() => {}}>
                    {icon && <View style={styles.iconContainer}>{icon}</View>}

                    <Text
                        size="xlarge"
                        color="onBackground"
                        style={[styles.title, icon ? styles.titleCentered : undefined]}
                        numberOfLines={2}>
                        {title}
                    </Text>

                    {content && (
                        <Text
                            size="medium"
                            color="onBackground"
                            style={styles.supportingText}
                            numberOfLines={10}>
                            {content}
                        </Text>
                    )}

                    {children && <View style={styles.customContent}>{children}</View>}

                    <View style={styles.actionsRow}>
                        {actions.map((action, i) => (
                            <DialogActionButton key={i} action={action} />
                        ))}
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

export default Dialog;

const dialogElevation = Platform.select({
    ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
    },
    android: {
        elevation: 6,
    },
    default: {},
});

const styles = StyleSheet.create({
    scrim: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    container: {
        width: "85%",
        maxWidth: 560,
        minWidth: 280,
        borderRadius: 28,
        paddingTop: 24,
        paddingHorizontal: 24,
        paddingBottom: 8,
    },
    iconContainer: {
        alignItems: "center",
        marginBottom: 16,
    },
    title: {
        marginBottom: 16,
    },
    titleCentered: {
        textAlign: "center",
    },
    supportingText: {
        opacity: 0.7,
        lineHeight: 22,
        marginBottom: 8,
    },
    customContent: {
        marginBottom: 8,
    },
    actionsRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        gap: 8,
        paddingTop: 16,
        paddingBottom: 16,
    },
    actionButton: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 100,
        alignItems: "center",
        justifyContent: "center",
    },
    actionPressed: {
        opacity: 0.7,
    },
});
