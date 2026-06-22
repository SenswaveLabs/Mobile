import { Platform, StyleSheet } from "react-native";

export const shadowStyles = StyleSheet.create({
    default: {
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 1, height: 1 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
});
