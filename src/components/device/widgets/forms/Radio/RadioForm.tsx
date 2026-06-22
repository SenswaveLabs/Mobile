import ImageButton from "@/components/common/ImageButton";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import Text from "@/components/common/Text";
import { shadowStyles } from "@/styles/shadowStyles";
import { useTheme } from "@/contexts/ThemeProvider";
import { useWidgetDetails } from "@/contexts/custom/WidgetDetailsProvider";
import Icon from "@/components/common/Icon";
import RadioOptionFormModal from "./RadioOptionFormModal";
import { useToast } from "@/contexts/ToastProvider";
import SenswaveModal from "@/components/common/SenswaveModal";
import { OperationType } from "@/types/DeviceTypes";

interface RadioFormProps {
    edit?: boolean;
}

export type RadioOption = {
    optionName: string;
    displayName: string;
    icon: string;
};

export const RadioOperationTypes: OperationType[] = ["Options"];

const RadioForm = ({ edit }: RadioFormProps) => {
    const theme = useTheme();
    const toast = useToast();
    const [dialogOpen, setDialogOpen] = useState(false);
    const widgetDetails = useWidgetDetails();

    const options = (widgetDetails.widget?.configuration?.options as RadioOption[]) ?? [];

    const [currentRadioOptions, setCurrentRadioOptions] = useState<RadioOption[]>(options);

    const validateOptions = (): boolean => {
        if (widgetDetails.widget?.configuration?.options?.length === 0) {
            return false;
        }

        if (widgetDetails.widget?.configuration?.options?.length < 2) {
            toast.error("At least two options are required.");
            return false;
        }

        return true;
    };

    useEffect(() => {
        widgetDetails.setAdditionalValidation(validateOptions);
        widgetDetails.setIsValid(options.length >= 2);

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const removeOption = (option: RadioOption) => {
        const updatedOptions = currentRadioOptions.filter((item) => item !== option);
        setCurrentRadioOptions(updatedOptions);

        widgetDetails.setWidget({
            ...widgetDetails.widget!,
            configuration: {
                ...widgetDetails.widget?.configuration,
                options: updatedOptions,
            },
        });

        widgetDetails.setIsValid(updatedOptions.length >= 2);
    };

    const onAddOption = (option: RadioOption) => {
        const updatedOptions = [...currentRadioOptions, option];
        setCurrentRadioOptions(updatedOptions);

        widgetDetails.setWidget({
            ...widgetDetails.widget!,
            configuration: {
                ...widgetDetails.widget?.configuration,
                options: updatedOptions,
            },
        });

        widgetDetails.setIsValid(updatedOptions.length >= 2);
    };

    return (
        <View>
            <SenswaveModal
                visible={dialogOpen}
                onClose={() => setDialogOpen(false)}
                title="Add Radio Option">
                <RadioOptionFormModal
                    onAddOption={onAddOption}
                    currentRadioOptions={currentRadioOptions}
                    onClose={() => setDialogOpen(false)}
                />
            </SenswaveModal>

            <View>
                <View style={{ flexDirection: "row", marginBottom: 10, alignItems: "center" }}>
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

                {currentRadioOptions.map((option: RadioOption, idx: number) => (
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
                            <Icon icon={option.icon} size={20} />
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
                                    justifyContent: "flex-start",
                                    flexDirection: "row",
                                    gap: 8,
                                },
                                shadowStyles.default,
                            ]}>
                            <Text size={"medium"} color={"onPrimary"} bold={false}>
                                {option.displayName}
                            </Text>
                        </View>
                        {!edit && (
                            <ImageButton
                                size={24}
                                icon="remove-outline"
                                onPress={() => removeOption(option)}
                            />
                        )}
                    </View>
                ))}
            </View>
        </View>
    );
};

export default RadioForm;
