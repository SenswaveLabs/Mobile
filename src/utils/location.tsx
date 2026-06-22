import * as ExpoLocation from "expo-location";

export const getCurrentLocation = async (): Promise<ExpoLocation.LocationObjectCoords | null> => {
    const overallTimeout = 2000;

    const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), overallTimeout),
    );

    const locationTask = (async () => {
        try {
            console.info("[Location] Retriving current location.");
            const { status } = await ExpoLocation.requestForegroundPermissionsAsync();

            if (status !== "granted") {
                console.warn("[Location] Permission not granted.");
                return null;
            }

            const { coords } = await ExpoLocation.getCurrentPositionAsync({
                accuracy: ExpoLocation.Accuracy.Balanced,
            });

            return coords;
        } catch (err) {
            console.error(`[Location] Failed to get current location: ${err}`);
            return null;
        }
    })();

    return Promise.race([locationTask, timeoutPromise]);
};
