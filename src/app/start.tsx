import Button from "@/components/common/Button";
import Tile from "@/components/common/Tile";
import { useConfiguration } from "@/contexts/ConfigurationProvider";
import { router } from "expo-router";
import React from "react";
import { View, StyleSheet, Image } from "react-native";

const Start: React.FC = () => {
    const configuration = useConfiguration();

    const loginClicked = () => {
        router.push({
            pathname: "login",
        });
    };

    const registerClicked = () => {
        router.push({
            pathname: "register",
        });
    };

    const chooseServerClicked = () => {
        router.push({
            pathname: "server",
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.logoContainer}>
                <View>
                    <Tile backgroundColor="primary" padding={0}>
                        <Image source={require("@/assets/icon.png")} style={styles.logoImage} />
                    </Tile>
                </View>
            </View>
            <View style={styles.buttonContainer}>
                <Button
                    name="Login"
                    style={{ marginBottom: 10 }}
                    onPress={loginClicked}
                    loading={false}
                />
                <Button
                    name="Register"
                    type="alternative"
                    onPress={registerClicked}
                    loading={false}
                />

                {configuration.isDevelopment() && (
                    <Button
                        name="Choose Server"
                        style={{ marginTop: 10 }}
                        type="alternative"
                        onPress={chooseServerClicked}
                        loading={false}
                    />
                )}
            </View>
        </View>
    );
};

export default Start;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    logoContainer: {
        marginBottom: 20,
        height: "60%",
        justifyContent: "flex-end",
        backgroundColor: "transparent",
    },
    logoImage: {
        width: 128,
        height: 128,
        textAlign: "center",
        borderRadius: 16,
    },
    logoTextContainer: {
        margin: 0,
        padding: 0,
        paddingTop: 5,
        flexDirection: "row",
    },
    logoTextFirst: {
        fontSize: 24,
        fontWeight: "bold",
        textAlign: "center",
    },
    logoTextSecond: {
        fontSize: 24,
        textAlign: "center",
    },
    buttonContainer: {
        height: "40%",
        marginBottom: 20,
        alignItems: "center",
        padding: 5,
        paddingHorizontal: 15,
        width: "100%",
    },
});
