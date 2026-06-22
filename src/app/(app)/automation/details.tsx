import ConfirmDialog from "@/components/common/ConfirmDialog";
import FAB, { FABAction } from "@/components/common/FAB";
import Loading from "@/components/common/Loading";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useToast } from "@/contexts/ToastProvider";
import { AutomationDto } from "@/types/AutomationsTypes";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import AutomationForm, { AutomationFormHandle } from "@/components/automations/AutomationForm";
import { useAutomationList } from "@/contexts/custom/AutomationListProvider";

const automationUrl: string = "v1/automations/";

function Details() {
    const { automationId } = useLocalSearchParams();
    const [automation, setAutomation] = useState<AutomationDto | undefined>(undefined);
    const [loading, setLoading] = useState<boolean>(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const httpClient = useHttpClient();
    const toast = useToast();
    const automations = useAutomationList();
    const formRef = useRef<AutomationFormHandle>(null);

    useEffect(() => {
        const getAutomation = async () => {
            setLoading(true);
            const response = await httpClient.get(`${automationUrl}${automationId}`);

            if (response.isSuccess) {
                const content = (await response.response?.json()) as AutomationDto;
                console.log("Fetched Automation: ", content);
                setAutomation(content);
            } else {
                toast.error("Failed to load automation details.");
                const content = await response.response?.text();
                console.error("[Device Details] Error: " + content);
            }
            setLoading(false);
        };

        getAutomation();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const deleteAutomation = async () => {
        console.log("[AutomationDetails] Delete Automation trigger");
        const response = await httpClient.delete(`${automationUrl}${automationId}`);

        if (response.isSuccess) {
            toast.success("Automation deleted successfully.");
            await automations.refresh();
        } else {
            toast.error("Failed to delete automation.");

            const data = await response.response?.text();
            console.error(data);
        }
    };

    const deleteClicked = () => {
        setShowDeleteDialog(true);
    };

    const editClicked = async (values: any) => {
        console.log("[Automation Details] Submitting values: ", values);

        if ("isEnabled" in values) {
            const changeStateMsg = { isEnabled: values.isEnabled };
            await httpClient.put(`${automationUrl}${automationId}/state`, changeStateMsg);
            delete values.isEnabled;
        }

        const response = await httpClient.patch(`${automationUrl}${automationId}`, values);

        if (response.isSuccess) {
            toast.success("Automation updated successfully.");
            await automations.refresh();
        } else {
            toast.error("Failed to update automation.");

            const data = await response.response?.text();
            console.error("[Automation Details] Error: " + data);
        }
    };

    if (loading) return <Loading />;

    const fabActions: FABAction[] = [
        ...(isFormDirty
            ? [
                  {
                      icon: "checkmark-outline",
                      label: "Save",
                      onPress: () => formRef.current?.triggerSave(),
                  },
              ]
            : []),
        { icon: "trash-outline", label: "Delete", onPress: deleteClicked },
    ];

    return (
        <View style={{ flex: 1 }}>
            <ConfirmDialog
                visible={showDeleteDialog}
                title="Delete Automation"
                content="This automation and all its conditions and results will be permanently deleted. This action cannot be undone."
                confirmLabel="Delete"
                onConfirm={() => {
                    setShowDeleteDialog(false);
                    deleteAutomation();
                }}
                onCancel={() => setShowDeleteDialog(false)}
            />
            <AutomationForm
                ref={formRef}
                automationId={automation?.id}
                initName={automation?.name}
                initIcon={automation?.icon}
                initIsEnabled={automation?.isEnabled}
                initConditionConnector={automation?.conditionConnector}
                initConditions={automation?.conditions}
                initResults={automation?.results}
                onSubmit={editClicked}
                edit={true}
                onDirtyChange={setIsFormDirty}
                hideInternalButton={true}
            />
            <FAB actions={fabActions} />
        </View>
    );
}

export default Details;
