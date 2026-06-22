import ImageButton from "@/components/common/ImageButton";
import { OptionInfo, useOperationForm } from "@/contexts/custom/OperationFormProvider";
import React, { useState } from "react";
import { View } from "react-native";
import Text from "@/components/common/Text";
import { shadowStyles } from "@/styles/shadowStyles";
import { useTheme } from "@/contexts/ThemeProvider";
import SenswaveModal from "@/components/common/SenswaveModal";
import OptionsOperationFormModal from "./OptionsOperationFormModal";

interface OptionOperationFormProps {
    edit?: boolean;
}

const OptionOperationForm = ({ edit }: OptionOperationFormProps) => {
    const theme = useTheme();
    const [dialogOpen, setDialogOpen] = useState(false);
    const operationForm = useOperationForm();

    return (
        <View style={{ paddingHorizontal: 15 }}>
            <SenswaveModal
                visible={dialogOpen}
                onClose={() => setDialogOpen(false)}
                title="Add Option">
                <OptionsOperationFormModal onClose={() => setDialogOpen(false)} />
            </SenswaveModal>

            <View style={{ flexDirection: "row", marginBottom: 6, alignItems: "center" }}>
                <Text size={"medium"} color={"onBackground"} bold={true} style={{ flex: 1 }}>
                    Configured Options
                </Text>
                <ImageButton
                    icon="add-outline"
                    size={20}
                    onPress={() => {
                        if (edit) {
                            return;
                        }
                        setDialogOpen(true);
                    }}
                    style={{ opacity: edit ? 0 : 1 }}
                />
            </View>

            <View>
                {operationForm.getOptions().map((option: OptionInfo, idx: number) => (
                    <View
                        key={idx}
                        style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                        <View
                            style={[
                                {
                                    marginTop: 0,
                                    marginBottom: 5,
                                    borderRadius: 12,
                                    padding: 8,
                                    height: 40,
                                    marginRight: 10,
                                    backgroundColor: theme.current.colors.primary,
                                    justifyContent: "center",
                                },
                                shadowStyles.default,
                            ]}>
                            <Text size={"medium"} color={"onPrimary"} bold={false}>
                                {option.name}
                            </Text>
                        </View>
                        <View
                            style={[
                                {
                                    marginTop: 0,
                                    marginBottom: 5,
                                    borderRadius: 12,
                                    padding: 8,
                                    height: 40,
                                    flex: 1,
                                    marginRight: edit ? 0 : 10,
                                    backgroundColor: theme.current.colors.primary,
                                    justifyContent: "center",
                                },
                                shadowStyles.default,
                            ]}>
                            <Text
                                size={"medium"}
                                color={"onPrimary"}
                                bold={false}
                                numberOfLines={1}>
                                Value: {option.value.toString()}
                            </Text>
                        </View>
                        {!edit && (
                            <ImageButton
                                size={24}
                                icon="remove-outline"
                                onPress={() => operationForm.removeOption(option.name)}
                            />
                        )}
                    </View>
                ))}
            </View>
        </View>
    );
};

export default OptionOperationForm;
