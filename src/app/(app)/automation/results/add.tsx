import { useToast } from "@/contexts/ToastProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useLocalSearchParams } from "expo-router";
import AutomationResultForm from "@/components/automations/results/AutomationResultForm";

const automationResultUrl: string = "v1/automations/results";

export default function AddAutomationResult() {
    const automationId = useLocalSearchParams().automationId as string;
    console.log("Automation id: ", automationId);

    const toast = useToast();
    const httpClient = useHttpClient();
    const edit = automationId !== undefined;

    const addToExistingAutomation = async (values: any) => {
        console.info(
            "[AutomationResultAdd] Submitting automation result for automationId: ",
            automationId,
            " with values: ",
            values,
        );

        const response = await httpClient.put(`${automationResultUrl}/${automationId}`, values);

        if (response.isSuccess) {
            toast.success("Automation result added successfully.");
        } else {
            toast.error("Failed to add automation result.");

            const data = await response.response?.text();
            console.error("[AutomationResultAdd] Error: " + data);
        }
    };

    const addToNewAutomation = async (values: any) => {
        console.info("[AutomationResultAdd] Adding result to new automation with values: ", values);
    };

    const onButtonClick = edit ? addToExistingAutomation : addToNewAutomation;

    return (
        <AutomationResultForm
            automationId={automationId}
            edit={edit}
            onButtonClick={onButtonClick}
        />
    );
}
