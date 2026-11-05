import { View, StyleSheet, Text } from "react-native";
import React, { FC } from "react";
import { useTheme } from "@/contexts/ThemeProvider";
import { useRouter } from "expo-router";
import { OperationType } from "@/contexts/custom/DeviceListProvider";
import ListRow from "@/components/common/ListRow";

interface OperationTileProps {
    id: string;
    deviceId?: string;
    name: string;
    type: OperationType;
    disablePress?: boolean;
    variant?: "list";
    separator?: boolean;
}

const OperationTile: FC<OperationTileProps> = ({
    id,
    deviceId,
    name,
    type,
    disablePress = false,
    separator = false,
}: OperationTileProps) => {
    const router = useRouter();
    const { colors } = useTheme().current;

    const icons = {
        Boolean: "B",
        Number: "N",
        Integer: "I",
        Text: "T",
        HexColor: "HC",
        Options: "O",
    };

    const letter = Object.prototype.hasOwnProperty.call(icons, type) ? icons[type] : "?";

    const onOperationClicked = () => {
        if (disablePress) {
            console.info("[OperationTile] Operation Clicked but disabled.");
            return;
        }

        console.info("[OperationTile] Operation Clicked.");
        router.push({
            pathname: "device/operation/details",
            params: {
                operationId: id,
                ...(deviceId ? { deviceId } : {}),
            },
        });
    };

    return (
        <ListRow
            title={name}
            separator={separator}
            description={type}
            leading={
                <View style={[styles.typeIcon, { backgroundColor: colors.authFieldBackground }]}>
                    <Text style={[styles.letter, { color: colors.authForeground }]}>{letter}</Text>
                </View>
            }
            onPress={onOperationClicked}
            disabled={disablePress}
        />
    );
};

const styles = StyleSheet.create({
    letter: { fontSize: 14, lineHeight: 20 },
    typeIcon: {
        width: 40,
        height: 40,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
    },
});

export default OperationTile;
