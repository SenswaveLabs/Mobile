import React, { ReactNode, useEffect, useImperativeHandle, useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import BottomSheetSelect from "@/components/common/BottomSheetSelect";
import Button from "@/components/common/Button";
import FormSection from "@/components/common/FormSection";
import Input from "@/components/common/Input";
import JsonPathSelector from "@/components/common/JsonPathSelector";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/contexts/ThemeProvider";
import { OperationFormProvider, useOperationForm } from "@/contexts/custom/OperationFormProvider";
import { keyboardOffset } from "@/styles/defaultStyles";
import { OperationType } from "@/types/DeviceTypes";
import { isValidJsonPathSegment } from "@/utils/jsonPath";
import BooleanOperationForm, {
    BoolValueType,
    defaultBoolValue,
    getBoolOverrideValue,
    inferBoolValueType,
} from "./forms/Boolean/BooleanOperationForm";
import NumericOperationForm from "./forms/Numeric/NumericOperationForm";
import OptionOperationForm from "./forms/Options/OptionsOperationForm";

const typeOptions: { label: string; value: OperationType }[] = [
    { label: "Boolean", value: "Boolean" },
    { label: "Number", value: "Number" },
    { label: "Integer", value: "Integer" },
    { label: "Text", value: "Text" },
    { label: "Hex color", value: "HexColor" },
    { label: "Options", value: "Options" },
];
const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;

export interface OperationFormHandle {
    triggerSave: () => void;
}

interface OperationFormProps {
    deviceId?: string;
    initName?: string;
    initTopic?: string;
    initType?: OperationType;
    initConfiguration?: any;
    onSubmit: (values: any) => Promise<void>;
    onValidChange?: (valid: boolean) => void;
    onChange?: () => void;
    edit?: boolean;
    pending?: boolean;
    disabled?: boolean;
    feedback?: ReactNode;
    returnAction?: ReactNode;
}

export const OperationFormInternal = React.forwardRef<OperationFormHandle, OperationFormProps>(
    function OperationFormInternal(
        {
            deviceId,
            initName,
            initTopic,
            initType,
            initConfiguration,
            onSubmit,
            onValidChange,
            onChange,
            edit = false,
            pending = false,
            disabled = false,
            feedback,
            returnAction,
        },
        ref,
    ) {
        const operationForm = useOperationForm();
        const { colors } = useTheme().current;
        const [name, setName] = useState(initName ?? "");
        const [topic, setTopic] = useState(initTopic ?? "");
        const [type, setType] = useState<OperationType>(initType ?? "Boolean");
        const [mapping, setMapping] = useState(initConfiguration?.isJson ? "json" : "text");
        const [separator, setSeparator] = useState(initConfiguration?.decimalSeparator ?? ".");
        const [jsonNames, setJsonNames] = useState<string[]>(initConfiguration?.jsonNames ?? []);
        const [jsonDraftValid, setJsonDraftValid] = useState(true);
        const jsonNamesRef = useRef(jsonNames);
        const jsonDraftValidRef = useRef(true);
        const [saveOnUserAction, setSaveOnUserAction] = useState(
            initConfiguration?.saveOnUserAction ?? true,
        );
        const [numericTypeCheck, setNumericTypeCheck] = useState(() => {
            if (initConfiguration?.min === undefined) return "nocheck";
            const fullInteger =
                initConfiguration.min === INT32_MIN && initConfiguration.max === INT32_MAX;
            const fullDouble =
                initConfiguration.min === -Number.MAX_VALUE &&
                initConfiguration.max === Number.MAX_VALUE;
            return fullInteger || fullDouble ? "nocheck" : "check";
        });
        const [minValue, setMinValue] = useState<number | undefined>(initConfiguration?.min ?? 0);
        const [maxValue, setMaxValue] = useState<number | undefined>(initConfiguration?.max ?? 100);
        const [booleanOverride, setBooleanOverride] = useState(() => {
            const trueValue = initConfiguration?.trueValue;
            const falseValue = initConfiguration?.falseValue;
            if (
                (trueValue === undefined || trueValue === true) &&
                (falseValue === undefined || falseValue === false)
            )
                return "default";
            return trueValue === false && falseValue === true ? "inversed" : "custom";
        });
        const [boolTrueType, setBoolTrueType] = useState<BoolValueType>(() =>
            inferBoolValueType(initConfiguration?.trueValue),
        );
        const [boolFalseType, setBoolFalseType] = useState<BoolValueType>(() =>
            inferBoolValueType(initConfiguration?.falseValue),
        );
        const [boolTrueValue, setBoolTrueValue] = useState<string | boolean>(
            () =>
                initConfiguration?.trueValue ??
                defaultBoolValue(inferBoolValueType(initConfiguration?.trueValue)),
        );
        const [boolFalseValue, setBoolFalseValue] = useState<string | boolean>(
            () =>
                initConfiguration?.falseValue ??
                defaultBoolValue(inferBoolValueType(initConfiguration?.falseValue)),
        );
        const [submitted, setSubmitted] = useState(false);
        const [localPending, setLocalPending] = useState(false);
        const submitLock = useRef(false);
        const locked = useRef(false);
        locked.current = edit || disabled || pending;
        const nameInput = useRef<TextInput>(null);
        const topicInput = useRef<TextInput>(null);
        const options = operationForm.getOptions();
        const invalidBool = (valueType: BoolValueType, value: string | boolean) =>
            valueType !== "boolean" &&
            (!String(value).trim() || (valueType === "number" && !Number.isFinite(Number(value))));
        const nameError = !name.trim()
            ? "Name is required."
            : name.trim().length < 3 || name.trim().length > 64
              ? "Use 3–64 characters."
              : "";
        const topicError = !topic.trim()
            ? "Topic is required."
            : topic.length < 3 || topic.length > 256
              ? "Use 3–256 characters."
              : "";
        const rangeActive =
            (type === "Number" || type === "Integer") && numericTypeCheck === "check";
        const rangeError =
            rangeActive &&
            (minValue === undefined ||
                maxValue === undefined ||
                !Number.isFinite(minValue) ||
                !Number.isFinite(maxValue) ||
                minValue >= maxValue ||
                (type === "Integer" &&
                    (!Number.isInteger(minValue) ||
                        !Number.isInteger(maxValue) ||
                        minValue < INT32_MIN ||
                        maxValue > INT32_MAX)))
                ? "Use a valid range with minimum less than maximum."
                : "";
        const pathError =
            mapping === "json" &&
            (!jsonDraftValid ||
                jsonNames.length < 1 ||
                jsonNames.length > 5 ||
                jsonNames.some((value) => !isValidJsonPathSegment(value)))
                ? "Add 1–5 valid JSON path segments."
                : "";
        const optionError =
            type === "Options" &&
            (options.length < 2 ||
                options.length > 10 ||
                options.some(
                    (option, index) =>
                        !option.name ||
                        option.name.length > 12 ||
                        options.findIndex(
                            (other) => other.name === option.name || other.value === option.value,
                        ) !== index ||
                        (typeof option.value === "number" && !Number.isFinite(option.value)) ||
                        (typeof option.value === "string" &&
                            (!option.value.trim() || option.value.length > 127)),
                ))
                ? "Use 2–10 unique, valid options."
                : "";
        const boolError =
            type === "Boolean" &&
            booleanOverride === "custom" &&
            (invalidBool(boolTrueType, boolTrueValue) || invalidBool(boolFalseType, boolFalseValue))
                ? "Enter valid true and false values."
                : "";
        const valid =
            !nameError && !topicError && !rangeError && !pathError && !optionError && !boolError;

        useEffect(() => {
            onValidChange?.(valid);
        }, [valid, onValidChange]);
        useEffect(() => {
            if (initType === "Options") operationForm.setConfiguration(initConfiguration);
            // Initialize the read-only option snapshot once per form instance.
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        const change =
            <T,>(setter: (value: T) => void) =>
            (value: T) => {
                if (locked.current || submitLock.current) return;
                setter(value);
                onChange?.();
            };
        const submit = async () => {
            if (locked.current || submitLock.current) return;
            setSubmitted(true);
            if (!valid || (mapping === "json" && !jsonDraftValidRef.current)) {
                if (nameError) nameInput.current?.focus();
                else if (topicError) topicInput.current?.focus();
                return;
            }
            submitLock.current = true;
            setLocalPending(true);
            const configuration: Record<string, unknown> = {
                isJson: mapping === "json",
                saveOnUserAction,
            };
            if (mapping === "json") configuration.jsonNames = jsonNamesRef.current;
            if (rangeActive) {
                configuration.min = minValue;
                configuration.max = maxValue;
            }
            if (type === "Number" && mapping === "text") configuration.decimalSeparator = separator;
            if (type === "Boolean" && booleanOverride === "inversed") {
                configuration.trueValue = false;
                configuration.falseValue = true;
            }
            if (type === "Boolean" && booleanOverride === "custom") {
                configuration.trueValue = getBoolOverrideValue(boolTrueType, boolTrueValue);
                configuration.falseValue = getBoolOverrideValue(boolFalseType, boolFalseValue);
            }
            if (type === "Options") configuration.options = options;
            try {
                await onSubmit({ deviceId, name: name.trim(), topic, type, configuration });
            } finally {
                submitLock.current = false;
                setLocalPending(false);
            }
        };
        useImperativeHandle(ref, () => ({ triggerSave: submit }));
        const busy = pending || localPending;
        const selectionDisabled = edit || disabled || busy;
        const inputEditable = !edit && !disabled;
        const errorText = (message: string) =>
            submitted &&
            !!message && (
                <Text
                    accessibilityLiveRegion="polite"
                    style={[styles.error, { color: colors.error }]}>
                    {message}
                </Text>
            );

        return (
            <KeyboardAwareScrollView
                bottomOffset={keyboardOffset}
                keyboardShouldPersistTaps="handled"
                style={styles.screen}
                contentContainerStyle={styles.content}>
                <FormSection
                    title={edit ? "Operation details" : "Create operation"}
                    helper={
                        edit
                            ? "View this operation's configuration."
                            : "Define the topic and values for this device operation."
                    }>
                    <Input
                        variant="auth"
                        title="Name"
                        placeholder="Operation name"
                        value={name}
                        setValue={change(setName)}
                        error={submitted ? nameError : ""}
                        inputRef={nameInput}
                        editable={inputEditable}
                        accessibilityState={{ busy }}
                        returnKeyType="next"
                        onSubmitEditing={() => topicInput.current?.focus()}
                    />
                    <Input
                        variant="auth"
                        title="Topic"
                        placeholder="example/nested/topic"
                        value={topic}
                        setValue={change(setTopic)}
                        error={submitted ? topicError : ""}
                        inputRef={topicInput}
                        editable={inputEditable}
                        accessibilityState={{ busy }}
                        returnKeyType="done"
                        onSubmitEditing={submit}
                    />
                    <BottomSheetSelect
                        title="Operation type"
                        value={typeOptions.find((option) => option.value === type)?.label ?? type}
                        disabled={selectionDisabled}
                        options={typeOptions.map((option) => ({
                            label: option.label,
                            selected: option.value === type,
                            onPress: () => change(setType)(option.value),
                        }))}
                    />
                    <View style={styles.field}>
                        <BottomSheetSelect
                            title="Save on user action"
                            value={saveOnUserAction ? "Enabled" : "Disabled"}
                            disabled={selectionDisabled}
                            options={[
                                {
                                    label: "Enabled",
                                    selected: saveOnUserAction,
                                    onPress: () => change(setSaveOnUserAction)(true),
                                },
                                {
                                    label: "Disabled",
                                    selected: !saveOnUserAction,
                                    onPress: () => change(setSaveOnUserAction)(false),
                                },
                            ]}
                        />
                        <Text style={[styles.helper, { color: colors.authMuted }]}>
                            {saveOnUserAction
                                ? "Changes sync to all users immediately."
                                : "The device must retransmit before changes sync."}
                        </Text>
                    </View>
                    <BottomSheetSelect
                        title="Data mapping"
                        value={mapping === "json" ? "JSON" : "Plain text"}
                        disabled={selectionDisabled}
                        options={[
                            {
                                label: "Plain text",
                                selected: mapping === "text",
                                onPress: () =>
                                    change((value: string) => {
                                        jsonDraftValidRef.current = true;
                                        setJsonDraftValid(true);
                                        setMapping(value);
                                    })("text"),
                            },
                            {
                                label: "JSON",
                                selected: mapping === "json",
                                onPress: () => change(setMapping)("json"),
                            },
                        ]}
                    />
                    {mapping === "json" && (
                        <View style={styles.field}>
                            <JsonPathSelector
                                editable={inputEditable}
                                disabled={busy}
                                jsonNames={jsonNames}
                                setJsonNames={change((next: string[]) => {
                                    jsonNamesRef.current = next;
                                    setJsonNames(next);
                                })}
                                onValidChange={(next) => {
                                    jsonDraftValidRef.current = next;
                                    setJsonDraftValid(next);
                                }}
                            />
                            {errorText(pathError)}
                        </View>
                    )}
                    {type === "Boolean" && (
                        <View style={styles.field}>
                            <BooleanOperationForm
                                edit={edit}
                                disabled={disabled || busy}
                                override={booleanOverride}
                                trueType={boolTrueType}
                                trueValue={boolTrueValue}
                                falseType={boolFalseType}
                                falseValue={boolFalseValue}
                                onOverrideChange={change(setBooleanOverride)}
                                onTrueTypeChange={change((value) => {
                                    setBoolTrueType(value);
                                    setBoolTrueValue(defaultBoolValue(value));
                                })}
                                onTrueValueChange={change(setBoolTrueValue)}
                                onFalseTypeChange={change((value) => {
                                    setBoolFalseType(value);
                                    setBoolFalseValue(defaultBoolValue(value));
                                })}
                                onFalseValueChange={change(setBoolFalseValue)}
                            />
                            {errorText(boolError)}
                        </View>
                    )}
                    {(type === "Number" || type === "Integer") && (
                        <NumericOperationForm
                            edit={edit}
                            disabled={disabled || busy}
                            showSeparator={type === "Number" && mapping === "text"}
                            separator={separator}
                            typeCheck={numericTypeCheck}
                            minValue={minValue}
                            maxValue={maxValue}
                            minValueError={submitted ? rangeError : ""}
                            onSeparatorChange={change(setSeparator)}
                            onTypeCheckChange={change(setNumericTypeCheck)}
                            onMinValueChange={change(setMinValue)}
                            onMaxValueChange={change(setMaxValue)}
                        />
                    )}
                    {type === "Options" && (
                        <View style={styles.field}>
                            <OptionOperationForm
                                edit={edit}
                                disabled={disabled || busy}
                                onChange={onChange}
                            />
                            {errorText(optionError)}
                        </View>
                    )}
                </FormSection>
                {!edit && (
                    <View style={styles.actions}>
                        {feedback}
                        {returnAction}
                        <Button
                            name="Create operation"
                            type="auth"
                            loading={busy}
                            disabled={disabled || busy}
                            onPress={submit}
                        />
                    </View>
                )}
            </KeyboardAwareScrollView>
        );
    },
);

const OperationForm = React.forwardRef<OperationFormHandle, OperationFormProps>(
    function OperationForm(props, ref) {
        return (
            <OperationFormProvider>
                <OperationFormInternal {...props} ref={ref} />
            </OperationFormProvider>
        );
    },
);
export default OperationForm;

const styles = StyleSheet.create({
    screen: { flex: 1 },
    content: {
        flexGrow: 1,
        width: "100%",
        maxWidth: 448,
        alignSelf: "center",
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 16,
    },
    actions: { marginTop: "auto", paddingTop: 32, gap: 12 },
    field: { gap: 6 },
    helper: { fontSize: 14, lineHeight: 20 },
    error: { fontSize: 14, lineHeight: 20 },
});
