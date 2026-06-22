import ConfirmDialog from "@/components/common/ConfirmDialog";
import FAB, { FABAction } from "@/components/common/FAB";
import Loading from "@/components/common/Loading";
import OperationForm from "@/components/device/operation/OperationForm";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useToast } from "@/contexts/ToastProvider";
import { OperationDto } from "@/types/DeviceTypes";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { View } from "react-native";

function Details() {
    const toast = useToast();
    const router = useRouter();
    const httpClient = useHttpClient();
    const { operationId } = useLocalSearchParams();
    const [loading, setLoading] = useState(false);
    const [operation, setOperation] = useState<OperationDto | undefined>(undefined);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const deleteOperation = async () => {
        const response = await httpClient.delete(`v1/devices/operations/${operationId}`);

        if (response.isSuccess) {
            toast.success("Operation removed successfully.");
            router.back();
        } else {
            toast.httpError(response);
        }
    };

    const deleteClicked = () => {
        setShowDeleteDialog(true);
    };

    useEffect(() => {
        const getOperation = async () => {
            setLoading(true);

            const response = await httpClient.get("v1/devices/operations/" + operationId);

            if (response.isSuccess) {
                const content = (await response.response?.json()) as OperationDto;
                setOperation(content);
            } else {
                toast.error("Failed to load operation details.");
                const content = await response.response?.text();
                console.error("[Operation Details] Error: " + content);
            }

            setLoading(false);
        };

        getOperation();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [operationId]);

    if (loading) return <Loading />;

    const fabActions: FABAction[] = [
        { icon: "trash-outline", label: "Delete", onPress: deleteClicked },
    ];

    return (
        <View style={{ flex: 1 }}>
            <ConfirmDialog
                visible={showDeleteDialog}
                title="Delete Operation"
                content="The operation and all widgets linked to it will be permanently deleted. This may break widget placements on dashboards. Automations using it will stop working. This action cannot be undone."
                confirmLabel="Delete"
                onConfirm={() => {
                    setShowDeleteDialog(false);
                    deleteOperation();
                }}
                onCancel={() => setShowDeleteDialog(false)}
            />
            <OperationForm
                edit={true}
                onSubmit={async () => {
                    console.warn("Operation can not be edited.");
                }}
                initName={operation?.name}
                initTopic={operation?.topic}
                initType={operation?.type}
                initConfiguration={operation?.configuration}
            />

            <FAB actions={fabActions} />
        </View>
    );
}

export default Details;
