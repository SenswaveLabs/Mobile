import React, { FC } from "react";
import { useRouter } from "expo-router";
import Icon from "@/components/common/Icon";
import SectionHeaderAction from "@/components/common/SectionHeaderAction";
import { useHomes } from "@/contexts/domain/HomeProvider";

const AddRoomTile: FC = () => {
    const router = useRouter();
    const home = useHomes().current;
    if (!home?.isOwner && !home?.canManage) return null;
    return (
        <SectionHeaderAction
            label="Add room"
            icon={<Icon icon="add-outline" size={18} color="brand" />}
            onPress={() => router.push("home/room/add")}
            accessibilityLabel="Add room"
        />
    );
};
export default AddRoomTile;
