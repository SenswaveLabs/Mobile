import {
    ConditionConnector,
    AutomationConditionDto,
    AutomationResultDto,
} from "@/types/AutomationsTypes";
import { View, StyleSheet } from "react-native";
import Text from "@/components/common/Text";
import IconSelector from "@/components//common/IconSelector";
import HorizontalSelector from "@/components/common/HorizontalSelector";
import ConditionResultTile from "@/components/automations/ConditionResultTile";
import { useTheme } from "@/contexts/ThemeProvider";
import LogicalConjuction from "@/components/automations/LogicalConjuction";
import AutomationConditions from "@/components/automations/conditions/AutomationConditions";
import AutomationResult from "@/components/automations/results/AutomationResults";
import Input from "@/components/common/Input";
import { shadowStyles } from "@/styles/shadowStyles";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import AutomationTile from "@/components/automations/AutomationTile";
import ImageButton from "@/components/common/ImageButton";
import { ScrollView } from "react-native-gesture-handler";
import Divider from "../common/Divider";
import { useAutomation } from "@/contexts/custom/AutomationProvider";

const AutomationIcons = [
    "flash-outline",
    "timer-outline",
    "time-outline",
    "calendar-outline",
    "alarm-outline",
    "sync-outline",
    "shuffle-outline",
    "pulse-outline",
    "swap-horizontal-outline",
    "notifications-outline",
    "cog-outline",
    "moon-outline",
    "sunny-outline",
    "thermometer-outline",
] as string[];

export interface AutomationFormHandle {
    triggerSave: () => void;
}

const sections = ["Enabled", "Disabled"];

interface AutomationFormProps {
    automationId?: string;
    initName?: string;
    initIcon?: string;

    initIsEnabled?: boolean;
    initConditionConnector?: ConditionConnector;

    initConditions?: AutomationConditionDto[];
    initResults?: AutomationResultDto[];

    onSubmit: (values: any) => Promise<void>;
    edit?: boolean;
    onDirtyChange?: (isDirty: boolean) => void;
    hideInternalButton?: boolean;
}

