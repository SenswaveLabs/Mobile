import { useDeviceList } from "@/contexts/custom/DeviceListProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { useRouter } from "expo-router";
import React, { FC } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface RoomProperties {
    id: string;
    name: string;
    disableClicks?: boolean;
    disableDetails?: boolean;
}

const RoomTile: FC<RoomProperties> = ({
    id,
    name,
    disableClicks = false,
    disableDetails = false,
}) => {
    const { colors } = useTheme().current;
    const devices = useDeviceList();
    const home = useHomes().current;
    const router = useRouter();
    const selected = !disableClicks && devices.filter === id;
    const canEdit = !disableClicks && !disableDetails && (home?.isOwner || home?.canManage);
    return (
        <Pressable
            cssInterop={false}
            accessibilityRole="button"
            accessibilityLabel={name}
            accessibilityState={{ selected, disabled: disableClicks }}
            accessibilityHint={canEdit ? "Touch and hold for room details." : undefined}
            disabled={disableClicks}
            onPress={() => devices.setFilter(id)}
            onLongPress={
                canEdit
                    ? () => router.push({ pathname: "home/room/details", params: { id } })
                    : undefined
            }
            style={({ pressed }) => [styles.target, pressed && styles.pressed]}>
            <View
                pointerEvents="none"
                style={[
                    styles.chip,
                    {
                        backgroundColor: selected ? colors.authPrimary : colors.authFieldBackground,
                        borderColor: selected ? colors.authPrimary : colors.authBorder,
                    },
                ]}>
                <Text
                    style={[
                        styles.text,
                        { color: selected ? colors.authOnPrimary : colors.authForeground },
                    ]}>
                    {name}
                </Text>
            </View>
        </Pressable>
    );
};
export default RoomTile;
const styles = StyleSheet.create({
    text: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
    target: { minHeight: 48, minWidth: 48, justifyContent: "center" },
    chip: {
        minHeight: 32,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 12,
        paddingVertical: 5,
    },
    pressed: { opacity: 0.72 },
});
