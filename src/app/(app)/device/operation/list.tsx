import FAB, { FABAction } from "@/components/common/FAB";
import OperationList from "@/components/device/operation/OperationList";
import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";

function List() {
    const router = useRouter();
    const addClicked = async () => {
        console.info("[AddOperation] Add Operation Clicked.");
        router.push({ pathname: "device/operation/add" });
    };

    const fabActions: FABAction[] = [
        { icon: "add-outline", label: "Add Operation", onPress: addClicked },
    ];

    return (
        <View style={{ flex: 1 }}>
            <OperationList />
            <FAB actions={fabActions} />
        </View>
    );
}

export default List;
