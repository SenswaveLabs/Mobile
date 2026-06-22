import Icon from "@/components/common/Icon";
import Text from "@/components/common/Text";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { shadowStyles } from "@/styles/shadowStyles";
import { useRouter } from "expo-router";
import React, { FC } from "react";
import { Pressable, View, StyleSheet } from "react-native";

interface CurrentHomeProps {
    disableClicks?: boolean;
    initName?: string;
    initIcon?: string;
    initIsOwner?: boolean;
}

const CurrentHome: FC<CurrentHomeProps> = ({
    disableClicks = false,
    initName,
    initIcon,
    initIsOwner = undefined,
}: CurrentHomeProps) => {
    const theme = useTheme();
    const router = useRouter();
    const homes = useHomes();

    const homeClicked = () => {
        if (disableClicks) {
            console.info("[CurrentHome] Clicks are disabled");
            return;
        }

        router.back();
    };

    const settingsClicked = () => {
        if (disableClicks) {
            console.info("[CurrentHome] Clicks are disabled");
            return;
        }

        router.navigate("home/details");
    };

    return (
        <View style={{ width: "100%" }}>
            <Text size="medium" color="onBackground" bold={true} style={{ paddingVertical: 7 }}>
                Currently Inside
            </Text>

            <Pressable
                onPress={homeClicked}
                onLongPress={settingsClicked}
                style={[
                    shadowStyles.default,
                    styles.currentHome,
                    { backgroundColor: theme.current.colors.primary },
                ]}>
                <View style={styles.dataContainer}>
                    <Icon icon={initIcon ?? homes.current!.icon} size={26} color="onPrimary" />

                    <View style={styles.textInDataContainer}>
                        <Text size={"large"} color="onPrimary">
                            {initName ?? homes.current!.name}
                        </Text>
                    </View>

                    <View style={styles.keyContainer}>
                        {(initIsOwner === undefined ? homes.current!.isOwner : initIsOwner) && (
                            <Icon icon="key-outline" size={18} color="onPrimary" />
                        )}
                        {!(initIsOwner === undefined ? homes.current!.isOwner : initIsOwner) && (
                            <Icon icon="people-outline" size={18} color="onPrimary" />
                        )}
                    </View>
                </View>
            </Pressable>
        </View>
    );
};

export default CurrentHome;

const styles = StyleSheet.create({
    currentHome: {
        borderRadius: 16,
        flexDirection: "row",
        padding: 10,
    },
    dataContainer: {
        marginLeft: 15,
        alignSelf: "center",
        flexDirection: "row",
    },
    textInDataContainer: {
        alignSelf: "center",
        marginLeft: 20,
        flex: 1,
    },
    text: {
        fontSize: 18,
    },
    keyContainer: {
        alignSelf: "center",
        justifyContent: "center",
        marginHorizontal: 10,
    },
});
