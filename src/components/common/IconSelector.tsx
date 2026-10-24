import React, { useState, useRef, useEffect } from "react";
import {
    View,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    Animated,
    Dimensions,
    useWindowDimensions,
} from "react-native";
import Icon, { AllIcons } from "./Icon";
import { useTheme } from "@/contexts/ThemeProvider";
import { shadowStyles } from "@/styles/shadowStyles";
import Text from "./Text";
import SenswaveModal from "./SenswaveModal";
import Button from "./Button";
import BottomSheetSelect from "./BottomSheetSelect";
import { IconCatalog } from "@/hooks/useIconCatalog";
import { getEnglishIconLabel } from "@/utils/iconLabels";
import { IconResource } from "@/utils/resourceIcons";
import { Text as ReusableText } from "@/components/ui/text";

const ICON_SIZE = 24;

const DefaultIcons = [
    "home-outline",
    "planet-outline",
    "globe-outline",
    "business-outline",
    "bag-outline",
    "briefcase-outline",
] as string[];

const InitialIcon: string = DefaultIcons[0];
const NUM_COLUMNS = 5;
const BRAND_GRID_COLUMNS = 4;
const BRAND_GRID_GAP = 8;
const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_PADDING = 16;
const ICON_CELL_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2) / NUM_COLUMNS;

interface IconProps {
    defaultIcon?: string;
    iconList?: string[];
    onIconSelected?: (icon: string) => void;
    variant?: "default" | "brand";
    catalog?: IconCatalog;
    resource?: IconResource;
    disabled?: boolean;
}

