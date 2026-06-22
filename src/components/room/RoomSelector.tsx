import { View, StyleSheet } from "react-native";
import React, { useCallback, useEffect, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import ImageButton from "@/components/common/ImageButton";
import Dropdown, { Option } from "@/components/common/Dropdown";
import { useHomes } from "@/contexts/domain/HomeProvider";

interface RoomSelectorProps {
    initialRoomId?: string;
    onSelected: (value: string) => void;
}

const NoneOption: Option = {
    name: "None",
    value: "None",
};

function RoomSelector({ initialRoomId, onSelected: handleSelected }: RoomSelectorProps) {
    const router = useRouter();
    const homes = useHomes();
    const [options, setOptions] = useState<Option[]>([NoneOption]);

    const buildOptions = () => {
        const rooms = homes.current?.rooms ?? [];
        const roomOptions = rooms.map((room) => ({ value: room.id, name: room.name }));
        setOptions([...roomOptions, NoneOption]);
    };

    useFocusEffect(
        useCallback(() => {
            homes.refreshRooms();
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []),
    );

    useEffect(() => {
        buildOptions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [homes.current?.rooms]);

    const addClicked = () => {
        router.push({ pathname: "home/room/add" });
    };

    return (
        <View style={styles.container}>
            <View style={styles.dropdown}>
                <Dropdown
                    selectedValue={
                        initialRoomId && initialRoomId !== "" ? initialRoomId : NoneOption.value
                    }
                    title="Room"
                    options={options}
                    onSelected={handleSelected}
                />
            </View>
            <View style={styles.add}>
                <ImageButton icon="add-outline" onPress={addClicked} size={24} />
            </View>
        </View>
    );
}

export default RoomSelector;

const styles = StyleSheet.create({
    container: {
        alignItems: "flex-end",
        width: "100%",
        flexDirection: "row",
    },
    dropdown: {
        flex: 1,
        paddingRight: 10,
    },
    add: {
        alignItems: "flex-end",
    },
});
