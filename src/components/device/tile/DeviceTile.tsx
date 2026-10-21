import React, { FC } from "react";
import { StyleSheet, Pressable, View, Text, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { CircleHelp, Clock3, Unplug } from "lucide-react-native";
import DisplayDeviceTile from "./DisplayDeviceTile";
import { getDeviceReadings, formatReadingValue } from "@/utils/deviceReadings";
import SwitchDeviceTile from "./SwitchDeviceTile";
import ControlDeviceTile from "./ControlDeviceTile";
import Icon from "@/components/common/Icon";
import { Device } from "@/contexts/custom/DeviceListProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useDeviceTileAction } from "@/hooks/useDeviceTileAction";
import { DeviceLayout } from "@/hooks/useDeviceLayout";

interface DeviceTileProps {
    device: Device;
    layout?: DeviceLayout;
    last?: boolean;
    disablePress?: boolean;
    onTilePressParam?: () => void;
}

const DeviceTile: FC<DeviceTileProps> = ({
    device,
    layout = "grid",
    last = false,
    disablePress = false,
    onTilePressParam,
}) => {
    const router = useRouter();
    const { colors } = useTheme().current;
    const home = useHomes().current;
    const { width, fontScale } = useWindowDimensions();
    const list = layout === "list";
    const horizontal = list && width >= 360 && fontScale < 1.25 && device.tile.type !== "Slider";
    const roomName = home?.rooms.find((room) => room.id === device.roomId)?.name;
    const canManage = home?.isOwner || home?.canManage;
    const hasControl = ["Switch", "Slider", "Options"].includes(device.tile.type);
    const hasPresence = device.presence?.type === "BooleanOperation";
    const inactive = hasPresence && device.presence?.value === false;
    const unknown = hasPresence && device.presence?.value == null;
    const action = useDeviceTileAction({
        deviceId: device.id,
        tile: device.tile,
        disabled: disablePress || !hasControl,
        inactive,
    });
    const noReading =
        device.tile.type === "Display"
            ? getDeviceReadings(device.tile).every(
                  ({ value }) =>
                      typeof value !== "boolean" &&
                      !(typeof value === "number" && Number.isFinite(value)),
              )
            : hasControl && (action.value == null || action.value === "");
    const presence = inactive
        ? "Inactive"
        : unknown
          ? "Status unavailable"
          : noReading
            ? "No data"
            : null;
    const StatusIcon = inactive ? Unplug : unknown ? CircleHelp : Clock3;
    const label = [
        device.name,
        roomName,
        presence,
        device.tile.type === "Display"
            ? getDeviceReadings(device.tile, inactive)
                  .map(
                      (reading) =>
                          `${reading.label} ${formatReadingValue(reading.value, reading.unit)}`,
                  )
                  .join(", ")
            : null,
    ]
        .filter(Boolean)
        .join(", ");

    const navigation = (
        <Pressable
            cssInterop={false}
            accessibilityRole={disablePress ? "text" : "button"}
            accessibilityLabel={label}
            accessibilityHint={
                disablePress
                    ? undefined
                    : canManage
                      ? "Open device dashboard. Touch and hold for device settings."
                      : "Open device dashboard."
            }
            disabled={disablePress}
            onPress={() => {
                if (disablePress) return;
                if (onTilePressParam) onTilePressParam();
                else router.push({ pathname: "device/device", params: { deviceId: device.id } });
            }}
            onLongPress={
                !disablePress && canManage
                    ? () =>
                          router.push({
                              pathname: "device/details",
                              params: { deviceId: device.id },
                          })
                    : undefined
            }
            style={({ pressed }) => [
                styles.main,
                hasControl && styles.controlMain,
                list && styles.listMain,
                horizontal && styles.horizontalMain,
                pressed && styles.pressed,
            ]}>
            <View style={[styles.top, horizontal && styles.listTop]}>
                <View style={inactive && styles.mutedIcon}>
                    <Icon
                        icon={device.icon}
                        resource="devices"
                        size={list ? 22 : 20}
                        color="brand"
                    />
                </View>
                <View style={styles.identity}>
                    <Text
                        style={[
                            styles.name,
                            list && styles.listName,
                            { color: colors.authForeground },
                        ]}>
                        {device.name}
                    </Text>
                    <View style={styles.metadata}>
                        {!!roomName && (
                            <Text style={[styles.room, { color: colors.authMuted }]}>
                                {roomName}
                            </Text>
                        )}
                        {presence && (
                            <View
                                style={[
                                    styles.status,
                                    { backgroundColor: colors.deviceTileSubtle },
                                ]}>
                                <StatusIcon size={12} color={colors.authMuted} accessible={false} />
                                <Text style={[styles.presence, { color: colors.authMuted }]}>
                                    {presence}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
            {device.tile.type === "Display" && (
                <View style={[styles.body, horizontal && styles.listBody]}>
                    <DisplayDeviceTile
                        deviceId={device.id}
                        tile={device.tile}
                        inactive={inactive}
                        layout={horizontal ? "list" : "grid"}
                    />
                </View>
            )}
        </Pressable>
    );

    return (
        <View
            style={[
                styles.tile,
                {
                    backgroundColor: colors.deviceTileSurface ?? colors.authFieldBackground,
                    borderColor: colors.deviceTileBorder ?? colors.authBorder,
                },
                list && styles.listTile,
                list && { backgroundColor: "transparent", borderBottomWidth: last ? 0 : 1 },
                horizontal && styles.horizontal,
            ]}>
            {device.tile.type !== "Slider" && navigation}
            {hasControl && (
                <View
                    style={[
                        styles.control,
                        device.tile.type === "Slider" && styles.sliderControl,
                        list && styles.listControl,
                        horizontal && styles.horizontalControl,
                        horizontal && device.tile.type === "Options" && styles.optionsControl,
                    ]}>
                    {device.tile.type === "Switch" ? (
                        <SwitchDeviceTile
                            name={device.name}
                            action={action}
                            disablePress={disablePress}
                            inactive={inactive}
                            layout={horizontal ? "list" : "grid"}
                        />
                    ) : (
                        <ControlDeviceTile
                            heading={device.tile.type === "Slider" ? navigation : undefined}
                            layout={layout}
                            name={device.name}
                            tile={device.tile}
                            action={action}
                            disablePress={disablePress}
                            inactive={inactive}
                        />
                    )}
                </View>
            )}
        </View>
    );
};
export default DeviceTile;
const styles = StyleSheet.create({
    tile: { width: "100%", flex: 1, minHeight: 112, borderRadius: 12, borderWidth: 1 },
    listTile: { minHeight: 84, borderWidth: 0, borderRadius: 0, paddingVertical: 14, gap: 10 },
    horizontal: { flexDirection: "row", alignItems: "center", gap: 12 },
    main: { flex: 1, minHeight: 48, padding: 12, gap: 10, borderRadius: 12 },
    controlMain: { paddingBottom: 0 },
    listMain: { padding: 0 },
    horizontalMain: { flexDirection: "row", alignItems: "center", gap: 16 },
    top: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
    listTop: { flex: 1, alignItems: "center" },
    identity: { flex: 1, minWidth: 0, gap: 2 },
    name: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
    listName: { fontSize: 15, lineHeight: 21 },
    room: { fontSize: 12, lineHeight: 18 },
    metadata: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        columnGap: 6,
        rowGap: 4,
    },
    status: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        borderRadius: 5,
        paddingHorizontal: 6,
        paddingVertical: 1,
        maxWidth: "100%",
    },
    presence: { fontSize: 12, lineHeight: 18, fontWeight: "500", flexShrink: 1 },
    mutedIcon: { opacity: 0.65 },
    body: { marginTop: "auto" },
    listBody: { marginTop: 0, maxWidth: "48%", flexShrink: 1 },
    control: { paddingHorizontal: 12, paddingBottom: 12 },
    sliderControl: { paddingHorizontal: 0, paddingBottom: 4 },
    listControl: { padding: 0, paddingHorizontal: 0, paddingBottom: 0 },
    horizontalControl: { flexShrink: 1, maxWidth: "46%", minWidth: 120 },
    optionsControl: { width: "56%", maxWidth: "60%", minWidth: 0, flexShrink: 0 },
    pressed: { opacity: 0.72 },
});
