import { useState } from "react";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { useSession } from "@/contexts/SessionProvider";
import { SimpleResult } from "@/utils/result";

export const useGoogleSignIn = () => {
    const session = useSession();
    const [loading, setLoading] = useState(false);

    const signIn = async (): Promise<SimpleResult> => {
        setLoading(true);
        try {
            await GoogleSignin.hasPlayServices();
            await GoogleSignin.signOut();
            const userInfo = await GoogleSignin.signIn();
            if (userInfo.type === "cancelled") return SimpleResult.success();

            const result = await session.loginGoogle(userInfo.data.serverAuthCode ?? "");
            return result;
        } catch (error) {
            const code =
                typeof error === "object" && error !== null && "code" in error
                    ? error.code
                    : undefined;
            if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                return SimpleResult.failure("Play Services not available or outdated");
            } else if (code !== statusCodes.SIGN_IN_CANCELLED && code !== statusCodes.IN_PROGRESS) {
                return SimpleResult.failure("Google Sign-In error");
            }
            return SimpleResult.success();
        } finally {
            setLoading(false);
        }
    };

    return { loading, signIn };
};
