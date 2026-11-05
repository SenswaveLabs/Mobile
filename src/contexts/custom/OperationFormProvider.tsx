import React, { createContext, useContext, useState, ReactNode } from "react";

export type OptionInfo = {
    name: string;
    value: string | number | boolean;
};

interface OperationFormState {
    error: string;
    addOption: (name: string, value: string | number | boolean) => void;
    removeOption: (name: string) => void;
    getOptions: () => OptionInfo[];
    setConfiguration: (configuration: any) => boolean;
}

const OperationFormContext = createContext<OperationFormState>({
    error: "",
    addOption: () => {},
    removeOption: () => {},
    getOptions: () => [],
    setConfiguration: () => false,
});

export const OperationFormProvider = ({ children }: { children: ReactNode }) => {
    const [error, setError] = useState("");
    const [options, setOptions] = useState<OptionInfo[]>([]);

    const addOption = (name: string, value: string | number | boolean) => {
        setError("");
        const existingIndex = options.findIndex((opt) => opt.name === name);

        if (existingIndex !== -1) {
            // Update existing option
            const updatedOptions = [...options];
            updatedOptions[existingIndex].value = value;
            setOptions(updatedOptions);
        } else {
            // Check limit before adding
            if (options.length >= 10) {
                setError("Max options reached.");
                return;
            }
            setOptions([...options, { name, value }]);
        }
    };

    const removeOption = (name: string) => {
        setError("");
        setOptions((prev) => prev.filter((opt) => opt.name !== name));
    };

    const getOptions = () => options;

    const setConfiguration = (configuration: any) => {
        if (!configuration || !Array.isArray(configuration.options)) {
            setError("Invalid configuration format.");
            return false;
        }

        setError("");
        setOptions(configuration.options);
        return true;
    };

    return (
        <OperationFormContext.Provider
            value={{
                error,
                addOption,
                removeOption,
                getOptions,
                setConfiguration,
            }}>
            {children}
        </OperationFormContext.Provider>
    );
};

export const useOperationForm = () => useContext(OperationFormContext);
