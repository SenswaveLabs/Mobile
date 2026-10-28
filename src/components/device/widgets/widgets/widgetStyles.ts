import { StyleSheet } from "react-native";

export const widgetStyles = StyleSheet.create({
    compactInsets: { paddingHorizontal: 0 },
    tile: {
        width: "100%",
        height: "100%",
        minWidth: 48,
        minHeight: 48,
        borderWidth: 1,
        borderRadius: 12,
        padding: 8,
        gap: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    label: { fontSize: 14, lineHeight: 20, fontWeight: "600", textAlign: "center" },
    support: { fontSize: 14, lineHeight: 20, textAlign: "center" },
    readout: {
        fontSize: 24,
        lineHeight: 32,
        fontWeight: "500",
        fontVariant: ["tabular-nums"],
        textAlign: "center",
    },
});
