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
    const hasContent = React.Children.toArray(children).length > 0;
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
                <View style={styles.heading}>
                    <NativeText
                        accessibilityRole="header"
                        style={[styles.title, { color: colors.authForeground }]}>
                        {title}
                    </NativeText>
                    {helper !== undefined &&
                        (typeof helper === "string" ? (
                            <NativeText style={[styles.helper, { color: colors.authMuted }]}>
                                {helper}
                            </NativeText>
                        ) : (
                            helper
                        ))}
                </View>
                {headerAction}
            </View>
            {hasContent && <View style={styles.content}>{children}</View>}
            {actions !== undefined && actions !== null && actions !== false && (
                <View style={styles.actions}>{actions}</View>
            )}
        </View>
    );
};

export default ContentSection;

const styles = StyleSheet.create({
    section: { width: "100%" },
    header: {
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    heading: { flex: 1, minWidth: 0, gap: 2 },
    title: { fontSize: 20, lineHeight: 28, fontWeight: "600" },
    helper: { fontSize: 14, lineHeight: 20 },
    content: { marginTop: 8 },
    actions: { marginTop: 8, gap: 12 },
});
