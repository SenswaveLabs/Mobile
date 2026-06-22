import React, {
    createContext,
    useState,
    useEffect,
    useContext,
    FC,
    PropsWithChildren,
} from "react";
import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";

type ThemeColors = {
    primary: string;
    secondary: string;
    background: string;
    complementary: string;
    textOnPrimary: string;
    textOnSecondary: string;
    textOnBackground: string;
    error: string;
    success: string;
    warning: string;
    info: string;
};

const LightMode: ThemeColors = {
    primary: "#F5F5F5",
    secondary: "#33363F",
    background: "#DFE6F8",
    complementary: "#d69b12",
    textOnPrimary: "#33363F",
    textOnSecondary: "#F5F5F5",
    textOnBackground: "#33363F",
    error: "#DE7171",
    success: "#81C784",
    warning: "#FFB74D",
    info: "#1E88E5",
};

const DarkMode: ThemeColors = {
    primary: "#1E1E1E",
    secondary: "#2A2A2A",
    background: "#121212",
    complementary: "#a2750e",
    textOnPrimary: "#F5F5F5",
    textOnSecondary: "#E0E0E0",
    textOnBackground: "#F5F5F5",
    error: "#FF5252",
    success: "#81C784",
    warning: "#FFB74D",
    info: "#1E88E5",
};

type Theme = {
    type: "light" | "dark";
    colors: ThemeColors;
};

const Default: Theme = {
    type: "light",
    colors: LightMode,
};

interface ThemeProperties {
    current: Theme;
    updateTheme: (theme: Theme) => void;
    lightTheme: () => Promise<void>;
    darkTheme: () => Promise<void>;
    resetTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeProperties>({
    current: Default,
    updateTheme: () => {
        console.error("[Theme Provider] No theme update function provided.");
    },
    lightTheme: async () => {
        console.error("[Theme Provider] No light theme function provided.");
    },
    darkTheme: async () => {
        console.error("[Theme Provider] No dark theme function provided.");
    },
    resetTheme: async () => {
        console.error("[Theme Provider] No reset theme function provided.");
    },
});

const ThemeName: string = "theme";

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: FC<PropsWithChildren> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(Default);
    const colorScheme = useColorScheme();

    const lightTheme = async () => {
        setTheme({ type: "light", colors: LightMode });
        await SecureStore.setItemAsync(ThemeName, "light");
        console.debug("[Theme Provider] Light mode enabled.");
    };

    const darkTheme = async () => {
        setTheme({ type: "dark", colors: DarkMode });
        await SecureStore.setItemAsync(ThemeName, "dark");
        console.debug("[Theme Provider] Dark mode enabled.");
    };

    const resetTheme = async () => {
        await SecureStore.deleteItemAsync(ThemeName);
        console.debug("[Theme Provider] Theme reset.");

        if (colorScheme === "dark") {
            setTheme({ type: "dark", colors: DarkMode });
            console.debug("[Theme Provider] Dark mode enabled.");
            return;
        }

        setTheme({ type: "light", colors: LightMode });
        console.debug("[Theme Provider] Light mode enabled.");
    };

    const updateTheme = (newTheme: Theme) => {
        setTheme(newTheme);
        console.debug("[Theme Provider] Theme updated.");
    };

    useEffect(() => {
        const initialize: () => Promise<void> = async () => {
            const theme = await SecureStore.getItemAsync(ThemeName);

            if (theme === "dark" || colorScheme === "dark") {
                setTheme({ type: "dark", colors: DarkMode });
                console.debug("[Theme Provider] Dark mode enabled.");
            } else {
                setTheme({ type: "light", colors: LightMode });
                console.debug("[Theme Provider] Light mode enabled.");
            }
        };
        initialize();
    }, [colorScheme]);

    return (
        <ThemeContext.Provider
            value={{ current: theme, updateTheme, lightTheme, darkTheme, resetTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
