import { useTheme } from "@/contexts/ThemeProvider";
import { FC, PropsWithChildren } from "react";
import { StyleSheet } from "react-native";
import MarkdownDisplay, {
    MarkdownProps as NativeMarkdownProps,
} from "react-native-markdown-display";

const Markdown: FC<PropsWithChildren<NativeMarkdownProps>> = (props) => {
    const theme = useTheme();

    return (
        <MarkdownDisplay
            {...props}
            style={{
                ...styles,
                body: { ...styles.body, color: theme.current.colors.authForeground },
                link: {
                    color: theme.current.colors.authForeground,
                    textDecorationLine: "underline",
                },
                hr: { backgroundColor: theme.current.colors.authBorder },
                ...props.style,
            }}
        />
    );
};

export default Markdown;
const styles = StyleSheet.create({ body: { fontSize: 16, lineHeight: 24 } });
