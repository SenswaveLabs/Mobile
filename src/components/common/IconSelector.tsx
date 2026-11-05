import React, { FC, useEffect, useRef, useState } from "react";
import { FlatList, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import Icon, { AllIcons } from "./Icon";
import Button from "./Button";
import BottomSheetSelect from "./BottomSheetSelect";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/contexts/ThemeProvider";
import { IconCatalog } from "@/hooks/useIconCatalog";
import { getEnglishIconLabel } from "@/utils/iconLabels";
import { IconResource } from "@/utils/resourceIcons";

const COLUMNS = 4;
const GAP = 8;

interface IconProps {
    defaultIcon?: string;
    iconList?: string[];
    onIconSelected?: (icon: string) => void;
    variant?: "brand";
    catalog?: IconCatalog;
    resource?: IconResource;
    disabled?: boolean;
}

const IconSelector: FC<IconProps> = ({
    defaultIcon = "home-outline",
    iconList = AllIcons,
    onIconSelected,
    catalog,
    resource,
    disabled = false,
}) => {
    const { colors } = useTheme().current;
    const { width } = useWindowDimensions();
    const cellSize = Math.max(48, (width - 48 - (COLUMNS - 1) * GAP) / COLUMNS);
    const [selectedIcon, setSelectedIcon] = useState(defaultIcon);
    const selectedOptionRef = useRef<View>(null);
    const availableIcons = catalog ? catalog.keys : iconList;
    const unavailable =
        disabled || !!(catalog && (catalog.loading || catalog.error || !catalog.keys.length));
    const current = useRef({ availableIcons, unavailable, onIconSelected });
    current.current = { availableIcons, unavailable, onIconSelected };
    const virtualized = availableIcons.length > 40;

    useEffect(() => setSelectedIcon(defaultIcon), [defaultIcon]);

    const iconLabel = (key: string) => {
        if (resource) {
            const labelKey = catalog?.entries?.find((entry) => entry.key === key)?.labelKey;
            return labelKey ? getEnglishIconLabel(labelKey, key) : key;
        }
        const label = key.replace(/-outline$/, "").replace(/-/g, " ");
        return label.charAt(0).toUpperCase() + label.slice(1);
    };

    const renderIcon = (item: string, close: () => boolean) => (
        <TouchableOpacity
            key={item}
            ref={item === selectedIcon ? selectedOptionRef : undefined}
            disabled={unavailable}
            accessibilityRole="radio"
            accessibilityLabel={`${iconLabel(item)} icon`}
            accessibilityState={{
                selected: item === selectedIcon,
                checked: item === selectedIcon,
                disabled: unavailable,
            }}
            style={[
                styles.cell,
                {
                    width: cellSize,
                    borderColor: item === selectedIcon ? colors.authFocus : "transparent",
                },
            ]}
            activeOpacity={0.72}
            onPress={() => {
                const latest = current.current;
                if (latest.unavailable || !latest.availableIcons.includes(item) || !close()) return;
                if (item === selectedIcon) return;
                setSelectedIcon(item);
                latest.onIconSelected?.(item);
            }}>
            <Icon icon={item} resource={resource} size={24} color="brand" />
            <Text
                numberOfLines={2}
                style={[styles.label, { color: colors.authForeground, width: cellSize - 8 }]}>
                {iconLabel(item)}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View>
            <BottomSheetSelect
                title="Icon"
                sheetTitle="Select icon"
                value={iconLabel(selectedIcon)}
                options={[]}
                disabled={unavailable}
                initialFocusRef={selectedOptionRef}
                scrollable={!virtualized}
                leading={
                    <View
                        style={[styles.preview, { backgroundColor: colors.background }]}
                        accessible={false}>
                        <Icon icon={selectedIcon} resource={resource} size={24} color="brand" />
                    </View>
                }
                renderOptions={(close) =>
                    virtualized ? (
                        <FlatList
                            data={availableIcons}
                            numColumns={COLUMNS}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => renderIcon(item, close)}
                            initialNumToRender={24}
                            maxToRenderPerBatch={24}
                            windowSize={5}
                            columnWrapperStyle={styles.row}
                            contentContainerStyle={styles.rows}
                            keyboardShouldPersistTaps="handled"
                            extraData={{ selectedIcon, unavailable, cellSize }}
                        />
                    ) : (
                        <View style={styles.grid}>
                            {availableIcons.map((item) => renderIcon(item, close))}
                        </View>
                    )
                }
            />
            {catalog?.loading && (
                <Text accessibilityLiveRegion="polite" style={{ color: colors.authMuted }}>
                    Loading icons…
                </Text>
            )}
            {!!catalog?.error && (
                <View style={styles.feedback}>
                    <Text accessibilityRole="alert" style={{ color: colors.error }}>
                        {catalog.error}
                    </Text>
                    <Button
                        name="Retry icons"
                        loading={false}
                        type="brand-outline"
                        disabled={disabled}
                        onPress={catalog.retry}
                    />
                </View>
            )}
        </View>
    );
};

export default IconSelector;

const styles = StyleSheet.create({
    preview: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
    row: { gap: GAP },
    rows: { gap: GAP, paddingBottom: 8 },
    cell: {
        minHeight: 72,
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 8,
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
    },
    label: { fontSize: 12, lineHeight: 16, textAlign: "center" },
    feedback: { gap: 8, paddingVertical: 8 },
});
