import React, { PropsWithChildren } from "react";
import { shadowStyles } from "@/styles/shadowStyles";
import { useTheme } from "@/contexts/ThemeProvider";
import { View } from "react-native";

export default function ConditionResultTile({ children }: PropsWithChildren) {
    const theme = useTheme();

    return (
        <View
            style={[
                shadowStyles.default,
                {
                    height: 50,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 12,
                    paddingHorizontal: 15,
                    flexDirection: "row",
                    marginRight: 10,
                    backgroundColor: theme.current.colors.primary,
                },
            ]}>
            {children}
        </View>
    );
}
