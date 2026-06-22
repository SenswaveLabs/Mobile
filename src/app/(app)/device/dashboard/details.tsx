import ConfirmDialog from "@/components/common/ConfirmDialog";
import FAB, { FABAction } from "@/components/common/FAB";
import Loading from "@/components/common/Loading";
import DashboardForm, { DashboardFormHandle } from "@/components/device/dashboards/DashboardForm";
import { DashboardDto } from "@/components/device/dashboards/DashboardView";
import { useDevice } from "@/contexts/custom/DeviceProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useToast } from "@/contexts/ToastProvider";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";

function Details() {
    const toast = useToast();
    const router = useRouter();
    const httpClient = useHttpClient();
    const dashboards = useDevice();
    const [loading, setLoading] = useState(false);
    const [dashboard, setDashboard] = useState<DashboardDto | undefined>(undefined);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const formRef = useRef<DashboardFormHandle>(null);
    const editClicked = async (values: any) => {
        const response = await httpClient.patch(
            `v1/devices/dashboards/${dashboards.currentDashboardId}`,
            values,
        );

        if (response.isSuccess) {
            toast.success("Dashboard updated successfully.");
            await dashboards.refresh(true);
        } else {
            toast.error("Failed to update dashboard.");
            const data = await response.response?.text();
            console.error("[Dashboard Edit] Error: " + data);
        }
    };

    const deleteDashboard = async () => {
        const response = await httpClient.delete(
            `v1/devices/dashboards/${dashboards.currentDashboardId}`,
        );

        if (response.isSuccess) {
            toast.success("Dashboard removed successfully.");
            await dashboards.refresh(true);
            router.back();
        } else {
            toast.error("Failed to remove dashboard.");
            const data = await response.response?.text();
            console.error("[Dashboard Delete] Error: " + data);
        }
    };

    const deleteClicked = () => {
        setShowDeleteDialog(true);
    };

    useEffect(() => {
        const getDashboard = async () => {
            setLoading(true);

            const response = await httpClient.get(
                "v1/devices/dashboards/" + dashboards.currentDashboardId,
            );

            if (response.isSuccess) {
                const content = (await response.response?.json()) as DashboardDto;
                setDashboard(content);
            } else {
                toast.error("Failed to load dashboard details.");
                const content = await response.response?.text();
                console.error("[Dashboard Details] Error: " + content);
            }

            setLoading(false);
        };

        getDashboard();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dashboards.currentDashboardId]);

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
        { icon: "trash-outline", label: "Delete Dashboard", onPress: deleteClicked },
    ];

    return (
        <View style={{ flex: 1 }}>
            <ConfirmDialog
                visible={showDeleteDialog}
                title="Delete Dashboard"
                content="The dashboard layout will be permanently deleted. Widgets themselves are not removed. This action cannot be undone."
                confirmLabel="Delete"
                onConfirm={() => {
                    setShowDeleteDialog(false);
                    deleteDashboard();
                }}
                onCancel={() => setShowDeleteDialog(false)}
            />
            <DashboardForm
                ref={formRef}
                deviceId=""
                onSubmit={editClicked}
                edit={true}
                onDirtyChange={setIsFormDirty}
                initName={dashboard?.name}
                initIcon={dashboard?.icon}
                initConfiguration={dashboard?.configuration}
            />

            <FAB actions={fabActions} forceExpanded={isFormDirty} />
        </View>
    );
}

export default Details;
