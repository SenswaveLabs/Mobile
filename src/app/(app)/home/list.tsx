import HomeList from "@/components/home/lists/HomeList";
import { useTheme } from "@/contexts/ThemeProvider";
import { useRouter } from "expo-router";
import React, { FC } from "react";
import { StyleSheet, View } from "react-native";

const Homes: FC = () => {
    const router = useRouter();
    const { colors } = useTheme().current;

    return (
        <View style={[styles.container, { backgroundColor: colors.authBackground }]}>
            <HomeList
                onCreateHome={() => router.push("home/add")}
                onJoinHome={() => router.push("home/join")}
            />
        </View>
    );
};

export default Homes;

const styles = StyleSheet.create({ container: { flex: 1 } });
