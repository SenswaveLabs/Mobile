import React, { type FC, useCallback, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text as NativeText, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { ChevronRight, CircleAlert } from "lucide-react-native";
import Button from "@/components/common/Button";
import BottomSheetSelect from "@/components/common/BottomSheetSelect";
import ContentSection from "@/components/common/ContentSection";
import ListRow from "@/components/common/ListRow";
import UserProfileImage from "@/components/user/UserProfileImage";
import RemoveAccountDialog from "@/components/user/RemoveAccountDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useTheme } from "@/contexts/ThemeProvider";
import { ThemeMode, useUser } from "@/contexts/domain/UserProvider";
import { useSession } from "@/contexts/SessionProvider";

const themeOptions = [
    { label: "Light", value: ThemeMode.Light },
    { label: "Dark", value: ThemeMode.Dark },
    { label: "System", value: ThemeMode.Default },
];

const Profile: FC = () => {
    const router = useRouter();
    const theme = useTheme();
    const user = useUser();
    const session = useSession();
    const [pending, setPending] = useState<"theme" | "delete" | null>(null);
    const [themeError, setThemeError] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [identityError, setIdentityError] = useState<string | null>(null);
    const [identityLoading, setIdentityLoading] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const mutationLock = useRef(false);
    const focusVersion = useRef(0);
    const email = user.data?.email?.trim() ?? "";
    const hasIdentity = email.length > 0;
    const selectedTheme = user.data?.theme ?? ThemeMode.Default;
    const selectedThemeLabel =
        themeOptions.find((option) => option.value === selectedTheme)?.label ?? "System";

    useFocusEffect(
        useCallback(() => {
            const version = ++focusVersion.current;
            return () => {
                if (focusVersion.current === version) focusVersion.current++;
            };
        }, []),
    );

    const updateTheme = async (value: ThemeMode) => {
        if (!hasIdentity || mutationLock.current || value === selectedTheme) return;

        mutationLock.current = true;
        const requestVersion = focusVersion.current;
        setPending("theme");
        setThemeError(null);

        try {
            const result = await user.updateTheme(value);
            if (focusVersion.current === requestVersion && !result.isSuccess) {
                setThemeError(result.errorMessage || "Failed to update theme.");
            }
        } catch (error) {
            if (focusVersion.current === requestVersion) {
                setThemeError(
                    error instanceof Error && error.message
                        ? error.message
                        : "Failed to update theme.",
                );
            }
        } finally {
            mutationLock.current = false;
            setPending(null);
        }
    };

    const retryAccountDetails = async () => {
        if (identityLoading) return;

        const requestVersion = focusVersion.current;
        setIdentityLoading(true);
        setIdentityError(null);

        try {
            const result = await user.getUserData({ silent: true });
            if (focusVersion.current === requestVersion && !result.isSuccess) {
                setIdentityError(result.errorMessage || "Failed to load account details.");
            }
        } catch (error) {
            if (focusVersion.current === requestVersion) {
                setIdentityError(
                    error instanceof Error && error.message
                        ? error.message
                        : "Failed to load account details.",
                );
            }
        } finally {
            setIdentityLoading(false);
        }
    };

    const removeAccount = async () => {
        if (!hasIdentity || mutationLock.current) return;

        setShowDeleteDialog(false);
        mutationLock.current = true;
        const requestVersion = focusVersion.current;
        setPending("delete");
        setDeleteError(null);

        try {
            const result = await user.removeUserAccount();
            if (focusVersion.current === requestVersion && !result.isSuccess) {
                setDeleteError(result.errorMessage || "Failed to remove account.");
            }
        } catch (error) {
            if (focusVersion.current === requestVersion) {
                setDeleteError(
                    error instanceof Error && error.message
                        ? error.message
                        : "Failed to remove account.",
                );
            }
        } finally {
            mutationLock.current = false;
            setPending(null);
        }
    };

    const openDeleteDialog = () => {
        if (!hasIdentity || mutationLock.current) return;
        setShowDeleteDialog(true);
    };

    const onManageDataSources = () => router.push("dataSource/list");
    const onAppInformation = () => router.push("user/info");

    return (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog} asChild>
            <View style={[styles.screen, { backgroundColor: theme.current.colors.background }]}>
                <RemoveAccountDialog
                    visible={showDeleteDialog}
                    onConfirm={removeAccount}
                    onCancel={() => setShowDeleteDialog(false)}
                />
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.column}>
                        <View style={styles.identity}>
                            <UserProfileImage size={56} enableNavigation={false} />
                            <NativeText
                                style={[
                                    styles.email,
                                    { color: theme.current.colors.authForeground },
                                ]}>
                                {hasIdentity ? email : "Account details unavailable"}
                            </NativeText>
                        </View>
                        {!hasIdentity && (
                            <View style={styles.identityRecovery}>
                                {identityError && (
                                    <Alert icon={CircleAlert} variant="destructive">
                                        <AlertDescription>{identityError}</AlertDescription>
                                    </Alert>
                                )}
                                <Button
                                    name="Retry account details"
                                    type="brand-outline"
                                    loading={identityLoading}
                                    disabled={identityLoading}
                                    onPress={retryAccountDetails}
                                    style={styles.actionButton}
                                />
                            </View>
                        )}

                        <ContentSection title="Preferences">
                            <View style={styles.preferences}>
                                <View>
                                    <BottomSheetSelect
                                        title="Theme"
                                        value={selectedThemeLabel}
                                        disabled={!hasIdentity || pending !== null}
                                        busy={pending === "theme"}
                                        options={themeOptions.map((option) => ({
                                            label: option.label,
                                            selected: selectedTheme === option.value,
                                            onPress: () => updateTheme(option.value),
                                        }))}
                                    />
                                    {themeError && (
                                        <Alert
                                            icon={CircleAlert}
                                            variant="destructive"
                                            style={styles.themeError}>
                                            <AlertDescription>{themeError}</AlertDescription>
                                        </Alert>
                                    )}
                                </View>
                                <ListRow title="Language" description="English" />
                            </View>
                        </ContentSection>

                        <ContentSection title="Manage" separated>
                            <ListRow
                                title="Data sources"
                                trailing={
                                    <ChevronRight
                                        size={20}
                                        color={theme.current.colors.authMuted}
                                    />
                                }
                                accessibilityHint="Open data sources"
                                onPress={onManageDataSources}
                                separator
                            />
                            <ListRow
                                title="App information"
                                trailing={
                                    <ChevronRight
                                        size={20}
                                        color={theme.current.colors.authMuted}
                                    />
                                }
                                accessibilityHint="Open app information"
                                onPress={onAppInformation}
                            />
                        </ContentSection>

                        <ContentSection
                            title="Account"
                            separated
                            actions={
                                <Button
                                    name="Sign out"
                                    type="brand-outline"
                                    loading={false}
                                    onPress={session.logout}
                                    style={styles.actionButton}
                                />
                            }
                        />

                        <ContentSection
                            title="Delete account"
                            helper="Permanently delete your account and all associated data."
                            separated
                            actions={
                                <>
                                    {deleteError && (
                                        <Alert
                                            icon={CircleAlert}
                                            variant="destructive"
                                            style={styles.deleteError}>
                                            <AlertDescription>{deleteError}</AlertDescription>
                                        </Alert>
                                    )}
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            name="Delete account"
                                            type="brand-destructive"
                                            loading={pending === "delete"}
                                            disabled={!hasIdentity || pending !== null}
                                            onPress={openDeleteDialog}
                                            style={styles.actionButton}
                                        />
                                    </AlertDialogTrigger>
                                </>
                            }
                        />
                    </View>
                </ScrollView>
            </View>
        </AlertDialog>
    );
};

export default Profile;

const styles = StyleSheet.create({
    screen: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16 },
    column: { width: "100%", maxWidth: 448, alignSelf: "center" },
    identity: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
    email: { flex: 1, flexShrink: 1, lineHeight: 22 },
    identityRecovery: { gap: 12, marginTop: -12, marginBottom: 24 },
    preferences: { gap: 24 },
    actionButton: { width: "100%" },
    themeError: { marginTop: 12 },
    deleteError: { marginBottom: 12 },
});
