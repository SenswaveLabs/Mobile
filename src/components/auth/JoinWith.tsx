import { useTheme } from "@/contexts/ThemeProvider";
import { View } from "react-native";
import Text from "../common/Text";
import React from "react";
import GoogleSignInButton from "./GoogleSignInButton";

const JoinWith: React.FC = () => {
    const theme = useTheme();

    return (
        <View>
            <View
                style={{
                    flexDirection: "row",
                    padding: 35,
                    paddingHorizontal: 0,
                    alignItems: "center",
                    justifyContent: "center",
                }}>
                <View
                    style={{
                        backgroundColor: theme.current.colors.secondary,
                        height: 2,
                        width: "100%",
                        opacity: 0.6,
                    }}
                />

                <View
                    style={{
                        backgroundColor: theme.current.colors.background,
                        paddingHorizontal: 8,
                        position: "absolute",
                        height: 26,
                        justifyContent: "center",
                        alignSelf: "center",
                    }}>
                    <Text size={"small"} color={"onBackground"} bold>
                        or Join with
                    </Text>
                </View>
            </View>

            <View style={{ alignItems: "center", justifyContent: "center" }}>
                <GoogleSignInButton />
            </View>
        </View>
    );
};

export default JoinWith;
