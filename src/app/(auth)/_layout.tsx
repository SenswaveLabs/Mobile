import React, { FC, useRef } from "react";
import { Stack } from "expo-router";
import { ResendCooldownContext } from "@/components/auth/AuthFlow";
import { useTheme } from "@/contexts/ThemeProvider";

const AuthLayout: FC = () => {
    const { colors } = useTheme().current;
    const lastEmailSentAt = useRef(0);

    return (
        <ResendCooldownContext.Provider value={lastEmailSentAt}>
            <Stack
                screenOptions={{
                    headerShown: false,
                    animation: "none",
                    contentStyle: { backgroundColor: colors.background },
                }}
            />
        </ResendCooldownContext.Provider>
    );
};

export default AuthLayout;
