import AddSubscriptionForm from "@/components/dataSource/subscriptions/AddSubscriptionForm";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { View } from "react-native";

function AddSubscription() {
    const { brokerId } = useLocalSearchParams();
    return (
        <View style={{ flex: 1 }}>
            <AddSubscriptionForm brokerId={brokerId as string} />
        </View>
    );
}

export default AddSubscription;
