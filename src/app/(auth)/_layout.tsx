import React, { FC } from "react";
import { Slot } from "expo-router";
import { AuthFlow } from "@/components/auth/AuthFlow";

const AuthLayout: FC = () => (
    <>
        <AuthFlow />
        <Slot />
    </>
);

export default AuthLayout;
