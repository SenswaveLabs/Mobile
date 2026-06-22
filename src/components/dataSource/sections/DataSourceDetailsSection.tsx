import ConfirmDialog from "@/components/common/ConfirmDialog";
import FAB, { FABAction } from "@/components/common/FAB";
import Loading from "@/components/common/Loading";
import { DataSourceForm, DataSourceFormHandle } from "@/components/dataSource/DataSourceForm";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useToast } from "@/contexts/ToastProvider";
import { DataSourceDto } from "@/types/DataSourcesTypes";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";

function DataSourceDetailsSection() {
    const { id } = useLocalSearchParams();
    const httpClient = useHttpClient();
    const toast = useToast();
    const router = useRouter();

    const formRef = useRef<DataSourceFormHandle>(null);
    const [loading, setLoading] = useState(false);
    const [dataSource, setDataSource] = useState<DataSourceDto | undefined>(undefined);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const editClicked = async (values: any) => {
        setLoading(true);

        const response = await httpClient.patch("v1/datasources/brokers/" + id, values);

        if (response.isSuccess) {
            toast.success("Data source updated successfully.");
        } else {
            const content = await response.response?.text();
            console.error(content);
            toast.error("Failed to update data source.");
        }

        setLoading(false);
    };

    const deleteDataSource = async () => {
        setLoading(true);

        try {
            const response = await httpClient.delete("v1/datasources/brokers/" + id);

            if (response.isSuccess) {
                toast.success("Data source removed successfully.");
                router.back();
            } else {
                toast.httpError(response);
            }
        } finally {
            setLoading(false);
        }
    };

    const deleteClicked = () => {
        setShowDeleteDialog(true);
    };

    useEffect(() => {
        const load = async () => {
            setLoading(true);

            const response = await httpClient.get("v1/datasources/brokers/" + id);

            if (response.isSuccess) {
                const content = (await response.response?.json()) as DataSourceDto;
                setDataSource(content);
            } else {
                toast.httpError(response);
            }

            setLoading(false);
        };

        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) return <Loading />;

    const fabActions: FABAction[] = [
        ...(isFormDirty
            ? [
                  {
                      icon: "checkmark-outline",
                      label: "Save",
                      onPress: () => formRef.current?.triggerSave(),
                  },
                  {
                      icon: "refresh-outline",
                      label: "Restore",
                      onPress: () => formRef.current?.triggerReset(),
                  },
              ]
            : []),
        { icon: "trash-outline", label: "Delete Data Source", onPress: deleteClicked },
    ];

    return (
        <View style={{ flex: 1 }}>
            <ConfirmDialog
                visible={showDeleteDialog}
                title="Remove Data Source"
                content="Are you sure you want to remove this data source?"
                onConfirm={() => {
                    setShowDeleteDialog(false);
                    deleteDataSource();
                }}
                onCancel={() => setShowDeleteDialog(false)}
            />
            <DataSourceForm
                ref={formRef}
                edit={true}
                onClick={editClicked}
                onDirtyChange={setIsFormDirty}
                id={dataSource?.id}
                initServer={dataSource?.url}
                initName={dataSource?.name}
                initClientName={dataSource?.clientName}
                initPort={dataSource?.port}
                initMqttVersion={dataSource?.mqttVersion}
                initTls={dataSource?.tls}
            />

            <FAB actions={fabActions} forceExpanded={isFormDirty} />
        </View>
    );
}

export default DataSourceDetailsSection;
