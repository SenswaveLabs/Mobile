import { useSession } from "@/contexts/SessionProvider";
import { Redirect, Stack } from "expo-router";
import React from "react";
import * as SplashScreen from "expo-splash-screen";
import ProfileHeader from "@/components/headers/ProfileHeader";
import { useTheme } from "@/contexts/ThemeProvider";
import { HomeProvider } from "@/contexts/domain/HomeProvider";
import { LiveUpdateProvider } from "@/contexts/domain/LiveUpdateProvider";
import { DeviceListProvider } from "@/contexts/custom/DeviceListProvider";
import DefaultHeader from "@/components/headers/DefaultHeader";
import { DeviceProvider } from "@/contexts/custom/DeviceProvider";
import Loading from "@/components/common/Loading";
import { ModalProvider } from "@/contexts/ModalProvider";
import { AutomationListProvider } from "@/contexts/custom/AutomationListProvider";
import AutomationProvider from "@/contexts/custom/AutomationProvider";

SplashScreen.preventAutoHideAsync();

SplashScreen.setOptions({
    duration: 1000,
    fade: true,
});

function InternalLayout() {
    const theme = useTheme();

    const screenOptions = {
        headerStyle: { backgroundColor: theme.current.colors.background },
        contentStyle: { backgroundColor: theme.current.colors.background },
    };

    return (
        <Stack screenOptions={screenOptions}>
            <Stack.Screen name="index" options={{ header: () => <ProfileHeader /> }} />

            <Stack.Screen
                name="user/profile"
                options={{
                    header: () => <DefaultHeader titlePrefix="My" titleSuffix="Profile" />,
                }}
            />

            <Stack.Screen
                name="user/privacy"
                options={{
                    header: () => <DefaultHeader titlePrefix="Privacy" titleSuffix="Policy" />,
                }}
            />

            <Stack.Screen
                name="user/terms"
                options={{
                    header: () => <DefaultHeader titlePrefix="Terms" titleSuffix="" />,
                }}
            />

            <Stack.Screen
                name="user/info"
                options={{
                    header: () => <DefaultHeader titlePrefix="App" titleSuffix="Info" />,
                }}
            />

            <Stack.Screen
                name="home/list"
                options={{
                    header: () => <DefaultHeader titlePrefix="My" titleSuffix="Homes" />,
                }}
            />

            <Stack.Screen
                name="home/details"
                options={{
                    header: () => <DefaultHeader titlePrefix="Home" />,
                }}
            />

            <Stack.Screen
                name="home/add"
                options={{
                    header: () => <DefaultHeader titlePrefix="Add" titleSuffix="Home" />,
                }}
            />

            <Stack.Screen
                name="home/share"
                options={{
                    header: () => <DefaultHeader titlePrefix="Share" titleSuffix="Home" />,
                }}
            />

            <Stack.Screen
                name="home/join"
                options={{
                    header: () => <DefaultHeader titlePrefix="Join" titleSuffix="Home" />,
                }}
            />

            <Stack.Screen
                name="home/dataSource/select"
                options={{
                    header: () => <DefaultHeader titlePrefix="Data" titleSuffix="Sources" />,
                }}
            />

            <Stack.Screen
                name="home/room/add"
                options={{
                    header: () => <DefaultHeader titlePrefix="Add" titleSuffix="Room" />,
                }}
            />

            <Stack.Screen
                name="home/room/details"
                options={{
                    header: () => <DefaultHeader titlePrefix="Room" />,
                }}
            />

            <Stack.Screen
                name="device/device"
                options={{
                    header: () => <DefaultHeader titlePrefix="Device" />,
                }}
            />

            <Stack.Screen
                name="device/add"
                options={{
                    headerShown: true,
                    header: () => <DefaultHeader titlePrefix="Add" titleSuffix="Device" />,
                }}
            />

            <Stack.Screen
                name="device/details"
                options={{
                    headerShown: true,
                    header: () => <DefaultHeader titlePrefix="Device" titleSuffix="Details" />,
                }}
            />

            <Stack.Screen
                name="device/widget/details"
                options={{
                    headerShown: true,
                    header: () => <DefaultHeader titlePrefix="Widget" titleSuffix="Details" />,
                }}
            />

            <Stack.Screen
                name="device/widget/add"
                options={{
                    headerShown: true,
                    header: () => <DefaultHeader titlePrefix="Add" titleSuffix="Widget" />,
                }}
            />

            <Stack.Screen
                name="device/widget/list"
                options={{
                    headerShown: true,
                    header: () => <DefaultHeader titlePrefix="Widgets" />,
                }}
            />

            <Stack.Screen
                name="device/operation/details"
                options={{
                    headerShown: true,
                    header: () => <DefaultHeader titlePrefix="Operation" titleSuffix="Details" />,
                }}
            />

            <Stack.Screen
                name="device/operation/add"
                options={{
                    headerShown: true,
                    header: () => <DefaultHeader titlePrefix="Add" titleSuffix="Operation" />,
                }}
            />

            <Stack.Screen
                name="device/operation/list"
                options={{
                    headerShown: true,
                    header: () => <DefaultHeader titlePrefix="Operations" />,
                }}
            />

            <Stack.Screen
                name="device/dashboard/details"
                options={{
                    headerShown: true,
                    header: () => <DefaultHeader titlePrefix="Dashboard" titleSuffix="Details" />,
                }}
            />

            <Stack.Screen
                name="device/dashboard/add"
                options={{
                    headerShown: true,
                    header: () => <DefaultHeader titlePrefix="Add" titleSuffix="Dashboard" />,
                }}
            />

            <Stack.Screen
                name="device/dashboard/placeWidget"
                options={{
                    headerShown: true,
                    header: () => <DefaultHeader titlePrefix="Select" titleSuffix="Widget" />,
                }}
            />

            <Stack.Screen
                name="dataSource/list"
                options={{
                    header: () => <DefaultHeader titlePrefix="Data" titleSuffix="Sources" />,
                }}
            />

            <Stack.Screen
                name="dataSource/add"
                options={{
                    header: () => <DefaultHeader titlePrefix="Add Data" titleSuffix="Source" />,
                }}
            />

            <Stack.Screen
                name="dataSource/details"
                options={{
                    header: () => <DefaultHeader titlePrefix="Data" titleSuffix="Source" />,
                }}
            />

            <Stack.Screen
                name="dataSource/brokers/startBrokerClient"
                options={{
                    header: () => <DefaultHeader titlePrefix="Data" titleSuffix="Source" />,
                }}
            />

            <Stack.Screen
                name="dataSource/brokers/addSubscription"
                options={{
                    header: () => <DefaultHeader titlePrefix="Add" titleSuffix="Subscription" />,
                }}
            />
            <Stack.Screen
                name="automation/details"
                options={{
                    header: () => <DefaultHeader titlePrefix="Automation" titleSuffix="Details" />,
                }}
            />

            <Stack.Screen
                name="automation/results/add"
                options={{
                    headerShown: true,
                    header: () => <DefaultHeader titlePrefix="Automation" titleSuffix="Result" />,
                }}
            />

            <Stack.Screen
                name="automation/add"
                options={{
                    headerShown: true,
                    header: () => <DefaultHeader titlePrefix="Add" titleSuffix="Automation" />,
                }}
            />

            <Stack.Screen
                name="automation/conditions/add"
                options={{
                    headerShown: true,
                    header: () => <DefaultHeader titlePrefix="Add" titleSuffix="Condition" />,
                }}
            />
        </Stack>
    );
}

export default function RootLayout() {
    const session = useSession();

    if (session.session.loading) {
        console.debug("[App Layout] Loading...");
        return <Loading activityColor="textOnBackground" />;
    }

    SplashScreen.hide();

    if (session.maintenance) {
        console.debug("[App Layout] Redirect to maintenance...");
        return <Redirect href="maintenance" />;
    }

    if (!session.session.authenticated) {
        console.debug("[App Layout] Redirect to start...");
        return <Redirect href="start" />;
    }

    console.debug("[App Layout] Entering main application...");

    return (
        <HomeProvider>
            <DeviceListProvider>
                <DeviceProvider>
                    <AutomationListProvider>
                        <AutomationProvider>
                            <LiveUpdateProvider>
                                <ModalProvider>
                                    <InternalLayout />
                                </ModalProvider>
                            </LiveUpdateProvider>
                        </AutomationProvider>
                    </AutomationListProvider>
                </DeviceProvider>
            </DeviceListProvider>
        </HomeProvider>
    );
}
