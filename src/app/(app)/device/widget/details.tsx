import ConfirmDialog from "@/components/common/ConfirmDialog";
import FAB, { FABAction } from "@/components/common/FAB";
import Loading from "@/components/common/Loading";
import WidgetForm from "@/components/device/widgets/WidgetForm";
import { useWidgetDetails, WidgetDetailsProvider } from "@/contexts/custom/WidgetDetailsProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useToast } from "@/contexts/ToastProvider";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { View } from "react-native";

function InternalDetails() {
    const toast = useToast();
    const widgetDetails = useWidgetDetails();
    const { widgetId } = useLocalSearchParams<{ widgetId: string }>();

    const editClicked = async () => {
        console.warn("[WidgetDetails] Edit clicked. But is disabled for now.");
        toast.error("Edit is not supported yet.");
    };

    useEffect(() => {
        widgetDetails.initializeForDisplay(widgetId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [widgetId]);

    if (!widgetDetails || widgetDetails.loading) {
        return <Loading />;
    }

    return (
        <View style={{ flex: 1 }}>
            <WidgetForm onSubmit={editClicked} edit={true} />
        </View>
    );
}

function Details() {
    const toast = useToast();
    const router = useRouter();
    const httpClient = useHttpClient();
    const { widgetId } = useLocalSearchParams<{ widgetId: string }>();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const deleteWidget = async () => {
        const response = await httpClient.delete(`v1/devices/widgets/${widgetId}`);

        if (response.isSuccess) {
            toast.success("Widget removed successfully.");
            router.back();
        } else {
            toast.error("Failed to remove widget.");
            console.error("Failed to remove widget.");
        }
    };

    const deleteClicked = () => {
        setShowDeleteDialog(true);
    };

    const fabActions: FABAction[] = [
        { icon: "trash-outline", label: "Delete Widget", onPress: deleteClicked },
    ];

    return (
        <WidgetDetailsProvider>
            <View style={{ flex: 1 }}>
                <ConfirmDialog
                    visible={showDeleteDialog}
                    title="Delete Widget"
                    content="The widget definition will be permanently deleted and it may break widget placements on dashboards. This action cannot be undone."
                    confirmLabel="Delete"
                    onConfirm={() => {
                        setShowDeleteDialog(false);
                        deleteWidget();
                    }}
                    onCancel={() => setShowDeleteDialog(false)}
                />
                <InternalDetails />
                <FAB actions={fabActions} />
            </View>
        </WidgetDetailsProvider>
    );
}

export default Details;
