import ImageButton from "@/components/common/ImageButton";
import TermsAndConditions from "@/components/user/TermsAndConditions";
import { useRouter } from "expo-router";
import { View } from "react-native";
import Text from "@/components/common/Text";

const Terms = () => {
    const router = useRouter();

    const backClicked = () => {
        router.back();
    };

    return (
        <View style={{ flex: 1 }}>
            <View
                style={{
                    width: "100%",
                    paddingTop: 30,
                    paddingBottom: 25,
                    flexDirection: "row",
                }}>
                <ImageButton onPress={backClicked} style={{ marginLeft: 15 }} />
                <Text
                    size={"large"}
                    style={{ marginTop: 10, marginLeft: 15 }}
                    color={"complementary"}>
                    Terms and Conditions
                </Text>
            </View>
            <TermsAndConditions />
        </View>
    );
};

export default Terms;
