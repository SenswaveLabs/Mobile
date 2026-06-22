import Button from "@/components/common/Button";
import Dropdown, { Option } from "@/components/common/Dropdown";
import Input from "@/components/common/Input";
import InputNumber from "@/components/common/InputNumber";
import SwitchDropdown from "@/components/common/SwitchDropdown";
import { useOperationForm } from "@/contexts/custom/OperationFormProvider";
import React, { useRef, useState } from "react";
import { View } from "react-native";

const TypeOptions: Option[] = [
    { name: "Boolean Value", value: "Boolean" },
    { name: "Number Value", value: "Number" },
    { name: "Text Value", value: "Text" },
];

interface OptionsOperationFormModalProps {
    onClose: () => void;
}

const OptionsOperationFormModal = ({ onClose }: OptionsOperationFormModalProps) => {
    const operationForm = useOperationForm();

    const [name, setName] = useState<string>("");
    const [nameError, setNameError] = useState<string>("");

    const [type, setType] = useState<string>("Number");
    const [inputValue, setInputValue] = useState<number | boolean | string>(0);
    const [error, setError] = useState<string>("");
    const numberFieldValidRef = useRef<boolean>(true);

    const validateInput = () => {
        if (name.length < 1) {
            setNameError("Name options is too short");
            return false;
        }

        if (name.length > 12) {
            setNameError("Option name is too long");
            return false;
        }

        if (operationForm.getOptions().some((option) => option.name === name)) {
            setNameError("Option name already used.");
            return false;
        }

        setNameError("");

        if (type === "Number") {
            if (!numberFieldValidRef.current) {
                setError("Required.");
                return false;
            }
        } else if (type === "Text") {
            if (typeof inputValue !== "string" || inputValue.trim() === "") {
                setError("Text value cannot be empty.");
                return false;
            }

            if (inputValue.length >= 128) {
                setError("Too long value");
                return false;
            }
        }

        if (operationForm.getOptions().some((option) => option.value === inputValue)) {
            setError("Option value already used.");
            return false;
        }

        setError("");
        return true;
    };

    const addValuePressed = () => {
        if (!validateInput()) return;

        operationForm.addOption(name, inputValue);

        setName("");
        typeSelected(type);
        setInputValue("");

        onClose();
    };

    const typeSelected = (type: string) => {
        setType(type);

        if (type === "Boolean") {
            setInputValue(false);
        } else if (type === "Number") {
            setInputValue(0);
            numberFieldValidRef.current = true;
        } else {
            setInputValue("");
        }

        setError("");
        setNameError("");
    };

    return (
        <View style={{ flex: 1 }}>
            <Input
                value={name}
                setValue={setName}
                error={nameError}
                title={"Option Name"}
                placeholder={"Provide option name"}
            />

            <Dropdown
                title={"Option Value"}
                options={TypeOptions}
                selectedValue={type}
                onSelected={typeSelected}
                style={{ marginBottom: 10 }}
            />

            {type === "Boolean" ? (
                <SwitchDropdown
                    value={Boolean(inputValue)}
                    onSelected={(v) => setInputValue(v)}
                    style={{ marginBottom: 10 }}
                />
            ) : type === "Number" ? (
                <InputNumber
                    value={typeof inputValue === "number" ? inputValue : undefined}
                    onChange={(v) => {
                        setError("");
                        numberFieldValidRef.current = v !== undefined;
                        if (v !== undefined) setInputValue(v);
                    }}
                    error={error}
                    required
                    placeholder="Enter a number"
                />
            ) : (
                <Input
                    value={inputValue as string}
                    setValue={(value: string) => setInputValue(value)}
                    error={error}
                    placeholder="Enter text"
                />
            )}

            <View style={{ flex: 1 }} />

            <Button
                name="Add Option"
                loading={false}
                onPress={addValuePressed}
                style={{ marginBottom: 16 }}
            />
        </View>
    );
};

export default OptionsOperationFormModal;
