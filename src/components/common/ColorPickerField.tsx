import React, { FC, useEffect, useRef, useState } from "react";
import { PressableProps, StyleSheet, Text, View } from "react-native";
import ColorPicker, { ColorFormatsObject, HueSlider, Panel1 } from "reanimated-color-picker";
import { CircleAlert } from "lucide-react-native";
import BottomSheetSelect from "@/components/common/BottomSheetSelect";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTheme } from "@/contexts/ThemeProvider";

export interface ColorPickerFieldProps {
    title: string;
    value: string;
    onConfirm: (hex: string) => boolean | Promise<boolean>;
    disabled?: boolean;
    pending?: boolean;
    error?: string;
    readOnly?: boolean;
    variant?: "field" | "tile";
    triggerProps?: Pick<
        PressableProps,
        "onLongPress" | "accessibilityActions" | "onAccessibilityAction"
    >;
}
const validHex = (value: string) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);

const ColorPickerField: FC<ColorPickerFieldProps> = ({
    title,
    value,
    onConfirm,
    disabled = false,
    pending = false,
    error = "",
    readOnly = false,
    variant = "field",
    triggerProps,
}) => {
    const { colors } = useTheme().current;
    const [draft, setDraft] = useState(value);
    const [localError, setLocalError] = useState("");
    const [failure, setFailure] = useState("");
    const [attempted, setAttempted] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const valueRef = useRef(value);
    const draftRef = useRef(value);
    const lastValid = useRef(validHex(value) ? value : "#000000");
    const dirty = useRef(false);
    const locked = useRef(false);
    const accepted = useRef(false);
    const availability = useRef({ disabled, pending, readOnly });
    valueRef.current = value;
    availability.current = { disabled, pending, readOnly };

    useEffect(() => {
        if (dirty.current || locked.current) return;
        draftRef.current = value;
        setDraft(value);
        if (validHex(value)) lastValid.current = value;
    }, [value]);

    const changeDraft = (next: string) => {
        if (
            locked.current ||
            availability.current.pending ||
            availability.current.disabled ||
            availability.current.readOnly
        )
            return;
        dirty.current = true;
        draftRef.current = next;
        setDraft(next);
        if (validHex(next)) lastValid.current = next;
        setLocalError("");
        setFailure("");
        setAttempted(false);
    };
    const reset = () => {
        dirty.current = false;
        accepted.current = false;
        draftRef.current = valueRef.current;
        setDraft(valueRef.current);
        if (validHex(valueRef.current)) lastValid.current = valueRef.current;
        setLocalError("");
        setFailure("");
        setAttempted(false);
    };
    const confirm = async (close: () => boolean) => {
        if (
            locked.current ||
            availability.current.disabled ||
            availability.current.pending ||
            availability.current.readOnly
        )
            return;
        const hex = draftRef.current;
        if (!validHex(hex)) {
            setLocalError("Enter a valid HEX color, such as #123 or #12AB34.");
            return;
        }
        locked.current = true;
        setConfirming(true);
        setLocalError("");
        setFailure("");
        setAttempted(true);
        try {
            if (await onConfirm(hex)) {
                accepted.current = true;
                locked.current = false;
                close();
            } else {
                setFailure("Couldn't apply this color. Try again.");
            }
        } catch {
            setFailure("Couldn't apply this color. Try again.");
        } finally {
            locked.current = false;
            setConfirming(false);
        }
    };
    const busy = pending || confirming;
    const swatch = (
        <View
            accessible={false}
            style={[
                styles.swatch,
                {
                    backgroundColor: validHex(value) ? value : "transparent",
                    borderColor: colors.authBorder,
                },
            ]}
        />
    );
    if (readOnly)
        return (
            <View style={styles.readOnly}>
                <Text style={[styles.label, { color: colors.authForeground }]}>{title}</Text>
                <View style={styles.readOnlyValue}>
                    {swatch}
                    <Text selectable style={[styles.value, { color: colors.authForeground }]}>
                        {value || "No color selected"}
                    </Text>
                </View>
            </View>
        );

    return (
        <View style={styles.field}>
            <BottomSheetSelect
                title={title}
                sheetTitle={
                    variant === "tile"
                        ? `Choose color for ${title}`
                        : `Choose ${title.toLowerCase()}`
                }
                value={value || "No color selected"}
                options={[]}
                leading={swatch}
                variant={variant}
                disabled={disabled || busy}
                busy={busy}
                triggerProps={triggerProps}
                keyboardAware
                dismissDisabled={() =>
                    !accepted.current && (locked.current || availability.current.pending)
                }
                onClosed={reset}
                renderOptions={(close) => (
                    <View style={styles.editor}>
                        <Input
                            variant="auth"
                            title="HEX"
                            placeholder="#12AB34"
                            value={draft}
                            setValue={changeDraft}
                            error={localError}
                            editable={!disabled}
                            accessibilityState={{ busy }}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <View style={styles.previewRow}>
                            <View
                                accessible
                                accessibilityLabel={`Color preview ${validHex(draft) ? draft : lastValid.current}`}
                                style={[
                                    styles.preview,
                                    {
                                        backgroundColor: validHex(draft)
                                            ? draft
                                            : lastValid.current,
                                        borderColor: colors.authBorder,
                                    },
                                ]}
                            />
                            <Text style={[styles.helper, { color: colors.authMuted }]}>
                                Color preview
                            </Text>
                        </View>
                        <View
                            pointerEvents={busy || disabled ? "none" : "auto"}
                            accessibilityState={{ disabled: busy || disabled }}>
                            <ColorPicker
                                value={validHex(draft) ? draft : lastValid.current}
                                onCompleteJS={(color: ColorFormatsObject) => changeDraft(color.hex)}
                                sliderThickness={48}
                                thumbSize={20}
                                boundedThumb
                                style={styles.picker}>
                                <Panel1 style={styles.panel} />
                                <View style={styles.hueTarget}>
                                    <HueSlider style={styles.hue} />
                                    <View
                                        pointerEvents="none"
                                        style={[
                                            styles.hueMask,
                                            styles.hueMaskTop,
                                            { backgroundColor: colors.authFieldBackground },
                                        ]}
                                    />
                                    <View
                                        pointerEvents="none"
                                        style={[
                                            styles.hueMask,
                                            styles.hueMaskBottom,
                                            { backgroundColor: colors.authFieldBackground },
                                        ]}
                                    />
                                </View>
                            </ColorPicker>
                        </View>
                        {attempted && !!(error || failure) && (
                            <Alert
                                icon={CircleAlert}
                                variant="destructive"
                                accessibilityRole="alert"
                                accessibilityLiveRegion="polite">
                                <AlertDescription>{error || failure}</AlertDescription>
                            </Alert>
                        )}
                        <View style={styles.actions}>
                            <Button
                                name="Cancel"
                                type="brand-outline"
                                loading={false}
                                disabled={busy}
                                style={styles.action}
                                onPress={() => {
                                    if (!locked.current && !availability.current.pending) close();
                                }}
                            />
                            <Button
                                name="Confirm"
                                accessibilityLabel="Confirm color"
                                type="auth"
                                loading={busy}
                                disabled={disabled || busy}
                                style={styles.action}
                                onPress={() => confirm(close)}
                            />
                        </View>
                    </View>
                )}
            />
            {variant === "field" && !!error && !attempted && (
                <Text
                    accessibilityLiveRegion="polite"
                    style={[styles.helper, { color: colors.error }]}>
                    {error}
                </Text>
            )}
        </View>
    );
};
export default ColorPickerField;
const styles = StyleSheet.create({
    field: { width: "100%", gap: 6 },
    readOnly: { gap: 8 },
    readOnlyValue: { flexDirection: "row", alignItems: "center", gap: 12 },
    label: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
    value: { fontSize: 16, lineHeight: 24 },
    swatch: { width: 32, height: 32, borderWidth: 1, borderRadius: 8 },
    editor: { gap: 16, paddingBottom: 4 },
    previewRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    preview: { width: 40, height: 40, borderWidth: 1, borderRadius: 8 },
    helper: { fontSize: 14, lineHeight: 20 },
    picker: { width: "100%", gap: 12 },
    panel: { height: 144, borderRadius: 10 },
    hueTarget: { height: 48 },
    hue: { height: 48, borderRadius: 8 },
    hueMask: { position: "absolute", left: 0, right: 0, height: 12 },
    hueMaskTop: { top: 0 },
    hueMaskBottom: { bottom: 0 },
    actions: { flexDirection: "row", gap: 8 },
    action: { flex: 1, width: undefined },
});
