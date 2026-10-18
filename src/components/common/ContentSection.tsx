import React, { FC, ReactNode } from "react";
import { StyleSheet, Text as NativeText, View } from "react-native";
import { useTheme } from "@/contexts/ThemeProvider";

interface ContentSectionProps {
    title: string;
    helper?: ReactNode;
    headerAction?: ReactNode;
    actions?: ReactNode;
    separated?: boolean;
    children?: ReactNode;
}

const ContentSection: FC<ContentSectionProps> = ({
    title,
    helper,
    headerAction,
    actions,
    separated = false,
    children,
}) => {
    const { colors } = useTheme().current;
    return (
        <View
            style={[
                styles.section,
                separated && {
                    marginTop: 20,
                    paddingTop: 20,
                },
            ]}>
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <NativeText
                        accessibilityRole="header"
                        style={[styles.title, { color: colors.authForeground }]}>
                        {title}
                    </NativeText>
                    {headerAction}
                </View>
                {helper !== undefined &&
                    (typeof helper === "string" ? (
                        <NativeText style={[styles.helper, { color: colors.authMuted }]}>
                            {helper}
                        </NativeText>
                    ) : (
                        helper
                    ))}
            </View>
            {children !== undefined && children !== null && children !== false && (
                <View style={styles.content}>{children}</View>
            )}
            {actions !== undefined && actions !== null && actions !== false && (
                <View style={styles.actions}>{actions}</View>
            )}
        </View>
    );
};

export default ContentSection;

const styles = StyleSheet.create({
    section: { width: "100%" },
    header: { gap: 4 },
    titleRow: {
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    title: { flex: 1, minWidth: 0, fontSize: 20, lineHeight: 28, fontWeight: "600" },
    helper: { fontSize: 14, lineHeight: 20 },
    content: { marginTop: 16 },
    actions: { marginTop: 16, gap: 12 },
});
