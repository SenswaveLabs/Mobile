import { useTheme } from "@/contexts/ThemeProvider";
import { FC } from "react";
import { StyleSheet, View, ViewProps } from "react-native";

const Divider: FC<ViewProps> = ({ style, ...props }) => {
    const { colors } = useTheme().current;
    return (
        <View
            {...props}
            accessible={false}
            style={[styles.line, { backgroundColor: colors.authBorder }, style]}
        />
    );
};
export default Divider;
const styles = StyleSheet.create({ line: { height: 1, width: "100%", marginVertical: 15 } });
