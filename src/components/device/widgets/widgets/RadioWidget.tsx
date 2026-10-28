import Icon from "@/components/common/Icon";
import { useTheme } from "@/contexts/ThemeProvider";
import type { CalculatedWidget, PositionedWidget } from "../../dashboards/DashboardView";
import { widgetRemovalAccessibility } from "../widgetAccessibility";
import type { RadioOption } from "../forms/Radio/RadioForm";
import React, { FC, useEffect, useState } from "react";
import {
    ActivityIndicator,
    LayoutChangeEvent,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { widgetStyles } from "./widgetStyles";
import InvalidWidget from "./InvalidWidget";

interface RadioWidgetProps {
    operations?: () => void;
    widget: CalculatedWidget;
    positionedWidget: PositionedWidget;
    disabled: boolean;
    pending: boolean;
    onAction: (value: string | number | boolean) => Promise<boolean>;
}

interface RadioDisplayOptionProps {
    option: RadioOption;
    isSelected: boolean;
    onPress: (option: RadioOption) => void;
    operations?: () => void;
    disabled: boolean;
    pending: boolean;
    itemWidth: number;
    itemHeight: number;
}

const RadioDisplayOption: FC<RadioDisplayOptionProps> = ({
    option,
    isSelected,
    onPress,
    operations,
    disabled,
    pending,
    itemWidth,
    itemHeight,
}) => {
    const { colors } = useTheme().current;
    const isDisabled = disabled || pending;
    const foreground = isSelected ? colors.authOnPrimary : colors.authForeground;

    return (
        <Pressable
            accessibilityRole="radio"
            accessibilityLabel={option.displayName}
            accessibilityState={{
                checked: isSelected,
                selected: isSelected,
                disabled: isDisabled,
                busy: pending,
            }}
            {...widgetRemovalAccessibility(operations)}
            disabled={isDisabled}
            onPress={() => onPress(option)}
            onLongPress={operations}
            style={[
                styles.option,
                {
                    width: itemWidth,
                    height: itemHeight,
                    backgroundColor: isSelected ? colors.authPrimary : colors.deviceTileSurface,
                    borderColor: isSelected ? colors.authPrimary : colors.deviceTileBorder,
                },
            ]}>
            {itemHeight >= 80 && (
                <View style={[styles.optionIcon, { backgroundColor: colors.deviceTileSurface }]}>
                    {pending ? (
                        <ActivityIndicator size="small" color={colors.authForeground} />
                    ) : (
                        <Icon icon={option.icon} size={20} color="brand" />
                    )}
                </View>
            )}
            <Text
                numberOfLines={itemHeight >= 80 ? 2 : 1}
                style={[
                    styles.optionLabel,
                    { color: disabled && !isSelected ? colors.authMuted : foreground },
                ]}>
                {option.displayName}
            </Text>
        </Pressable>
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
    const { colors } = useTheme().current;
    const configuredOptions = widget.configuration?.options;
    const radioOptions: RadioOption[] = Array.isArray(configuredOptions)
        ? configuredOptions.filter(
              (option): option is RadioOption =>
                  option &&
                  typeof option.optionName === "string" &&
                  typeof option.displayName === "string" &&
                  typeof option.icon === "string",
          )
        : [];
    const reportedOption = widget.configuration?.runtime?.value;
    const [selectedOption, setSelectedOption] = useState<string | undefined>(reportedOption);
    const [containerHeight, setContainerHeight] = useState(0);
    const [containerWidth, setContainerWidth] = useState(0);
    const horizontal = positionedWidget.columnSpan >= positionedWidget.rowSpan;
    const contentHeight = containerHeight - 46;
    const narrow = containerWidth < 80;
    const contentWidth = containerWidth - (narrow ? 2 : 18);

    useEffect(() => {
        setSelectedOption(reportedOption);
    }, [widget.id, reportedOption]);

    const handleToggle = async (option: RadioOption) => {
        if (disabled || pending || option.optionName === selectedOption) return;
        if (await onAction(option.optionName)) setSelectedOption(option.optionName);
    };

    const onLayout = (event: LayoutChangeEvent) => {
        setContainerHeight(event.nativeEvent.layout.height);
        setContainerWidth(event.nativeEvent.layout.width);
    };

    if (radioOptions.length === 0)
        return <InvalidWidget widget={widget} operations={operations} disabled={disabled} />;

    return (
        <View
            onLayout={onLayout}
            accessibilityRole="radiogroup"
            accessibilityLabel={widget.name}
            style={[
                widgetStyles.tile,
                narrow && widgetStyles.compactInsets,
                { backgroundColor: colors.deviceTileSurface, borderColor: colors.deviceTileBorder },
            ]}>
            <Text numberOfLines={1} style={[widgetStyles.label, { color: colors.authForeground }]}>
                {widget.name}
            </Text>
            {containerHeight <= 0 || containerWidth <= 0 ? (
                <ActivityIndicator size="small" color={colors.authForeground} />
            ) : (
                <ScrollView
                    horizontal={horizontal}
                    style={styles.scroll}
                    contentContainerStyle={{ flexDirection: horizontal ? "row" : "column", gap: 8 }}
                    persistentScrollbar
                    showsHorizontalScrollIndicator={horizontal}
                    showsVerticalScrollIndicator={!horizontal}>
                    {radioOptions.map((option) => (
                        <RadioDisplayOption
                            key={option.optionName}
                            option={option}
                            isSelected={selectedOption === option.optionName}
                            onPress={(selected) => void handleToggle(selected)}
                            operations={operations}
                            disabled={disabled}
                            pending={pending}
                            itemWidth={Math.max(
                                48,
                                horizontal
                                    ? contentWidth / positionedWidget.columnSpan
                                    : contentWidth,
                            )}
                            itemHeight={Math.max(
                                48,
                                horizontal
                                    ? contentHeight
                                    : contentHeight / positionedWidget.rowSpan,
                            )}
                        />
                    ))}
                </ScrollView>
            )}
        </View>
    );
};

export default RadioWidget;

const styles = StyleSheet.create({
    scroll: { width: "100%", flex: 1 },
    option: {
        minWidth: 48,
        minHeight: 48,
        padding: 4,
        borderWidth: 1,
        borderRadius: 8,
        gap: 4,
        alignItems: "center",
        justifyContent: "center",
    },
    optionIcon: {
        width: 24,
        height: 24,
        borderRadius: 4,
        alignItems: "center",
        justifyContent: "center",
    },
    optionLabel: { fontSize: 14, lineHeight: 20, fontWeight: "500", textAlign: "center" },
});
