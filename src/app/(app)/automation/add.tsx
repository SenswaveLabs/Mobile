import Loading from "@/components/common/Loading";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useToast } from "@/contexts/ToastProvider";
import { useState } from "react";
import AutomationForm from "@/components/automations/AutomationForm";
import { useAutomationList } from "@/contexts/custom/AutomationListProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";

const automationUrl: string = "v1/automations/";

function Add() {
    const httpClient = useHttpClient();
    const toast = useToast();
    const automations = useAutomationList();
    const [loading, setLoading] = useState<boolean>(false);
    const homes = useHomes();

    const addClicked = async (values: any) => {
        setLoading(true);

        values.homeId = homes.current?.id; // TODO: Should be handled somehow when current home is undefined ?

        console.info("[Automation Add] Submitting values: ", values);

        const response = await httpClient.post(`${automationUrl}`, values);

        if (response.isSuccess) {
            toast.success("Automation created successfully.");
            await automations.refresh();
        } else {
            toast.error("Failed to add automation.");

            const data = await response.response?.text();
            console.error("[Automation Add] Error: " + data);
        }
        setLoading(false);
    };

    if (loading) return <Loading />;

    return <AutomationForm onSubmit={addClicked} edit={false} />;
}

export default Add;
