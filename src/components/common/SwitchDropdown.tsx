import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import Dropdown from "@/components/common/Dropdown";

interface SwitchDropdownProps {
    value: boolean;
    onSelected: (value: boolean) => void;
    title?: string;
    trueLabel?: string;
    falseLabel?: string;
    style?: StyleProp<ViewStyle>;
    disablePress?: boolean;
    error?: string;
}

function SwitchDropdown({
    value,
    onSelected,
    title = "",
    trueLabel = "True",
    falseLabel = "False",
    style,
    disablePress,
    error,
}: SwitchDropdownProps) {
    const options = [
        { name: trueLabel, value: "true" },
        { name: falseLabel, value: "false" },
    ];

    return (
        <Dropdown
            title={title}
            options={options}
            selectedValue={value ? "true" : "false"}
            onSelected={(v) => onSelected(v === "true")}
            style={style}
            disablePress={disablePress}
            error={error}
        />
    );
}

export default SwitchDropdown;
