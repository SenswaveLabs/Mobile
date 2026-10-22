import React, {
    forwardRef,
    ReactNode,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from "react";
import { StyleSheet, View } from "react-native";
import { CircleAlert } from "lucide-react-native";
import Button from "../common/Button";
import Input from "../common/Input";
import FormSection from "../common/FormSection";
import IconSelector from "../common/IconSelector";
import DeviceTile from "./tile/DeviceTile";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { DevicePresenceType, OperationDto, TileReadingConfiguration } from "@/types/DeviceTypes";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import Dropdown, { Option } from "../common/Dropdown";
import OperationSelector from "./operation/OperationSelector";
import RoomSelector from "../room/RoomSelector";
import { useToast } from "@/contexts/ToastProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import Expander from "../common/Expander";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { keyboardOffset } from "@/styles/defaultStyles";
import { useIconCatalog } from "@/hooks/useIconCatalog";
import Text from "../common/Text";
import { Text as UiText } from "@/components/ui/text";
import { Alert, AlertDescription } from "@/components/ui/alert";

const DefaultDeviceIcon = "bulb-outline";
const TileTypeOptions: Option[] = [
    { name: "Default", value: "Default" },
    { name: "Switch", value: "Switch" },
    { name: "Display", value: "Display" },
    { name: "Slider", value: "Slider" },
    { name: "Options", value: "Options" },
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
    tileStep: string;
    tileLabel: string;
    tileReadings: TileReadingConfiguration[];
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
    initTileStep?: number;
    initTileLabel?: string;
    initTileReadings?: TileReadingConfiguration[];
    initPresenceType?: string;
    initPresenceOperationId?: string;
    onSubmit: (values: any) => Promise<void | boolean>;
    onHasChanges?: (hasChanges: boolean) => void;
    edit?: boolean;
    children?: ReactNode;
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
        initTileStep,
        initTileLabel,
        initTileReadings,
        initPresenceType,
        initPresenceOperationId,
        onSubmit,
        onHasChanges,
        edit = false,
        children,
    },
    ref,
) {
    const homes = useHomes();
    const toast = useToast();
    const httpClient = useHttpClient();
    const catalog = useIconCatalog("devices");
    const { colors } = useTheme().current;
    const initial: DeviceValues = {
        name: initName ?? "",
        icon: initIcon ?? DefaultDeviceIcon,
        roomId: initRoomId ?? "None",
        tileType: initTileType ?? "Default",
        tileOperationId: initTileOperationId ?? "None",
        tileDisplayableOperationId: initTileDisplayableOperationId ?? "None",
        tileUnit: initTileUnit ?? "",
        tileStep: String(initTileStep ?? 1),
        tileLabel: initTileLabel ?? "",
        tileReadings: (initTileReadings ?? []).map(({ operationId, label, unit }) => ({
            operationId,
            label: label ?? "",
            unit: unit ?? "",
        })),
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
    const [tileType, setTileType] = useState(initial.tileType);
    const [tileOperationId, setTileOperationId] = useState(initial.tileOperationId);
    const [tileDisplayableOperationId, setTileDisplayableOperationId] = useState(
        initial.tileDisplayableOperationId,
    );
    const [tileUnit, setTileUnit] = useState(initial.tileUnit);
    const [tileStep, setTileStep] = useState(initial.tileStep);
    const [tileLabel, setTileLabel] = useState(initial.tileLabel);
    const [tileReadings, setTileReadings] = useState(initial.tileReadings);
    const tileLabelError = tileLabel.length > 64 ? "Label must be at most 64 characters." : "";
    const readingIds = [
        tileDisplayableOperationId,
        ...tileReadings.map((reading) => reading.operationId),
    ];
    const tileReadingsError =
        tileReadings.length > 8 ||
        readingIds.some((id) => !id || id === "None") ||
        new Set(readingIds).size !== readingIds.length
            ? "Select a different operation for every reading (up to 8 additional readings)."
            : tileReadings.some((reading) => reading.label.length > 64 || reading.unit.length > 5)
              ? "Reading labels allow 64 characters and units allow 5."
              : "";
    const [previewOperation, setPreviewOperation] = useState<OperationDto | null>(null);
    const tileStepError =
        !tileStep.trim() || !Number.isFinite(Number(tileStep)) || Number(tileStep) < 0
            ? "Enter a non-negative numeric step."
            : "";
    const tileUnitError = tileUnit.length > 5 ? "Unit must be at most 5 characters." : "";
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
        tileStep,
        tileLabel,
        tileReadings,
        presenceType,
        presenceOperationId,
    };
    const dirty =
        !edit ||
        Object.keys(values).some((key) =>
            key === "tileReadings"
                ? JSON.stringify(tileReadings) !== JSON.stringify(saved.tileReadings)
                : values[key as keyof DeviceValues] !== saved[key as keyof DeviceValues],
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

        if (
            ["Switch", "Slider", "Options"].includes(tileType) &&
            (tileOperationId === "None" || tileOperationId === "")
        ) {
            toast.info("Select operation for this tile.");
            setTileExpanded(true);
            valid = false;
        }
        if (tileType === "Slider" && (tileStepError || tileUnitError)) {
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
        if (tileType === "Display" && (tileReadingsError || tileLabelError || tileUnitError)) {
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
                ["Switch", "Slider", "Options"].includes(tileType) &&
                (tileType !== saved.tileType ||
                    tileOperationId !== saved.tileOperationId ||
                    (tileType === "Slider" &&
                        (tileStep !== saved.tileStep || tileUnit !== saved.tileUnit)))
            ) {
                request.type = tileType;
                request.operationId = tileOperationId === "None" ? null : tileOperationId;
                if (tileType === "Slider")
                    request.configuration = { unit: tileUnit, step: Number(tileStep) };
            }
            if (tileType === "Display") {
                if (
                    tileType !== saved.tileType ||
                    tileDisplayableOperationId !== saved.tileDisplayableOperationId ||
                    tileUnit !== saved.tileUnit ||
                    tileLabel !== saved.tileLabel ||
                    JSON.stringify(tileReadings) !== JSON.stringify(saved.tileReadings)
                ) {
                    request.type = tileType;
                    request.displayableOperationId =
                        tileDisplayableOperationId === "None" ? null : tileDisplayableOperationId;
                    request.configuration = {
                        unit: tileUnit,
                        ...(tileLabel ? { label: tileLabel } : {}),
                        ...(tileReadings.length ? { readings: tileReadings } : {}),
                    };
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
        setTileStep(saved.tileStep);
        setTileLabel(saved.tileLabel);
        setTileReadings(saved.tileReadings);
        setPresenceType(saved.presenceType);
        setPresenceOperationId(saved.presenceOperationId);
        setSubmitError("");
    };

    useImperativeHandle(ref, () => ({ save, reset }));
    useEffect(() => onHasChanges?.(dirty), [dirty, onHasChanges]);
    useEffect(() => {
        setPreviewOperation(null);
        const previewOperationId =
            tileType === "Display" ? tileDisplayableOperationId : tileOperationId;
        if (
            !["Slider", "Options", "Display"].includes(tileType) ||
            !previewOperationId ||
            previewOperationId === "None"
        )
            return;
        let active = true;
        const loadPreview = async () => {
            try {
                const result = await httpClient.get("v1/devices/operations/" + previewOperationId);
                if (result.isSuccess && result.response) {
                    const operation = (await result.response.json()) as OperationDto;
                    if (active) setPreviewOperation(operation);
                }
            } catch {
                /* The inactive preview explains that an operation must be available. */
            }
        };
        void loadPreview();
        return () => {
            active = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tileOperationId, tileDisplayableOperationId, tileType]);
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
    const tileSummary = `${tileType} tile`;
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
                        configuration:
                            tileType === "Display"
                                ? {
                                      unit: tileUnit,
                                      label: tileLabel,
                                      operationType: previewOperation?.type,
                                      readings: tileReadings,
                                  }
                                : tileType === "Slider"
                                  ? {
                                        unit: tileUnit,
                                        step: Number(tileStep),
                                        range: previewOperation
                                            ? {
                                                  min: previewOperation.configuration.min,
                                                  max: previewOperation.configuration.max,
                                              }
                                            : undefined,
                                    }
                                  : tileType === "Options"
                                    ? {
                                          options: previewOperation?.configuration.options?.map(
                                              (option: { name: string }) => option.name,
                                          ),
                                      }
                                    : undefined,
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

    const fields = (
        <>
            <Input
                error={nameError}
                value={name}
                title="Name"
                placeholder="Your device name"
                variant="auth"
                setValue={onNameChange}
                editable={!loading}
                returnKeyType={!edit ? "done" : undefined}
                onSubmitEditing={!edit ? save : undefined}
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
            <RoomSelector initialRoomId={roomId} onSelected={onRoomSelected} disabled={loading} />

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
                    {["Switch", "Slider", "Options"].includes(tileType) && (
                        <View
                            style={styles.disclosureField}
                            pointerEvents={loading ? "none" : "auto"}>
                            <OperationSelector
                                key={tileType}
                                initialOperationId={tileOperationId}
                                deviceId={deviceId!}
                                filterTypes={
                                    tileType === "Slider"
                                        ? ["Number", "Integer"]
                                        : tileType === "Options"
                                          ? ["Options"]
                                          : ["Boolean"]
                                }
                                onSelected={(value) => {
                                    setTileOperationId(value);
                                    setSubmitError("");
                                }}
                            />
                        </View>
                    )}
                    {tileType === "Slider" && (
                        <View style={styles.disclosureField}>
                            <Input
                                title="Step"
                                placeholder="e.g. 1"
                                error={tileStepError}
                                value={tileStep}
                                keyboardType="decimal-pad"
                                variant="auth"
                                editable={!loading}
                                setValue={(value) => {
                                    setTileStep(value);
                                    setSubmitError("");
                                }}
                            />
                            <Text>
                                Range comes from the selected operation. Use 0 for a continuous
                                numeric slider.
                            </Text>
                            <Input
                                title="Unit"
                                error={tileUnitError}
                                value={tileUnit}
                                placeholder="e.g. %"
                                variant="auth"
                                editable={!loading}
                                setValue={(value) => {
                                    setTileUnit(value);
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
                                    filterTypes={["Number", "Integer", "Boolean"]}
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
                                        error={tileUnitError}
                                        variant="auth"
                                        editable={!loading}
                                    />
                                )}
                            <Input
                                title="Reading label"
                                placeholder="Operation name by default"
                                value={tileLabel}
                                error={tileLabelError}
                                variant="auth"
                                editable={!loading}
                                setValue={(value) => {
                                    setTileLabel(value);
                                    setSubmitError("");
                                }}
                            />
                            <Text>
                                Boolean operations show read-only On/Off. Add separate operations
                                for additional units or measurements.
                            </Text>
                            {tileReadings.map((reading, index) => (
                                <View key={index} style={styles.disclosureField}>
                                    <Text>Reading {index + 2}</Text>
                                    <View pointerEvents={loading ? "none" : "auto"}>
                                        <OperationSelector
                                            initialOperationId={reading.operationId}
                                            deviceId={deviceId!}
                                            filterTypes={["Number", "Integer", "Boolean"]}
                                            onSelected={(operationId) => {
                                                setTileReadings((current) =>
                                                    current.map((item, position) =>
                                                        position === index
                                                            ? { ...item, operationId }
                                                            : item,
                                                    ),
                                                );
                                                setSubmitError("");
                                            }}
                                        />
                                    </View>
                                    <Input
                                        title={`Reading ${index + 2} label`}
                                        placeholder="Operation name by default"
                                        value={reading.label}
                                        error={
                                            reading.label.length > 64
                                                ? "Label must be at most 64 characters."
                                                : ""
                                        }
                                        variant="auth"
                                        editable={!loading}
                                        setValue={(label) => {
                                            setTileReadings((current) =>
                                                current.map((item, position) =>
                                                    position === index ? { ...item, label } : item,
                                                ),
                                            );
                                            setSubmitError("");
                                        }}
                                    />
                                    <Input
                                        title={`Reading ${index + 2} unit`}
                                        placeholder="e.g. %"
                                        value={reading.unit}
                                        error={
                                            reading.unit.length > 5
                                                ? "Unit must be at most 5 characters."
                                                : ""
                                        }
                                        variant="auth"
                                        editable={!loading}
                                        setValue={(unit) => {
                                            setTileReadings((current) =>
                                                current.map((item, position) =>
                                                    position === index ? { ...item, unit } : item,
                                                ),
                                            );
                                            setSubmitError("");
                                        }}
                                    />
                                    <Button
                                        name={`Remove reading ${index + 2}`}
                                        type="brand-outline"
                                        loading={false}
                                        disabled={loading}
                                        onPress={() => {
                                            setTileReadings((current) =>
                                                current.filter((_, position) => position !== index),
                                            );
                                            setSubmitError("");
                                        }}
                                    />
                                </View>
                            ))}
                            {!!tileReadingsError && <Text color="error">{tileReadingsError}</Text>}
                            <Button
                                name="Add reading"
                                type="brand-outline"
                                loading={false}
                                disabled={loading || tileReadings.length >= 8}
                                onPress={() => {
                                    setTileReadings((current) => [
                                        ...current,
                                        { operationId: "None", label: "", unit: "" },
                                    ]);
                                    setSubmitError("");
                                }}
                            />
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
        </>
    );
    const submitAlert = !!submitError && (
        <Alert
            icon={CircleAlert}
            variant="destructive"
            accessibilityRole="alert"
            accessibilityLiveRegion="polite">
            <AlertDescription>{submitError}</AlertDescription>
        </Alert>
    );
    const actions = edit ? (
        <>
            {submitAlert}
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
        </>
    ) : (
        <View style={styles.createActions}>
            {submitAlert}
            <Button
                name="Create device"
                type="auth"
                loading={loading}
                disabled={!isIconValid}
                onPress={save}
            />
        </View>
    );

    return (
        <View style={styles.container}>
            <KeyboardAwareScrollView
                bottomOffset={keyboardOffset}
                keyboardShouldPersistTaps="handled"
                style={styles.scrollContainer}
                contentContainerStyle={[styles.content, edit && styles.editContent]}>
                {edit ? (
                    <FormSection
                        title="Device details"
                        helper="Update this device's name, icon and room."
                        actions={actions}>
                        {fields}
                    </FormSection>
                ) : (
                    <>
                        <View style={styles.fields}>
                            <View style={styles.intro}>
                                <UiText
                                    accessibilityRole="header"
                                    style={[styles.title, { color: colors.authForeground }]}>
                                    Create device
                                </UiText>
                                <UiText style={[styles.helper, { color: colors.authMuted }]}>
                                    Add a device to “{homes.current?.name ?? "your home"}”.
                                </UiText>
                            </View>
                            {fields}
                        </View>
                        {actions}
                    </>
                )}
                {children}
            </KeyboardAwareScrollView>
        </View>
    );
});

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContainer: { flex: 1 },
    content: {
        flexGrow: 1,
        width: "100%",
        maxWidth: 448,
        alignSelf: "center",
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 16,
    },
    editContent: {
        width: "100%",
        maxWidth: 448,
        alignSelf: "center",
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 16,
        gap: 0,
    },
    fields: { gap: 24 },
    intro: { gap: 8 },
    title: { fontSize: 30, lineHeight: 36, fontWeight: "600" },
    helper: { fontSize: 16, lineHeight: 24 },
    disclosureField: { paddingTop: 12 },
    tilePreview: {
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        maxWidth: 260,
        alignSelf: "center",
        marginTop: 12,
    },
    actions: { gap: 12 },
    createActions: { paddingTop: 32, gap: 12, marginTop: "auto" },
});

export default DeviceForm;
