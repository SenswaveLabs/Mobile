import Button from "@/components/common/Button";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { useToast } from "@/contexts/ToastProvider";
import { ListResponse } from "@/utils/httpClient";
import React, { FC, useCallback, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from "react-native";
import HomeListItem from "./HomeListItem";
import { useFocusEffect, useRouter } from "expo-router";
import { Home } from "@/types/HomeTypes";

interface HomeListProps {
    onCreateHome: () => void;
    onJoinHome: () => void;
}

const HomeList: FC<HomeListProps> = ({ onCreateHome, onJoinHome }) => {
    const homes = useHomes();
    const httpClient = useHttpClient();
    const router = useRouter();
    const { colors } = useTheme().current;
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [homesList, setHomesList] = useState<Home[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [switchError, setSwitchError] = useState<{ homeId: string; message: string }>();
    const [switchingId, setSwitchingId] = useState<string>();
    const requestId = useRef(0);
    const switching = useRef(false);

    const loadHomes = useCallback(
        async (refresh = false) => {
            if (switching.current) return;
            const id = ++requestId.current;
            setLoading(true);
            setRefreshing(refresh);
            setLoadError("");
            try {
                const result = await httpClient.get("v1/homes");
                if (!result.isSuccess || !result.response) throw new Error("Homes unavailable");
                const data = (await result.response.json()) as ListResponse<Home>;
                if (!Array.isArray(data.items)) throw new Error("Invalid homes response");
                if (id === requestId.current) setHomesList(data.items);
            } catch {
                if (id === requestId.current) setLoadError("Couldn't load homes. Try again.");
            } finally {
                if (id === requestId.current) {
                    setLoading(false);
                    setRefreshing(false);
                }
            }
        },
        [httpClient],
    );

    useFocusEffect(
        useCallback(() => {
            void loadHomes();
            return () => {
                requestId.current++;
            };
        }, [loadHomes]),
    );

    const returnToDashboard = () => {
        if (router.canGoBack()) router.back();
        else router.replace("/");
    };

    const selectHome = async (home: Home) => {
        if (switching.current) return;
        if (home.id === homes.current?.id) {
            returnToDashboard();
            return;
        }
        switching.current = true;
        setSwitchingId(home.id);
        setSwitchError(undefined);
        const id = requestId.current;
        try {
            const success = await homes.setCurrent(home.id);
            if (id !== requestId.current) return;
            if (success) returnToDashboard();
            else throw new Error("Home switch failed");
        } catch {
            if (id === requestId.current) {
                const message = "Couldn't switch homes. Tap this home to try again.";
                setSwitchError({ homeId: home.id, message });
                toast.error(message);
            }
        } finally {
            switching.current = false;
            setSwitchingId(undefined);
        }
    };

    const availableHomes = homesList.filter((home) => home.id !== homes.current?.id);
    const disabled = !!switchingId;

    return (
        <FlatList
            data={availableHomes}
            keyExtractor={(home) => home.id}
            style={styles.list}
            contentContainerStyle={styles.content}
            ListHeaderComponent={
                <View style={styles.header}>
                    <View style={styles.intro}>
                        <Text
                            accessibilityRole="header"
                            style={[styles.title, { color: colors.authForeground }]}>
                            Choose a home
                        </Text>
                        <Text style={[styles.description, { color: colors.authMuted }]}>
                            Switch homes to control their rooms, devices and automations.
                        </Text>
                    </View>
                    {homes.current && (
                        <View style={styles.currentSection}>
                            <HomeListItem
                                home={homes.current}
                                selected
                                disabled={disabled}
                                onPress={() => void selectHome(homes.current!)}
                            />
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Home details"
                                disabled={disabled}
                                accessibilityState={{ disabled }}
                                onPress={() => router.navigate("home/details")}
                                style={({ pressed }) => [
                                    styles.details,
                                    (pressed || disabled) && styles.dimmed,
                                ]}>
                                <Text style={[styles.link, { color: colors.authForeground }]}>
                                    Home details
                                </Text>
                            </Pressable>
                        </View>
                    )}
                    <Text
                        accessibilityRole="header"
                        style={[styles.sectionTitle, { color: colors.authForeground }]}>
                        Other homes
                    </Text>
                    {!!loadError && (
                        <View style={styles.error}>
                            <Text
                                accessibilityRole="alert"
                                accessibilityLiveRegion="polite"
                                style={[styles.message, { color: colors.error }]}>
                                {loadError}
                            </Text>
                            <Button
                                name="Retry"
                                type="brand-outline"
                                loading={loading}
                                disabled={disabled}
                                onPress={() => void loadHomes()}
                            />
                        </View>
                    )}
                    {loading && !refreshing && homesList.length > 0 && (
                        <ActivityIndicator
                            accessibilityLabel="Refreshing homes"
                            color={colors.authForeground}
                        />
                    )}
                </View>
            }
            renderItem={({ item }) => (
                <HomeListItem
                    home={item}
                    disabled={disabled}
                    loading={switchingId === item.id}
                    error={switchError?.homeId === item.id ? switchError.message : undefined}
                    onPress={() => void selectHome(item)}
                />
            )}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => void loadHomes(true)}
                    colors={[colors.authForeground]}
                    tintColor={colors.authForeground}
                />
            }
            ListEmptyComponent={
                loading ? (
                    <View style={styles.empty}>
                        <ActivityIndicator
                            accessibilityLabel="Loading homes"
                            color={colors.authForeground}
                        />
                    </View>
                ) : !loadError ? (
                    <Text style={[styles.empty, styles.description, { color: colors.authMuted }]}>
                        No other homes yet. Create one or join a home shared with you.
                    </Text>
                ) : null
            }
            ListFooterComponentStyle={styles.footer}
            ListFooterComponent={
                <View style={styles.actions}>
                    <Button
                        name="Create home"
                        type="brand-outline"
                        loading={false}
                        disabled={disabled}
                        onPress={onCreateHome}
                    />
                    <Button
                        name="Join home"
                        type="brand-outline"
                        loading={false}
                        disabled={disabled}
                        onPress={onJoinHome}
                    />
                </View>
            }
        />
    );
};

export default HomeList;

const styles = StyleSheet.create({
    list: { flex: 1 },
    content: {
        flexGrow: 1,
        width: "100%",
        maxWidth: 640,
        alignSelf: "center",
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 32,
    },
    header: { gap: 24, paddingBottom: 8 },
    intro: { gap: 8 },
    title: { fontSize: 30, fontWeight: "600" },
    description: { fontSize: 16, lineHeight: 24 },
    currentSection: { gap: 8 },
    details: {
        minHeight: 48,
        minWidth: 48,
        alignSelf: "flex-start",
        justifyContent: "center",
        paddingHorizontal: 8,
    },
    link: { fontSize: 16, fontWeight: "500", textDecorationLine: "underline" },
    sectionTitle: { fontSize: 18, fontWeight: "600" },
    message: { fontSize: 14, lineHeight: 20 },
    error: { gap: 12 },
    empty: { paddingVertical: 24 },
    footer: { flexGrow: 1, justifyContent: "flex-end", paddingTop: 32 },
    actions: { gap: 12 },
    dimmed: { opacity: 0.6 },
});
