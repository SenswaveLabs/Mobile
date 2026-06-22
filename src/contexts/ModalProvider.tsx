import React, { createContext, useContext, useState, ReactNode } from "react";

interface ModalContextType {
    opened: boolean;
    open: () => void;
    close: () => void;
}

const ModalContext = createContext<ModalContextType>({
    opened: false,
    open: () => {
        console.debug("[Modal Context] Not initialized.");
    },
    close: () => {
        console.debug("[Modal Context] Not initialized.");
    },
});

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [opened, setOpened] = useState<boolean>(false);

    const open = () => {
        setOpened(true);
    };

    const close = () => {
        setOpened(false);
    };

    return (
        <ModalContext.Provider value={{ opened, open, close }}>{children}</ModalContext.Provider>
    );
};

export const useModal = (): ModalContextType => useContext(ModalContext);
