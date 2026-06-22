import React, { useEffect, useState } from "react";
import { StyleSheet, Pressable, View, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import BaseDeviceTile from "./BaseDeviceTile";
import DisplayDeviceTile from "./DisplayDeviceTile";
import SwitchDeviceTile from "./SwitchDeviceTile";
import { Device } from "@/contexts/custom/DeviceListProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { shadowStyles } from "@/styles/shadowStyles";
import Text from "@/components/common/Text";
import { useHomes } from "@/contexts/domain/HomeProvider";

const numColumns = 2;
const screenWidth = Dimensions.get("window").width;
const edgePadding = 15;
const innerSpacing = 20;
const itemWidth = (screenWidth - edgePadding * 2 - innerSpacing * (numColumns - 1)) / numColumns;

interface DeviceTileProps {
    device: Device;
    disablePress?: boolean;
    onTilePressParam?: () => void;
}

export default function DeviceTile({
    device,
    disablePress = false,
    onTilePressParam,
}: DeviceTileProps) {
    const router = useRouter();
    const theme = useTheme();
    const homes = useHomes();

    const [roomName, setRoomName] = useState<string | undefined>(undefined);

    const tileClicked = () => {
        if (disablePress) {
            console.info("[Device Tile] Device Tile press disabled.");
            return;
        }

        if (onTilePressParam) {
            console.info("[Device Tile] Device Tile custom press.");
            onTilePressParam();
            return;
        }

        console.info(`[Device Tile] Device Tile default press. Device: ${device.id}`);
        router.push({
            pathname: "device/device",
            params: {
                deviceId: device.id,
            },
        });
    };

    const tileLongClicked = () => {
        console.info("[Device Tile] Opening device details.");

        router.push({
            pathname: "device/details",
            params: {
                deviceId: device.id,
            },
        });
    };

    useEffect(() => {
        const getRoomName = async () => {
            if (!homes.current) return;

            const room = homes.current.rooms.find((room) => room.id === device.roomId);

            if (room) {
                setRoomName(room.name);
            } else {
                setRoomName(undefined);
            }
        };

        getRoomName();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [homes.current, homes.current?.rooms, device.roomId]);

    return (
        <View style={{ flex: 1, width: itemWidth }}>
            <Pressable onPress={tileClicked} onLongPress={tileLongClicked} style={styles.wrapper}>
                <View
                    style={[
                        styles.contianer,
                        { backgroundColor: theme.current.colors.primary },
                        shadowStyles.default,
                    ]}>
                    {device.presence?.type === "BooleanOperation" && (
                        <View
                            style={[
                                styles.presenceDot,
                                {
                                    backgroundColor:
                                        device.presence.value === true
                                            ? theme.current.colors.success
                                            : device.presence.value === false
                                              ? theme.current.colors.error
                                              : theme.current.colors.warning,
                                },
                            ]}
                        />
                    )}
                    <View style={styles.internalContainer}>
                        {device.tile.type === "Switch" && (
                            <SwitchDeviceTile
                                deviceId={device.id}
                                icon={device.icon}
                                tile={device.tile}
                                disablePress={disablePress}
                            />
                        )}
                        {device.tile.type === "Display" && (
                            <DisplayDeviceTile
                                deviceId={device.id}
                                icon={device.icon}
                                tile={device.tile}
                            />
                        )}
                        {device.tile.type === "Default" && <BaseDeviceTile icon={device.icon} />}

                        <View style={styles.textContainer}>
                            <Text size={"medium"} color={"onPrimary"} numberOfLines={1}>
                                {device.name}
                            </Text>

                            <Text
                                size={"small"}
                                color={"onPrimary"}
                                numberOfLines={1}
                                style={!roomName ? { opacity: 0 } : {}}>
                                {roomName || "Placeholder"}
                            </Text>
                        </View>
                    </View>
                </View>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        alignSelf: "center",
        flexDirection: "row",
    },
    contianer: {
        flex: 1,
        borderRadius: 14,
        padding: 10,
        paddingHorizontal: 5,
    },
    internalContainer: {
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        alignSelf: "center",
        margin: 0,
        width: "100%",
        flex: 1,
    },
    textContainer: {
        justifyContent: "flex-start",
        alignItems: "flex-start",
        width: "100%",
        height: "40%",
        paddingHorizontal: 5,
        minHeight: 20,
        paddingTop: 5,
    },
    deviceName: {
        fontSize: 18,
    },
    deviceRoom: {
        fontSize: 14,
    },
    actionContainer: {
        width: "100%",
        height: "60%",
        flexDirection: "row",
    },
    iconContainer: {
        justifyContent: "center",
        alignItems: "center",
        width: "60%",
        height: "100%",
    },
    switchContainer: {
        justifyContent: "center",
        alignItems: "center",
        width: "40%",
        height: "100%",
    },
    switch: {
        width: 64,
        height: 34,
    },
    presenceDot: {
        position: "absolute",
        top: 12,
        left: 12,
        width: 8,
        height: 8,
        borderRadius: 4,
        zIndex: 1,
    },
});
