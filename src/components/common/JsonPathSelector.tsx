import React, { FC, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Plus, Trash2 } from "lucide-react-native";
import Input from "@/components/common/Input";
import SectionHeaderAction from "@/components/common/SectionHeaderAction";
import { useTheme } from "@/contexts/ThemeProvider";
import { isValidJsonPathSegment } from "@/utils/jsonPath";

interface JsonPathSelectorProps {
    jsonNames: string[];
    setJsonNames: (names: string[]) => void;
    editable?: boolean;
    disabled?: boolean;
    onValidChange?: (valid: boolean) => void;
}

const segmentError = (value: string) => {
    const key = value.trim();
    if (!key) return "Enter a field name.";
    if (key.length > 63) return "Use at most 63 characters.";
    if (!isValidJsonPathSegment(key)) return "Remove quotes, backslashes and control characters.";
    return "";
};

const JsonPathSelector: FC<JsonPathSelectorProps> = ({
    jsonNames,
    setJsonNames,
    editable = true,
    disabled = false,
    onValidChange,
}) => {
    const { colors } = useTheme().current;
    const [drafts, setDrafts] = useState(jsonNames);
    const [newPath, setNewPath] = useState("");
    const [newError, setNewError] = useState("");
    const draftsRef = useRef(drafts);
    const newPathRef = useRef(newPath);
    const locked = useRef(false);
    locked.current = !editable || disabled;

    const updateDrafts = (next: string[]) => {
        draftsRef.current = next;
        setDrafts(next);
        const valid = next.every((item) => !segmentError(item));
        onValidChange?.(valid && !newPathRef.current.trim());
        if (valid) setJsonNames(next.map((item) => item.trim()));
    };
    const updateNewPath = (next: string) => {
        if (locked.current) return;
        newPathRef.current = next;
        setNewPath(next);
        setNewError("");
        onValidChange?.(draftsRef.current.every((item) => !segmentError(item)) && !next.trim());
    };
    const add = () => {
        if (locked.current || draftsRef.current.length >= 5) return;
        const error = segmentError(newPathRef.current);
        setNewError(error);
        if (error) {
            onValidChange?.(false);
            return;
        }
        const next = [...draftsRef.current, newPathRef.current.trim()];
        newPathRef.current = "";
        setNewPath("");
        updateDrafts(next);
    };

    return (
        <View style={styles.root}>
            <Text
                accessibilityRole="header"
                style={[styles.title, { color: colors.authForeground }]}>
                JSON path
            </Text>
            <Text style={[styles.helper, { color: colors.authMuted }]}>
                Segments are read in order, from the outer field to the value.
            </Text>
            {drafts.map((item, index) => (
                <View key={index} style={styles.row}>
                    <View style={styles.input}>
                        <Input
                            variant="auth"
                            title={`Segment ${index + 1}`}
                            placeholder="Field name"
                            value={item}
                            setValue={(value) => {
                                if (locked.current) return;
                                const next = [...draftsRef.current];
                                next[index] = value;
                                updateDrafts(next);
                            }}
                            error={segmentError(item)}
                            editable={editable}
                            accessibilityState={{ busy: disabled }}
                        />
                    </View>
                    {editable && (
                        <Pressable
                            cssInterop={false}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove segment ${index + 1}`}
                            accessibilityState={{ disabled }}
                            disabled={disabled}
                            onPress={() => {
                                if (!locked.current)
                                    updateDrafts(
                                        draftsRef.current.filter((_, current) => current !== index),
                                    );
                            }}
                            style={styles.remove}>
                            <Trash2 size={20} color={colors.authForeground} accessible={false} />
                        </Pressable>
                    )}
                </View>
            ))}
            {editable && drafts.length < 5 && (
                <View style={styles.fields}>
                    <Input
                        variant="auth"
                        title="New segment"
                        placeholder="For example, state"
                        value={newPath}
                        setValue={updateNewPath}
                        error={newError}
                        accessibilityState={{ busy: disabled }}
                        onSubmitEditing={add}
                    />
                    <SectionHeaderAction
                        label="Add segment"
                        accessibilityLabel="Add JSON path segment"
                        icon={<Plus size={20} color={colors.authForeground} accessible={false} />}
                        disabled={disabled}
                        onPress={add}
                    />
                </View>
            )}
        </View>
    );
};
export default JsonPathSelector;
const styles = StyleSheet.create({
    root: { gap: 12 },
    title: { fontSize: 16, lineHeight: 24, fontWeight: "600" },
    helper: { fontSize: 14, lineHeight: 20 },
    fields: { gap: 8 },
    row: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
    input: { flex: 1, minWidth: 0 },
    remove: { width: 48, height: 52, alignItems: "center", justifyContent: "center" },
});
