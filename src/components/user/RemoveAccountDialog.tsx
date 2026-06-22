import React, { FC } from "react";
import Dialog from "@/components/common/Dialog";
import Icon from "@/components/common/Icon";

interface RemoveAccountDialogProps {
    visible: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

const RemoveAccountDialog: FC<RemoveAccountDialogProps> = ({ visible, onConfirm, onCancel }) => {
    return (
        <Dialog
            visible={visible}
            onDismiss={onCancel}
            title="Remove Account"
            content="This action is permanent. All your data will be deleted and cannot be recovered."
            icon={<Icon icon="alert-outline" size={24} color="error" />}
            actions={[
                {
                    label: "Cancel",
                    onPress: onCancel,
                    variant: "text",
                },
                {
                    label: "Remove",
                    onPress: onConfirm,
                    variant: "filled",
                    destructive: true,
                },
            ]}
        />
    );
};

export default RemoveAccountDialog;
