import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type DeviceLayout = "grid" | "list";
const storageKey = "senswave.deviceLayout";

export const useDeviceLayout = () => {
    const [layout, updateLayout] = useState<DeviceLayout>("grid");
    const changed = useRef(false);
    const writes = useRef(Promise.resolve());

    useEffect(() => {
        let active = true;
        void AsyncStorage.getItem(storageKey)
            .then((saved) => {
                if (active && !changed.current && (saved === "grid" || saved === "list"))
                    updateLayout(saved);
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, []);

    const setLayout = (next: DeviceLayout) => {
        changed.current = true;
        updateLayout(next);
        // Serialize writes so a slower previous choice cannot replace the latest one.
        writes.current = writes.current
            .then(() => AsyncStorage.setItem(storageKey, next))
            .catch(() => {});
    };

    return { layout, setLayout };
};
