import React from "react";
import { View } from "react-native";
import JoinHomeForm from "@/components/homeSharing/JoinHomeForm";

function JoinHomePage() {
    return (
        <View
            style={{
                flex: 1,
            }}>
            <JoinHomeForm />
        </View>
    );
}

export default JoinHomePage;
