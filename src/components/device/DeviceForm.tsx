import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { CircleAlert } from "lucide-react-native";
import Button from "../common/Button";
import Input from "../common/Input";
import IconSelector from "../common/IconSelector";
import DeviceTile from "./tile/DeviceTile";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { DevicePresenceType } from "@/types/DeviceTypes";
import Dropdown, { Option } from "../common/Dropdown";
import OperationSelector from "./operation/OperationSelector";
import RoomSelector from "../room/RoomSelector";
import { useToast } from "@/contexts/ToastProvider";
import Expander from "../common/Expander";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { keyboardOffset } from "@/styles/defaultStyles";
import { useIconCatalog } from "@/hooks/useIconCatalog";
import Text from "../common/Text";
import { Alert, AlertDescription } from "@/components/ui/alert";

const screenWidth = Dimensions.get("window").width;
const DefaultDeviceIcon = "bulb-outline";
const TileTypeOptions: Option[] = [
    { name: "Default", value: "Default" },
    { name: "Switch", value: "Switch" },
    { name: "Display", value: "Display" },
];
const PresenceTypeOptions: Option[] = [
    { value: "Default", name: "No presence" },
    { value: "BooleanOperation", name: "Boolean operation" },
];

interface DeviceValues {
    name: string;
    icon: string;
    roomId: string;
    tileType: string;
    tileOperationId: string;
    tileDisplayableOperationId: string;
    tileUnit: string;
    presenceType: string;
    presenceOperationId: string;
}

export interface DeviceFormRef {
    save: () => void;
    reset: () => void;
}

interface DeviceFormProps {
    deviceId?: string;
    initName?: string;
    initIcon?: string;
    initRoomId?: string;
    initTileType?: string;
    initTileOperationId?: string;
    initTileDisplayableOperationId?: string;
    initTileUnit?: string;
    initPresenceType?: string;
    initPresenceOperationId?: string;
    onSubmit: (values: any) => Promise<void | boolean>;
    onHasChanges?: (hasChanges: boolean) => void;
    edit?: boolean;
}

