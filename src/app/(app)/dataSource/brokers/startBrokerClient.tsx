import Button from "@/components/common/Button";
import { Text } from "@/components/ui/text";
import StartBrokerClientForm from "@/components/dataSource/brokers/StartBrokerClientForm";
import { useTheme } from "@/contexts/ThemeProvider";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { FC } from "react";
import { StyleSheet, View } from "react-native";

const StartClient: FC = () => {
    const params = useLocalSearchParams();
    const router = useRouter();
    const { colors } = useTheme().current;
    const rawBrokerId = Array.isArray(params.brokerId) ? params.brokerId[0] : params.brokerId;
    const brokerId = typeof rawBrokerId === "string" ? rawBrokerId : undefined;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {brokerId?.trim() ? (
                <StartBrokerClientForm key={brokerId} brokerId={brokerId} />
            ) : (
                <View style={styles.recovery}>
                    <View style={styles.recoveryContent}>
                        <Text
                            accessibilityRole="header"
                            style={[styles.recoveryTitle, { color: colors.authForeground }]}>
                            Broker not found
                        </Text>
                        <Text style={[styles.recoveryHelper, { color: colors.authMuted }]}>
                            Return to your data sources and choose a broker.
                        </Text>
                        <Button
                            name="Return to data sources"
                            type="auth"
                            loading={false}
                            onPress={() => router.replace("/dataSource/list")}
                            style={styles.recoveryButton}
                        />
                    </View>
                </View>
            )}
        </View>
    );
};

export default StartClient;

const styles = StyleSheet.create({
    container: { flex: 1 },
    recovery: { flex: 1, paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16 },
    recoveryContent: { width: "100%", maxWidth: 448, alignSelf: "center", gap: 12 },
    recoveryTitle: { fontSize: 24, lineHeight: 32, fontWeight: "600" },
    recoveryHelper: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
    recoveryButton: { width: "100%" },
});
