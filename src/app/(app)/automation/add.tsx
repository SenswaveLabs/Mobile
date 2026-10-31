import AutomationForm from "@/components/automations/AutomationForm";
import Button from "@/components/common/Button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useAutomationList } from "@/contexts/custom/AutomationListProvider";
import { useAutomation } from "@/contexts/custom/AutomationProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import {
    AutomationConditionDto,
    AutomationConditionInput,
    AutomationFormValues,
    CreateAutomationRequest,
} from "@/types/AutomationsTypes";
import { CircleAlert } from "lucide-react-native";
import { useFocusEffect, useRouter } from "expo-router";
import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

const automationUrl = "v1/automations/";

const toConditionInput = (
    condition: AutomationConditionDto,
): AutomationConditionInput | undefined => {
    const configuration = condition.conditionConfiguration;
    switch (condition.conditionType) {
        case "BooleanCondition":
            return typeof configuration?.isOn === "boolean"
                ? {
                      operationId: condition.operationId,
                      conditionType: condition.conditionType,
                      conditionConfiguration: { isOn: configuration.isOn },
                  }
                : undefined;
        case "NumberCondition":
            return Number.isFinite(configuration?.minValue) &&
                Number.isFinite(configuration?.maxValue) &&
                configuration.minValue < configuration.maxValue
                ? {
                      operationId: condition.operationId,
                      conditionType: condition.conditionType,
                      conditionConfiguration: {
                          minValue: configuration.minValue,
                          maxValue: configuration.maxValue,
                      },
                  }
                : undefined;
        case "TextCondition":
            return typeof configuration?.requiredValue === "string" &&
                configuration.requiredValue.length > 0
                ? {
                      operationId: condition.operationId,
                      conditionType: condition.conditionType,
                      conditionConfiguration: { requiredValue: configuration.requiredValue },
                  }
                : undefined;
        default:
            return undefined;
    }
};

