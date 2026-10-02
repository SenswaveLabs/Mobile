import { useEffect, useState } from "react";
import { KeyboardController, KeyboardEvents } from "react-native-keyboard-controller";

export const useKeyboardVisible = () => {
    const [visible, setVisible] = useState(() => KeyboardController.isVisible());

    useEffect(() => {
        const show = KeyboardEvents.addListener("keyboardWillShow", () => setVisible(true));
        const shown = KeyboardEvents.addListener("keyboardDidShow", () => setVisible(true));
        const hide = KeyboardEvents.addListener("keyboardDidHide", () => setVisible(false));
        setVisible(KeyboardController.isVisible());
        return () => {
            show.remove();
            shown.remove();
            hide.remove();
        };
    }, []);

    return visible;
};
