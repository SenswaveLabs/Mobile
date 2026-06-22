import React, { FC } from "react";
import { StyleProp, TouchableOpacity, View, ViewStyle } from "react-native";
import { useTheme } from "@/contexts/ThemeProvider";
import { shadowStyles } from "@/styles/shadowStyles";
import { useRouter } from "expo-router";
import Text from "@/components/common/Text";
import DataSourceStateGet from "../state/DataSourceStateGet";

export interface DataSourceTileProps {
    id: string;
    name: string;
    server: string;
    onClicked?: (id: string) => void;
    onClickDisabled?: boolean;
    style?: StyleProp<ViewStyle>;
}

const DataSourceTile: FC<DataSourceTileProps> = ({
    id,
    server,
    name,
    onClicked,
    onClickDisabled = false,
    style = null,
}: DataSourceTileProps) => {
    const theme = useTheme();
    const router = useRouter();

    const dataSourceClicked = () => {
        if (onClickDisabled) {
            console.info("[DataSourceTile] Click disabled.");
            return;
        }

        if (onClicked) {
            onClicked(id);
            return;
        }

        router.push({ pathname: "dataSource/details", params: { id: id } });
    };

    return (
        <View
            style={{
                backgroundColor: theme.current.colors.primary,
                borderRadius: 12,
                marginTop: 5,
                paddingHorizontal: 10,
                paddingVertical: 6,
                ...shadowStyles.default,
                ...((style as ViewStyle) || {}),
            }}>
            <TouchableOpacity onPress={dataSourceClicked}>
                <View
                    style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: 5,
                    }}>
                    <View style={{ width: "70%", padding: 5 }}>
                        <Text size={"large"} bold={true} color={"onPrimary"}>
                            {name}
                        </Text>

                        <Text size={"small"} color={"onPrimary"}>
                            Server: {server ? server : "?"}
                        </Text>
                    </View>
                    <View style={{ width: "30%" }}>
                        <DataSourceStateGet id={id} />
                    </View>
                </View>
            </TouchableOpacity>
        </View>
    );
};

export default DataSourceTile;
