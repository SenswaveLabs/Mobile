import React, { FC, ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/contexts/ThemeProvider";

interface FormSectionProps {
    title: string;
    helper: string;
    actions?: ReactNode;
    separated?: boolean;
    children: ReactNode;
}

const FormSection: FC<FormSectionProps> = ({
    title,
    helper,
    actions,
    separated = false,
    children,
}) => {
    const { colors } = useTheme().current;

    return (
        <View style={separated && styles.separated}>
            <View style={styles.fields}>
                <View style={styles.intro}>
                    <Text
                        accessibilityRole="header"
                        style={[styles.title, { color: colors.authForeground }]}>
                        {title}
                    </Text>
                    <Text style={[styles.helper, { color: colors.authMuted }]}>{helper}</Text>
                </View>
                {children}
            </View>
            {!!actions && <View style={styles.actions}>{actions}</View>}
        </View>
    );
};

export default FormSection;

const styles = StyleSheet.create({
    separated: { marginTop: 40 },
    fields: { gap: 24 },
    intro: { gap: 8 },
    title: { fontSize: 24, lineHeight: 32, fontWeight: "600" },
    helper: { fontSize: 14, lineHeight: 20 },
    actions: { paddingTop: 24, gap: 12 },
});
