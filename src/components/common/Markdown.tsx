import { useTheme } from "@/contexts/ThemeProvider";
import { FC, PropsWithChildren } from "react";
import MarkdownDisplay, {
    MarkdownProps as NativeMarkdownProps,
} from "react-native-markdown-display";

const Markdown: FC<PropsWithChildren<NativeMarkdownProps>> = (props) => {
    const theme = useTheme();

    return (
        <MarkdownDisplay
            style={{
                body: { color: theme.current.colors.textOnBackground },
            }}
            {...props}>
            {props.children}
        </MarkdownDisplay>
    );
};

export default Markdown;
