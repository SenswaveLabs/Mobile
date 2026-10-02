import HomeList from "@/components/home/lists/HomeList";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { Redirect, useRouter } from "expo-router";
import React, { FC } from "react";
import { StyleSheet, View } from "react-native";

const Homes: FC = () => {
    const router = useRouter();
    const homes = useHomes();
    const { colors } = useTheme().current;

    if (!homes.loading && !homes.current) return <Redirect href="/" />;

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
