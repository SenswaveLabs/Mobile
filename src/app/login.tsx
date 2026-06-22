import { LoginForm } from "@/components/auth/LoginForm";
import ImageButton from "@/components/common/ImageButton";
import Text from "@/components/common/Text";
import { useRouter } from "expo-router";
import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";

const Login: React.FC = () => {
    const router = useRouter();

    const backClicked = () => {
        console.debug("[Login Page] Back clicked");
        //router.back();
        router.push({ pathname: "/" });
    };

    const registerClicked = () => {
        console.debug("[Login Page] Open register page");
        router.push({ pathname: "register" });
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <ImageButton onPress={backClicked} style={{ marginLeft: 15 }} />
            </View>
            <View style={styles.content}>
                <Text size={"title"} color={"onBackground"} bold={true}>
                    Welcome Back!
                </Text>

                <View style={styles.contentContainer}>
                    <LoginForm />
                </View>
            </View>
            <View style={styles.footer}>
                <View style={styles.footerRegisterContainer}>
                    <Text
                        style={styles.footerRegisterQuestion}
                        color={"onBackground"}
                        size={"medium"}>
                        Don't have an account?
                    </Text>
                    <TouchableOpacity onPress={registerClicked}>
                        <Text color={"complementary"} size={"medium"} style={styles.footerRegister}>
                            Register here!
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

export default Login;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
    },
    header: {
        height: "15%",
        width: "100%",
        justifyContent: "center",
        paddingTop: 30,
    },
    content: {
        height: "70%",
        width: "100%",
        paddingHorizontal: 15,
    },
    contentContainer: {
        alignItems: "center",
        width: "100%",
    },
    footer: {
        height: "15%",
        justifyContent: "center",
        padding: 25,
    },
    footerRegisterContainer: {
        margin: 0,
        padding: 0,
        paddingTop: 5,
        flexDirection: "row",
        justifyContent: "center",
    },
    footerRegisterQuestion: {
        fontSize: 16,
    },
    footerRegister: {
        marginLeft: 5,
        fontSize: 16,
    },
});
