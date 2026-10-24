import Icon from "@/components/common/Icon";
import Loading from "@/components/common/Loading";
import Text from "@/components/common/Text";
import { useTheme } from "@/contexts/ThemeProvider";
import { shadowStyles } from "@/styles/shadowStyles";
import { widgetRemovalAccessibility } from "../widgetAccessibility";
import type { CalculatedWidget } from "../../dashboards/DashboardView";
import React, { FC, useEffect, useState } from "react";
import { LayoutChangeEvent, Pressable, View } from "react-native";

interface SwitchWidgetProps {
    operations?: () => void;
    widget: CalculatedWidget;
    disabled: boolean;
    pending: boolean;
    onAction: (value: string | number | boolean) => Promise<boolean>;
}

const SwitchWidget: FC<SwitchWidgetProps> = ({
    operations,
    widget,
    disabled,
    pending,
    onAction,
}) => {
    const theme = useTheme();
    const [isChecked, setIsChecked] = useState(widget.configuration?.runtime?.value ?? false);
    const [containerHeight, setContainerHeight] = useState(0);
    const [containerWidth, setContainerWidth] = useState(0);
    const isDisabled = disabled || pending;

    const handleToggle = async () => {
        if (isDisabled) return;
        const nextValue = !isChecked;
        if (await onAction(nextValue)) setIsChecked(nextValue);
    };

    const onLayout = (event: LayoutChangeEvent) => {
        setContainerHeight(event.nativeEvent.layout.height);
        setContainerWidth(event.nativeEvent.layout.width);
    };

    useEffect(() => {
        setIsChecked(widget.configuration?.runtime?.value ?? false);
    }, [widget.id, widget.configuration?.runtime?.value]);

    const iconSize =
        Math.min(containerHeight * 0.4, containerWidth * 0.4) > 0
            ? Math.min(containerHeight * 0.4, containerWidth * 0.4)
            : 24;

    return (
        <Pressable
            onLayout={onLayout}
            accessibilityRole="switch"
            accessibilityLabel={widget.name}
            accessibilityState={{ checked: isChecked, disabled: isDisabled, busy: pending }}
            {...widgetRemovalAccessibility(operations)}
            style={[
                {
                    borderRadius: 8,
                    width: "100%",
                    height: "100%",
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: isChecked
                        ? theme.current.colors.success
                        : theme.current.colors.error,
                    ...shadowStyles.default,
                },
            ]}
            disabled={isDisabled}
            onPress={() => void handleToggle()}
            onLongPress={operations}>
            <View
                style={{
                    justifyContent: "center",
                    alignItems: "center",
                    height: containerHeight * 0.4 > 0 ? containerHeight * 0.4 : 24,
                    padding: 0,
                    margin: 0,
                }}>
                {pending ? (
                    <Loading size={iconSize} useBackgroundColor={false} />
                ) : (
                    <Icon icon="power-outline" color="onPrimary" size={iconSize} />
                )}
            </View>

            <Text
                size={containerHeight < 56 ? "small" : "medium"}
                color="onPrimary"
                style={{ textAlign: "center" }}
                numberOfLines={1}>
                {widget.name}
            </Text>
        </Pressable>
    );
};

export default SwitchWidget;
