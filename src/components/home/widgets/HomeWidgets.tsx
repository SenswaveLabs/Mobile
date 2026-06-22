import React from "react";
import { ScrollView, View } from "react-native";
import HomeStateWidget from "./HomeStateWidget";

interface HomeWidgetsProperties {
    padding?: {
        top?: number;
        left?: number;
        right?: number;
        bottom?: number;
    };
}

export default function HomeWidgets({
    padding = { top: 0, left: 0, right: 0, bottom: 0 },
}: HomeWidgetsProperties) {
    return (
        <ScrollView
            style={{
                width: "100%",
                flexDirection: "row",
                paddingTop: padding!.top,
                paddingLeft: padding!.left,
                paddingRight: padding!.right,
                paddingBottom: padding!.bottom,
            }}
            horizontal={true}
            showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row" }}>
                <HomeStateWidget />
            </View>
        </ScrollView>
    );
}
