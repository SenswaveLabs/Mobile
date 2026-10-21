import React, { FC, ReactNode } from "react";
import {
    ActivityIndicator,
    Pressable,
    PressableProps,
    StyleSheet,
    Text as NativeText,
    View,
} from "react-native";
import { useTheme } from "@/contexts/ThemeProvider";

interface ListRowProps {
    title: ReactNode;
    description?: ReactNode;
    leading?: ReactNode;
    trailing?: ReactNode;
    onPress?: PressableProps["onPress"];
    onLongPress?: PressableProps["onLongPress"];
    disabled?: boolean;
    selected?: boolean;
    separator?: boolean;
    loading?: boolean;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    children?: ReactNode;
}

const ListRow: FC<ListRowProps> = ({
    title,
    description,
    leading,
    trailing,
    onPress,
    onLongPress,
    disabled = false,
    selected = false,
    separator = false,
    loading = false,
    accessibilityLabel,
    accessibilityHint,
    children,
}) => {
    const { colors } = useTheme().current;
    const content = (
        <>
            {leading && <View style={styles.leading}>{leading}</View>}
            <View style={styles.body}>
                {typeof title === "string" ? (
                    <NativeText style={[styles.title, { color: colors.authForeground }]}>
                        {title}
                    </NativeText>
                ) : (
                    title
                )}
                {description !== undefined &&
                    (typeof description === "string" ? (
                        <NativeText style={[styles.description, { color: colors.authMuted }]}>
                            {description}
                        </NativeText>
                    ) : (
                        description
                    ))}
                {children}
            </View>
        </>
    );

    return (
        <View
            style={[
                styles.row,
                separator && styles.separator,
                { borderBottomColor: colors.authBorder, backgroundColor: colors.authBackground },
                selected && {
                    borderColor: colors.authPrimary,
                    borderBottomColor: colors.authPrimary,
                    backgroundColor: colors.authPrimary + "14",
                },
                selected && styles.selected,
                disabled && styles.disabled,
            ]}>
            {onPress || onLongPress ? (
                <Pressable
                    cssInterop={false}
                    accessibilityRole="button"
                    accessibilityLabel={accessibilityLabel}
                    accessibilityHint={accessibilityHint}
                    accessibilityState={{ selected, disabled, busy: loading }}
                    disabled={disabled}
                    onPress={onPress}
                    onLongPress={onLongPress}
                    android_ripple={{ color: colors.authBorder }}
                    style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
                    {content}
                </Pressable>
            ) : (
                <View style={styles.main}>{content}</View>
            )}
            {loading && !trailing ? (
                <ActivityIndicator accessible={false} color={colors.authForeground} />
            ) : (
                trailing
            )}
        </View>
    );
};

export default ListRow;

const styles = StyleSheet.create({
    row: {
        width: "100%",
        minHeight: 72,
        paddingHorizontal: 12,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    separator: { borderBottomWidth: StyleSheet.hairlineWidth },
    main: {
        flex: 1,
        minWidth: 0,
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    leading: { alignItems: "center", justifyContent: "center" },
    body: { flex: 1, minWidth: 0, justifyContent: "center", gap: 4 },
    title: { fontSize: 16, lineHeight: 24, fontWeight: "600", flexShrink: 1 },
    description: { fontSize: 14, lineHeight: 20, flexShrink: 1 },
    selected: { borderWidth: 1, borderRadius: 8 },
    disabled: { opacity: 0.6 },
    pressed: { opacity: 0.72 },
});
