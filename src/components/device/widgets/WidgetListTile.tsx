import React, { FC, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/contexts/ThemeProvider";
import Text from "../../common/Text";
import { shadowStyles } from "@/styles/shadowStyles";
import ImageButton from "@/components/common/ImageButton";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useToast } from "@/contexts/ToastProvider";

interface WidgetListTileProps {
    id: string;
    name: string;
    type: string;
    enabled: boolean; // Property is from WidgetListDto

    overrideOnClick?: (operationId: string) => Promise<void>;
    disablePress?: boolean;
}

const WidgetListTile: FC<WidgetListTileProps> = ({
    id,
    name,
    type,
    enabled,
    overrideOnClick,
    disablePress = false,
}) => {
    const router = useRouter();
    const theme = useTheme();
    const toast = useToast();
    const httpClient = useHttpClient();

    const [loading, setLoading] = useState<boolean>(false);
    const [enabledState, setEnabledState] = useState(enabled);

    const handleTileClick = async () => {
        if (disablePress) {
            console.info("[WidgetListTile] Tile press is disabled.");
            return;
        }

        if (overrideOnClick) {
            console.info("[WidgetListTile] Tile press is overridden.");
            await overrideOnClick(id);
            return;
        }

        router.push({ pathname: "device/widget/details", params: { widgetId: id } });
    };

    const onStateClicked = async () => {
        if (disablePress) {
            console.info("[WidgetListTile] State click is disabled.");
            return;
        }

        console.info("[WidgetListTile] State Clicked.");

        setLoading(true);

        try {
            const result = await httpClient.put(`v1/devices/widgets/${id}/state`, {
                enabled: !enabledState,
            });

            if (result.isSuccess) {
                if (enabledState) {
                    toast.info("Widget disabled.");
                } else {
                    toast.info("Widget enabled.");
                }

                setEnabledState(!enabledState);
            } else {
                toast.httpError(result);
            }
        } catch (error) {
            console.error("[WidgetListTile] Error while clicking state:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Pressable onPress={handleTileClick} style={{ flexDirection: "row" }}>
            <View
                style={{
                    padding: 10,
                    flexDirection: "column",
                    borderRadius: 12,
                    backgroundColor: theme.current.colors.primary,
                    ...shadowStyles.default,
                    marginVertical: 6,
                    marginRight: 10,
                }}>
                <Text size="medium" color="onPrimary">
                    {type}
                </Text>
            </View>

            <View
                style={{
                    padding: 10,
                    flexDirection: "column",
                    borderRadius: 12,
                    backgroundColor: theme.current.colors.primary,
                    ...shadowStyles.default,
                    marginVertical: 6,
                    marginRight: 10,
                    flex: 1,
                }}>
                <Text size="medium" color="onPrimary">
                    {name}
                </Text>
            </View>

            <View style={{ justifyContent: "center", alignItems: "center" }}>
                <ImageButton
                    size={25}
                    style={{
                        backgroundColor: enabledState
                            ? theme.current.colors.success
                            : theme.current.colors.error,
                    }}
                    loading={loading}
                    icon={"power"}
                    onPress={onStateClicked}
                />
            </View>
        </Pressable>
    );
};

export default WidgetListTile;
