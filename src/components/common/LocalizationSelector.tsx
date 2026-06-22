import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import * as Location from "expo-location";
import ImageButton from "./ImageButton";
import { useToast } from "@/contexts/ToastProvider";
import Text from "./Text";

interface LocalizationSelectorProps {
    onSelectLocation: (latitude: number, longitude: number) => void;
    initLocation: {
        latitude?: number;
        longitude?: number;
    };
}

const LocalizationSelector: React.FC<LocalizationSelectorProps> = ({
    onSelectLocation,
    ...props
}: LocalizationSelectorProps) => {
    const toast = useToast();

    const [address, setAddress] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [expand] = useState(false);

    const [loactionProvided] = useState(
        props.initLocation.latitude && props.initLocation.longitude,
    );
    const [latitude, setLatitude] = useState(props.initLocation.latitude ?? 0);
    const [longitude, setLongitude] = useState(props.initLocation.longitude ?? 0);

    const animatedHeight = useRef(new Animated.Value(0)).current;

    const loadinitLocation = async () => {
        if (loactionProvided) {
            await updateAddress(latitude, longitude);
        }
    };

    useEffect(() => {
        loadinitLocation();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        // Animate map height expansion/collapse
        Animated.timing(animatedHeight, {
            toValue: expand ? 300 : 0, // Expanded height to 300 or collapsed to 0
            duration: 300, // Duration of animation
            useNativeDriver: false,
        }).start();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [expand]);

    const loadLocation = async () => {
        setIsLoading(true);

        const overallTimeout = 10000;

        // Create a timeout promise that rejects after overallTimeout
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Location request timed out")), overallTimeout),
        );

        try {
            await Promise.race([
                (async () => {
                    const { status } = await Location.requestForegroundPermissionsAsync();

                    if (status !== "granted") {
                        toast.error("Permission to access location was denied");
                        return;
                    }

                    const location = await Location.getCurrentPositionAsync({});
                    const { latitude, longitude } = location.coords;

                    await updateAddress(latitude, longitude);
                    onSelectLocation(latitude, longitude);
                })(),
                timeoutPromise,
            ]);
        } catch (error) {
            // This will catch timeout or any other error
            toast.error(error instanceof Error ? error.message : "Error fetching location");
            console.error("Error fetching location:", error);
        } finally {
            setIsLoading(false); // Always reset loading
        }
    };

    const updateAddress = async (latitude: number, longitude: number) => {
        setLongitude(longitude);
        setLatitude(latitude);

        const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (reverseGeocode.length > 0) {
            const place = reverseGeocode[0];
            const address =
                `${place.streetNumber ? place.streetNumber : ""} ${place.street ? place.street + "," : ""} ${place.city ? place.city + "," : ""} ${place.region || ""}`.trim();
            setAddress(address);
        }
    };

    // const handleMapPress = async (event: any) => {
    //     const { latitude, longitude } = event.nativeEvent.coordinate;
    //     await updateAddress(latitude, longitude);
    //     props.onSelectLocation(latitude, longitude);
    // };

    return (
        <View style={styles.mainContainer}>
            <Text bold={true} size={"medium"} color={"onBackground"}>
                Location
            </Text>

            <View style={styles.dataContainer}>
                {/* <ImageButton
                    icon="location-outline"
                    loading={isLoading}
                    onPress={() => setExpand(!expand)}
                    style={{ marginRight: 10 }} /> */}

                <ImageButton
                    icon="locate-outline"
                    loading={isLoading}
                    onPress={loadLocation}
                    style={{ marginRight: 20 }}
                />

                <View style={styles.textContainer}>
                    <Text bold={true} size={"medium"} color={"onPrimary"}>
                        {isLoading
                            ? "Fetching your location..."
                            : address || "No location selected"}
                    </Text>
                </View>
            </View>
        </View>
    );
};

export default LocalizationSelector;

const styles = StyleSheet.create({
    mainContainer: {
        marginTop: 0,
    },
    dataContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
        paddingTop: 5,
    },
    textContainer: {
        flex: 1,
    },
    animatedMapContainer: {
        overflow: "hidden",
        width: "100%",
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
});
