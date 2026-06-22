import { useTheme } from "@/contexts/ThemeProvider";
import { TouchableOpacity, View, ViewProps } from "react-native";
import Divider from "./Divider";
import Text from "./Text";
import { shadowStyles } from "@/styles/shadowStyles";
import Icon from "./Icon";

export type SimpleListItem = {
    icon: string;
    name: string;
    value?: string;
    onClick?: (e: any) => void;
};

interface SimlpleItemListProps extends ViewProps {
    items: SimpleListItem[];
}

const SimlpleItemList = ({ items, style }: SimlpleItemListProps) => {
    const theme = useTheme();

    return (
        <View
            style={[
                { borderRadius: 16, backgroundColor: theme.current.colors.primary },
                style,
                shadowStyles.default,
                { paddingVertical: 8 },
            ]}>
            {items.map((item, index) => (
                <View key={index}>
                    <TouchableOpacity
                        style={{
                            justifyContent: "center",
                            width: "100%",
                            flexDirection: "row",
                            paddingHorizontal: 6,
                        }}
                        onPress={item.onClick}>
                        <View style={{ paddingHorizontal: 12 }}>
                            <Icon icon={item.icon} size={28} color="onPrimary" />
                        </View>

                        <View style={{ flex: 1, justifyContent: "center" }}>
                            <Text size={"medium"} color="onPrimary">
                                {item.name}
                            </Text>
                        </View>

                        <View style={{ justifyContent: "center", paddingHorizontal: 12 }}>
                            <Text size={"medium"} color="onPrimary">
                                {item.value}
                            </Text>
                        </View>
                    </TouchableOpacity>
                    {index < items.length - 1 && (
                        <Divider
                            color="textOnPrimary"
                            style={{ paddingVertical: 8, paddingHorizontal: 12 }}
                        />
                    )}
                </View>
            ))}
        </View>
    );
};

export default SimlpleItemList;
