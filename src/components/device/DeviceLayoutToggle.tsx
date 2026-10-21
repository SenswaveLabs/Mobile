import React, { FC, useState } from "react";
import { StyleSheet, View } from "react-native";
import { LayoutGrid, List } from "lucide-react-native";
import { DeviceLayout } from "@/hooks/useDeviceLayout";
import { useTheme } from "@/contexts/ThemeProvider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface DeviceLayoutToggleProps {
    layout: DeviceLayout;
    onChange: (layout: DeviceLayout) => void;
}

const DeviceLayoutToggle: FC<DeviceLayoutToggleProps> = ({ layout, onChange }) => {
    const { colors } = useTheme().current;
    const [focused, setFocused] = useState<DeviceLayout | null>(null);
    return (
        <ToggleGroup
            type="single"
            value={layout}
            accessibilityLabel="Device view"
            className="rounded-lg shadow-none"
            onValueChange={(choice) => {
                if ((choice === "list" || choice === "grid") && choice !== layout) onChange(choice);
            }}>
            {(["list", "grid"] as const).map((choice) => {
                const Symbol = choice === "list" ? List : LayoutGrid;
                const selected = choice === layout;
                return (
                    <ToggleGroupItem
                        key={choice}
                        value={choice}
                        isFirst={choice === "list"}
                        isLast={choice === "grid"}
                        className="h-12 min-h-12 min-w-12 rounded-lg p-0 shadow-none active:bg-transparent active:opacity-70"
                        accessibilityLabel={choice === "list" ? "List view" : "Grid view"}
                        accessibilityState={{ selected }}
                        onFocus={() => setFocused(choice)}
                        onBlur={() => setFocused(null)}
                        style={styles.choice}>
                        <View
                            style={[
                                styles.indicator,
                                {
                                    backgroundColor:
                                        focused === choice
                                            ? colors.authFocus
                                            : selected
                                              ? colors.deviceTileSubtle
                                              : "transparent",
                                },
                            ]}>
                            <Symbol
                                size={18}
                                color={
                                    focused === choice
                                        ? colors.authFieldBackground
                                        : selected
                                          ? colors.authForeground
                                          : colors.authMuted
                                }
                                accessible={false}
                            />
                        </View>
                    </ToggleGroupItem>
                );
            })}
        </ToggleGroup>
    );
};

export default DeviceLayoutToggle;
const styles = StyleSheet.create({
    choice: {
        width: 48,
        height: 48,
        minHeight: 48,
        backgroundColor: "transparent",
        paddingHorizontal: 0,
        paddingVertical: 0,
        alignItems: "center",
        justifyContent: "center",
    },
    indicator: {
        width: 36,
        height: 36,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
});
