import FAB, { FABAction } from "@/components/common/FAB";
import WidgetList from "@/components/device/widgets/WidgetList";
import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";

function List() {
    const router = useRouter();

    const addOperationClicked = async () => {
        console.info("[Widget List Page] Add Operation Clicked.");
        router.push({ pathname: "device/operation/add" });
    };

    const fabActions: FABAction[] = [
        { icon: "construct-outline", label: "Add Operation", onPress: addOperationClicked },
    ];

    return (
        <View style={{ flex: 1 }}>
            <WidgetList />
            <FAB actions={fabActions} />
        </View>
    );
}

export default List;
