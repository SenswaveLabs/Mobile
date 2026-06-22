import React, { createContext, useContext, useState, ReactNode } from "react";
import { useToast } from "../ToastProvider";

export type OptionInfo = {
    name: string;
    value: string | number | boolean;
};

interface OperationFormState {
    addOption: (name: string, value: string | number | boolean) => void;
    removeOption: (name: string) => void;
    getOptions: () => OptionInfo[];
    setConfiguration: (configuration: any) => boolean;
}

const OperationFormContext = createContext<OperationFormState>({
    addOption: () => {},
    removeOption: () => {},
    getOptions: () => [],
    setConfiguration: () => false,
});

export const OperationFormProvider = ({ children }: { children: ReactNode }) => {
    const toast = useToast();

    const [options, setOptions] = useState<OptionInfo[]>([]);

    const addOption = (name: string, value: string | number | boolean) => {
        const existingIndex = options.findIndex((opt) => opt.name === name);

        if (existingIndex !== -1) {
            // Update existing option
            const updatedOptions = [...options];
            updatedOptions[existingIndex].value = value;
            setOptions(updatedOptions);
        } else {
            // Check limit before adding
            if (options.length >= 10) {
                toast.error("Max options reached.");
                return;
            }
            setOptions([...options, { name, value }]);
        }
    };

    const removeOption = (name: string) => {
        setOptions((prev) => prev.filter((opt) => opt.name !== name));
    };

    const getOptions = () => options;

    const setConfiguration = (configuration: any) => {
        if (!configuration || !Array.isArray(configuration.options)) {
            toast.error("Invalid configuration format.");
            return false;
        }

        setOptions(configuration.options);
        return true;
    };

    return (
        <OperationFormContext.Provider
            value={{
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
