import React, { useCallback, useRef } from "react";
import { Pressable, StyleSheet, Text as NativeText } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import BottomSheetSelect from "../common/BottomSheetSelect";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useTheme } from "@/contexts/ThemeProvider";

interface RoomSelectorProps {
    initialRoomId?: string;
    onSelected: (value: string) => void;
    disabled?: boolean;
}

function RoomSelector({ initialRoomId, onSelected, disabled = false }: RoomSelectorProps) {
    const router = useRouter();
    const homes = useHomes();
    const { colors } = useTheme().current;
    const pendingCreate = useRef(false);
    const navigating = useRef(false);
    const rooms = homes.current?.rooms ?? [];
    const canManage = homes.current?.isOwner === true || homes.current?.canManage === true;
    const currentRoom = rooms.find((room) => room.id === initialRoomId);

    useFocusEffect(
        useCallback(() => {
            navigating.current = false;
            void homes.refreshRooms({ silent: true });
            // Room options refresh when returning from room creation.
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []),
    );

    return (
        <BottomSheetSelect
            title="Room"
            value={
                currentRoom?.name ??
                (initialRoomId && initialRoomId !== "None" ? "Unavailable room" : "None")
            }
            options={rooms
                .map((room) => ({
                    label: room.name,
                    selected: room.id === initialRoomId,
                    onPress: () => onSelected(room.id),
                }))
                .concat([
                    {
                        label: "None",
                        selected: !initialRoomId || initialRoomId === "None",
                        onPress: () => onSelected("None"),
                    },
                ])}
            disabled={disabled}
            onClosed={() => {
                if (pendingCreate.current && !navigating.current) {
                    pendingCreate.current = false;
                    navigating.current = true;
                    router.push({ pathname: "home/room/add" });
                }
            }}
            renderOptions={(close) => (
                <>
                    {rooms.map((room) => (
                        <Pressable
                            key={room.id}
                            disabled={disabled}
                            onPress={() => {
                                if (close()) onSelected(room.id);
                            }}
                            accessibilityRole="radio"
                            accessibilityLabel={room.name}
                            accessibilityState={{
                                selected: room.id === initialRoomId,
                                checked: room.id === initialRoomId,
                            }}
                            style={[
                                styles.option,
                                room.id === initialRoomId && {
                                    backgroundColor: colors.authPrimary,
                                },
                            ]}>
                            <NativeText
                                style={{
                                    color:
                                        room.id === initialRoomId
                                            ? colors.authOnPrimary
                                            : colors.authForeground,
                                }}>
                                {room.name}
                            </NativeText>
                        </Pressable>
                    ))}
                    <Pressable
                        onPress={() => {
                            if (close()) onSelected("None");
                        }}
                        disabled={disabled}
                        accessibilityRole="radio"
                        accessibilityLabel="None"
                        accessibilityState={{
                            selected: !initialRoomId || initialRoomId === "None",
                            checked: !initialRoomId || initialRoomId === "None",
                        }}
                        style={[
                            styles.option,
                            (!initialRoomId || initialRoomId === "None") && {
                                backgroundColor: colors.authPrimary,
                            },
                        ]}>
                        <NativeText
                            style={{
                                color:
                                    !initialRoomId || initialRoomId === "None"
                                        ? colors.authOnPrimary
                                        : colors.authForeground,
                            }}>
                            None
                        </NativeText>
                    </Pressable>
                    {canManage && (
                        <Pressable
                            onPress={() => {
                                if (close()) pendingCreate.current = true;
                            }}
                            disabled={disabled}
                            accessibilityRole="button"
                            accessibilityLabel="Create room"
                            style={[
                                styles.option,
                                styles.create,
                                { borderTopColor: colors.authBorder },
                            ]}>
                            <NativeText style={{ color: colors.authPrimary }}>
                                Create room
                            </NativeText>
                        </Pressable>
                    )}
                </>
            )}
        />
    );
}

export default RoomSelector;

const styles = StyleSheet.create({
    option: {
        minHeight: 48,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 8,
    },
    create: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8, paddingTop: 8 },
});
