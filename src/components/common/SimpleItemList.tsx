import React, { FC } from "react";
import { View, ViewProps } from "react-native";
import ListRow from "./ListRow";
import Text from "./Text";
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

const SimlpleItemList: FC<SimlpleItemListProps> = ({ items, style, ...viewProps }) => {
    return (
        <View {...viewProps} style={style}>
            {items.map((item, index) => (
                <ListRow
                    key={index}
                    title={item.name}
                    separator={index < items.length - 1}
                    leading={<Icon icon={item.icon} size={24} color="onBackground" />}
                    trailing={
                        item.value ? (
                            <Text
                                size="medium"
                                color="onBackground"
                                style={{ maxWidth: "55%", textAlign: "right" }}>
                                {item.value}
                            </Text>
                        ) : undefined
                    }
                    onPress={item.onClick}
                />
            ))}
        </View>
    );
};

export default SimlpleItemList;
