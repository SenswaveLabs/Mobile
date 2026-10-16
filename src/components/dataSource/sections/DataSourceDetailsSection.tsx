import Button from "@/components/common/Button";
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
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { DataSourceDto } from "@/types/DataSourcesTypes";
import { PortalHost } from "@rn-primitives/portal";
import { CircleAlert } from "lucide-react-native";
import React, { FC, useEffect, useId, useRef, useState } from "react";
import { Modal as NativeModal, StyleSheet, View } from "react-native";

interface DataSourceDetailsSectionProps {
    dataSource: DataSourceDto;
    onSaved: (dataSource: DataSourceDto) => void;
    onDeleted: () => void;
}

const DataSourceDetailsSection: FC<DataSourceDetailsSectionProps> = ({
    dataSource,
    onSaved,
    onDeleted,
}) => {
    const httpClient = useHttpClient();
    const dialogHost = useId();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const [deleting, setDeleting] = useState(false);
    const deletePending = useRef(false);
    const active = useRef(true);

    useEffect(() => {
        active.current = true;
        return () => {
            active.current = false;
        };
    }, []);

    const saveSettings = async (values: DataSourceFormValues) => {
        const response = await httpClient.patch(`v1/datasources/brokers/${dataSource.id}`, values);
        if (!response.isSuccess) {
            if (response.response?.status === 404)
                throw new Error(
                    "This data source is no longer available. Return to the list and try again.",
                );
            throw new Error("Couldn't save broker settings. Check your connection and try again.");
        }

        if (!active.current) return;
        onSaved({
            ...dataSource,
            name: values.name,
            url: values.url,
            clientName: values.clientName,
            port: values.port,
            mqttVersion: values.protocolVersion,
            tls: values.useTls,
        });
    };

    const deleteDataSource = async () => {
        if (deletePending.current) return;
        deletePending.current = true;
        setDeleting(true);
        setDeleteError("");
        setShowDeleteDialog(false);

        try {
            const response = await httpClient.delete(`v1/datasources/brokers/${dataSource.id}`);
            if (!response.isSuccess && response.response?.status !== 404)
                throw new Error(
                    "Couldn't delete this data source. Check your connection and try again.",
                );
            if (active.current) onDeleted();
        } catch (error) {
            if (active.current)
                setDeleteError(
                    error instanceof Error
                        ? error.message
                        : "Couldn't delete this data source. Try again.",
                );
        } finally {
            deletePending.current = false;
            if (active.current) setDeleting(false);
        }
    };

    return (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog} asChild>
            <View style={styles.container}>
                <NativeModal
                    visible={showDeleteDialog}
                    transparent
                    statusBarTranslucent
                    navigationBarTranslucent
                    accessibilityViewIsModal
                    onRequestClose={() => setShowDeleteDialog(false)}>
                    <PortalHost name={dialogHost} />
                </NativeModal>
                <AlertDialogContent
                    portalHost={dialogHost}
                    accessibilityViewIsModal
                    className="max-w-md"
                    style={styles.dialogContent}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete data source</AlertDialogTitle>
                        <AlertDialogDescription>
                            This permanently removes the broker and its subscriptions. This action
                            cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:flex-col-reverse">
                        <AlertDialogCancel asChild>
                            <Button
                                name="Cancel"
                                type="brand-outline"
                                loading={false}
                                disabled={deleting}
                                onPress={() => setShowDeleteDialog(false)}
                            />
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <Button
                                name="Delete"
                                type="brand-destructive"
                                loading={deleting}
                                disabled={deleting}
                                onPress={() => void deleteDataSource()}
                            />
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>

                {deleteError !== "" && (
                    <Alert accessibilityRole="alert" variant="destructive" icon={CircleAlert}>
                        <AlertDescription>{deleteError}</AlertDescription>
                    </Alert>
                )}
                <DataSourceForm
                    edit
                    id={dataSource.id}
                    initServer={dataSource.url}
                    initName={dataSource.name}
                    initClientName={dataSource.clientName}
                    initPort={dataSource.port}
                    initMqttVersion={dataSource.mqttVersion}
                    initTls={dataSource.tls}
                    onClick={saveSettings}>
                    <Button
                        name="Delete data source"
                        type="brand-destructive"
                        loading={deleting}
                        disabled={deleting}
                        onPress={() => setShowDeleteDialog(true)}
                    />
                </DataSourceForm>
            </View>
        </AlertDialog>
    );
};

export default DataSourceDetailsSection;

const styles = StyleSheet.create({
    container: { flex: 1 },
    dialogContent: { width: "100%", maxWidth: 560 },
});
