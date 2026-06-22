import Button from "@/components/common/Button";
import { DataSourceForm, DataSourceFormHandle } from "@/components/dataSource/DataSourceForm";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useToast } from "@/contexts/ToastProvider";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { View } from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";

function AddPage() {
    const httpClient = useHttpClient();
    const toast = useToast();
    const router = useRouter();
    const formRef = useRef<DataSourceFormHandle>(null);
    const [loading, setLoading] = useState(false);
    const [isFormValid, setIsFormValid] = useState(false);

    const addClicked = async (values: any) => {
        setLoading(true);

        const response = await httpClient.post("v1/datasources/brokers", values);

        if (response.isSuccess) {
            toast.success("Data source added successfully.");
            router.back();
        } else {
            toast.error("Failed to add data source.");
            const data = await response.response?.text();
            console.error(data);
        }

        setLoading(false);
    };

    return (
        <View style={{ flex: 1 }}>
            <DataSourceForm
                ref={formRef}
                edit={false}
                onClick={addClicked}
                onValidChange={setIsFormValid}
            />

            <KeyboardStickyView style={{ paddingHorizontal: 15, paddingVertical: 12 }}>
                <Button
                    name="Create Data Source"
                    loading={loading}
                    onPress={() => formRef.current?.triggerSave()}
                    style={!isFormValid ? { opacity: 0.4 } : undefined}
                />
            </KeyboardStickyView>
        </View>
    );
}

export default AddPage;
