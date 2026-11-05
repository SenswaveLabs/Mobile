import Button from "@/components/common/Button";
import ContentSection from "@/components/common/ContentSection";
import { DataSourceForm, DataSourceFormValues } from "@/components/dataSource/DataSourceForm";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { DataSourceDto } from "@/types/DataSourcesTypes";
import { PortalHost } from "@rn-primitives/portal";
import { CircleAlert } from "lucide-react-native";
import { useFocusEffect } from "expo-router";
import React, { FC, useCallback, useId, useRef, useState } from "react";
import { Modal as NativeModal, ScrollView, StyleSheet, View } from "react-native";

interface DataSourceDetailsSectionProps {
    dataSource: DataSourceDto;
    header?: React.ReactNode;
    onSaved: (dataSource: DataSourceDto) => void;
    onDeleted: () => void | Promise<void>;
}

const DataSourceDetailsSection: FC<DataSourceDetailsSectionProps> = ({
    dataSource,
    header,
    onSaved,
    onDeleted,
}) => {
    const httpClient = useHttpClient();
    const dialogHost = useId();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const [busy, setBusy] = useState<"save" | "delete" | null>(null);
    const mutation = useRef(false);
    const accepted = useRef(false);
    const active = useRef(false);
    const currentId = useRef(dataSource.id);
    currentId.current = dataSource.id;
    const dialogOpen = useRef(false);
    const deleting = busy === "delete";
    const isCurrent = () => active.current && currentId.current === dataSource.id;

    useFocusEffect(
        useCallback(() => {
            active.current = true;
            return () => {
                active.current = false;
                dialogOpen.current = false;
                setShowDeleteDialog(false);
            };
        }, []),
    );

    const changeDialog = (open: boolean) => {
        if (open && (!isCurrent() || mutation.current || accepted.current)) return;
        dialogOpen.current = open;
        setShowDeleteDialog(open);
    };

    const saveSettings = async (values: DataSourceFormValues) => {
        if (!isCurrent() || mutation.current || accepted.current)
            throw new Error("Broker settings cannot be saved while another action is in progress.");
        mutation.current = true;
        setBusy("save");
        changeDialog(false);
        try {
            const response = await httpClient.patch(
                `v1/datasources/brokers/${dataSource.id}`,
                values,
            );
            if (!response.isSuccess) {
                if (response.response?.status === 404)
                    throw new Error(
                        "This data source is no longer available. Return to the list and try again.",
                    );
                throw new Error(
                    "Couldn't save broker settings. Check your connection and try again.",
                );
            }

            if (currentId.current !== dataSource.id) return;
            onSaved({
                ...dataSource,
                name: values.name,
                url: values.url,
                clientName: values.clientName,
                port: values.port,
                protocolVersion: values.protocolVersion,
                useTls: values.useTls,
            });
        } finally {
            mutation.current = false;
            if (currentId.current === dataSource.id) setBusy(null);
        }
    };

    const deleteDataSource = async () => {
        if (!isCurrent() || mutation.current || accepted.current || !dialogOpen.current) return;
        mutation.current = true;
        setBusy("delete");
        setDeleteError("");
        changeDialog(false);

        try {
            const response = await httpClient.delete(`v1/datasources/brokers/${dataSource.id}`);
            if (!response.isSuccess && response.response?.status !== 404)
                throw new Error(
                    "Couldn't delete this data source. Check your connection and try again.",
                );
            accepted.current = true;
            if (currentId.current === dataSource.id) await onDeleted();
        } catch (error) {
            if (isCurrent())
                setDeleteError(
                    error instanceof Error
                        ? error.message
                        : "Couldn't delete this data source. Try again.",
                );
        } finally {
            mutation.current = false;
            if (currentId.current === dataSource.id) setBusy(null);
        }
    };

    return (
        <AlertDialog open={showDeleteDialog} onOpenChange={changeDialog} asChild>
            <View style={styles.container}>
                <NativeModal
                    visible={showDeleteDialog}
                    transparent
                    statusBarTranslucent
                    navigationBarTranslucent
                    accessibilityViewIsModal
                    onRequestClose={() => changeDialog(false)}>
                    <PortalHost name={dialogHost} />
                </NativeModal>
                <AlertDialogContent
                    portalHost={dialogHost}
                    accessibilityViewIsModal
                    className="max-w-md"
                    style={styles.dialogContent}>
                    <ScrollView style={styles.dialogBody}>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete data source</AlertDialogTitle>
                            <AlertDialogDescription>
                                This permanently removes the broker and its subscriptions. This
                                action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                    </ScrollView>
                    <AlertDialogFooter className="sm:flex-col-reverse">
                        <AlertDialogCancel asChild>
                            <Button
                                name="Cancel"
                                type="brand-outline"
                                loading={false}
                                disabled={deleting}
                                onPress={() => changeDialog(false)}
                            />
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <Button
                                name="Delete"
                                type="brand-destructive"
                                loading={deleting}
                                disabled={deleting}
                                onPress={deleteDataSource}
                            />
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>

                <DataSourceForm
                    edit
                    disabled={busy !== null || accepted.current}
                    header={header}
                    initServer={dataSource.url}
                    initName={dataSource.name}
                    initClientName={dataSource.clientName}
                    initPort={dataSource.port}
                    initMqttVersion={dataSource.protocolVersion}
                    initTls={dataSource.useTls}
                    onClick={saveSettings}>
                    <ContentSection
                        title="Delete data source"
                        helper="Permanently remove this broker and its subscriptions."
                        separated
                        actions={
                            <View style={styles.deleteActionSlot}>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        name="Delete data source"
                                        type="brand-destructive"
                                        loading={deleting}
                                        disabled={busy !== null || accepted.current}
                                        onPress={() => changeDialog(true)}
                                    />
                                </AlertDialogTrigger>
                            </View>
                        }>
                        {!!deleteError && (
                            <Alert
                                accessibilityRole="alert"
                                variant="destructive"
                                icon={CircleAlert}>
                                <AlertDescription>{deleteError}</AlertDescription>
                            </Alert>
                        )}
                    </ContentSection>
                </DataSourceForm>
            </View>
        </AlertDialog>
    );
};

export default DataSourceDetailsSection;

const styles = StyleSheet.create({
    container: { flex: 1 },
    dialogContent: { width: "100%", maxWidth: 560, maxHeight: "90%" },
    dialogBody: { flexShrink: 1 },
    deleteActionSlot: { minHeight: 72, justifyContent: "center" },
});