const IconSelector: React.FC<IconProps> = ({
    defaultIcon = InitialIcon,
    iconList = DefaultIcons,
    onIconSelected = () => {},
    variant = "default",
    catalog,
    resource,
    disabled = false,
}) => {
    const theme = useTheme();
    const brand = variant === "brand";
    const { width } = useWindowDimensions();
    const brandCellSize = Math.max(
        48,
        (width - 48 - (BRAND_GRID_COLUMNS - 1) * BRAND_GRID_GAP) / BRAND_GRID_COLUMNS,
    );
    const { colors } = theme.current;
    const selectedStyle = { ...shadowStyles.default, backgroundColor: colors.primary };
    const [selectedIcon, setSelectedIcon] = useState<string>(defaultIcon);

    useEffect(() => {
        setSelectedIcon(defaultIcon);
    }, [defaultIcon]);

    const [modalVisible, setModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const selectedOptionRef = useRef<View>(null);
    const unavailable =
        disabled ||
        (!!catalog && (catalog.loading || !!catalog.error || catalog.keys.length === 0));
    const availableIcons = catalog ? catalog.keys : brand ? iconList : AllIcons;
    const quickIcons = catalog ? catalog.keys.filter((icon) => icon !== selectedIcon) : iconList;
    const showResourceLabels = !!(resource && catalog);
    const iconLabel = (key: string) => {
        if (resource) {
            const labelKey = catalog?.entries?.find((entry) => entry.key === key)?.labelKey;
            return labelKey ? getEnglishIconLabel(labelKey, key) : key;
        }
        const label = key.replace(/-outline$/, "").replace(/-/g, " ");
        return label.charAt(0).toUpperCase() + label.slice(1);
    };

    const triggerPulse = () => {
        Animated.sequence([
            Animated.spring(scaleAnim, {
                toValue: 1.25,
                useNativeDriver: true,
                bounciness: 0,
                speed: 40,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                bounciness: 12,
                speed: 15,
            }),
        ]).start();
    };

    const onSelected = (icon: string) => {
        if (unavailable || (catalog && !catalog.keys.includes(icon))) return;
        setSelectedIcon(icon);
        onIconSelected?.(icon);
        if (!brand) triggerPulse();
    };

    const onModalSelect = (icon: string) => {
        onSelected(icon);
        setModalVisible(false);
        setSearchQuery("");
    };

    const closeModal = () => {
        setModalVisible(false);
        setSearchQuery("");
    };

    const filteredIcons = searchQuery
        ? availableIcons.filter(
              (key) =>
                  key.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  iconLabel(key).toLowerCase().includes(searchQuery.toLowerCase()),
          )
        : availableIcons;

    return (
        <View style={[styles.mainContainer, brand && styles.brandContainer]}>
            {brand ? (
                <BottomSheetSelect
                    title="Icon"
                    sheetTitle="Select icon"
                    value={iconLabel(selectedIcon)}
                    options={[]}
                    disabled={unavailable}
                    initialFocusRef={selectedOptionRef}
                    leading={
                        <View
                            style={[
                                styles.brandPickerPreview,
                                { backgroundColor: colors.background },
                            ]}
                            accessible={false}>
                            <Icon
                                icon={selectedIcon}
                                resource={resource}
                                size={ICON_SIZE}
                                color="brand"
                            />
                        </View>
                    }
                    renderOptions={(closeSheet) => (
                        <View style={styles.brandGrid}>
                            {availableIcons.map((item) => {
                                const selected = item === selectedIcon;
                                return (
                                    <TouchableOpacity
                                        key={item}
                                        ref={selected ? selectedOptionRef : undefined}
                                        disabled={unavailable}
                                        accessibilityRole="radio"
                                        accessibilityLabel={`${iconLabel(item)} icon`}
                                        accessibilityState={{
                                            selected,
                                            checked: selected,
                                            disabled: unavailable,
                                        }}
                                        style={[
                                            styles.brandGridCell,
                                            {
                                                width: brandCellSize,
                                                borderColor: selected
                                                    ? colors.authFocus
                                                    : "transparent",
                                            },
                                        ]}
                                        activeOpacity={0.72}
                                        onPress={() => {
                                            if (unavailable || !closeSheet()) return;
                                            if (!selected) onSelected(item);
                                        }}>
                                        <Icon
                                            icon={item}
                                            resource={resource}
                                            size={ICON_SIZE}
                                            color="brand"
                                        />
                                        <ReusableText
                                            numberOfLines={2}
                                            style={[
                                                styles.brandGridLabel,
                                                {
                                                    color: colors.authForeground,
                                                    width: brandCellSize - 8,
                                                },
                                            ]}>
                                            {iconLabel(item)}
                                        </ReusableText>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                />
            ) : (
                <>
                    <ReusableText style={[styles.label, { color: colors.textOnBackground }]}>
                        Icon
                    </ReusableText>
                    <View style={styles.iconRow}>
                        <View style={styles.selectedWrapper}>
                            <Animated.View
                                accessible
                                accessibilityRole="image"
                                accessibilityLabel={`Current icon: ${iconLabel(selectedIcon)}`}
                                style={[
                                    styles.iconContainer,
                                    shadowStyles.default,
                                    {
                                        backgroundColor: colors.primary,
                                        borderColor: colors.secondary,
                                        transform: [{ scale: scaleAnim }],
                                    },
                                ]}>
                                <Icon
                                    icon={selectedIcon}
                                    resource={resource}
                                    size={ICON_SIZE}
                                    color="onPrimary"
                                />
                            </Animated.View>
                        </View>

                        <View
                            style={[styles.separator, { backgroundColor: colors.textOnBackground }]}
                        />
                        <FlatList
                            removeClippedSubviews={false}
                            data={quickIcons}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    disabled={unavailable}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${iconLabel(item)} icon`}
                                    accessibilityState={{
                                        selected: item === selectedIcon,
                                        disabled: unavailable,
                                    }}
                                    style={[
                                        styles.iconContainer,
                                        item === selectedIcon && selectedStyle,
                                    ]}
                                    onPress={() => onSelected(item)}>
                                    <Icon
                                        icon={item}
                                        resource={resource}
                                        size={ICON_SIZE}
                                        color={item === selectedIcon ? "onPrimary" : "onBackground"}
                                    />
                                </TouchableOpacity>
                            )}
                            keyExtractor={(item) => item}
                            horizontal
                            keyboardShouldPersistTaps="handled"
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.iconListContainer}
                            style={styles.iconList}
                        />
                        <TouchableOpacity
                            disabled={unavailable}
                            accessibilityRole="button"
                            accessibilityLabel="Browse all icons"
                            accessibilityState={{ disabled: unavailable }}
                            style={[styles.browseButton, { borderColor: colors.textOnBackground }]}
                            onPress={() => {
                                if (!unavailable) setModalVisible(true);
                            }}>
                            <Icon icon="grid-outline" size={20} color="onBackground" />
                        </TouchableOpacity>
                    </View>
                </>
            )}

            {catalog?.loading && (
                <Text color="onBackground" accessibilityLiveRegion="polite">
                    Loading icons…
                </Text>
            )}
            {!!catalog?.error && (
                <View style={styles.catalogFeedback}>
                    <Text color="error" accessibilityRole="alert" numberOfLines={0}>
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

            {/* Full icon browser for legacy selectors */}
            {!brand && (
                <SenswaveModal
                    visible={modalVisible}
                    onClose={closeModal}
                    title="Select icon"
                    variant="default">
                    {/* Search bar */}
                    <View
                        style={[
                            styles.searchContainer,
                            shadowStyles.default,
                            {
                                backgroundColor: colors.primary,
                                borderColor: colors.authBorder,
                            },
                        ]}>
                        <Icon icon="search-outline" size={18} color="onPrimary" />
                        <TextInput
                            accessibilityLabel="Search icons"
                            style={[styles.searchInput, { color: colors.textOnPrimary }]}
                            placeholder="Search icons..."
                            placeholderTextColor={colors.textOnPrimary + "99"}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity
                                accessibilityRole="button"
                                accessibilityLabel="Clear icon search"
                                onPress={() => setSearchQuery("")}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Icon icon="close-outline" size={18} color="onPrimary" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Icon grid */}
                    <FlatList
                        data={filteredIcons}
                        keyExtractor={(item) => item}
                        numColumns={NUM_COLUMNS}
                        key={NUM_COLUMNS}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                accessibilityRole="button"
                                accessibilityLabel={`${iconLabel(item)} icon`}
                                accessibilityState={{
                                    selected: item === selectedIcon,
                                    disabled: unavailable,
                                }}
                                disabled={unavailable}
                                style={[
                                    styles.gridCell,
                                    showResourceLabels && styles.catalogGridCell,
                                ]}
                                onPress={() => onModalSelect(item)}>
                                <View
                                    style={[
                                        styles.iconContainer,
                                        item === selectedIcon && selectedStyle,
                                    ]}>
                                    <Icon
                                        icon={item}
                                        resource={resource}
                                        size={ICON_SIZE}
                                        color={item === selectedIcon ? "onPrimary" : "onBackground"}
                                    />
                                </View>
                                {showResourceLabels && (
                                    <Text
                                        color="onBackground"
                                        size="small"
                                        numberOfLines={2}
                                        style={styles.catalogGridCellLabel}>
                                        {iconLabel(item)}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        )}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.gridContainer}
                        keyboardShouldPersistTaps="handled"
                    />
                </SenswaveModal>
            )}
        </View>
    );
};

export default IconSelector;

const styles = StyleSheet.create({
    catalogFeedback: { gap: 8, paddingVertical: 8 },
    label: { marginBottom: 5, fontSize: 16, fontWeight: "bold" },
    brandContainer: { marginTop: 0 },
    brandPickerPreview: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    brandGrid: { flexDirection: "row", flexWrap: "wrap", gap: BRAND_GRID_GAP },
    brandGridCell: {
        minHeight: 72,
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 8,
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
    },
    brandGridLabel: { fontSize: 12, lineHeight: 16, textAlign: "center" },
    mainContainer: {
        marginTop: 6,
    },
    iconRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    selectedWrapper: {
        padding: 5,
        justifyContent: "center",
        alignItems: "center",
    },
    separator: {
        width: 2,
        height: 40,
        marginHorizontal: 8,
    },
    iconListContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    iconList: {
        alignSelf: "center",
        flex: 1,
    },
    iconContainer: {
        minWidth: 48,
        minHeight: 48,
        padding: 10,
        borderColor: "transparent",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 10,
        marginHorizontal: 2,
    },
    browseButton: {
        minWidth: 48,
        minHeight: 48,
        paddingVertical: 8,
        paddingHorizontal: 10,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 10,
        borderWidth: 1,
        borderStyle: "dashed",
        marginLeft: 4,
    },
    // Modal content
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 12,
        paddingHorizontal: 10,
        marginBottom: 12,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 10,
        fontSize: 16,
    },
    gridContainer: {
        paddingBottom: 20,
    },
    gridCell: {
        width: ICON_CELL_SIZE,
        height: ICON_CELL_SIZE,
        justifyContent: "center",
        alignItems: "center",
    },
    catalogGridCell: {
        height: ICON_CELL_SIZE + 30,
        justifyContent: "flex-start",
        paddingTop: 4,
    },
    catalogGridCellLabel: {
        width: ICON_CELL_SIZE - 4,
        textAlign: "center",
    },
});
