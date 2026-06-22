import React, { FC } from "react";
import Dialog from "@/components/common/Dialog";
import Icon from "@/components/common/Icon";
import { IconColor } from "@/components/common/Icon";

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
    const iconColor: IconColor = destructive ? "error" : "info";

    return (
        <Dialog
            visible={visible}
            onDismiss={onCancel}
            title={title}
            content={content}
            icon={<Icon icon={iconName} size={24} color={iconColor} />}
            actions={[
                { label: "Cancel", onPress: onCancel, variant: "text" },
                { label: confirmLabel, onPress: onConfirm, variant: "filled", destructive },
            ]}
        />
    );
};

export default ConfirmDialog;
