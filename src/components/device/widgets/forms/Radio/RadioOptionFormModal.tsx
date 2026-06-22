import { View } from "react-native";
import Button from "@/components/common/Button";
import Dropdown from "@/components/common/Dropdown";
import IconSelector from "@/components/common/IconSelector";
import Input from "@/components/common/Input";
import { useWidgetDetails } from "@/contexts/custom/WidgetDetailsProvider";
import { useState } from "react";
import { RadioOption } from "./RadioForm";
import { OptionInfo } from "@/contexts/custom/OperationFormProvider";
interface RadioOptionFormModalProps {
    onAddOption: (option: RadioOption) => void;
    currentRadioOptions: RadioOption[];
    onClose: () => void;
}

const DefaultIcons = [
    "bulb-outline",
    "flash-outline",
    "power-outline",
    "checkmark-outline",
    "close-outline",
    "play-outline",
    "pause-outline",
    "stop-outline",
    "moon-outline",
    "sunny-outline",
    "snow-outline",
    "flame-outline",
    "thermometer-outline",
    "water-outline",
    "leaf-outline",
] as string[];

const RadioOptionFormModal = ({
    onAddOption,
    currentRadioOptions,
    onClose,
}: RadioOptionFormModalProps) => {
    const widgetDetails = useWidgetDetails();

    const options = (widgetDetails.operation?.configuration?.options as OptionInfo[]).map((x) => ({
        name: x.name,
        value: x.name,
    }));

    const [name, setName] = useState<string>("");
    const [nameError, setNameError] = useState<string>("");
    const [optionError, setOptionError] = useState<string>("");
    const [icon, setIcon] = useState<string>("bulb-outline");
    const [selectedOption, setSelectedOption] = useState<string>(options[0].value);

    const validateNewOption = () => {
        if (name.length < 1) {
            setNameError("Name options is too short");
            return false;
        }

        if (name.length > 12) {
            setNameError("Option name is too long");
            return false;
        }

        setNameError("");

        if (currentRadioOptions.some((option) => option.optionName === selectedOption)) {
            setOptionError("Option already used.");
            return false;
        }

        if (currentRadioOptions.some((option) => option.displayName === name)) {
            setNameError("Display name already used.");
            return false;
        }

        setOptionError("");
        return true;
    };

    const addOptionPressed = () => {
        if (!validateNewOption()) return;

        const option: RadioOption = {
            optionName: selectedOption,
            displayName: name,
            icon: icon,
        };

        onAddOption(option);
        onClose();
    };

    return (
        <View style={{ flex: 1 }}>
            <Dropdown
                title={"Operation Option"}
                options={options}
                selectedValue={selectedOption}
                onSelected={(v) => {
                    setSelectedOption(v);
                    setOptionError("");
                }}
                error={optionError}
                style={{ marginBottom: 10 }}
            />

            <Input
                value={name}
                setValue={setName}
                error={nameError}
                title={"Radio Display Name"}
                placeholder={"Provide option name"}
            />

            <IconSelector
                onIconSelected={(x) => {
                    setIcon(x);
                }}
                iconList={DefaultIcons}
                defaultIcon="bulb-outline"
            />

            <View style={{ flex: 1 }} />

            <Button
                name="Add Option"
                loading={false}
                onPress={addOptionPressed}
                style={{ marginBottom: 16 }}
            />
        </View>
    );
};

export default RadioOptionFormModal;
