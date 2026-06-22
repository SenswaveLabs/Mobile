import React, { useEffect, useState } from "react";
import { Animated } from "react-native";
import { useHomes } from "@/contexts/domain/HomeProvider";
import AddRoomTile from "./tiles/AddRoomTile";
import RoomTile from "./tiles/RoomTile";
import { Room } from "@/types/HomeTypes";

const baseRooms: Room[] = [
    { id: "add", name: "Add" },
    { id: "all", name: "All" },
];

export default function RoomsView() {
    const homes = useHomes();

    const [roomList, setRoomList] = useState<Room[]>(baseRooms);

    useEffect(() => {
        const currentRooms = homes.current?.rooms
            ? [...baseRooms, ...homes.current.rooms]
            : baseRooms;
        setRoomList(currentRooms);

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [homes.current, homes.current?.rooms]);

    return (
        <Animated.FlatList
            data={roomList}
            renderItem={({ item }) =>
                item.id === "add" ? (
                    <AddRoomTile />
                ) : (
                    <RoomTile id={item.id} name={item.name} disableDetails={item.id === "all"} />
                )
            }
            keyExtractor={(item) => item.name}
            horizontal={true}
            contentContainerStyle={{
                gap: 3,
                paddingLeft: 10,
                paddingRight: 15,
                alignSelf: "center",
                paddingVertical: 10,
            }}
            showsHorizontalScrollIndicator={false}
            removeClippedSubviews={false}
        />
    );
}
