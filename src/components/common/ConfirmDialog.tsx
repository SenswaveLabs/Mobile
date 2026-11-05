import React, { FC, useId } from "react";
import { Modal as NativeModal, ScrollView, StyleSheet } from "react-native";
import { PortalHost } from "@rn-primitives/portal";
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
                <PortalHost name={host} />
            </NativeModal>
            <AlertDialogContent portalHost={host} accessibilityViewIsModal className="max-w-md">
                <ScrollView style={styles.body}>
                    <AlertDialogHeader>
                        <Icon icon={iconName} size={24} color={destructive ? "error" : "brand"} />
                        <AlertDialogTitle>{title}</AlertDialogTitle>
                        <AlertDialogDescription>{content}</AlertDialogDescription>
                    </AlertDialogHeader>
                </ScrollView>
                <AlertDialogFooter>
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
    body: { flexShrink: 1 },
});
