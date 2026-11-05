import { View, StyleSheet } from "react-native";
import React, { FC } from "react";
import Text from "@/components/common/Text";
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

    const icons = {
        Boolean: { letter: "B", colour: "#f5d258" },
        Number: { letter: "N", colour: "#5478d6" },
        Integer: { letter: "I", colour: "#2a59d4" },
        Text: { letter: "T", colour: "#64bd72" },
        HexColor: { letter: "HC", colour: "#71a832" },
        Options: { letter: "O", colour: "#32a887" },
    };

    const icon =
        type && icons[type as keyof typeof icons]
            ? icons[type]
            : { letter: "?", colour: "#33363F40" };

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
                <View style={[styles.typeIcon, { backgroundColor: icon.colour }]}>
                    <Text size="small" color="onPrimary">
                        {icon.letter}
                    </Text>
                </View>
            }
            onPress={onOperationClicked}
            disabled={disablePress}
        />
    );
};

const styles = StyleSheet.create({
    typeIcon: {
        width: 40,
        height: 40,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
    },
});

export default OperationTile;
