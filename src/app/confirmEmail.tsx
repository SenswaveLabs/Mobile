import Icon from "@/components/common/Icon";
import Loading from "@/components/common/Loading";
import { useSession } from "@/contexts/SessionProvider";
import { useRouter, useSearchParams } from "expo-router/build/hooks";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Text from "@/components/common/Text";
import Button from "@/components/common/Button";

export type Status = "InProgress" | "Failed" | "Success";

export default function ConfirmEmail() {
    const searchParams = useSearchParams();
    const session = useSession();
    const router = useRouter();

    const [status, setStatus] = useState<Status>("InProgress");
    const [message, setMessage] = useState<string>("");

    useEffect(() => {
        const userId = searchParams.get("userId");
        const code = searchParams.get("code");

        if (userId && code) {
            const confirmation = async () => {
                if (status === "Success") return;

                const result = await session.confirmEmail(userId, code);

                if (result.isSuccess) {
                    setStatus("Success");
                } else {
                    setStatus("Failed");
                    setMessage(result.errorMessage ?? "Unknow fail.");
                }
            };

            try {
                setStatus("InProgress");
                confirmation();
            } catch {
                setStatus("Failed");
                setMessage("Unexpected error occured.");
            }
        } else {
            setStatus("Failed");
            setMessage("Link is missing userId or verification code.");
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 15 }}>
            {status === "InProgress" && <Loading />}
            {status === "Success" && (
                <View style={{ alignItems: "center" }}>
                    <Icon icon="checkmark-circle-outline" size={96} color="success" />

                    <Text size={"large"} color={"onBackground"}>
                        Email Verified
                    </Text>

                    <Text size={"small"} color={"onBackground"}>
                        Your email address was successfully verifed.
                    </Text>

                    <Button
                        onPress={() => {
                            router.replace("/start");
                        }}
                        name="Go to Start"
                        loading={false}
                        type="alternative"
                    />
                </View>
            )}
            {status === "Failed" && (
                <View style={{ alignItems: "center", width: "100%", gap: 16 }}>
                    <Icon icon="close-circle-outline" size={96} color="error" />

                    <Text size={"large"} color={"onBackground"}>
                        Email Not Verified
                    </Text>

                    <Text size={"small"} color={"onBackground"}>
                        We were unable to verify your email. {message}. Please try again or contact
                        support.
                    </Text>

                    <Button
                        onPress={() => {
                            router.replace("/start");
                        }}
                        name="Go to Start"
                        loading={false}
                        type="alternative"
                    />
                </View>
            )}
        </View>
    );
}
