import Text from "@/components/common/Text";
import { useTheme } from "@/contexts/ThemeProvider";
import { shadowStyles } from "@/styles/shadowStyles";
import { widgetRemovalAccessibility } from "../widgetAccessibility";
import type { CalculatedWidget } from "../../dashboards/DashboardView";
import ColorPicker, {
    type ColorFormatsObject,
    HueCircular,
    Panel1,
    Preview,
} from "reanimated-color-picker";
import React, { FC, useEffect, useState } from "react";
import {
    ActivityIndicator,
    LayoutChangeEvent,
    Modal,
    Pressable,
    StyleSheet,
    View,
} from "react-native";

interface ColorWidgetProps {
    operations?: () => void;
    widget: CalculatedWidget;
    disabled: boolean;
    pending: boolean;
    onAction: (value: string | number | boolean) => Promise<boolean>;
}

const ColorWidget: FC<ColorWidgetProps> = ({ widget, operations, disabled, pending, onAction }) => {
    const theme = useTheme();
    const [showModal, setShowModal] = useState(false);
    const [height, setHeight] = useState(0);
    const [width, setWidth] = useState(0);
    const reportedColor = widget.configuration?.runtime?.value ?? "#000000";
    const [color, setColor] = useState<string>(reportedColor);
    const [tempColor, setTempColor] = useState<string>(reportedColor);
    const isDisabled = disabled || pending;

    useEffect(() => {
        setColor(reportedColor);
        setTempColor(reportedColor);
    }, [widget.id, reportedColor]);

    const setColorValue = async (newColor: ColorFormatsObject) => {
        if (isDisabled) return;
        const accepted = await onAction(newColor.hex);
        if (accepted) {
            setColor(newColor.hex);
            setTempColor(newColor.hex);
        }
        if (showModal) setShowModal(false);
    };

    const onLayout = (event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setWidth(width);
        setHeight(height);
    };

    const openPicker = () => {
        if (isDisabled) return;
        setShowModal(true);
    };

    return (
        <Pressable
            accessibilityRole={operations ? "button" : undefined}
            accessibilityLabel={widget.name}
            accessibilityState={{ disabled: isDisabled, busy: pending }}
            {...widgetRemovalAccessibility(operations)}
            onLongPress={operations}
            onLayout={onLayout}
            style={styles.container}>
            {(height < 140 || width < 140) && (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Choose color for ${widget.name}`}
                    accessibilityState={{ disabled: isDisabled, busy: pending }}
                    {...widgetRemovalAccessibility(operations)}
                    disabled={isDisabled}
                    onPress={openPicker}
                    onLongPress={operations}
                    style={[
                        styles.colorButton,
                        { backgroundColor: color, ...shadowStyles.default },
                    ]}>
                    {pending ? (
                        <ActivityIndicator color={theme.current.colors.authForeground} />
                    ) : (
                        <Text size="medium" color="contrast" contrastingColor={color}>
                            {color}
                        </Text>
                    )}
                </Pressable>
            )}

            {height >= 140 && width >= 140 && isDisabled && (
                <View style={styles.largeDisabled}>
                    {pending && <ActivityIndicator color={theme.current.colors.authForeground} />}
                    <Text size="medium" color="complementary">
                        {widget.name}
                    </Text>
                </View>
            )}

            {height >= 140 && width >= 140 && !isDisabled && (
                <View style={styles.embeddedPicker}>
                    <ColorPicker
                        style={{ width: Math.min(width, height) }}
                        value={color}
                        onCompleteJS={(value) => void setColorValue(value)}>
                        <HueCircular
                            containerStyle={{
                                justifyContent: "center",
                                backgroundColor: theme.current.colors.background,
                            }}
                            thumbShape="pill">
                            <Panel1 style={styles.colorPanel} />
                        </HueCircular>
                    </ColorPicker>
                </View>
            )}

            <Modal
                visible={showModal}
                transparent
                animationType="fade"
                accessibilityViewIsModal
                onRequestClose={() => setShowModal(false)}>
                <Pressable style={styles.modalBackdrop} onPress={() => setShowModal(false)}>
                    <Pressable
                        onPress={(event) => event.stopPropagation()}
                        style={[
                            styles.modalContent,
                            { backgroundColor: theme.current.colors.background },
                        ]}>
                        <ColorPicker
                            style={styles.modalPicker}
                            value={tempColor}
                            onChangeJS={({ hex }) => setTempColor(hex)}>
                            <Preview />
                            <HueCircular
                                containerStyle={{ justifyContent: "center" }}
                                thumbShape="pill">
                                <Panel1 style={styles.colorPanel} />
                            </HueCircular>
                        </ColorPicker>

                        <View style={styles.modalActions}>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Confirm color"
                                accessibilityState={{ disabled: isDisabled, busy: pending }}
                                disabled={isDisabled}
                                style={styles.confirmButton}
                                onPress={() =>
                                    void setColorValue({ hex: tempColor } as ColorFormatsObject)
                                }>
                                {pending ? (
                                    <ActivityIndicator
                                        color={theme.current.colors.authForeground}
                                    />
                                ) : (
                                    <Text color="onBackground" size="medium" bold>
                                        Confirm
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </Pressable>
    );
};

export default ColorWidget;

const styles = StyleSheet.create({
    container: {
        width: "100%",
        height: "100%",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
    },
    colorButton: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
    },
    largeDisabled: { alignContent: "center", justifyContent: "center" },
    embeddedPicker: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContent: {
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    modalPicker: { width: 240, height: 270, gap: 10 },
    modalActions: {
        flexDirection: "row",
        marginTop: 16,
        justifyContent: "flex-end",
        width: 240,
    },
    confirmButton: {
        minWidth: 88,
        minHeight: 48,
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    colorPanel: {
        borderRadius: 16,
        width: "70%",
        height: "70%",
        alignSelf: "center",
    },
});
