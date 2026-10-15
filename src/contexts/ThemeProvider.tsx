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
    authBackground: string;
    authForeground: string;
    authMuted: string;
    authFieldBackground: string;
    authBorder: string;
    authFocus: string;
    authPrimary: string;
    authOnPrimary: string;
    complementary: string;
    textOnPrimary: string;
    textOnSecondary: string;
    textOnBackground: string;
    error: string;
    success: string;
    warning: string;
    info: string;
    dataSourceStatus: Record<
        "positive" | "warning" | "critical" | "neutral",
        { foreground: string; background: string; border: string }
    >;
};

const LightMode: ThemeColors = {
    primary: "#F5F5F5",
    secondary: "#33363F",
    background: "#F9F7F1",
    authBackground: "#F9F7F1",
    authForeground: "#1B1610",
    authMuted: "#615A50",
    authFieldBackground: "#F9F7F1",
    authBorder: "#8C857A",
    authFocus: "#009286",
    authPrimary: "#F7B817",
    authOnPrimary: "#321A03",
    complementary: "#d69b12",
    textOnPrimary: "#33363F",
    textOnSecondary: "#F5F5F5",
    textOnBackground: "#33363F",
    error: "#B42318",
    success: "#81C784",
    warning: "#FFB74D",
    info: "#1E88E5",
    dataSourceStatus: {
        positive: { foreground: "#00362B", background: "#CAF2E5", border: "#74B7A4" },
        warning: { foreground: "#532E04", background: "#FFECC5", border: "#D9B577" },
        critical: { foreground: "#830001", background: "#FFE2DC", border: "#E99489" },
        neutral: { foreground: "#403A30", background: "#EBE7E1", border: "#BCB7AD" },
    },
};

const DarkMode: ThemeColors = {
    primary: "#1E1E1E",
    secondary: "#2A2A2A",
    background: "#100D08",
    authBackground: "#100D08",
    authForeground: "#EEEBE5",
    authMuted: "#AAA498",
    authFieldBackground: "#211D16",
    authBorder: "#847C70",
    authFocus: "#47BAAC",
    authPrimary: "#FBC031",
    authOnPrimary: "#321A03",
    complementary: "#a2750e",
    textOnPrimary: "#F5F5F5",
    textOnSecondary: "#E0E0E0",
    textOnBackground: "#F5F5F5",
    error: "#FF5252",
    success: "#81C784",
    warning: "#FFB74D",
    info: "#1E88E5",
    dataSourceStatus: {
        positive: { foreground: "#A4E4D1", background: "#082D25", border: "#256B5A" },
        warning: { foreground: "#FADA99", background: "#3B270C", border: "#7C5D2F" },
        critical: { foreground: "#FFBFB8", background: "#431F1D", border: "#904D49" },
        neutral: { foreground: "#CFCAC2", background: "#2A2620", border: "#585148" },
    },
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