const DeviceForm = forwardRef<DeviceFormRef, DeviceFormProps>(function DeviceForm(
    {
        deviceId,
        initName,
        initIcon,
        initRoomId,
        initTileType,
        initTileOperationId,
        initTileDisplayableOperationId,
        initTileUnit,
        initPresenceType,
        initPresenceOperationId,
        onSubmit,
        onHasChanges,
        edit = false,
    },
    ref,
) {
    const homes = useHomes();
    const toast = useToast();
    const catalog = useIconCatalog("devices");
    const initial: DeviceValues = {
        name: initName ?? "",
        icon: initIcon ?? DefaultDeviceIcon,
        roomId: initRoomId ?? "None",
        tileType: initTileType ?? "Default",
        tileOperationId: initTileOperationId ?? "None",
        tileDisplayableOperationId: initTileDisplayableOperationId ?? "None",
        tileUnit: initTileUnit ?? "",
        presenceType: initPresenceType ?? "Default",
        presenceOperationId: initPresenceOperationId ?? "None",
    };
    const [saved, setSaved] = useState(initial);
    const [loading, setLoading] = useState(false);
    const submitting = useRef(false);
    const [submitError, setSubmitError] = useState("");
    const [name, setName] = useState(initial.name);
    const [nameError, setNameError] = useState("");
    const [icon, setIcon] = useState(initial.icon);
    const isIconValid =
        (edit && icon === initial.icon) ||
        (!catalog.loading && !catalog.error && catalog.keys.includes(icon));
    const [roomId, setRoomId] = useState(initial.roomId);
    const [roomOptions, setRoomOptions] = useState<Option[]>([{ value: "None", name: "None" }]);
    const [tileType, setTileType] = useState(initial.tileType);
    const [tileOperationId, setTileOperationId] = useState(initial.tileOperationId);
    const [tileDisplayableOperationId, setTileDisplayableOperationId] = useState(
        initial.tileDisplayableOperationId,
    );
    const [tileUnit, setTileUnit] = useState(initial.tileUnit);
    const [presenceType, setPresenceType] = useState(initial.presenceType);
    const [presenceOperationId, setPresenceOperationId] = useState(initial.presenceOperationId);
    const [tileExpanded, setTileExpanded] = useState(false);
    const [presenceExpanded, setPresenceExpanded] = useState(false);

    const values: DeviceValues = {
        name,
        icon,
        roomId,
        tileType,
        tileOperationId,
        tileDisplayableOperationId,
        tileUnit,
        presenceType,
        presenceOperationId,
    };
    const dirty =
        !edit ||
        Object.keys(values).some(
            (key) => values[key as keyof DeviceValues] !== saved[key as keyof DeviceValues],
        );

    const validateForm = () => {
        let valid = true;
        if (name.trim().length < 3) {
            setNameError("Name is too short.");
            valid = false;
        } else if (name.length > 64) {
            setNameError("Name is too long.");
            valid = false;
        } else setNameError("");

        if (tileType === "Switch" && (tileOperationId === "None" || tileOperationId === "")) {
            toast.info("Select operation for switch tile.");
            setTileExpanded(true);
            valid = false;
        }
        if (
            tileType === "Display" &&
            (tileDisplayableOperationId === "None" || tileDisplayableOperationId === "")
        ) {
            toast.info("Select operation for display tile.");
            setTileExpanded(true);
            valid = false;
        }
        if (
            presenceType === "BooleanOperation" &&
            (presenceOperationId === "None" || presenceOperationId === "")
        ) {
            toast.info("Select operation for presence.");
            setPresenceExpanded(true);
            valid = false;
        }
        return valid && isIconValid;
    };

    const save = async () => {
        if (submitting.current || !validateForm()) return;
        submitting.current = true;
        setLoading(true);
        setSubmitError("");
        const request: Record<string, unknown> = {};
        if (!edit) {
            request.homeId = homes.current?.id;
            request.roomId = roomId === "None" ? null : roomId;
            request.name = name;
            request.icon = icon;
        } else {
            if (name !== saved.name) request.name = name;
            if (icon !== saved.icon) request.icon = icon;
            if (roomId !== saved.roomId) request.roomId = roomId === "None" ? null : roomId;
            if (tileType !== saved.tileType) request.type = tileType;
            if (
                tileType === "Switch" &&
                (tileType !== saved.tileType || tileOperationId !== saved.tileOperationId)
            ) {
                request.type = tileType;
                request.operationId = tileOperationId === "None" ? null : tileOperationId;
            }
            if (tileType === "Display") {
                if (
                    tileType !== saved.tileType ||
                    tileDisplayableOperationId !== saved.tileDisplayableOperationId ||
                    tileUnit !== saved.tileUnit
                ) {
                    request.type = tileType;
                    request.displayableOperationId =
                        tileDisplayableOperationId === "None" ? null : tileDisplayableOperationId;
                    request.configuration = { unit: tileUnit };
                }
            }
            const presenceTypeChanged = presenceType !== saved.presenceType;
            const presenceOperationChanged = presenceOperationId !== saved.presenceOperationId;
            if (presenceTypeChanged) request.presenceType = presenceType;
            if (
                presenceType === "BooleanOperation" &&
                (presenceTypeChanged || presenceOperationChanged)
            ) {
                request.presenceType = presenceType;
                request.presenceOperationId =
                    presenceOperationId === "None" ? null : presenceOperationId;
            }
        }

        try {
            const result = await onSubmit(request);
            if (edit && result === false)
                throw new Error("Couldn't save device changes. Try again.");
            setSaved(values);
        } catch (error) {
            setSubmitError(
                error instanceof Error ? error.message : "Couldn't save device changes. Try again.",
            );
        } finally {
            submitting.current = false;
            setLoading(false);
        }
    };

    const reset = () => {
        setName(saved.name);
        setIcon(saved.icon);
        setRoomId(saved.roomId);
        setTileType(saved.tileType);
        setTileOperationId(saved.tileOperationId);
        setTileDisplayableOperationId(saved.tileDisplayableOperationId);
        setTileUnit(saved.tileUnit);
        setPresenceType(saved.presenceType);
        setPresenceOperationId(saved.presenceOperationId);
        setSubmitError("");
    };

    useImperativeHandle(ref, () => ({ save, reset }));
    useEffect(() => onHasChanges?.(dirty), [dirty, onHasChanges]);
    useEffect(() => {
        const roomOptions = (homes.current?.rooms ?? []).map((room) => ({
            value: room.id,
            name: room.name,
        }));
        setRoomOptions([...roomOptions, { value: "None", name: "None" }]);
    }, [homes.current?.rooms]);
    useEffect(() => {
        setNameError(
            name && name.length < 3
                ? "Name is too short."
                : name.length > 64
                  ? "Name is too long."
                  : "",
        );
    }, [name]);

    const onNameChange = (value: string) => {
        setName(value);
        setSubmitError("");
    };
    const onRoomSelected = (value: string) => {
        setRoomId(value);
        setSubmitError("");
    };
    const tileSummary =
        tileType === "Switch"
            ? "Switch tile"
            : tileType === "Display"
              ? "Display tile"
              : "Default tile";
    const presenceSummary =
        presenceType === "BooleanOperation" ? "Boolean operation" : "No presence";
    const tilePreview = (
        <View style={styles.tilePreview}>
            <DeviceTile
                device={{
                    id: "",
                    name,
                    icon,
                    roomId: roomId === "None" ? undefined : roomId,
                    tile: {
                        type: tileType,
                        operationId: tileOperationId,
                        displayableOperationId: tileDisplayableOperationId,
                        value: undefined,
                        configuration: tileType === "Display" ? { unit: tileUnit } : undefined,
                    },
                    presence:
                        presenceType !== "Default"
                            ? { type: presenceType as DevicePresenceType, value: null }
                            : undefined,
                    display: true,
                    createdAtUtc: new Date().toISOString(),
                    updatedAtUtc: new Date().toISOString(),
                }}
                disablePress
            />
        </View>
    );

    return (
        <View style={styles.container}>
            <KeyboardAwareScrollView
                bottomOffset={keyboardOffset}
                style={styles.scrollContainer}
                contentContainerStyle={styles.content}>
                <Input
                    error={nameError}
                    value={name}
                    title="Name"
                    placeholder="Your device name"
                    variant="auth"
                    setValue={onNameChange}
                    editable={!loading}
                />
                <IconSelector
                    defaultIcon={icon}
                    catalog={catalog}
                    resource="devices"
                    variant="brand"
                    onIconSelected={(value) => {
                        setIcon(value);
                        setSubmitError("");
                    }}
                    disabled={loading}
                />
                {!catalog.loading && !catalog.error && !isIconValid && (
                    <Text color="error" accessibilityRole="alert">
                        Select an available icon.
                    </Text>
                )}
                {edit ? (
                    <RoomSelector
                        initialRoomId={roomId}
                        onSelected={onRoomSelected}
                        disabled={loading}
                    />
                ) : (
                    <Dropdown
                        selectedValue={roomId}
                        title="Room"
                        options={roomOptions}
                        onSelected={onRoomSelected}
                        disablePress={loading}
                    />
                )}

                {!edit && tilePreview}

                {edit && (
                    <Expander
                        title="Tile"
                        summary={tileSummary}
                        expanded={tileExpanded}
                        onExpandedChange={setTileExpanded}
                        padding={{ paddingTop: 4 }}>
                        <Dropdown
                            title="Tile Type"
                            options={TileTypeOptions}
                            selectedValue={tileType}
                            onSelected={(value) => {
                                setTileType(value);
                                setSubmitError("");
                            }}
                            disablePress={loading}
                        />
                        {tileType === "Switch" && (
                            <View
                                style={styles.disclosureField}
                                pointerEvents={loading ? "none" : "auto"}>
                                <OperationSelector
                                    initialOperationId={tileOperationId}
                                    deviceId={deviceId!}
                                    filterTypes={["Boolean"]}
                                    onSelected={(value) => {
                                        setTileOperationId(value);
                                        setSubmitError("");
                                    }}
                                />
                            </View>
                        )}
                        {tileType === "Display" && (
                            <View style={styles.disclosureField}>
                                <View pointerEvents={loading ? "none" : "auto"}>
                                    <OperationSelector
                                        initialOperationId={tileDisplayableOperationId}
                                        deviceId={deviceId!}
                                        filterTypes={["Number", "Integer"]}
                                        onSelected={(value) => {
                                            setTileDisplayableOperationId(value);
                                            setSubmitError("");
                                        }}
                                    />
                                </View>
                                {!!tileDisplayableOperationId &&
                                    tileDisplayableOperationId !== "None" && (
                                        <Input
                                            value={tileUnit}
                                            title="Unit"
                                            placeholder="e.g. °C"
                                            setValue={(value) => {
                                                setTileUnit(value);
                                                setSubmitError("");
                                            }}
                                            error=""
                                            variant="auth"
                                            editable={!loading}
                                        />
                                    )}
                            </View>
                        )}
                        {tilePreview}
                    </Expander>
                )}

                {edit && (
                    <Expander
                        title="Presence"
                        summary={presenceSummary}
                        expanded={presenceExpanded}
                        onExpandedChange={setPresenceExpanded}
                        padding={{ paddingTop: 4 }}>
                        <Dropdown
                            title="Presence Type"
                            options={PresenceTypeOptions}
                            selectedValue={presenceType}
                            onSelected={(value) => {
                                setPresenceType(value);
                                setSubmitError("");
                            }}
                            disablePress={loading}
                        />
                        {presenceType === "BooleanOperation" && (
                            <View
                                style={styles.disclosureField}
                                pointerEvents={loading ? "none" : "auto"}>
                                <OperationSelector
                                    deviceId={deviceId!}
                                    initialOperationId={presenceOperationId}
                                    filterTypes={["Boolean"]}
                                    onSelected={(value) => {
                                        setPresenceOperationId(value);
                                        setSubmitError("");
                                    }}
                                />
                            </View>
                        )}
                    </Expander>
                )}

                {!!submitError && (
                    <Alert
                        icon={CircleAlert}
                        variant="destructive"
                        accessibilityRole="alert"
                        accessibilityLiveRegion="polite">
                        <AlertDescription>{submitError}</AlertDescription>
                    </Alert>
                )}
                {edit ? (
                    <View style={styles.actions}>
                        <Button
                            name="Save changes"
                            type="auth"
                            loading={loading}
                            disabled={!dirty || !isIconValid}
                            onPress={save}
                        />
                        {dirty && (
                            <Button
                                name="Reset"
                                type="brand-ghost"
                                loading={false}
                                disabled={loading}
                                onPress={reset}
                            />
                        )}
                    </View>
                ) : dirty ? (
                    <View style={styles.createButton}>
                        <Button name="Add Device" loading={loading} onPress={save} />
                    </View>
                ) : null}
            </KeyboardAwareScrollView>
        </View>
    );
});

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContainer: { paddingHorizontal: 16 },
    content: { paddingTop: 8, paddingBottom: 20, gap: 16 },
    disclosureField: { paddingTop: 12 },
    tilePreview: {
        justifyContent: "center",
        alignItems: "center",
        minHeight: 112,
        maxHeight: (screenWidth - 30) / 2,
        marginTop: 12,
    },
    actions: { gap: 4, paddingTop: 4 },
    createButton: { alignItems: "center", paddingTop: 8 },
});

export default DeviceForm;
