import React, { useState } from "react";
import {
    View,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    TextInputEndEditingEvent,
} from "react-native";
import { useTheme } from "@/contexts/ThemeProvider";
import Text from "@/components/common/Text";
import Icon from "./Icon";
import { useToast } from "@/contexts/ToastProvider";
import { ScrollView } from "react-native-gesture-handler";
import { shadowStyles } from "@/styles/shadowStyles";

interface JsonPathSelectorProps {
    jsonNames: string[];
    setJsonNames: (names: string[]) => void;
    editable?: boolean;
}

const JsonPathSelector: React.FC<JsonPathSelectorProps> = ({
    jsonNames,
    setJsonNames,
    editable = true,
}) => {
    const [newPath, setNewPath] = useState<string>("");
    const theme = useTheme();
    const toast = useToast();

    const hasControlChars = (value: string) => [...value].some((ch) => ch.charCodeAt(0) <= 0x1f);

    const validateText = (path: string) => {
        if (!path || path.trim() === "") {
            toast.error("Field name not provided!");
            return false;
        }

        const key = path.trim();

        if (key.length < 1) {
            toast.error("Too short!");
            return false;
        }

        if (key.length >= 64) {
            toast.error("Too long field name!");
            return false;
        }

        if (key.includes('"') || key.includes("\\")) {
            toast.error('Invalid JSON key (contains " or \\)');
            return false;
        }

        if (hasControlChars(key)) {
            toast.error("Invalid JSON key (contains control characters)");
            return false;
        }

        return true;
    };

    const addPath = () => {
        if (!validateText(newPath)) {
            return;
        }

        setJsonNames([...jsonNames, newPath.trim()]);
        setNewPath("");
    };

    const removePathAtIndex = (index: number) => {
        const newArray = [...jsonNames];

        // Remove the item at the specified index
        if (index >= 0 && index < newArray.length) {
            newArray.splice(index, 1);
        }

        setJsonNames(newArray);
    };

    const editExistingPath = (index: number, oldValue: string, e: TextInputEndEditingEvent) => {
        const newValue = e.nativeEvent.text?.trim();

        console.debug(`[Field name: ${oldValue}] Old name field name changed:`, newValue);

        if (newValue === oldValue) {
            return;
        }

        if (!validateText(newValue)) {
            const copy = [...jsonNames];
            copy[index] = oldValue;
            setJsonNames(copy);
            return;
        }

        const copy = [...jsonNames];
        copy[index] = newValue;
        setJsonNames(copy);
    };

    return (
        <View style={styles.container}>
            <Text bold={true} size={"medium"} color={"onBackground"}>
                Json Fields Path
            </Text>

            <View style={{ paddingLeft: 5 }}>
                <View
                    style={[
                        {
                            backgroundColor: theme.current.colors.primary,
                            marginTop: 10,
                            borderRadius: 8,
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            alignSelf: "flex-start",
                        },
                        shadowStyles.default,
                    ]}>
                    <Text>{"{"}</Text>
                </View>
            </View>

            <View style={{ flexDirection: "column", paddingTop: 6 }}>
                {jsonNames.map((item, index) => (
                    <View key={index} style={{ flexDirection: "row" }}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View
                                style={{
                                    flexDirection: "row",
                                    flex: 1,
                                    justifyContent: "center",
                                    alignItems: "center",
                                    paddingBottom: 6,
                                    paddingLeft: index * 10 + 5,
                                }}>
                                <View
                                    style={[
                                        {
                                            backgroundColor: theme.current.colors.primary,
                                            borderRadius: 8,
                                            padding: 4,
                                            flexDirection: "row",
                                        },
                                        shadowStyles.default,
                                    ]}>
                                    {editable && (
                                        <View
                                            style={{
                                                paddingRight: 4,
                                                paddingLeft: 8,
                                                justifyContent: "center",
                                            }}>
                                            <Icon icon="pencil-outline" size={14} />
                                        </View>
                                    )}

                                    <TextInput
                                        defaultValue={item}
                                        placeholderTextColor={
                                            theme.current.colors.textOnPrimary + "99"
                                        }
                                        onEndEditing={(event) =>
                                            editExistingPath(index, item, event)
                                        }
                                        style={{
                                            color: theme.current.colors.textOnPrimary,
                                            fontSize: 14,
                                            padding: 4,
                                            paddingRight: 12,
                                            margin: 0,
                                            height: "auto",
                                        }}
                                    />
                                </View>

                                <View
                                    style={[
                                        {
                                            backgroundColor: theme.current.colors.primary,
                                            borderRadius: 8,
                                            padding: 7,
                                            paddingHorizontal: 12,
                                            marginLeft: 4,
                                        },
                                        shadowStyles.default,
                                    ]}>
                                    <Text>{":"}</Text>
                                </View>

                                {index === jsonNames.length - 1 && (
                                    <View
                                        style={[
                                            {
                                                backgroundColor: theme.current.colors.primary,
                                                borderRadius: 8,
                                                padding: 7,
                                                paddingHorizontal: 12,
                                                marginLeft: 4,
                                            },
                                            shadowStyles.default,
                                        ]}>
                                        <Text>{"<value>"}</Text>
                                    </View>
                                )}

                                {index !== jsonNames.length - 1 && (
                                    <View
                                        style={[
                                            {
                                                backgroundColor: theme.current.colors.primary,
                                                borderRadius: 8,
                                                padding: 7,
                                                paddingHorizontal: 12,
                                                marginLeft: 4,
                                            },
                                            shadowStyles.default,
                                        ]}>
                                        <Text>{"{"}</Text>
                                    </View>
                                )}
                            </View>
                        </ScrollView>

                        {editable && (
                            <View style={{ marginLeft: 4 }}>
                                <View
                                    style={[
                                        {
                                            backgroundColor: theme.current.colors.primary,
                                            borderRadius: 8,
                                            padding: 7,
                                            paddingHorizontal: 12,
                                        },
                                        shadowStyles.default,
                                    ]}>
                                    <TouchableOpacity onPress={() => removePathAtIndex(index)}>
                                        <Icon icon="trash-outline" size={20} color="error" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                ))}
            </View>

            {jsonNames.length < 5 && editable && (
                <View
                    style={{
                        flex: 1,
                        flexDirection: "row",
                        paddingLeft: (jsonNames.length - 1) * 10,
                    }}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ height: "100%" }}>
                        <View
                            style={{
                                flexDirection: "row",
                                flex: 1,
                                justifyContent: "center",
                                alignItems: "center",
                                paddingLeft: 5,
                                paddingBottom: 6,
                            }}>
                            <View
                                style={[
                                    {
                                        backgroundColor: theme.current.colors.primary,
                                        borderRadius: 8,
                                        padding: 4,
                                        flex: 1,
                                        paddingBottom: 6,
                                    },
                                    shadowStyles.default,
                                ]}>
                                <TextInput
                                    value={newPath}
                                    onChangeText={setNewPath}
                                    placeholder="Enter value field name"
                                    placeholderTextColor={theme.current.colors.textOnPrimary + "99"}
                                    style={{
                                        flex: 1,
                                        color: theme.current.colors.textOnPrimary,
                                        fontSize: 14,
                                        height: 24,
                                        padding: 4,
                                        paddingHorizontal: 12,
                                        margin: 0,
                                    }}
                                />
                            </View>
                        </View>
                    </ScrollView>

                    <View style={{ paddingLeft: 4 }}>
                        <View
                            style={[
                                {
                                    backgroundColor: theme.current.colors.primary,
                                    borderRadius: 8,
                                    padding: 7,
                                },
                                shadowStyles.default,
                            ]}>
                            <TouchableOpacity
                                onPress={addPath}
                                style={{
                                    alignItems: "center",
                                    justifyContent: "center",
                                    height: "100%",
                                }}>
                                <Icon icon="add-outline" size={24} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
            <View style={{ paddingLeft: 5 }}>
                {jsonNames.map((item, index) => (
                    <View
                        key={index}
                        style={{
                            paddingLeft: (jsonNames.length - index - 1) * 10,
                            paddingBottom: 6,
                        }}>
                        <View
                            style={[
                                {
                                    backgroundColor: theme.current.colors.primary,
                                    borderRadius: 8,
                                    paddingHorizontal: 12,
                                    paddingVertical: 7,
                                    alignSelf: "flex-start",
                                },
                                shadowStyles.default,
                            ]}>
                            <Text>{"}"}</Text>
                        </View>
                    </View>
                ))}

                {jsonNames.length == 0 && (
                    <View
                        style={[
                            {
                                backgroundColor: theme.current.colors.primary,
                                borderRadius: 8,
                                paddingHorizontal: 12,
                                paddingVertical: 7,
                                alignSelf: "flex-start",
                            },
                            shadowStyles.default,
                        ]}>
                        <Text>{"}"}</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingBottom: 15,
    },
    itemContainer: {
        flexDirection: "row",
        alignItems: "center",
        padding: 10,
        marginRight: 5,
        borderRadius: 10,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingTop: 10,
        paddingBottom: 5,
    },
});

export default JsonPathSelector;
