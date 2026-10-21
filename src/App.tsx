import React, { FC } from "react";
import { ExpoRoot, SplashScreen } from "expo-router";
import Head from "expo-router/head";
import { OptimisticActionProvider } from "@/contexts/OptimisticActionProvider";

declare const require: NodeJS.Require;

SplashScreen.preventAutoHideAsync();
const context = require.context("./app");

export const App: FC = () => (
    <Head.Provider>
        <ExpoRoot context={context} wrapper={OptimisticActionProvider} />
    </Head.Provider>
);
