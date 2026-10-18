import React, { FC, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { CircleAlert, Info } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Text } from "@/components/ui/text";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { keyboardOffset } from "@/styles/defaultStyles";

type SharingType = "Display" | "Manage";

const roleOptions: { value: SharingType; label: string; description: string }[] = [
    {
        value: "Display",
        label: "Display and control",
        description: "Can view and control devices.",
    },
    {
        value: "Manage",
        label: "Manage home",
        description: "Can also change home settings.",
    },
];

interface ShareHomeResponse {
    password: string;
}

interface Invitation {
    password: string;
    email: string;
    role: SharingType;
}

const sharingNotice =
    "When sharing access to your home, advise all users that the app displays device states on all pages for information purposes only. These values may differ from the real device state and should not be treated as confirmed or guaranteed.";

const ShareHomePage: FC = () => {
    const httpClient = useHttpClient();
    const router = useRouter();
    const { colors } = useTheme().current;
    const currentHome = useHomes().current;
    const emailInput = useRef<TextInput>(null);
    const pending = useRef(false);
    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState("");
    const [role, setRole] = useState<SharingType>("Display");
    const [loading, setLoading] = useState(false);
    const [actionError, setActionError] = useState("");
    const [invitation, setInvitation] = useState<Invitation | null>(null);
    const [copied, setCopied] = useState(false);
    const homeName = currentHome?.name ?? "this home";

    const announceError = (message: string) => {
        setActionError(message);
        AccessibilityInfo.announceForAccessibility(message);
    };

    const submitClicked = async () => {
        if (pending.current) return;

        const normalizedEmail = email.trim();
        const emailMessage = !normalizedEmail
            ? "Email is required."
            : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
              ? ""
              : "Enter a valid email address.";

        if (emailMessage) {
            setEmailError(emailMessage);
            AccessibilityInfo.announceForAccessibility(emailMessage);
            emailInput.current?.focus();
            return;
        }

        if (!currentHome?.id || !currentHome.isOwner) {
            announceError(
                currentHome ? "Only the home owner can invite people." : "Select a home first.",
            );
            return;
        }

        pending.current = true;
        setLoading(true);
        setEmailError("");
        setActionError("");

        try {
            const result = await httpClient.post("v1/homes/sharings", {
                homeId: currentHome.id,
                friendEmail: normalizedEmail,
                sharingType: role,
            });

            if (!result.isSuccess || !result.response) {
                announceError(
                    !result.response
                        ? "Couldn't connect. Check your connection and try again."
                        : "Couldn't create the invitation. Check the email and try again.",
                );
                return;
            }

            const data = (await result.response.json()) as ShareHomeResponse;
            if (typeof data?.password !== "string" || !data.password) {
                announceError(
                    "Invitation was created, but its code couldn't be loaded. Go back and create a new invitation.",
                );
                return;
            }

            setInvitation({ password: data.password, email: normalizedEmail, role });
            AccessibilityInfo.announceForAccessibility("Invitation created.");
        } catch (error) {
            console.error("Failed to share home", error);
            announceError("Couldn't create the invitation. Check your connection and try again.");
        } finally {
            pending.current = false;
            setLoading(false);
        }
    };

    const copyToClipboard = async () => {
        if (!invitation) return;
        setCopied(false);
        try {
            await Clipboard.setStringAsync(invitation.password);
            setCopied(true);
            setActionError("");
        } catch {
            announceError("Couldn't copy the code. Select it above and copy it manually.");
        }
    };

    return (
        <KeyboardAwareScrollView
            bottomOffset={keyboardOffset}
            keyboardShouldPersistTaps="handled"
            style={styles.screen}
            contentContainerStyle={styles.content}>
            {invitation ? (
                <>
                    <View style={styles.fields}>
                        <View style={styles.intro}>
                            <Text
                                accessibilityRole="header"
                                style={[styles.title, { color: colors.authForeground }]}>
                                Invitation created
                            </Text>
                            <Text style={[styles.description, { color: colors.authMuted }]}>
                                Share this code with {invitation.email} to join {homeName}.
                            </Text>
                            <Text style={[styles.invitationRole, { color: colors.authMuted }]}>
                                Access:{" "}
                                {
                                    roleOptions.find((option) => option.value === invitation.role)
                                        ?.label
                                }
                            </Text>
                        </View>
                        <View style={styles.codeField}>
                            <Text style={[styles.sectionLabel, { color: colors.authForeground }]}>
                                Invite code
                            </Text>
                            <View
                                style={[
                                    styles.codeSurface,
                                    {
                                        backgroundColor: colors.authFieldBackground,
                                        borderColor: colors.authBorder,
                                    },
                                ]}>
                                <Text
                                    selectable
                                    style={[styles.code, { color: colors.authForeground }]}>
                                    {invitation.password}
                                </Text>
                            </View>
                            <Text style={[styles.hint, { color: colors.authMuted }]}>
                                Invitations expire after 15 minutes.
                            </Text>
                        </View>
                    </View>
                    <View style={styles.actions}>
                        {!!actionError && (
                            <Alert
                                icon={CircleAlert}
                                variant="destructive"
                                accessibilityRole="alert"
                                accessibilityLiveRegion="polite">
                                <AlertDescription>{actionError}</AlertDescription>
                            </Alert>
                        )}
                        <Button
                            name={copied ? "Code copied" : "Copy invitation code"}
                            onPress={() => void copyToClipboard()}
                            type="auth"
                            loading={false}
                        />
                        <Button
                            name="Done"
                            onPress={() => {
                                if (router.canGoBack()) router.back();
                                else router.replace("/home/details");
                            }}
                            type="brand-ghost"
                            loading={false}
                        />
                    </View>
                </>
            ) : (
                <>
                    <View style={styles.fields}>
                        <View style={styles.intro}>
                            <Text
                                accessibilityRole="header"
                                style={[styles.title, { color: colors.authForeground }]}>
                                Invite someone
                            </Text>
                            <Text style={[styles.description, { color: colors.authMuted }]}>
                                Create an invite code for {homeName}.
                            </Text>
                        </View>
                        <View style={styles.formFields}>
                            <Input
                                title="Email"
                                placeholder="friend@example.com"
                                value={email}
                                setValue={(value) => {
                                    setEmail(value);
                                    setEmailError("");
                                    setActionError("");
                                }}
                                error={emailError}
                                variant="auth"
                                inputRef={emailInput}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoComplete="email"
                                returnKeyType="done"
                                editable={!loading}
                                onSubmitEditing={() => void submitClicked()}
                            />
                            <View style={styles.accessField}>
                                <Text
                                    style={[styles.sectionLabel, { color: colors.authForeground }]}>
                                    Access
                                </Text>
                                <View
                                    style={[styles.roleList, { borderColor: colors.authBorder }]}
                                    accessibilityRole="radiogroup"
                                    accessibilityLabel="Access level">
                                    {roleOptions.map((option, index) => {
                                        const selected = role === option.value;
                                        return (
                                            <Pressable
                                                key={option.value}
                                                cssInterop={false}
                                                disabled={loading}
                                                onPress={() => {
                                                    setRole(option.value);
                                                    setActionError("");
                                                }}
                                                accessibilityRole="radio"
                                                accessibilityLabel={
                                                    option.label + ". " + option.description
                                                }
                                                accessibilityState={{
                                                    checked: selected,
                                                    selected,
                                                    disabled: loading,
                                                }}
                                                style={({ pressed }) => [
                                                    styles.roleOption,
                                                    index === 0 && styles.roleDivider,
                                                    { borderColor: colors.authBorder },
                                                    pressed && !loading && styles.pressed,
                                                ]}>
                                                <View
                                                    style={[
                                                        styles.radio,
                                                        {
                                                            borderColor: selected
                                                                ? colors.authFocus
                                                                : colors.authBorder,
                                                        },
                                                    ]}>
                                                    {selected && (
                                                        <View
                                                            style={[
                                                                styles.radioDot,
                                                                {
                                                                    backgroundColor:
                                                                        colors.authFocus,
                                                                },
                                                            ]}
                                                        />
                                                    )}
                                                </View>
                                                <View style={styles.roleCopy}>
                                                    <Text
                                                        style={[
                                                            styles.roleLabel,
                                                            { color: colors.authForeground },
                                                        ]}>
                                                        {option.label}
                                                    </Text>
                                                    <Text
                                                        style={[
                                                            styles.roleDescription,
                                                            { color: colors.authMuted },
                                                        ]}>
                                                        {option.description}
                                                    </Text>
                                                </View>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>
                            <Alert icon={Info}>
                                <AlertDescription>{sharingNotice}</AlertDescription>
                            </Alert>
                        </View>
                    </View>
                    <View style={styles.actions}>
                        {!!actionError && (
                            <Alert
                                icon={CircleAlert}
                                variant="destructive"
                                accessibilityRole="alert"
                                accessibilityLiveRegion="polite">
                                <AlertDescription>{actionError}</AlertDescription>
                            </Alert>
                        )}
                        <Button
                            name="Create invitation"
                            onPress={() => void submitClicked()}
                            type="auth"
                            loading={loading}
                        />
                    </View>
                </>
            )}
        </KeyboardAwareScrollView>
    );
};

export default ShareHomePage;

const styles = StyleSheet.create({
    screen: { flex: 1 },
    content: {
        flexGrow: 1,
        width: "100%",
        maxWidth: 448,
        alignSelf: "center",
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 16,
    },
    fields: { gap: 24 },
    formFields: { gap: 24 },
    intro: { gap: 8 },
    title: { fontSize: 30, lineHeight: 36, fontWeight: "600" },
    description: { fontSize: 16, lineHeight: 24 },
    invitationRole: { fontSize: 14, lineHeight: 20 },
    accessField: { gap: 8 },
    sectionLabel: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
    roleList: { borderWidth: 1, borderRadius: 8, overflow: "hidden" },
    roleOption: {
        minHeight: 72,
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    roleDivider: { borderBottomWidth: 1 },
    roleCopy: { flex: 1, gap: 2 },
    roleLabel: { fontSize: 16, lineHeight: 22, fontWeight: "500" },
    roleDescription: { fontSize: 14, lineHeight: 20 },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        alignItems: "center",
        justifyContent: "center",
    },
    radioDot: { width: 10, height: 10, borderRadius: 5 },
    codeField: { gap: 12 },
    codeSurface: {
        minHeight: 72,
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderWidth: 1,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
    },
    code: { fontSize: 28, lineHeight: 36, fontWeight: "600", letterSpacing: 2 },
    hint: { fontSize: 14, lineHeight: 20 },
    actions: { marginTop: "auto", paddingTop: 32, gap: 12 },
    pressed: { opacity: 0.72 },
});
