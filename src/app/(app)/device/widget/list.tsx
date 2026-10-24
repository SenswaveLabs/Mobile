import FAB, { FABAction } from "@/components/common/FAB";
import WidgetList from "@/components/device/widgets/WidgetList";
import { useDevice } from "@/contexts/custom/DeviceProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";

function List() {
    const router = useRouter();
    const device = useDevice();
    const home = useHomes();
    const canManage = home.current?.isOwner === true || home.current?.canManage === true;

    const addOperationClicked = async () => {
        if (!canManage || !device.deviceId) return;
        console.info("[Widget List Page] Add Operation Clicked.");
        router.push({ pathname: "device/operation/add", params: { deviceId: device.deviceId } });
    };

    const fabActions: FABAction[] = [
        { icon: "construct-outline", label: "Add Operation", onPress: addOperationClicked },
    ];

    return (
        <View style={{ flex: 1 }}>
            <WidgetList />
            {canManage && device.deviceId && <FAB actions={fabActions} />}
        </View>
    );
}

export default List;
