import Loading from "@/components/common/Loading";
import Markdown from "@/components/common/Markdown";
import { LegalDocument, useLegal } from "@/contexts/domain/LegalProvider";
import { useToast } from "@/contexts/ToastProvider";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import Divider from "../common/Divider";
import Text from "../common/Text";

const PrivacyPolicy = () => {
    const legal = useLegal();
    const toast = useToast();

    const [loading, setLoading] = useState(true);
    const [policy, setPolicy] = useState<LegalDocument>();

    const loadPolicy = async () => {
        setLoading(true);

        try {
            console.info("Loading privacy policy...");
            const doc = await legal.getPrivacy();

            if (doc.isSuccess) {
                setPolicy(doc.data!);
                return;
            }

            toast.error("Failed to load privacy policy.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPolicy();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) {
        return <Loading />;
    }

    return (
        <View style={{ flex: 1 }}>
            <ScrollView
                style={{ flex: 1, paddingHorizontal: 15 }}
                contentContainerStyle={{ paddingBottom: 30 }}>
                <Text size={"medium"} color={"complementary"}>
                    Version: {policy?.version}
                </Text>
                <Divider />
                <Markdown>{policy?.summary ?? ""}</Markdown>
                <Divider />
                <Markdown>{policy?.content ?? ""}</Markdown>
            </ScrollView>
        </View>
    );
};

export default PrivacyPolicy;
