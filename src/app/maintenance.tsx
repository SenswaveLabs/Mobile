import Button from "@/components/common/Button";
import Text from "@/components/common/Text";
import { useTheme } from "@/contexts/ThemeProvider";
import { useSession } from "@/contexts/SessionProvider";
import { useFocusEffect, useRouter } from "expo-router";
import { FC, useCallback, useEffect, useRef, useState } from "react";
import { Image, RefreshControl, ScrollView, StyleSheet, View } from "react-native";

const ForceUpgradePage: FC = () => {
    const router = useRouter();
    const session = useSession();
    const theme = useTheme();
    const routerRef = useRef(router);
    const sessionRef = useRef(session);
    const focusedRef = useRef(false);
    const focusEpochRef = useRef(0);
    const inFlightRef = useRef(false);
    const attemptRef = useRef(0);
    const [refreshing, setRefreshing] = useState(false);
    const [completedAttempt, setCompletedAttempt] = useState(0);
    const [error, setError] = useState(false);

    routerRef.current = router;
    sessionRef.current = session;

    useFocusEffect(
        useCallback(() => {
            focusedRef.current = true;
            focusEpochRef.current++;
            return () => {
                focusedRef.current = false;
                focusEpochRef.current++;
            };
        }, []),
    );

    const retry = useCallback(async () => {
        if (inFlightRef.current) return;

        inFlightRef.current = true;
        const attempt = ++attemptRef.current;
        const focusEpoch = focusEpochRef.current;
        const isCurrent = () => focusedRef.current && focusEpochRef.current === focusEpoch;
        setRefreshing(true);
        setCompletedAttempt(0);
        setError(false);

        try {
            await sessionRef.current.initialize();
            if (isCurrent()) setCompletedAttempt(attempt);
        } catch {
            if (isCurrent()) setError(true);
        } finally {
            inFlightRef.current = false;
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (!completedAttempt || !focusedRef.current || attemptRef.current !== completedAttempt)
            return;

        const current = sessionRef.current;
        if (current.maintenance || current.session.loading || current.session.authenticated) return;

        routerRef.current.replace("/start");
    }, [
        completedAttempt,
        session.maintenance,
        session.session.loading,
        session.session.authenticated,
    ]);

    return (
        <ScrollView
            style={[styles.scroll, { backgroundColor: theme.current.colors.background }]}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={retry} />}>
            <View style={styles.message}>
                <Image
                    source={require("../assets/icon.png")}
                    style={styles.logo}
                    accessible={false}
                />
                <Text size="large" color="complementary" numberOfLines={0}>
                    Senswave is under maintenance
                </Text>
                <Text size="small" color="onBackground" numberOfLines={0}>
                    The service is unavailable or this app may need an update. Try again later.
                </Text>
                {error && (
                    <Text size="small" color="error" numberOfLines={0}>
                        We couldn't check the service status. Try again.
                    </Text>
                )}
            </View>
            <Button name="Retry" loading={refreshing} type="brand-outline" onPress={retry} />
        </ScrollView>
    );
};

export default ForceUpgradePage;

const styles = StyleSheet.create({
    scroll: { flex: 1 },
    content: {
        flexGrow: 1,
        width: "100%",
        maxWidth: 448,
        alignSelf: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
        paddingVertical: 24,
        gap: 24,
    },
    message: { alignItems: "center", gap: 12 },
    logo: { width: 96, height: 96, borderRadius: 16 },
});
