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
import BottomSheetSelect from "../common/BottomSheetSelect";
import OperationSelector from "./operation/OperationSelector";
import RoomSelector from "../room/RoomSelector";
import { useTheme } from "@/contexts/ThemeProvider";
import Expander from "../common/Expander";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { keyboardOffset } from "@/styles/defaultStyles";
import { useIconCatalog } from "@/hooks/useIconCatalog";
import Text from "../common/Text";
import { Text as UiText } from "@/components/ui/text";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isConsumedOperation } from "@/utils/operationValidation";

const DefaultDeviceIcon = "bulb-outline";
const TileTypeOptions = ["Default", "Switch", "Display", "Slider", "Options"];
const PresenceTypeOptions = [
    { value: "Default", label: "No presence" },
    { value: "BooleanOperation", label: "Boolean operation" },
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
    disabled?: boolean;
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
        disabled = false,
        children,
    },
    ref,
) {
    const homes = useHomes();
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
    const disabledRef = useRef(disabled);
    disabledRef.current = disabled;
    const loadingRef = useRef(loading);
    loadingRef.current = loading;
    const canMutate = () => !disabledRef.current && !loadingRef.current && !submitting.current;
    const formDisabled = disabled || loading;
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
        ...(tileDisplayableOperationId && tileDisplayableOperationId !== "None"
            ? [tileDisplayableOperationId]
            : []),
        ...tileReadings.map((reading) => reading.operationId),
    ];
    const tileReadingsError =
        tileReadings.length > 8 ||
        tileReadings.some((reading) => !reading.operationId || reading.operationId === "None") ||
        new Set(readingIds).size !== readingIds.length
            ? "Select a different operation for every reading (up to 8 additional readings)."
            : tileReadings.some((reading) => reading.label.length > 64 || reading.unit.length > 5)
              ? "Reading labels allow 64 characters and units allow 5."
              : "";
    const [loadedPreview, setLoadedPreview] = useState<{
        key: string;
        operation: OperationDto;
    } | null>(null);
    const [previewError, setPreviewError] = useState("");
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewRetry, setPreviewRetry] = useState(0);
    const previewOperationId =
        tileType === "Display" ? tileDisplayableOperationId : tileOperationId;
    const previewKey = `${homes.current?.id}:${deviceId}:${tileType}:${previewOperationId}`;
    const currentPreviewKey = useRef(previewKey);
    currentPreviewKey.current = previewKey;
    const previewOperation = loadedPreview?.key === previewKey ? loadedPreview.operation : null;
    const tileStepError =
        !tileStep.trim() || !Number.isFinite(Number(tileStep)) || Number(tileStep) < 0
            ? "Enter a non-negative numeric step."
            : "";
    const tileUnitError = tileUnit.length > 5 ? "Unit must be at most 5 characters." : "";
    const [presenceType, setPresenceType] = useState(initial.presenceType);
    const [presenceOperationId, setPresenceOperationId] = useState(initial.presenceOperationId);
    const [tileExpanded, setTileExpanded] = useState(false);
    const [presenceExpanded, setPresenceExpanded] = useState(false);
    const [operationErrors, setOperationErrors] = useState({
        tileOperation: "",
        displayOperation: "",
        presenceOperation: "",
    });
    const clearOperationError = (field: keyof typeof operationErrors) => {
        setOperationErrors((current) => (current[field] ? { ...current, [field]: "" } : current));
    };

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
        const missingOperations: Partial<typeof operationErrors> = {};
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
            missingOperations.tileOperation = "Select an operation for this tile.";
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
            missingOperations.displayOperation = "Select an operation for the Display tile.";
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
            missingOperations.presenceOperation = "Select an operation for presence.";
            setPresenceExpanded(true);
            valid = false;
        }
        if (Object.keys(missingOperations).length)
            setOperationErrors((current) => ({ ...current, ...missingOperations }));
        return valid && isIconValid;
    };

    const save = async () => {
        if (!canMutate() || !validateForm()) return;
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
        if (!canMutate()) return;
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
        setOperationErrors({ tileOperation: "", displayOperation: "", presenceOperation: "" });
        setSubmitError("");
    };

    useImperativeHandle(ref, () => ({ save, reset }));
    useEffect(() => onHasChanges?.(dirty), [dirty, onHasChanges]);
    useEffect(() => {
        setLoadedPreview(null);
        setPreviewError("");
        setPreviewLoading(false);
        if (
            !["Slider", "Options", "Display"].includes(tileType) ||
            !previewOperationId ||
            previewOperationId === "None"
        )
            return;
        let active = true;
        const isCurrent = () => active && currentPreviewKey.current === previewKey;
        setPreviewLoading(true);
        const loadPreview = async () => {
            try {
                const result = await httpClient.get("v1/devices/operations/" + previewOperationId);
                if (!result.isSuccess || !result.response) throw new Error("Preview read failed");
                const operation: unknown = await result.response.json();
                if (!isCurrent()) return;
                const allowedTypes =
                    tileType === "Slider"
                        ? ["Number", "Integer"]
                        : tileType === "Options"
                          ? ["Options"]
                          : ["Number", "Integer", "Boolean"];
                if (
                    !isConsumedOperation(operation, previewOperationId) ||
                    !allowedTypes.includes(operation.type)
                )
                    throw new Error("Invalid preview operation");
                if (
                    tileType === "Slider" &&
                    (typeof operation.configuration.min !== "number" ||
                        typeof operation.configuration.max !== "number" ||
                        operation.configuration.min >= operation.configuration.max)
                )
                    throw new Error("Invalid preview range");
                setLoadedPreview({ key: previewKey, operation });
            } catch {
                if (isCurrent()) setPreviewError("Couldn't load the tile preview. Try again.");
            } finally {
                if (isCurrent()) setPreviewLoading(false);
            }
        };
        void loadPreview();
        return () => {
            active = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [previewKey, previewRetry]);
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
        if (!canMutate()) return;
        setName(value);
        setSubmitError("");
    };
    const onRoomSelected = (value: string) => {
        if (!canMutate()) return;
        setRoomId(value);
        setSubmitError("");
    };
    const onTileTypeSelected = (value: string) => {
        if (!canMutate()) return;
        setTileType(value);
        setSubmitError("");
    };
    const onPresenceTypeSelected = (value: string) => {
        if (!canMutate()) return;
        setPresenceType(value);
        setSubmitError("");
    };
    const updateReading = (index: number, update: Partial<TileReadingConfiguration>) => {
        if (!canMutate()) return;
        setTileReadings((current) =>
            current.map((reading, position) =>
                position === index ? { ...reading, ...update } : reading,
            ),
        );
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
                editable={!formDisabled}
                returnKeyType={!edit ? "done" : undefined}
                onSubmitEditing={!edit ? save : undefined}
            />
            <IconSelector
                defaultIcon={icon}
                catalog={catalog}
                resource="devices"
                variant="brand"
                onIconSelected={(value) => {
                    if (!canMutate()) return;
                    setIcon(value);
                    setSubmitError("");
                }}
                disabled={formDisabled}
            />
            {!catalog.loading && !catalog.error && !isIconValid && (
                <Text color="error" accessibilityRole="alert">
                    Select an available icon.
                </Text>
            )}
            <RoomSelector
                initialRoomId={roomId}
                onSelected={onRoomSelected}
                disabled={formDisabled}
            />

            {edit && (
                <Expander
                    title="Tile"
                    summary={tileSummary}
                    expanded={tileExpanded}
                    onExpandedChange={(expanded) => {
                        if (canMutate()) setTileExpanded(expanded);
                    }}
                    padding={{ paddingTop: 4 }}>
                    <BottomSheetSelect
                        title="Tile Type"
                        value={tileType}
                        options={TileTypeOptions.map((value) => ({
                            label: value,
                            selected: tileType === value,
                            onPress: () => onTileTypeSelected(value),
                        }))}
                        disabled={formDisabled}
                    />
                    {["Switch", "Slider", "Options"].includes(tileType) && (
                        <View style={styles.disclosureField}>
                            <OperationSelector
                                key={tileType}
                                initialOperationId={tileOperationId}
                                deviceId={deviceId!}
                                title="Tile operation"
                                error={operationErrors.tileOperation}
                                disabled={formDisabled}
                                filterTypes={
                                    tileType === "Slider"
                                        ? ["Number", "Integer"]
                                        : tileType === "Options"
                                          ? ["Options"]
                                          : ["Boolean"]
                                }
                                onSelected={(value) => {
                                    if (!canMutate()) return;
                                    setTileOperationId(value);
                                    clearOperationError("tileOperation");
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
                                editable={!formDisabled}
                                setValue={(value) => {
                                    if (!canMutate()) return;
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
                                editable={!formDisabled}
                                setValue={(value) => {
                                    if (!canMutate()) return;
                                    setTileUnit(value);
                                    setSubmitError("");
                                }}
                            />
                        </View>
                    )}
                    {tileType === "Display" && (
                        <View style={styles.disclosureField}>
                            <OperationSelector
                                initialOperationId={tileDisplayableOperationId}
                                deviceId={deviceId!}
                                title="Primary reading operation"
                                error={operationErrors.displayOperation}
                                disabled={formDisabled}
                                filterTypes={["Number", "Integer", "Boolean"]}
                                onSelected={(value) => {
                                    if (!canMutate()) return;
                                    setTileDisplayableOperationId(value);
                                    clearOperationError("displayOperation");
                                    setSubmitError("");
                                }}
                            />
                            {!!tileDisplayableOperationId &&
                                tileDisplayableOperationId !== "None" && (
                                    <Input
                                        value={tileUnit}
                                        title="Unit"
                                        placeholder="e.g. °C"
                                        setValue={(value) => {
                                            if (!canMutate()) return;
                                            setTileUnit(value);
                                            setSubmitError("");
                                        }}
                                        error={tileUnitError}
                                        variant="auth"
                                        editable={!formDisabled}
                                    />
                                )}
                            <Input
                                title="Reading label"
                                placeholder="Operation name by default"
                                value={tileLabel}
                                error={tileLabelError}
                                variant="auth"
                                editable={!formDisabled}
                                setValue={(value) => {
                                    if (!canMutate()) return;
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
                                    <OperationSelector
                                        initialOperationId={reading.operationId}
                                        deviceId={deviceId!}
                                        title={`Reading ${index + 2} operation`}
                                        disabled={formDisabled}
                                        filterTypes={["Number", "Integer", "Boolean"]}
                                        onSelected={(operationId) =>
                                            updateReading(index, { operationId })
                                        }
                                    />
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
                                        editable={!formDisabled}
                                        setValue={(label) => updateReading(index, { label })}
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
                                        editable={!formDisabled}
                                        setValue={(unit) => updateReading(index, { unit })}
                                    />
                                    <Button
                                        name={`Remove reading ${index + 2}`}
                                        type="brand-outline"
                                        loading={false}
                                        disabled={formDisabled}
                                        onPress={() => {
                                            if (!canMutate()) return;
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
                                disabled={formDisabled || tileReadings.length >= 8}
                                onPress={() => {
                                    if (!canMutate() || tileReadings.length >= 8) return;
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
                    {!!previewError && (
                        <View style={styles.disclosureField}>
                            <Alert
                                icon={CircleAlert}
                                variant="destructive"
                                accessibilityRole="alert">
                                <AlertDescription>{previewError}</AlertDescription>
                            </Alert>
                            <Button
                                name="Retry preview"
                                type="brand-outline"
                                loading={previewLoading}
                                disabled={formDisabled}
                                onPress={() => {
                                    if (canMutate() && !previewLoading)
                                        setPreviewRetry((value) => value + 1);
                                }}
                            />
                        </View>
                    )}
                </Expander>
            )}

            {edit && (
                <Expander
                    title="Presence"
                    summary={presenceSummary}
                    expanded={presenceExpanded}
                    onExpandedChange={(expanded) => {
                        if (canMutate()) setPresenceExpanded(expanded);
                    }}
                    padding={{ paddingTop: 4 }}>
                    <BottomSheetSelect
                        title="Presence Type"
                        value={
                            PresenceTypeOptions.find((option) => option.value === presenceType)
                                ?.label ?? "Unavailable presence"
                        }
                        options={PresenceTypeOptions.map((option) => ({
                            label: option.label,
                            selected: presenceType === option.value,
                            onPress: () => onPresenceTypeSelected(option.value),
                        }))}
                        disabled={formDisabled}
                    />
                    {presenceType === "BooleanOperation" && (
                        <View style={styles.disclosureField}>
                            <OperationSelector
                                deviceId={deviceId!}
                                initialOperationId={presenceOperationId}
                                title="Presence operation"
                                error={operationErrors.presenceOperation}
                                disabled={formDisabled}
                                filterTypes={["Boolean"]}
                                onSelected={(value) => {
                                    if (!canMutate()) return;
                                    setPresenceOperationId(value);
                                    clearOperationError("presenceOperation");
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
                    disabled={!dirty || !isIconValid || formDisabled}
                    onPress={save}
                />
                {dirty && (
                    <Button
                        name="Reset"
                        type="brand-ghost"
                        loading={false}
                        disabled={formDisabled}
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
                disabled={!isIconValid || formDisabled}
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
