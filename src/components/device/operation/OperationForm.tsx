import React, { useEffect, useImperativeHandle, useState } from "react";
import { View, StyleSheet } from "react-native";
import OperationTile from "./OperationTile";
import Input from "@/components/common/Input";
import Dropdown, { Option } from "@/components/common/Dropdown";
import JsonPathSelector from "@/components/common/JsonPathSelector";
import { useToast } from "@/contexts/ToastProvider";
import OptionOperationForm from "./forms/Options/OptionsOperationForm";
import BooleanOperationForm, {
    BoolValueType,
    defaultBoolValue,
    getBoolOverrideValue,
    inferBoolValueType,
} from "./forms/Boolean/BooleanOperationForm";
import NumericOperationForm from "./forms/Numeric/NumericOperationForm";
import { OperationFormProvider, useOperationForm } from "@/contexts/custom/OperationFormProvider";
import SwitchDropdown from "@/components/common/SwitchDropdown";
import Divider from "@/components/common/Divider";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { keyboardOffset } from "@/styles/defaultStyles";
import { OperationType } from "@/types/DeviceTypes";

const TypeOptions: Option[] = [
    { name: "Boolean Value", value: "Boolean" },
    { name: "Number Value", value: "Number" },
    { name: "Integer Value", value: "Integer" },
    { name: "Text Value", value: "Text" },
    { name: "Hex Color Value", value: "HexColor" },
    { name: "Option Value", value: "Options" },
];

const MappingOptions: Option[] = [
    { name: "Plain Text", value: "text" },
    { name: "Json", value: "json" },
];

const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;
const DOUBLE_MIN = -Number.MAX_VALUE;
const DOUBLE_MAX = Number.MAX_VALUE;

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
    edit?: boolean;
}

