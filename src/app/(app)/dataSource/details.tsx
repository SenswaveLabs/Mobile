import HorizontalSelector from "@/components/common/HorizontalSelector";
import BrokerClient from "@/components/dataSource/brokers/BrokerClient";
import DataSourceDetailsSection from "@/components/dataSource/sections/DataSourceDetailsSection";
import BrokerSubscriptions from "@/components/dataSource/subscriptions/BrokerSubscriptions";
import React, { useState } from "react";
import { View } from "react-native";

const sections: string[] = ["Details", "Client", "Subscriptions"];

function DetailsPage() {
    const [section, setSection] = useState(sections[0]);
    return (
        <View style={{ flex: 1 }}>
            <HorizontalSelector
                options={sections}
                selected={section}
                onSelect={setSection}
                margin={{ top: 15, left: 15, right: 15, bottom: 15 }}
            />

            <View style={{ flex: 1 }}>
                {section === "Details" && <DataSourceDetailsSection />}
                {section === "Client" && <BrokerClient />}
                {section === "Subscriptions" && <BrokerSubscriptions />}
            </View>
        </View>
    );
}

export default DetailsPage;
