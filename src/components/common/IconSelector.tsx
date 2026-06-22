import React, { useState, useRef, useEffect } from "react";
import {
    View,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    Animated,
    Dimensions,
} from "react-native";
import Icon, { AllIcons } from "./Icon";
import { useTheme } from "@/contexts/ThemeProvider";
import { shadowStyles } from "@/styles/shadowStyles";
import Text from "./Text";
import SenswaveModal from "./SenswaveModal";

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
const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_PADDING = 16;
const ICON_CELL_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2) / NUM_COLUMNS;

interface IconProps {
    defaultIcon?: string;
    iconList?: string[];
    onIconSelected?: (icon: string) => void;
}

const IconSelector: React.FC<IconProps> = ({
    defaultIcon = InitialIcon,
    iconList = DefaultIcons,
    onIconSelected = () => {},
}) => {
    const theme = useTheme();
    const [selectedIcon, setSelectedIcon] = useState<string>(defaultIcon);

    useEffect(() => {
        setSelectedIcon(defaultIcon);
    }, [defaultIcon]);

    const [modalVisible, setModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const scaleAnim = useRef(new Animated.Value(1)).current;

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
        setSelectedIcon(icon);
        onIconSelected?.(icon);
        triggerPulse();
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
        ? AllIcons.filter((i) => i.includes(searchQuery.toLowerCase()))
        : AllIcons;

    return (
        <View style={styles.mainContainer}>
            <Text style={{ marginBottom: 5 }} bold size="medium" color="onBackground">
                Select icon
            </Text>

            <View style={styles.iconRow}>
                {/* Selected icon preview with animation */}
                <View style={styles.selectedWrapper}>
                    <Animated.View
                        style={[
                            styles.iconContainer,
                            shadowStyles.default,
                            {
                                backgroundColor: theme.current.colors.primary,
                                borderColor: theme.current.colors.secondary,
                                transform: [{ scale: scaleAnim }],
                            },
                        ]}>
                        <Icon icon={selectedIcon} size={ICON_SIZE} color="onPrimary" />
                    </Animated.View>
                </View>

                {/* Separator */}
                <View
                    style={[
                        styles.separator,
                        { backgroundColor: theme.current.colors.textOnBackground },
                    ]}
                />

                {/* Quick-access strip */}
                <FlatList
                    removeClippedSubviews={false}
                    data={iconList}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[
                                styles.iconContainer,
                                item === selectedIcon && {
                                    ...shadowStyles.default,
                                    backgroundColor: theme.current.colors.primary,
                                },
                            ]}
                            onPress={() => onSelected(item)}>
                            <Icon
                                icon={item}
                                size={ICON_SIZE}
                                color={item === selectedIcon ? "onPrimary" : "onBackground"}
                            />
                        </TouchableOpacity>
                    )}
                    keyExtractor={(item) => item}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.iconListContainer}
                    style={styles.iconList}
                />

                {/* Browse all button */}
                <TouchableOpacity
                    style={[
                        styles.browseButton,
                        { borderColor: theme.current.colors.textOnBackground },
                    ]}
                    onPress={() => setModalVisible(true)}>
                    <Icon icon="grid-outline" size={20} color="onBackground" />
                </TouchableOpacity>
            </View>

            {/* Full icon browser */}
            <SenswaveModal visible={modalVisible} onClose={closeModal} title="Select Icon">
                {/* Search bar */}
                <View
                    style={[
                        styles.searchContainer,
                        shadowStyles.default,
                        { backgroundColor: theme.current.colors.primary },
                    ]}>
                    <Icon icon="search-outline" size={18} color="onPrimary" />
                    <TextInput
                        style={[styles.searchInput, { color: theme.current.colors.textOnPrimary }]}
                        placeholder="Search icons..."
                        placeholderTextColor={theme.current.colors.textOnPrimary + "99"}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity
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
                            style={styles.gridCell}
                            onPress={() => onModalSelect(item)}>
                            <View
                                style={[
                                    styles.iconContainer,
                                    item === selectedIcon && {
                                        ...shadowStyles.default,
                                        backgroundColor: theme.current.colors.primary,
                                    },
                                ]}>
                                <Icon
                                    icon={item}
                                    size={ICON_SIZE}
                                    color={item === selectedIcon ? "onPrimary" : "onBackground"}
                                />
                            </View>
                        </TouchableOpacity>
                    )}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.gridContainer}
                    keyboardShouldPersistTaps="handled"
                />
            </SenswaveModal>
        </View>
    );
};

export default IconSelector;

const styles = StyleSheet.create({
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
        padding: 10,
        borderColor: "transparent",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 10,
        marginHorizontal: 2,
    },
    browseButton: {
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
});
