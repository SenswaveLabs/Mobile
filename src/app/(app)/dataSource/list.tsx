import React from "react";
import { View } from "react-native";
import FAB, { FABAction } from "@/components/common/FAB";
import DataSourceList from "@/components/dataSource/DataSourceList";
import { useRouter } from "expo-router";

function DataSources() {
    const router = useRouter();
    const addClicked = () => {
        console.info("[Data Sources] Add clicked");
        router.navigate("dataSource/add");
    };

    const fabActions: FABAction[] = [
        { icon: "add-outline", label: "Add Data Source", onPress: addClicked },
    ];

    return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <DataSourceList />
            <FAB actions={fabActions} />
        </View>
    );
}

export default DataSources;