const Add: FC = () => {
    const httpClient = useHttpClient();
    const automations = useAutomationList();
    const automation = useAutomation();
    const homes = useHomes();
    const router = useRouter();
    const { colors } = useTheme().current;
    const automationRef = useRef(automation);
    const automationsRef = useRef(automations);
    const homesRef = useRef(homes);
    automationRef.current = automation;
    automationsRef.current = automations;
    homesRef.current = homes;
    const [sessionToken, setSessionToken] = useState("");
    const [pending, setPending] = useState(false);
    const [accepted, setAccepted] = useState(false);
    const [actionError, setActionError] = useState("");
    const tokenRef = useRef("");
    const homeIdRef = useRef<string | undefined>(undefined);
    const lock = useRef(false);
    const acceptedRef = useRef(false);
    const focused = useRef(false);
    const returning = useRef(false);
    const canManage = homes.current?.isOwner === true || homes.current?.canManage === true;
    const initialValues = useMemo<AutomationFormValues>(
        () => ({ name: "", icon: "flash-outline", conditionConnector: "And", isEnabled: true }),
        [],
    );

    const validVisit = useCallback(() => {
        const token = tokenRef.current;
        const homeId = homeIdRef.current;
        return !!(
            token &&
            homeId &&
            homesRef.current.current?.id === homeId &&
            automationRef.current.session?.token === token &&
            automationRef.current.session.homeId === homeId &&
            automationRef.current.isCurrentSession(token)
        );
    }, []);

    const returnToList = useCallback(
        async (explicitRecovery = false) => {
            if (
                !focused.current ||
                returning.current ||
                (!explicitRecovery && acceptedRef.current && !validVisit())
            )
                return;
            returning.current = true;
            try {
                if (router.canGoBack()) await router.back();
                else await router.replace("/automation/list");
                setActionError("");
            } catch {
                returning.current = false;
                setActionError(
                    acceptedRef.current
                        ? "Automation created. Return to automations to view it."
                        : "Couldn't return to automations. Try again.",
                );
            }
        },
        [router, validVisit],
    );

    useEffect(() => {
        if (!tokenRef.current && !homeIdRef.current && homes.current?.id && canManage) {
            const homeId = homes.current.id;
            const token = automationRef.current.beginSession(homeId);
            if (token) {
                homeIdRef.current = homeId;
                tokenRef.current = token;
                setSessionToken(token);
            }
        }
    }, [canManage, homes.current?.id]);

    useEffect(
        () => () => {
            if (tokenRef.current) automationRef.current.clearSession(tokenRef.current);
        },
        [],
    );

    useFocusEffect(
        useCallback(() => {
            focused.current = true;
            if (acceptedRef.current) void returnToList();
            return () => {
                focused.current = false;
            };
        }, [returnToList]),
    );

    const submit = async (values: AutomationFormValues) => {
        if (acceptedRef.current) {
            await returnToList();
            return;
        }
        if (
            lock.current ||
            !focused.current ||
            (homesRef.current.current?.isOwner !== true &&
                homesRef.current.current?.canManage !== true) ||
            !validVisit()
        )
            return;

        const token = tokenRef.current;
        const homeId = homeIdRef.current!;
        const current = automationRef.current.session;
        if (!current || current.token !== token || current.homeId !== homeId) return;
        const conditions: AutomationConditionInput[] = [];
        for (const condition of current.conditions) {
            const input = toConditionInput(condition);
            if (!input) {
                if (validVisit()) setActionError("One or more conditions are invalid.");
                return;
            }
            conditions.push(input);
        }
        const body: CreateAutomationRequest = {
            homeId,
            name: values.name.trim(),
            icon: values.icon,
            conditionConnector: values.conditionConnector,
            conditions,
            results: current.results.map(({ operationId, valueToSend }) => ({
                operationId,
                valueToSend,
            })),
        };

        lock.current = true;
        setPending(true);
        setActionError("");
        let wasAccepted = false;
        try {
            if (
                !validVisit() ||
                homesRef.current.current?.id !== homeId ||
                (homesRef.current.current?.isOwner !== true &&
                    homesRef.current.current?.canManage !== true)
            )
                return;
            const response = await httpClient.post(automationUrl, body);
            if (!response.isSuccess) {
                if (validVisit()) setActionError("Couldn't create this automation. Try again.");
                return;
            }

            acceptedRef.current = true;
            wasAccepted = true;
            setAccepted(true);
        } catch {
            if (validVisit()) setActionError("Couldn't create this automation. Try again.");
        } finally {
            lock.current = false;
            if (validVisit()) setPending(false);
        }

        if (!wasAccepted) return;
        try {
            await automationsRef.current.refresh(homeId);
        } catch {
            // The accepted POST is final; refresh is only for the return destination.
        }
        await returnToList();
    };

    if (!sessionToken || !validVisit() || !canManage) {
        return (
            <View style={[styles.recovery, { backgroundColor: colors.background }]}>
                <Alert
                    icon={CircleAlert}
                    variant="destructive"
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite">
                    <AlertDescription>
                        {!homes.current?.id
                            ? "Select a home before creating an automation."
                            : !canManage
                              ? "Only home managers and owners can create automations."
                              : "This automation draft is no longer active for the selected home."}
                    </AlertDescription>
                </Alert>
                <Button
                    name="Return to automations"
                    type="auth"
                    loading={false}
                    onPress={() => void returnToList(true)}
                />
            </View>
        );
    }

    return (
        <AutomationForm
            mode="create"
            sessionToken={sessionToken}
            initialValues={initialValues}
            readOnly={false}
            canAddChildren={true}
            pending={pending}
            accepted={accepted}
            actionError={actionError}
            onSubmit={submit}
        />
    );
};

export default Add;

const styles = StyleSheet.create({
    recovery: { flex: 1, gap: 16, justifyContent: "center", padding: 24 },
});
