import { useState } from "react";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { useSession } from "@/contexts/SessionProvider";
import { useToast } from "@/contexts/ToastProvider";

export const useGoogleSignIn = () => {
    const session = useSession();
    const toast = useToast();
    const [loading, setLoading] = useState(false);

    const signIn = async () => {
        setLoading(true);
        try {
            await GoogleSignin.hasPlayServices();
            await GoogleSignin.signOut();
            const userInfo = await GoogleSignin.signIn();
            if (userInfo.type === "cancelled") return;

            const result = await session.loginGoogle(userInfo.data.serverAuthCode ?? "");
            if (!result.isSuccess) {
                toast.error(result.errorMessage || "Google Sign-In error");
            }
        } catch (error) {
            const code =
                typeof error === "object" && error !== null && "code" in error
                    ? error.code
                    : undefined;
            if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                toast.error("Play Services not available or outdated");
            } else if (code !== statusCodes.SIGN_IN_CANCELLED && code !== statusCodes.IN_PROGRESS) {
                toast.error("Google Sign-In error");
            }
        } finally {
            setLoading(false);
        }
    };

    return { loading, signIn };
};
