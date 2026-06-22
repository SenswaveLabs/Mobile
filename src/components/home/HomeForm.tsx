import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { View, StyleSheet } from "react-native";
import CurrentHome from "./lists/CurrentHome";
import Input from "../common/Input";
import IconSelector from "../common/IconSelector";
import LocalizationSelector from "../common/LocalizationSelector";
import Divider from "../common/Divider";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { keyboardOffset } from "@/styles/defaultStyles";

const DefaultHomeIcon: string = "home-outline";

const HomeIcons = [
    "home-outline",
    "business-outline",
    "storefront-outline",
    "location-outline",
    "pin-outline",
    "map-outline",
    "people-outline",
    "heart-outline",
    "leaf-outline",
    "sunny-outline",
    "globe-outline",
] as string[];

export interface HomeFormHandle {
    isDirty: boolean;
    isValid: boolean;
    triggerSave: () => void;
    triggerReset: () => void;
}

interface HomeFormProps {
    initName?: string;
    initIcon?: string;
    initIsOwner?: boolean;
    initLongitude?: number;
    initLatitude?: number;

    onSubmit: (values: any) => Promise<void>;
    onDirtyChange?: (dirty: boolean) => void;
    onValidChange?: (valid: boolean) => void;
    edit?: boolean;
    children?: React.ReactNode;
}

const HomeForm = forwardRef<HomeFormHandle, HomeFormProps>(function HomeForm(
    {
        initName,
        initIcon,
        initIsOwner,
        initLongitude,
        initLatitude,
        onSubmit,
        onDirtyChange,
        onValidChange,
        edit = false,
        children,
    },
    ref,
) {
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState<string>(initName ?? "");
    const [nameError, setNameError] = useState<string>("");
    const [icon, setIcon] = useState(initIcon ?? DefaultHomeIcon);
    const [longitude, setLongitude] = useState<number | undefined>(initLongitude);
    const [latitude, setLatitude] = useState<number | undefined>(initLatitude);

    const isValid = name.length >= 3 && name.length <= 64;

    const isDirty =
        name !== (initName ?? "") ||
        icon !== (initIcon ?? DefaultHomeIcon) ||
        latitude !== initLatitude ||
        longitude !== initLongitude ||
        !edit;

    const validateForm = (): boolean => {
        let valid: boolean = true;

        if (name === "") {
            valid = false;
            setNameError("");
        } else if (name.length > 64) {
            valid = false;
            setNameError("Name is too long.");
        } else if (name.length < 3) {
            valid = false;
            setNameError("Name is too short.");
        } else {
            setNameError("");
        }

        return valid;
    };

    const triggerSave = async () => {
        if (loading) {
            console.info("[HomeForm] Form is processing");
            return;
        }

        if (!validateForm()) {
            console.info("[HomeForm] Form is invalid");
            return;
        }

        setLoading(true);

        let values: any = {};

        if (edit) {
            if (name !== initName) values.name = name;
            if (icon !== initIcon) values.icon = icon;
            if (longitude !== initLongitude) values.longitude = longitude;
            if (latitude !== initLatitude) values.latitude = latitude;
        } else {
            values = { name, icon, longitude, latitude };
        }

        await onSubmit(values);

        setLoading(false);
    };

    const triggerReset = () => {
        setName(initName ?? "");
        setIcon(initIcon ?? DefaultHomeIcon);
        setLatitude(initLatitude);
        setLongitude(initLongitude);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useImperativeHandle(ref, () => ({ isDirty, isValid, triggerSave, triggerReset }), [
        isDirty,
        isValid,
        loading,
        name,
        icon,
        latitude,
        longitude,
    ]);

    useEffect(() => {
        onDirtyChange?.(isDirty);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDirty]);

    useEffect(() => {
        onValidChange?.(isValid);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isValid]);

    useEffect(() => {
        validateForm();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [name]);

    return (
        <View style={styles.container}>
            <View style={styles.displayContainer}>
                <CurrentHome
                    initName={name ?? ""}
                    initIcon={icon}
                    initIsOwner={initIsOwner}
                    disableClicks={true}
                />
            </View>

            <Divider style={{ paddingHorizontal: 15 }} />

            <KeyboardAwareScrollView
                bottomOffset={keyboardOffset}
                style={styles.scrollContainer}
                contentContainerStyle={{ paddingBottom: edit ? 80 : 16 }}>
                <View style={{ paddingHorizontal: 15 }}>
                    <Input
                        error={nameError}
                        value={name}
                        title="Name"
                        placeholder="Your home name"
                        setValue={setName}
                    />

                    <IconSelector
                        defaultIcon={DefaultHomeIcon}
                        onIconSelected={setIcon}
                        iconList={HomeIcons}
                    />

                    <LocalizationSelector
                        onSelectLocation={(latitude: number, longitude: number) => {
                            setLatitude(latitude);
                            setLongitude(longitude);
                        }}
                        initLocation={{ latitude: latitude, longitude: longitude }}
                    />
                </View>

                <View>{children}</View>
            </KeyboardAwareScrollView>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 0,
        margin: 0,
        marginTop: 0,
    },
    displayContainer: {
        paddingHorizontal: 15,
        paddingTop: 5,
    },
    scrollContainer: {
        paddingHorizontal: 0,
        margin: 0,
    },
});

export default HomeForm;
