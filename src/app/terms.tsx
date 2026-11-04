import DefaultHeader from "@/components/headers/DefaultHeader";
import TermsAndConditions from "@/components/user/TermsAndConditions";
import { FC } from "react";
import { View } from "react-native";

const Terms: FC = () => (
    <View style={{ flex: 1 }}>
        <DefaultHeader titlePrefix="Terms" variant="brand" backFallback="/start" />
        <TermsAndConditions />
    </View>
);

export default Terms;
