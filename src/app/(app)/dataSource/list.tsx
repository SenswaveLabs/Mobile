import React from "react";
import { Plus } from "lucide-react-native";
import ContentSection from "@/components/common/ContentSection";
import DataSourceList from "@/components/dataSource/DataSourceList";
import SectionHeaderAction from "@/components/common/SectionHeaderAction";
import { useTheme } from "@/contexts/ThemeProvider";
import { useRouter } from "expo-router";

function DataSources() {
    const router = useRouter();
    const { colors } = useTheme().current;
    const addClicked = () => router.navigate("dataSource/add");

    return (
        <DataSourceList
            header={
                <ContentSection
                    title="Data sources"
                    helper="Manage your broker connections."
                    headerAction={
                        <SectionHeaderAction
                            label="Add data source"
                            accessibilityLabel="Add data source"
                            icon={<Plus size={18} color={colors.authForeground} />}
                            onPress={addClicked}
                        />
                    }
                />
            }
        />
    );
}

export default DataSources;
