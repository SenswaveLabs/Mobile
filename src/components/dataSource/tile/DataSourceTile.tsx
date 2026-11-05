import React, { FC } from "react";
import { ActivityIndicator, StyleProp, useWindowDimensions, View, ViewStyle } from "react-native";
import { useTheme } from "@/contexts/ThemeProvider";
import { useRouter } from "expo-router";
import Text from "@/components/common/Text";
import ListRow from "@/components/common/ListRow";
import DataSourceStateGet from "../state/DataSourceStateGet";

export interface DataSourceTileProps {
    id: string;
    name: string;
    server: string;
    onClicked?: (id: string) => void;
    onClickDisabled?: boolean;
    variant?: "list";
    separator?: boolean;
    selected?: boolean;
    loading?: boolean;
    style?: StyleProp<ViewStyle>;
}

const DataSourceTile: FC<DataSourceTileProps> = ({
    id,
    server,
    name,
    onClicked,
    onClickDisabled = false,
    separator = false,
    selected = false,
    loading = false,
    style = null,
}: DataSourceTileProps) => {
    const theme = useTheme();
    const router = useRouter();
    const { fontScale } = useWindowDimensions();
    const stacked = fontScale >= 1.3;

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
        <View style={[{ width: "100%" }, style]}>
            <ListRow
                title={name}
                separator={separator}
                description={`Server: ${server || "?"}`}
                trailing={
                    <View
                        style={{
                            maxWidth: stacked ? 168 : 120,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                        }}>
                        {loading && (
                            <ActivityIndicator
                                accessible={false}
                                size="small"
                                color={theme.current.colors.authMuted}
                            />
                        )}
                        <DataSourceStateGet id={id} inlineRecovery />
                    </View>
                }
                onPress={dataSourceClicked}
                disabled={onClickDisabled}
                selected={selected}
                loading={loading}
                stacked={stacked}
                accessibilityLabel={loading ? `Linking ${name}` : undefined}>
                {loading && (
                    <Text size="small" color="onBackground">
                        Linking {name}…
                    </Text>
                )}
            </ListRow>
        </View>
    );
};

export default DataSourceTile;
