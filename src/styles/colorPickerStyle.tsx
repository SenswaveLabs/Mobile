import { StyleSheet } from "react-native";

export const colorPickerStyle = StyleSheet.create({
    picker: {
        gap: 20,
    },
    pickerContainer: {
        alignSelf: "center",
        width: "100%",
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 5,
        },
        shadowOpacity: 0.34,
        shadowRadius: 6.27,

        elevation: 10,
    },
    sliderStyle: {
        borderRadius: 20,
        width: "100%",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,

        elevation: 5,
    },
    sliderTitle: {
        color: "#000",
        fontWeight: "bold",
        marginBottom: 5,
        paddingHorizontal: 4,
        fontFamily: "Quicksand",
    },
});
