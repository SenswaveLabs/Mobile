import React, { FC } from "react";
import SenswaveModal from "@/components/common/SenswaveModal";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/contexts/ThemeProvider";
import type { LocationMapPickerProps } from "./LocationMapPicker";

const LocationMapPicker: FC<LocationMapPickerProps> = ({ onCancel }) => {
    const { colors } = useTheme().current;
    return (
        <SenswaveModal visible variant="brand" title="Choose location" onClose={onCancel}>
            <Text style={{ color: colors.authForeground }}>
                Map selection is available in the Android and iOS app. You can use your current
                location here.
            </Text>
        </SenswaveModal>
    );
};

export default LocationMapPicker;
