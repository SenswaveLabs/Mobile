import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import Text from "@/components/common/Text";
import Button from "@/components/common/Button";
import { useRouter } from "expo-router";
import { useTheme } from "@/contexts/ThemeProvider";
import { ThemeMode, useUser } from "@/contexts/domain/UserProvider";
import { useSession } from "@/contexts/SessionProvider";
import UserProfileImage from "@/components/user/UserProfileImage";
import Dropdown from "@/components/common/Dropdown";
import Divider from "@/components/common/Divider";
import { ScrollView } from "react-native-gesture-handler";
import Loading from "@/components/common/Loading";
import RemoveAccountDialog from "@/components/user/RemoveAccountDialog";

const themeOptions = Object.keys(ThemeMode).map((k) => {
    return { name: k, value: ThemeMode[k as keyof typeof ThemeMode] };
});

const languageOptions = [{ name: "English", value: "en" }];

export default function Profile() {
    const router = useRouter();
    const theme = useTheme();
    const user = useUser();
    const session = useSession();
    const [loading, setLoading] = useState<boolean>(false);
    const [showRemoveDialog, setShowRemoveDialog] = useState<boolean>(false);

    const onThemeChange = (name: string) => {
        console.debug("[Dropdown] Theme change requested:", name);

        const internalTheme = themeOptions.find(
            (t) => t.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
        )!;

        console.debug("[Dropdown] Current theme:", user.data?.theme);

        if (internalTheme.value === user.data?.theme) {
            return;
        }

        console.debug("[Dropdown] Changing theme to:", internalTheme);
        user.updateTheme!(internalTheme.value);
        return;
    };

    const onLanguageChange = (name: string) => {
        const language = languageOptions.find(
            (t) => t.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
        )!.value;

        console.debug("[Dropdown] Current language:", user.data?.language);
        if (language === user.data?.language) {
            return;
        }

        console.debug("[Dropdown] Changing language to:", language);
        user.updateLanguage!(language);
        return;
    };

    const logoutClicked = () => {
        session.logout();
    };

    const onManageDataSources = () => {
        console.debug("[Profile] Manage data sources");
        router.push("dataSource/list");
    };

    const onAppInformation = () => {
        console.debug("[Profile] Entering app information.");
        router.push("user/info");
    };

    const removeAccount = async () => {
        console.info("[User profile] Removing account on server.");

        setLoading(true);

        user.removeUserAccount()
            .then(() => {
                setLoading(false);
            })
            .catch((error) => {
                console.error("[User profile] Unexpected error during account removal:", error);
                setLoading(false);
            });
    };

    const onRemoveAccount = () => {
        console.info("[User profile] Starting removal account process.");
        setShowRemoveDialog(true);
    };

    if (loading) {
        return <Loading />;
    }

    return (
        <View style={{ backgroundColor: theme.current.colors.background, flex: 1 }}>
            <RemoveAccountDialog
                visible={showRemoveDialog}
                onConfirm={() => {
                    setShowRemoveDialog(false);
                    removeAccount();
                }}
                onCancel={() => setShowRemoveDialog(false)}
            />
            <View style={{ paddingTop: 25, paddingHorizontal: 10 }}>
                <View style={styles.imageContainer}>
                    <UserProfileImage size={96} enableNavigation={false} />
                    <Text style={{ marginTop: 6 }} size={"large"} color="onBackground">
                        {user.data?.email}
                    </Text>
                </View>
            </View>

            <ScrollView style={{ flex: 1, paddingHorizontal: 10 }}>
                <Dropdown
                    selectedValue={user.data?.theme ?? ThemeMode.Default}
                    title={"Theme"}
                    onSelected={onThemeChange}
                    options={themeOptions}
                    style={{ marginTop: 10 }}
                />

                <Dropdown
                    selectedValue={user.data?.language ?? ""}
                    title={"Language"}
                    onSelected={onLanguageChange}
                    options={languageOptions}
                    style={{ marginTop: 10 }}
                />

                <Divider />

                <View>
                    <Button
                        name="Manage My Data Sources"
                        onPress={onManageDataSources}
                        loading={false}
                    />
                </View>

                <View style={styles.buttonContainer}>
                    <Button
                        name="Logout"
                        type="alternative"
                        onPress={logoutClicked}
                        loading={false}
                    />
                </View>

                <View style={styles.buttonContainer}>
                    <Button
                        name="Remove Account"
                        type="alternative"
                        onPress={onRemoveAccount}
                        loading={false}
                    />
                </View>

                <Divider />

                <View>
                    <Button name="App Information" onPress={onAppInformation} loading={false} />
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    imageContainer: {
        maxHeight: 256,
        alignItems: "center",
        justifyContent: "center",
    },
    buttonContainer: {
        marginTop: 12,
    },
});
