import Icon from "@/components/common/Icon";
import Loading from "@/components/common/Loading";
import Text from "@/components/common/Text";
import { useTheme } from "@/contexts/ThemeProvider";
import { shadowStyles } from "@/styles/shadowStyles";
import type { CalculatedWidget, PositionedWidget } from "../../dashboards/DashboardView";
import { widgetRemovalAccessibility } from "../widgetAccessibility";
import type { RadioOption } from "../forms/Radio/RadioForm";
import React, { FC, useEffect, useState } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

interface RadioWidgetProps {
    operations?: () => void;
    widget: CalculatedWidget;
    positionedWidget: PositionedWidget;
    disabled: boolean;
    pending: boolean;
    onAction: (value: string | number | boolean) => Promise<boolean>;
}

const RadioDisplayOption: FC<{
    option: RadioOption;
    isSelected: boolean;
    onPress: (option: RadioOption) => void;
    operations?: () => void;
    disabled: boolean;
    pending: boolean;
    itemWidth: number;
    itemHeight: number;
}> = ({ option, isSelected, onPress, operations, disabled, pending, itemWidth, itemHeight }) => {
    const theme = useTheme();
    const isDisabled = disabled || pending;
    return (
        <View style={{ width: itemWidth, height: itemHeight, padding: 8 }}>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${option.displayName}${isSelected ? ", selected" : ""}`}
                accessibilityState={{ selected: isSelected, disabled: isDisabled, busy: pending }}
                {...widgetRemovalAccessibility(operations)}
                disabled={isDisabled}
                onPress={() => onPress(option)}
                onLongPress={operations}
                style={[
                    {
                        flex: 1,
                        borderRadius: 8,
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isSelected
                            ? theme.current.colors.primary
                            : theme.current.colors.background,
                        ...shadowStyles.default,
                    },
                    isSelected ? {} : { shadowOpacity: 0, elevation: 0 },
                ]}>
                {pending ? (
                    <Loading size={itemHeight / 3} />
                ) : (
                    <View style={{ alignItems: "center", justifyContent: "center" }}>
                        <Icon icon={option.icon} size={itemHeight / 3} color="onPrimary" />
                        <Text size="small" color="onPrimary" numberOfLines={1}>
                            {option.displayName}
                        </Text>
                    </View>
                )}
            </Pressable>
        </View>
    );
};

const RadioWidget: FC<RadioWidgetProps> = ({
    operations,
    positionedWidget,
    widget,
    disabled,
    pending,
    onAction,
}) => {
    const radioOptions = (widget.configuration?.options as RadioOption[]) ?? [];
    const currentRadioOption = radioOptions.find(
        (option) => option.optionName === widget.configuration?.runtime?.value,
    );
    const [selectedOption, setSelectedOption] = useState<RadioOption | undefined>(
        currentRadioOption,
    );
    const [containerHeight, setContainerHeight] = useState(0);
    const [containerWidth, setContainerWidth] = useState(0);
    const [contentWidth, setContentWidth] = useState(0);
    const [scrollX, setScrollX] = useState(0);
    const columns = positionedWidget.columnSpan;
    const rows = positionedWidget.rowSpan;

    useEffect(() => {
        setSelectedOption(currentRadioOption);
    }, [widget.id, widget.configuration?.runtime?.value, currentRadioOption]);

    const handleToggle = async (option: RadioOption) => {
        if (disabled || pending) return;
        if (await onAction(option.optionName)) setSelectedOption(option);
    };

    const onLayout = (event: LayoutChangeEvent) => {
        setContainerHeight(event.nativeEvent.layout.height);
        setContainerWidth(event.nativeEvent.layout.width);
    };
    const itemWidth = containerWidth / columns;
    const itemHeight = containerHeight / rows;
    const showRightIndicator =
        contentWidth > containerWidth && scrollX < contentWidth - containerWidth;
    const showLeftIndicator = scrollX > 0;

    return (
        <View
            onLayout={onLayout}
            style={{
                borderRadius: 8,
                width: "100%",
                height: "100%",
                justifyContent: "center",
                alignItems: "center",
            }}>
            {containerHeight <= 0 || containerWidth <= 0 ? (
                <Loading />
            ) : (
                <ScrollView
                    onContentSizeChange={setContentWidth}
                    onScroll={(event) => setScrollX(event.nativeEvent.contentOffset.x)}
                    scrollEventThrottle={16}
                    horizontal={columns >= rows}
                    contentContainerStyle={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}>
                    {radioOptions.map((option) => (
                        <RadioDisplayOption
                            key={option.optionName}
                            option={option}
                            isSelected={selectedOption?.optionName === option.optionName}
                            onPress={(selected) => void handleToggle(selected)}
                            operations={operations}
                            disabled={disabled}
                            pending={pending}
                            itemWidth={itemWidth}
                            itemHeight={itemHeight}
                        />
                    ))}
                </ScrollView>
            )}

            {showRightIndicator && (
                <View style={styles.rightIndicator}>
                    <Icon icon="chevron-forward" size={24} color="complementary" />
                </View>
            )}
            {showLeftIndicator && (
                <View style={styles.leftIndicator}>
                    <Icon icon="chevron-back" size={24} color="complementary" />
                </View>
            )}
        </View>
    );
};

export default RadioWidget;

const styles = StyleSheet.create({
    rightIndicator: {
        position: "absolute" as const,
        right: 0,
        top: 0,
        bottom: 0,
        width: 24,
        justifyContent: "center" as const,
        alignItems: "center" as const,
        borderTopRightRadius: 8,
        borderBottomRightRadius: 8,
    },
    leftIndicator: {
        position: "absolute" as const,
        left: 0,
        top: 0,
        bottom: 0,
        width: 24,
        justifyContent: "center" as const,
        alignItems: "center" as const,
        borderTopLeftRadius: 8,
        borderBottomLeftRadius: 8,
    },
});
