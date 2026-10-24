import Button from "@/components/common/Button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CircleAlert } from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeProvider";
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
    Text,
    View,
} from "react-native";
import { widgetStyles } from "./widgetStyles";

interface ColorWidgetProps {
    operations?: () => void;
    widget: CalculatedWidget;
    disabled: boolean;
    pending: boolean;
    onAction: (value: string | number | boolean) => Promise<boolean>;
    error?: string;
}

const ColorWidget: FC<ColorWidgetProps> = ({
    widget,
    operations,
    disabled,
    pending,
    onAction,
    error,
}) => {
    const { colors } = useTheme().current;
    const [showModal, setShowModal] = useState(false);
    const [height, setHeight] = useState(0);
    const [width, setWidth] = useState(0);
    const reportedColor = widget.configuration?.runtime?.value ?? "#000000";
    const [color, setColor] = useState<string>(reportedColor);
    const [tempColor, setTempColor] = useState<string>(reportedColor);
    const isDisabled = disabled || pending;
    const embedded = height >= 140 && width >= 140 && !isDisabled;

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
            if (showModal) setShowModal(false);
        }
    };

    const onLayout = (event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setWidth(width);
        setHeight(height);
    };

    const openPicker = () => {
        if (isDisabled) return;
        setTempColor(color);
        setShowModal(true);
    };

    const closePicker = () => {
        if (pending) return;
        setTempColor(color);
        setShowModal(false);
    };

    return (
        <Pressable
            accessibilityRole={operations ? "button" : undefined}
            accessibilityLabel={widget.name}
            accessibilityState={{ disabled: isDisabled, busy: pending }}
            {...widgetRemovalAccessibility(operations)}
            onLongPress={operations}
            onLayout={onLayout}
            style={
                embedded
                    ? [
                          widgetStyles.tile,
                          styles.container,
                          {
                              backgroundColor: colors.deviceTileSurface,
                              borderColor: colors.deviceTileBorder,
                          },
                      ]
                    : styles.container
            }>
            {!embedded && (
                <Pressable
                    cssInterop={false}
                    accessibilityRole="button"
                    accessibilityLabel={`Choose color for ${widget.name}`}
                    accessibilityState={{ disabled: isDisabled, busy: pending }}
                    {...widgetRemovalAccessibility(operations)}
                    disabled={isDisabled}
                    onPress={openPicker}
                    onLongPress={operations}
                    android_ripple={{ color: colors.authBorder }}
                    style={[
                        widgetStyles.tile,
                        styles.colorButton,
                        {
                            backgroundColor: colors.deviceTileSurface,
                            borderColor: colors.deviceTileBorder,
                        },
                    ]}>
                    <Text
                        numberOfLines={width >= 96 ? 1 : 2}
                        style={[
                            widgetStyles.label,
                            { color: disabled ? colors.authMuted : colors.authForeground },
                        ]}>
                        {widget.name}
                    </Text>
                    {pending ? (
                        <ActivityIndicator size="small" color={colors.authForeground} />
                    ) : (
                        <View
                            style={[
                                styles.swatch,
                                { backgroundColor: color, borderColor: colors.authBorder },
                            ]}
                        />
                    )}
                    {width >= 96 && (
                        <Text
                            numberOfLines={1}
                            style={[styles.colorValue, { color: colors.authMuted }]}>
                            {color}
                        </Text>
                    )}
                </Pressable>
            )}

            {embedded && (
                <View style={styles.embeddedPicker}>
                    <Text
                        numberOfLines={1}
                        style={[widgetStyles.label, { color: colors.authForeground }]}>
                        {widget.name}
                    </Text>
                    <ColorPicker
                        style={{ width: Math.max(0, Math.min(width - 18, height - 48)) }}
                        value={color}
                        onCompleteJS={(value) => void setColorValue(value)}>
                        <HueCircular
                            containerStyle={{
                                justifyContent: "center",
                                backgroundColor: colors.deviceTileSurface,
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
                onRequestClose={closePicker}>
                <Pressable style={styles.modalBackdrop} onPress={closePicker}>
                    <Pressable
                        onPress={(event) => event.stopPropagation()}
                        style={[styles.modalContent, { backgroundColor: colors.authBackground }]}>
                        <Text
                            accessibilityRole="header"
                            numberOfLines={2}
                            style={[styles.modalTitle, { color: colors.authForeground }]}>
                            {widget.name}
                        </Text>
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

                        {!!error && (
                            <Alert
                                icon={CircleAlert}
                                compact
                                variant="destructive"
                                accessibilityRole="alert"
                                accessibilityLiveRegion="polite"
                                style={styles.modalError}>
                                <AlertDescription compact>{error}</AlertDescription>
                            </Alert>
                        )}
                        <View style={styles.modalActions}>
                            <Button
                                name="Cancel"
                                type="brand-ghost"
                                loading={false}
                                disabled={pending}
                                style={styles.modalAction}
                                onPress={closePicker}
                            />
                            <Button
                                name="Confirm"
                                accessibilityLabel="Confirm color"
                                type="auth"
                                loading={pending}
                                disabled={disabled}
                                style={styles.modalAction}
                                onPress={() =>
                                    void setColorValue({ hex: tempColor } as ColorFormatsObject)
                                }
                            />
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
        alignItems: "center",
        justifyContent: "center",
    },
    colorButton: { gap: 4 },
    swatch: { width: 24, height: 24, borderRadius: 6, borderWidth: 1 },
    colorValue: { fontSize: 12, lineHeight: 18, textAlign: "center" },
    embeddedPicker: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    modalContent: {
        borderRadius: 12,
        padding: 16,
        width: "100%",
        maxWidth: 320,
        alignItems: "center",
        justifyContent: "center",
    },
    modalTitle: { fontSize: 20, lineHeight: 28, fontWeight: "600", textAlign: "center" },
    modalError: { width: "100%", marginTop: 12 },
    modalPicker: { width: "100%", gap: 12, marginTop: 16 },
    modalActions: {
        flexDirection: "row",
        marginTop: 16,
        justifyContent: "flex-end",
        width: "100%",
        gap: 8,
    },
    modalAction: { flex: 1, width: undefined },
    colorPanel: {
        borderRadius: 16,
        width: "70%",
        height: "70%",
        alignSelf: "center",
    },
});