const AutomationForm = forwardRef<AutomationFormHandle, AutomationFormProps>(
    function AutomationForm(
        {
            automationId,
            initName = "",
            initIcon = "flash-outline",
            initIsEnabled = undefined,
            initConditionConnector = undefined,
            initConditions = [],
            initResults = [],
            onSubmit,
            edit = false,
            onDirtyChange,
            hideInternalButton = false,
        },
        ref,
    ) {
        const [automationName, setAutomationName] = useState<string>(initName ? initName : "");
        const [nameError, setNameError] = useState<string>("");
        const [automationIcon, setAutomationIcon] = useState<string>(
            initIcon ? initIcon : "flash-outline",
        );
        const [automationIsEnabled, setAutomationIsEnabled] = useState<boolean | undefined>(
            initIsEnabled,
        );
        const [logicalConjuction, setLogicalConjuction] = useState<ConditionConnector>(
            initConditionConnector ? initConditionConnector : "And",
        );

        const automationDetails = useAutomation();

        const [automationConditions, setAutomationConditions] =
            useState<AutomationConditionDto[]>(initConditions); // TODO: Will be done in next Task

        const [automationResults, setAutomationResults] =
            useState<AutomationResultDto[]>(initResults); // TODO: Will be done in next Task

        const theme = useTheme();
        const [loading, setLoading] = useState(false);

        useEffect(() => {
            automationDetails.setAutomationResults(initResults);
            automationDetails.setAutomationConditions(initConditions);
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        useEffect(() => {
            setAutomationResults(automationDetails.results);
        }, [automationDetails.results]);

        useEffect(() => {
            setAutomationConditions(automationDetails.conditions);
        }, [automationDetails.conditions]);

        useEffect(() => {
            onDirtyChange?.(buttonVisible());
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [automationName, automationIcon, automationIsEnabled, logicalConjuction]);

        const toggleLogicalConjunction = () => {
            setLogicalConjuction(logicalConjuction === "And" ? "Or" : "And");
        };

        const validateForm = (): boolean => {
            let isValid = true;

            if (automationName.trim().length < 3 || automationName.trim().length > 64) {
                isValid = false;
                setNameError("Automation name must be between 3 and 64 characters long");
                console.info("[AutomationForm] Automation name is required");
            }

            return isValid;
        };

        const buttonVisible = (): boolean => {
            if (!edit) return true;

            if (automationName !== initName) return true;
            if (automationIcon !== initIcon) return true;
            if (automationIsEnabled !== initIsEnabled) return true;
            if (logicalConjuction !== initConditionConnector) return true;

            return false;
        };

        const buttonClicked = async () => {
            setNameError("");

            if (loading) {
                console.info("[AutomationForm] Form is processing");
                return;
            }

            if (!validateForm()) {
                console.info("[AutomationForm] Form is invalid");
                return;
            }

            setLoading(true);

            const values: any = {};
            if (automationName !== initName) {
                values.name = automationName;
            }
            if (automationIcon !== initIcon) {
                values.icon = automationIcon;
            }
            if (automationIsEnabled !== initIsEnabled) {
                values.isEnabled = automationIsEnabled;
            }
            if (logicalConjuction !== initConditionConnector) {
                values.conditionConnector = logicalConjuction;
            }
            if (automationConditions !== initConditions) {
                values.conditions = automationConditions;
            }
            if (automationResults !== initResults) {
                values.results = automationResults;
            }

            await onSubmit(values);

            setLoading(false);
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
        useImperativeHandle(ref, () => ({ triggerSave: buttonClicked }), [loading]);

        return (
            <View style={styles.wrapper}>
                <View style={styles.automationTileWrapper}>
                    <AutomationTile
                        automationId={automationId ? automationId : ""}
                        automationName={automationName}
                        automationIcon={automationIcon}
                        automationIsEnabled={automationIsEnabled}
                        isPressDisabled={true}
                    />
                </View>

                <Divider />

                <ScrollView
                    style={styles.scrollContainer}
                    contentContainerStyle={{ paddingBottom: 90 }}
                    showsVerticalScrollIndicator={false}>
                    <Input
                        error={nameError}
                        value={automationName}
                        title="Name"
                        placeholder="Your automation name"
                        setValue={setAutomationName}
                    />

                    <View>
                        <IconSelector
                            defaultIcon={automationIcon}
                            onIconSelected={setAutomationIcon}
                            iconList={AutomationIcons}
                        />
                    </View>

                    <View>
                        <HorizontalSelector
                            options={sections}
                            selected={automationIsEnabled ? sections[0] : sections[1]}
                            onSelect={(value) => setAutomationIsEnabled(value === sections[0])}
                            optionAdditionalStyles={[
                                { backgroundColor: theme.current.colors.success },
                                { backgroundColor: theme.current.colors.error },
                            ]}
                            margin={{ top: 10, right: 0, bottom: 10, left: 0 }}
                            textColorWhenSelected="onPrimary"
                        />
                    </View>

                    <View style={styles.ifElseTilesWraper}>
                        <ConditionResultTile>
                            <Text size={"medium"} color={"onPrimary"} bold={true}>
                                If
                            </Text>
                        </ConditionResultTile>

                        <LogicalConjuction
                            onPress={toggleLogicalConjunction}
                            logicalConjuction={logicalConjuction}
                        />
                    </View>

                    <View style={[{ ...styles.conditionsResultsWrapper }, shadowStyles.default]}>
                        <AutomationConditions
                            automationId={automationId}
                            conditions={automationConditions ?? []}
                        />
                    </View>

                    <View style={styles.ifElseTilesWraper}>
                        <ConditionResultTile>
                            <Text size={"medium"} color={"onPrimary"} bold={true}>
                                Then
                            </Text>
                        </ConditionResultTile>
                    </View>

                    <View style={styles.conditionsResultsWrapper}>
                        <AutomationResult
                            automationId={automationId}
                            results={automationResults ?? []}
                        />
                    </View>
                </ScrollView>
                {!hideInternalButton && buttonVisible() && (
                    <View style={styles.buttonContainer}>
                        <ImageButton
                            size={40}
                            icon={edit ? "checkmark-outline" : "add-outline"}
                            loading={loading}
                            onPress={buttonClicked}
                        />
                    </View>
                )}
            </View>
        );
    },
);

export default AutomationForm;

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        gap: 10,
    },

    scrollContainer: {
        flex: 1,
        paddingHorizontal: 15,
        paddingBottom: 20,
    },

    automationTileWrapper: {
        paddingHorizontal: 15,
        alignItems: "center",
    },

    ifElseTilesWraper: {
        width: "35%",
        marginTop: 10,
        marginBottom: 10,
        flexDirection: "row",
    },

    conditionsResultsWrapper: {
        marginTop: 5,
    },

    buttonContainer: {
        position: "absolute",
        bottom: 0,
        right: 15,
        justifyContent: "flex-end",
        alignItems: "center",
        marginBottom: 15,
    },
});
