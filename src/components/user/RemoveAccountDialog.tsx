import React, { type FC } from "react";
import { Modal as NativeModal, ScrollView, StyleSheet } from "react-native";
import { PortalHost } from "@rn-primitives/portal";
import Button from "@/components/common/Button";
import {
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface RemoveAccountDialogProps {
    visible: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

const dialogHost = "profile-account-dialog";

const RemoveAccountDialog: FC<RemoveAccountDialogProps> = ({ visible, onConfirm, onCancel }) => {
    return (
        <>
            <NativeModal
                visible={visible}
                transparent
                statusBarTranslucent
                navigationBarTranslucent
                accessibilityViewIsModal
                onRequestClose={onCancel}>
                <PortalHost name={dialogHost} />
            </NativeModal>
            <AlertDialogContent
                portalHost={dialogHost}
                accessibilityViewIsModal
                className="max-w-md"
                style={styles.content}>
                <ScrollView style={styles.body}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete account?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action is permanent. All your data will be deleted and cannot be
                            recovered.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                </ScrollView>
                <AlertDialogFooter className="flex-col">
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
                            name="Delete account"
                            type="brand-destructive"
                            loading={false}
                            onPress={onConfirm}
                        />
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </>
    );
};

export default RemoveAccountDialog;

const styles = StyleSheet.create({
    content: { maxHeight: "90%" },
    body: { flexShrink: 1, maxHeight: "75%" },
});
