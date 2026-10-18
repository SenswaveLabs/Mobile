import React, { FC, useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, StyleSheet, View } from "react-native";
import { useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import { CircleAlert, MapPin } from "lucide-react-native";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/contexts/ThemeProvider";
import LocationMapPicker from "@/components/home/LocationMapPicker";
import Button from "./Button";

interface LocalizationSelectorProps {
    onSelectLocation: (latitude: number, longitude: number) => void;
    initLocation: { latitude?: number; longitude?: number };
    disabled?: boolean;
    onLoadingChange?: (loading: boolean) => void;
    showDescription?: boolean;
}

const LocalizationSelector: FC<LocalizationSelectorProps> = ({
    onSelectLocation,
    initLocation: { latitude, longitude },
    disabled = false,
    onLoadingChange,
    showDescription = true,
}) => {
    const { colors } = useTheme().current;
    const [address, setAddress] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [mapOpen, setMapOpen] = useState(false);
    const pending = useRef<"gps" | "map" | null>(null);
    const active = useRef(true);

    useFocusEffect(
        useCallback(() => {
            active.current = true;
            return () => {
                active.current = false;
                if (pending.current === "map") {
                    pending.current = null;
                    setMapOpen(false);
                    onLoadingChange?.(false);
                }
            };
        }, [onLoadingChange]),
    );

    useEffect(() => {
        let current = true;
        setAddress("");
        if (latitude === undefined || longitude === undefined) return;
        void Location.reverseGeocodeAsync({ latitude, longitude })
            .then((places) => {
                const place = places[0];
                if (current && place)
                    setAddress(
                        [
                            [place.streetNumber, place.street].filter(Boolean).join(" "),
                            place.city,
                            place.region,
                        ]
                            .filter(Boolean)
                            .join(", "),
                    );
            })
            .catch(() => {
                // The selected place stays usable when its address is unavailable.
            });
        return () => {
            current = false;
        };
    }, [latitude, longitude]);

    const loadLocation = async () => {
        if (pending.current || disabled || !active.current) return;
        pending.current = "gps";
        setLoading(true);
        setError("");
        onLoadingChange?.(true);
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try {
            const request = async () => {
                const permission = await Location.requestForegroundPermissionsAsync();
                if (permission.status !== "granted")
                    throw new Error("Allow location access in system settings, then try again.");
                return Location.getCurrentPositionAsync({});
            };
            const location = await Promise.race([
                request(),
                new Promise<never>((_, reject) => {
                    timeout = setTimeout(
                        () =>
                            reject(new Error("Location timed out. Try again or save without it.")),
                        10000,
                    );
                }),
            ]);
            if (active.current)
                onSelectLocation(location.coords.latitude, location.coords.longitude);
        } catch (failure) {
            if (active.current)
                setError(
                    failure instanceof Error
                        ? failure.message
                        : "Couldn't get your location. Try again.",
                );
        } finally {
            clearTimeout(timeout);
            pending.current = null;
            setLoading(false);
            onLoadingChange?.(false);
        }
    };

    const closeMap = () => {
        pending.current = null;
        setMapOpen(false);
        onLoadingChange?.(false);
    };

    return (
        <View style={styles.container}>
            <View style={styles.intro}>
                <Text style={[styles.label, { color: colors.authForeground }]}>
                    Location (optional)
                </Text>
                {showDescription && (
                    <Text style={[styles.description, { color: colors.authMuted }]}>
                        Helps select the nearest home. You can add it later.
                    </Text>
                )}
            </View>
            <View style={styles.location}>
                <MapPin accessible={false} size={20} color={colors.authMuted} />
                <Text
                    style={[styles.description, styles.address, { color: colors.authForeground }]}>
                    {address ||
                        (latitude !== undefined && longitude !== undefined
                            ? "Selected location"
                            : "No location selected")}
                </Text>
            </View>
            {!!error && (
                <Alert
                    icon={CircleAlert}
                    variant="destructive"
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            <View style={styles.actions}>
                <Button
                    name="Choose on map"
                    type="brand-outline"
                    style={styles.action}
                    loading={false}
                    disabled={disabled || loading || mapOpen}
                    onPress={() => {
                        if (pending.current || disabled || !active.current) return;
                        Keyboard.dismiss();
                        pending.current = "map";
                        setError("");
                        setMapOpen(true);
                        onLoadingChange?.(true);
                    }}
                />
                <Button
                    name={
                        latitude !== undefined && longitude !== undefined
                            ? "Update location"
                            : "Use current location"
                    }
                    type="brand-ghost"
                    style={styles.action}
                    loading={loading}
                    disabled={disabled || mapOpen}
                    onPress={loadLocation}
                />
            </View>
            {mapOpen && (
                <LocationMapPicker
                    initialLocation={{ latitude, longitude }}
                    onCancel={closeMap}
                    onConfirm={(lat, lng) => {
                        if (active.current) onSelectLocation(lat, lng);
                        closeMap();
                    }}
                />
            )}
        </View>
    );
};

export default LocalizationSelector;

const styles = StyleSheet.create({
    container: { gap: 12 },
    intro: { gap: 4 },
    location: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
    address: { flex: 1 },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    action: { flexGrow: 1, flexBasis: 160, width: "auto" },
    label: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
    description: { fontSize: 14, lineHeight: 20 },
});
