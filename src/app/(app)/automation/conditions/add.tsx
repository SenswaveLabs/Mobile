import { useToast } from "@/contexts/ToastProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useLocalSearchParams } from "expo-router";
import AutomationConditionForm from "@/components/automations/conditions/AutomationConditionForm";

const automationConditionUrl: string = "v1/automations/conditions";

export default function AddAutomationCondition() {
    const automationId = useLocalSearchParams().automationId as string;
    console.log("Automation id: ", automationId);

    const toast = useToast();
    const httpClient = useHttpClient();
    const edit = automationId !== undefined;

    const addToExistingAutomation = async (values: any) => {
        console.info(
            "[AutomationConditionAdd] Submitting automation condition for automationId: ",
            automationId,
            " with values: ",
            values,
        );

        const response = await httpClient.put(`${automationConditionUrl}/${automationId}`, values);

        if (response.isSuccess) {
            toast.success("Automation condition added successfully.");
        } else {
            toast.error("Failed to add automation condition.");

            const data = await response.response?.text();
            console.error("[AutomationConditionAdd] Error: " + data);
        }
    };

    const addToNewAutomation = async (values: any) => {
        console.info(
            "[AutomationConditionAdd] Adding condition to new automation with values: ",
            values,
        );
    };

    const onButtonClick = edit ? addToExistingAutomation : addToNewAutomation;

    return (
        <AutomationConditionForm
            automationId={automationId}
            edit={edit}
            onButtonClick={onButtonClick}
        />
    );
}