const OperationFormInternal = React.forwardRef<OperationFormHandle, OperationFormProps>(
    function OperationFormInternal(
        {
            deviceId,
            initName,
            initTopic,
            initType,
            initConfiguration,
            onSubmit,
            onValidChange,
            edit = false,
        },
        ref,
    ) {
        const toast = useToast();
        const operationForm = useOperationForm();
        const optionsCount = operationForm.getOptions().length;

        const [loading, setLoading] = useState(false);
        const [name, setName] = useState<string>(initName ?? "");
        const [nameError, setNameError] = useState<string>("");

        const [topic, setTopic] = useState<string>(initTopic ?? "");
        const [topicError, setTopicError] = useState<string>("");

        const [type, setType] = useState<OperationType>(initType ?? "Boolean");
        const [mapping, setMapping] = useState<string>(initConfiguration?.isJson ? "json" : "text");
        const [separator, setSeparator] = useState<string>(
            initConfiguration?.decimalSeparator ?? ".",
        );
        const [jsonNames, setJsonNames] = useState<string[]>(initConfiguration?.jsonNames ?? []);
        const [saveOnUserAction, setSaveOnUserAction] = useState<boolean>(
            initConfiguration?.saveOnUserAction ?? true,
        );
        const [numericTypeCheck, setNumericTypeCheck] = useState<string>(() => {
            if (initConfiguration?.min === undefined) return "nocheck";
            const isInt32FullRange =
                initConfiguration.min === INT32_MIN && initConfiguration.max === INT32_MAX;
            const isDoubleFullRange =
                initConfiguration.min === DOUBLE_MIN && initConfiguration.max === DOUBLE_MAX;
            return isInt32FullRange || isDoubleFullRange ? "nocheck" : "check";
        });

        const [minValue, setMinValue] = useState<number | undefined>(initConfiguration?.min ?? 0);
        const [minValueError, setMinValueError] = useState<string>("");
        const [maxValue, setMaxValue] = useState<number | undefined>(initConfiguration?.max ?? 100);

        const [booleanOverride, setBooleanOverride] = useState<string>(() => {
            const tv = initConfiguration?.trueValue;
            const fv = initConfiguration?.falseValue;
            if (tv === undefined && fv === undefined) return "default";
            if (tv === false && fv === true) return "inversed";
            if ((tv === undefined || tv === true) && (fv === undefined || fv === false))
                return "default";
            return "custom";
        });
        const [boolTrueType, setBoolTrueType] = useState<BoolValueType>(() =>
            inferBoolValueType(initConfiguration?.trueValue),
        );
        const [boolTrueValue, setBoolTrueValue] = useState<string | boolean>(() => {
            const tv = initConfiguration?.trueValue;
            return tv !== undefined ? tv : defaultBoolValue(inferBoolValueType(tv));
        });
        const [boolFalseType, setBoolFalseType] = useState<BoolValueType>(() =>
            inferBoolValueType(initConfiguration?.falseValue),
        );
        const [boolFalseValue, setBoolFalseValue] = useState<string | boolean>(() => {
            const fv = initConfiguration?.falseValue;
            return fv !== undefined ? fv : defaultBoolValue(inferBoolValueType(fv));
        });

        const handleBoolTrueTypeChange = (newType: BoolValueType) => {
            setBoolTrueType(newType);
            setBoolTrueValue(defaultBoolValue(newType));
        };

        const handleBoolFalseTypeChange = (newType: BoolValueType) => {
            setBoolFalseType(newType);
            setBoolFalseValue(defaultBoolValue(newType));
        };

        const typeSelected = (value: string) => {
            setType(value as OperationType);
        };

        const mappingSelected = (value: string) => {
            setMapping(value);
        };

        const buttonClicked = async () => {
            if (loading) {
                console.info("[OperationForm] Form is processing");
                return;
            }

            if (!validateForm()) {
                console.info("[OperationForm] Form is invalid");
                toast.error("Please fix the errors and fill fields in the form.");
                return;
            }

            setLoading(true);

            const values: any = {
                deviceId: deviceId,
                name: name,
                topic: topic,
                type: type,
                configuration: {
                    isJson: mapping === "json",
                    saveOnUserAction: saveOnUserAction,
                },
            };

            if (values.configuration.isJson) {
                values.configuration.jsonNames = jsonNames;
            }

            if (type === "Number" || type === "Integer") {
                if (numericTypeCheck === "check") {
                    values.configuration.min = minValue!;
                    values.configuration.max = maxValue!;
                }
            }

            if (type === "Number" && mapping === "text") {
                values.configuration.decimalSeparator = separator;
            }

            if (type === "Boolean" && booleanOverride === "inversed") {
                values.configuration.trueValue = false;
                values.configuration.falseValue = true;
            }

            if (type === "Boolean" && booleanOverride === "custom") {
                values.configuration.trueValue = getBoolOverrideValue(boolTrueType, boolTrueValue);
                values.configuration.falseValue = getBoolOverrideValue(
                    boolFalseType,
                    boolFalseValue,
                );
            }

            if (type === "Options") {
                const options = operationForm.getOptions();
                if (options.length < 2) {
                    toast.info("Please add at least two options.");
                    setLoading(false);
                    return;
                }
                values.configuration.options = options;
            }

            console.debug("[DeviceForm] Submitting form with values: ", values);
            await onSubmit(values);

            setLoading(false);
        };

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

            if (topic === "") {
                valid = false;
                setTopicError("");
            } else if (topic.length > 256) {
                valid = false;
                setTopicError("Topic is too long.");
            } else if (topic.length < 3) {
                valid = false;
                setTopicError("Topic is too short.");
            } else {
                setTopicError("");
            }

            if (minValue === undefined || maxValue === undefined) {
                valid = false;
                setMinValueError("Both values are required.");
            } else if (minValue >= maxValue) {
                valid = false;
                setMinValueError("Min value must be less than max value.");
            } else {
                setMinValueError("");
            }

            if (mapping === "json" && jsonNames.length === 0) {
                valid = false;
                toast.info("Please add json field.");
            }

            if (type === "Options" && optionsCount < 2) {
                valid = false;
            }

            if (type === "Boolean" && booleanOverride === "custom") {
                if (boolTrueType !== "boolean" && boolTrueValue.toString().trim() === "") {
                    valid = false;
                }
                if (boolFalseType !== "boolean" && boolFalseValue.toString().trim() === "") {
                    valid = false;
                }
            }

            return valid;
        };

        useImperativeHandle(ref, () => ({ triggerSave: buttonClicked }));

        useEffect(() => {
            const valid = validateForm();
            onValidChange?.(valid);

            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [
            name,
            topic,
            minValue,
            maxValue,
            type,
            booleanOverride,
            boolTrueType,
            boolTrueValue,
            boolFalseType,
            boolFalseValue,
            optionsCount,
        ]);

        useEffect(() => {
            if (initType === "Options") {
                operationForm.setConfiguration(initConfiguration);
            }

            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        return (
            <View style={styles.container}>
                <View style={{ paddingHorizontal: 15, paddingTop: 5, paddingBottom: 5 }}>
                    <OperationTile id={""} name={name} type={type} disablePress={true} />
                </View>

                <Divider style={{ paddingHorizontal: 15 }} />

                <KeyboardAwareScrollView
                    bottomOffset={keyboardOffset}
                    style={styles.scrollContainer}
                    contentContainerStyle={{ paddingBottom: 16 }}>
                    <View style={{ paddingHorizontal: 15 }}>
                        <Input
                            error={nameError}
                            value={name}
                            title="Name"
                            placeholder="Operation name"
                            setValue={setName}
                            editable={!edit}
                        />

                        <Input
                            error={topicError}
                            value={topic}
                            title="Topic"
                            placeholder="example/nested/topic"
                            setValue={setTopic}
                            editable={!edit}
                        />

                        <Dropdown
                            title={"Operation Type"}
                            options={TypeOptions}
                            selectedValue={type}
                            onSelected={typeSelected}
                            disablePress={edit}
                            style={{ marginBottom: 10 }}
                        />

                        <SwitchDropdown
                            title="Save on User Action"
                            value={saveOnUserAction}
                            onSelected={setSaveOnUserAction}
                            trueLabel="Enabled — instantly synced to all users"
                            falseLabel="Disabled — device must retransmit to sync"
                            disablePress={edit}
                            style={{ marginBottom: 10 }}
                        />

                        <Dropdown
                            title={"Data Mapping Type"}
                            options={MappingOptions}
                            selectedValue={mapping}
                            onSelected={mappingSelected}
                            disablePress={edit}
                            style={{ marginBottom: 10 }}
                        />

                        {mapping === "json" && (
                            <JsonPathSelector
                                editable={!edit}
                                jsonNames={jsonNames}
                                setJsonNames={setJsonNames}
                            />
                        )}

                        {type === "Boolean" && (
                            <BooleanOperationForm
                                edit={edit}
                                override={booleanOverride}
                                trueType={boolTrueType}
                                trueValue={boolTrueValue}
                                falseType={boolFalseType}
                                falseValue={boolFalseValue}
                                onOverrideChange={setBooleanOverride}
                                onTrueTypeChange={handleBoolTrueTypeChange}
                                onTrueValueChange={setBoolTrueValue}
                                onFalseTypeChange={handleBoolFalseTypeChange}
                                onFalseValueChange={setBoolFalseValue}
                            />
                        )}

                        {(type === "Number" || type === "Integer") && (
                            <NumericOperationForm
                                edit={edit}
                                showSeparator={type === "Number" && mapping === "text"}
                                separator={separator}
                                typeCheck={numericTypeCheck}
                                minValue={minValue}
                                maxValue={maxValue}
                                minValueError={minValueError}
                                onSeparatorChange={setSeparator}
                                onTypeCheckChange={setNumericTypeCheck}
                                onMinValueChange={setMinValue}
                                onMaxValueChange={setMaxValue}
                            />
                        )}
                    </View>

                    {type === "Options" && <OptionOperationForm edit={edit} />}
                </KeyboardAwareScrollView>
            </View>
        );
    },
);

const OperationForm = React.forwardRef<OperationFormHandle, OperationFormProps>(
    function OperationForm(
        {
            deviceId,
            initName,
            initTopic,
            initType,
            initConfiguration,
            onSubmit,
            onValidChange,
            edit = false,
        },
        ref,
    ) {
        return (
            <OperationFormProvider>
                <OperationFormInternal
                    ref={ref}
                    deviceId={deviceId}
                    initName={initName}
                    initTopic={initTopic}
                    initType={initType}
                    initConfiguration={initConfiguration}
                    onSubmit={onSubmit}
                    onValidChange={onValidChange}
                    edit={edit}
                />
            </OperationFormProvider>
        );
    },
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 0,
        margin: 0,
        marginTop: 0,
    },
    scrollContainer: {
        paddingHorizontal: 0,
        margin: 0,
    },
});

export default OperationForm;
