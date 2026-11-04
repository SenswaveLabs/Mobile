import DefaultHeader from "@/components/headers/DefaultHeader";
import PrivacyPolicy from "@/components/user/PrivacyPolicy";
import { FC } from "react";
import { View } from "react-native";

const Privacy: FC = () => (
    <View style={{ flex: 1 }}>
        <DefaultHeader
            titlePrefix="Privacy"
            titleSuffix="Policy"
            variant="brand"
            backFallback="/start"
        />
        <PrivacyPolicy />
    </View>
);

export default Privacy;
