import React, { FC, useId } from "react";
import {
    Modal as NativeModal,
    ScrollView,
    StyleSheet,
    View,
    useWindowDimensions,
} from "react-native";
import { PortalHost } from "@rn-primitives/portal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "./Button";
import Icon from "./Icon";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmDialogProps {
    visible: boolean;
    title: string;
    content: string;
    confirmLabel?: string;
    destructive?: boolean;
    iconName?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmDialog: FC<ConfirmDialogProps> = ({
    visible,
    title,
    content,
    confirmLabel = "Remove",
    destructive = true,
    iconName = "alert-outline",
    onConfirm,
    onCancel,
}) => {
    const host = useId();
    const insets = useSafeAreaInsets();
    const { height } = useWindowDimensions();
    return (
        <AlertDialog
            open={visible}
            onOpenChange={(open) => {
                if (!open) onCancel();
            }}>
            <NativeModal
                visible={visible}
                transparent
                statusBarTranslucent
                navigationBarTranslucent
                accessibilityViewIsModal
                onRequestClose={onCancel}>
                <View
                    style={[
                        styles.viewport,
                        { paddingTop: insets.top, paddingBottom: insets.bottom },
                    ]}>
                    <View style={styles.viewport}>
                        <PortalHost name={host} />
                    </View>
                </View>
            </NativeModal>
            <AlertDialogContent
                portalHost={host}
                accessibilityViewIsModal
                className="max-w-md"
                style={{ maxHeight: Math.max(0, height - insets.top - insets.bottom - 32) }}>
                <ScrollView style={styles.body}>
                    <AlertDialogHeader>
                        <Icon icon={iconName} size={24} color={destructive ? "error" : "brand"} />
                        <AlertDialogTitle>{title}</AlertDialogTitle>
                        <AlertDialogDescription>{content}</AlertDialogDescription>
                    </AlertDialogHeader>
                </ScrollView>
                <AlertDialogFooter style={styles.actions}>
                    <AlertDialogCancel asChild>
                        <Button
                            name="Cancel"
                            type="brand-outline"
                            loading={false}
                            onPress={onCancel}
                        />
                    </AlertDialogCancel>
                    <AlertDialogAction asChild>
                        <Button
                            name={confirmLabel}
                            type={destructive ? "brand-destructive" : "auth"}
                            loading={false}
                            onPress={onConfirm}
                        />
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default ConfirmDialog;

const styles = StyleSheet.create({
    viewport: { flex: 1 },
    body: { flexShrink: 1 },
    actions: { flexDirection: "column" },
});
