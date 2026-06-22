import { useTheme } from "@/contexts/ThemeProvider";
import { FC } from "react";
import { View, ViewProps } from "react-native";
import Text from "./Text";
import Icon from "./Icon";

interface UserNoteProps extends ViewProps {
    text: string;
    numberOfLines?: number;
    ellipsizeMode?: "head" | "middle" | "tail" | "clip";
}

const UserNote: FC<UserNoteProps> = ({
    text,
    style,
    numberOfLines = 3,
    ellipsizeMode = "tail",
    ...props
}) => {
    const theme = useTheme();

    return (
        <View style={[{ width: "100%", paddingHorizontal: 12 }, style]} {...props}>
            <View
                style={{
                    borderColor: theme.current.colors.info,
                    backgroundColor: theme.current.colors.info + "14",
                    paddingHorizontal: 8,
                    paddingVertical: 5,
                    borderWidth: 2,
                    borderRadius: 12,
                    flexDirection: "row",
                    gap: 8,
                }}>
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                    }}>
                    <Icon icon="information-circle-outline" size={24} color="info" />
                </View>
                <View style={{ flex: 1, justifyContent: "center" }}>
                    <Text
                        size={"small"}
                        color={"info"}
                        numberOfLines={numberOfLines}
                        ellipsizeMode={ellipsizeMode}>
                        {text}
                    </Text>
                </View>
            </View>
        </View>
    );
};

export default UserNote;
