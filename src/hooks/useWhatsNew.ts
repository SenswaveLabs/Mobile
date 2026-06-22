import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

// Bump this string manually with each release that has new content
export const WHATS_NEW_VERSION = "1.1.0";

const STORAGE_KEY = "whats_new_seen_version";

export function useWhatsNew() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then((seen) => {
            if (seen !== WHATS_NEW_VERSION) setShow(true);
        });
    }, []);

    const dismiss = async () => {
        await AsyncStorage.setItem(STORAGE_KEY, WHATS_NEW_VERSION);
        setShow(false);
    };

    return { show, dismiss };
}
