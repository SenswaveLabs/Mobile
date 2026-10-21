import React, { FC, useEffect, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import {
    Camera,
    Map,
    LogManager,
    MapRef,
    StyleSpecification,
    TransformRequestManager,
} from "@maplibre/maplibre-react-native";
import { CircleAlert, MapPin } from "lucide-react-native";
import Button from "@/components/common/Button";
import SenswaveModal from "@/components/common/SenswaveModal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/contexts/ThemeProvider";

export interface LocationMapPickerProps {
    initialLocation: { latitude?: number; longitude?: number };
    onConfirm: (latitude: number, longitude: number) => void;
    onCancel: () => void;
}

TransformRequestManager.addHeader({
    id: "senswave-osm-user-agent",
    name: "User-Agent",
    value: "Senswave mobile (https://senswave.net)",
    match: /^https:\/\/tile\.openstreetmap\.org\//,
});

const mapStyle: StyleSpecification = {
    version: 8,
    sources: {
        osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
            maxzoom: 19,
        },
    },
    layers: [{ id: "osm", type: "raster", source: "osm" }],
};

const LocationMapPicker: FC<LocationMapPickerProps> = ({
    initialLocation,
    onConfirm,
    onCancel,
}) => {
    const { colors } = useTheme().current;
    const map = useRef<MapRef>(null);
    const active = useRef(true);
    const pending = useRef(false);
    const loadFailed = useRef(false);
    const [ready, setReady] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0);
    const { latitude, longitude } = initialLocation;
    const located = latitude !== undefined && longitude !== undefined;
    const [center, setCenter] = useState<[number, number]>([
        located ? longitude : 21.0122,
        located ? latitude : 52.2297,
    ]);

    useEffect(() => {
        active.current = true;
        // Native tile failures do not trigger the map's style-load error callback.
        LogManager.onLog(({ level }) => {
            if (!active.current || level !== "error") return false;
            loadFailed.current = true;
            setReady(false);
            setError("Couldn't load the map. Check your connection and retry.");
            return true;
        });
        return () => {
            active.current = false;
            LogManager.onLog(() => false);
        };
    }, []);

    useEffect(() => {
        if (ready || error) return;
        const timeout = setTimeout(() => {
            setError("Map loading timed out. Check your connection and retry.");
        }, 10000);
        return () => clearTimeout(timeout);
    }, [ready, attempt, error]);

    const cancel = () => {
        active.current = false;
        onCancel();
    };

    const confirm = async () => {
        if (!ready || loadFailed.current || pending.current || !active.current || !map.current)
            return;
        pending.current = true;
        setLoading(true);
        setError("");
        try {
            const [lng, lat] = await map.current.getCenter();
            if (
                !Number.isFinite(lat) ||
                !Number.isFinite(lng) ||
                Math.abs(lat) > 90 ||
                Math.abs(lng) > 180
            )
                throw new Error("Couldn't read this location. Move the map and try again.");
            if (active.current && !loadFailed.current) onConfirm(lat, lng);
        } catch {
            if (active.current)
                setError("Couldn't read this location. Move the map and try again.");
        } finally {
            pending.current = false;
            setLoading(false);
        }
    };

    return (
        <SenswaveModal visible variant="brand" title="Choose location" onClose={cancel}>
            <ScrollView style={styles.fill} contentContainerStyle={styles.content}>
                <Text style={[styles.description, { color: colors.authMuted }]}>
                    Move and zoom the map to place your home under the pin.
                </Text>
                <View style={[styles.map, { backgroundColor: colors.authFieldBackground }]}>
                    <Map
                        key={attempt}
                        ref={map}
                        style={styles.fill}
                        mapStyle={mapStyle}
                        accessible
                        accessibilityRole="image"
                        accessibilityLabel={
                            "Home location map. Pan and zoom to move the center pin. Latitude " +
                            center[1].toFixed(5) +
                            ", longitude " +
                            center[0].toFixed(5)
                        }
                        attribution={false}
                        touchRotate={false}
                        touchPitch={false}
                        onRegionDidChange={({ nativeEvent }) => {
                            const [lng, lat] = nativeEvent.center;
                            if (Number.isFinite(lat) && Number.isFinite(lng)) setCenter([lng, lat]);
                        }}
                        onDidFinishRenderingMapFully={() => {
                            if (!ready && !loadFailed.current) {
                                setReady(true);
                                setError("");
                            }
                        }}
                        onDidFailLoadingMap={() => {
                            loadFailed.current = true;
                            setReady(false);
                            setError("Couldn't load the map. Check your connection and retry.");
                        }}>
                        <Camera
                            initialViewState={{
                                center: located ? [longitude, latitude] : [21.0122, 52.2297],
                                zoom: located ? 12 : 5,
                            }}
                            maxZoom={19}
                        />
                    </Map>
                    <View
                        pointerEvents="none"
                        style={styles.pin}
                        accessible
                        accessibilityRole="image"
                        accessibilityLabel={
                            "Selected home location pin. Latitude " +
                            center[1].toFixed(5) +
                            ", longitude " +
                            center[0].toFixed(5)
                        }>
                        <MapPin
                            size={32}
                            color={colors.authForeground}
                            fill={colors.authBackground}
                            strokeWidth={2.5}
                        />
                    </View>
                    {!ready && !error && (
                        <View
                            pointerEvents="none"
                            style={[styles.mapNotice, { backgroundColor: colors.authBackground }]}>
                            <Text
                                accessibilityLiveRegion="polite"
                                style={{ color: colors.authForeground }}>
                                Loading map…
                            </Text>
                        </View>
                    )}
                </View>
                <Text
                    accessibilityLiveRegion="polite"
                    accessibilityLabel={
                        "Pinned location: latitude " +
                        center[1].toFixed(5) +
                        ", longitude " +
                        center[0].toFixed(5)
                    }
                    style={[styles.description, { color: colors.authForeground }]}>
                    Pinned location: {center[1].toFixed(5)}, {center[0].toFixed(5)}
                </Text>
                <Pressable
                    accessibilityRole="link"
                    accessibilityLabel="OpenStreetMap contributors, map copyright"
                    style={styles.attribution}
                    onPress={() => {
                        void Linking.openURL("https://www.openstreetmap.org/copyright").catch(
                            () => {},
                        );
                    }}>
                    <Text style={[styles.description, { color: colors.authForeground }]}>
                        © OpenStreetMap contributors
                    </Text>
                </Pressable>
                {!!error && (
                    <Alert
                        icon={CircleAlert}
                        variant="destructive"
                        accessibilityRole="alert"
                        accessibilityLiveRegion="polite">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                {!ready && !!error && (
                    <Button
                        name="Retry map"
                        type="brand-outline"
                        loading={false}
                        onPress={() => {
                            loadFailed.current = false;
                            setReady(false);
                            setError("");
                            setAttempt((value) => value + 1);
                        }}
                    />
                )}
                <Button
                    name="Use this location"
                    type="auth"
                    onPress={confirm}
                    loading={loading}
                    disabled={!ready}
                />
            </ScrollView>
        </SenswaveModal>
    );
};

export default LocationMapPicker;

const styles = StyleSheet.create({
    content: { flexGrow: 1, gap: 16, paddingBottom: 16 },
    description: { fontSize: 14, lineHeight: 20 },
    map: { flexGrow: 1, minHeight: 220, borderRadius: 8, overflow: "hidden" },
    fill: { flex: 1 },
    pin: {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: [{ translateX: -16 }, { translateY: -32 }],
    },
    mapNotice: { position: "absolute", top: 16, left: 16, right: 16, padding: 12, borderRadius: 8 },
    attribution: { minHeight: 48, justifyContent: "center" },
});
