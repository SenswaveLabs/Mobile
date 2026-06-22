import Button from "@/components/common/Button";
import ImageButton from "@/components/common/ImageButton";
import Loading from "@/components/common/Loading";
import { useUser } from "@/contexts/domain/UserProvider";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Text from "@/components/common/Text";
import { Text as RNText } from "react-native";
import { useTheme } from "@/contexts/ThemeProvider";
import { useToast } from "@/contexts/ToastProvider";

const ConsentsPage = () => {
    const theme = useTheme();
    const user = useUser();
    const router = useRouter();
    const toast = useToast();

    const [loading, setLoading] = useState<boolean>(false);

    const cancelleClicked = async () => {
        console.info("[Consents Page] User did not agree to consents");

        router.replace("/start");
    };

    const acceptClicked = async () => {
        setLoading(true);

        try {
            const result = await user.makeConsents();

            if (result.isSuccess) {
                const updatedUser = await user.getUserData();

                if (!updatedUser.isSuccess) {
                    toast.error("Failed to confirm. Please try again.");
                    return;
                }

                if (!updatedUser.data!.hasActiveConsent) {
                    toast.error("Failed to update consents.");
                    return;
                }

                router.replace("/");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const userData = await user.getUserData();
            setLoading(false);

            if (userData.isSuccess && userData.data!.hasActiveConsent) {
                console.info("[Consents Page] User has active consent.");
                router.replace("/");
                return;
            }

            console.warn("[Consents Page] User has no active consent.");
        };

        fetchData();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <View style={{ flex: 1 }}>
            {loading ? (
                <Loading />
            ) : (
                <View style={{ flex: 1 }}>
                    <View
                        style={{
                            height: "15%",
                            width: "100%",
                            justifyContent: "center",
                            paddingTop: 30,
                        }}>
                        <ImageButton onPress={cancelleClicked} style={{ marginLeft: 15 }} />
                    </View>
                    <View style={{ height: "85%", paddingHorizontal: 15 }}>
                        <Text size={"large"} color={"onBackground"} bold={true}>
                            Before continuing, please review and accept our Terms of Service and
                            Privacy Policy.
                        </Text>

                        <View style={{ width: "100%" }}>
                            <Text size={"medium"} color={"onBackground"} style={{ marginTop: 20 }}>
                                By tapping Accept, you confirm that you have read and agree to our{" "}
                                <RNText
                                    style={{
                                        color: theme.current.colors.complementary,
                                        textDecorationLine: "underline",
                                    }}
                                    onPress={() => router.push("terms")}>
                                    Terms of Service
                                </RNText>{" "}
                                and{" "}
                                <RNText
                                    style={{
                                        color: theme.current.colors.complementary,
                                        textDecorationLine: "underline",
                                    }}
                                    onPress={() => router.push("privacy")}>
                                    Privacy Policy
                                </RNText>
                                .
                            </Text>

                            <Text size={"medium"} color={"onBackground"} style={{ marginTop: 20 }}>
                                You can tap Cancel if you do not wish to continue.
                            </Text>

                            <View style={{ flexDirection: "row", gap: 16, marginTop: 20 }}>
                                <View style={{ flex: 0.5 }}>
                                    <Button
                                        name={"Cancel"}
                                        type="alternative"
                                        loading={false}
                                        onPress={cancelleClicked}
                                    />
                                </View>
                                <View style={{ flex: 0.5 }}>
                                    <Button
                                        name={"Accept"}
                                        loading={false}
                                        onPress={acceptClicked}
                                    />
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
};

export default ConsentsPage;
