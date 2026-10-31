import AutomationConditionForm from "@/components/automations/conditions/AutomationConditionForm";
import Button from "@/components/common/Button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Text } from "@/components/ui/text";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useAutomation } from "@/contexts/custom/AutomationProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { AutomationConditionDraft, AutomationConditionInput } from "@/types/AutomationsTypes";
import { CircleAlert } from "lucide-react-native";
import React, { FC, useCallback, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

const automationConditionUrl = "v1/automations/conditions";

const AddAutomationCondition: FC = () => {
    const params = useLocalSearchParams<{
        sessionToken?: string | string[];
        automationId?: string | string[];
    }>();
    const rawToken = Array.isArray(params.sessionToken)
        ? params.sessionToken[0]
        : params.sessionToken;
    const rawAutomationId = Array.isArray(params.automationId)
        ? params.automationId[0]
        : params.automationId;
    const automationIdProvided = params.automationId !== undefined;
    const sessionToken =
        typeof rawToken === "string" && rawToken.trim() ? rawToken.trim() : undefined;
    const automationId =
        typeof rawAutomationId === "string" && rawAutomationId.trim()
            ? rawAutomationId.trim()
            : undefined;
    const paramsValid = !!sessionToken && (!automationIdProvided || !!automationId);
    const { colors } = useTheme().current;
    const homes = useHomes();
    const automation = useAutomation();
    const httpClient = useHttpClient();
    const router = useRouter();
    const homeId = homes.current?.id;
    const identity = JSON.stringify([sessionToken, automationIdProvided, automationId, homeId]);
    const routeRef = useRef({ identity, sessionToken, automationIdProvided, automationId, homeId });
    routeRef.current = { identity, sessionToken, automationIdProvided, automationId, homeId };
    const homesRef = useRef(homes);
    homesRef.current = homes;
    const automationRef = useRef(automation);
    automationRef.current = automation;
    const httpRef = useRef(httpClient);
    httpRef.current = httpClient;
    const [pending, setPending] = useState(false);
    const [accepted, setAccepted] = useState(false);
    const [actionError, setActionError] = useState("");
    const errorIdentity = useRef(identity);
    const pendingIdentity = useRef("");
    const acceptedIdentity = useRef("");
    const appendIdentity = useRef("");
    const focused = useRef("");
    const lock = useRef("");
    const returning = useRef("");

    const isCurrentVisit = useCallback(() => {
        const current = routeRef.current;
        const session = automationRef.current.session;
        return !!(
            paramsValid &&
            sessionToken &&
            homeId &&
            current.identity === identity &&
            current.sessionToken === sessionToken &&
            current.homeId === homeId &&
            homesRef.current.current?.id === homeId &&
            session?.token === sessionToken &&
            session.homeId === homeId &&
            (automationIdProvided
                ? session.automationId === automationId
                : session.automationId === undefined) &&
            automationRef.current.isCurrentSession(sessionToken)
        );
    }, [automationId, automationIdProvided, homeId, identity, paramsValid, sessionToken]);
    const canSubmit = useCallback(() => {
        const currentHome = homesRef.current.current;
        return !!(
            focused.current === identity &&
            isCurrentVisit() &&
            (automationIdProvided
                ? currentHome?.isOwner === true
                : currentHome?.isOwner === true || currentHome?.canManage === true)
        );
    }, [automationIdProvided, identity, isCurrentVisit]);
    const setVisitError = useCallback(
        (value: string) => {
            errorIdentity.current = identity;
            setActionError(value);
        },
        [identity],
    );
    const fallbackRoute = useCallback(
        () =>
            automationIdProvided
                ? { pathname: "/automation/details", params: { automationId } }
                : "/automation/list",
        [automationId, automationIdProvided],
    );

    const returnToParent = useCallback(async () => {
        if (focused.current !== identity || returning.current === identity || !isCurrentVisit())
            return;
        returning.current = identity;
        try {
            if (router.canGoBack()) await router.back();
            else await router.replace(fallbackRoute());
            if (errorIdentity.current === identity) setVisitError("");
        } catch {
            if (returning.current === identity) returning.current = "";
            if (focused.current !== identity || !isCurrentVisit()) return;
            try {
                await router.replace(fallbackRoute());
                returning.current = identity;
                if (errorIdentity.current === identity) setVisitError("");
            } catch {
                if (returning.current === identity) returning.current = "";
                setVisitError(
                    acceptedIdentity.current === identity
                        ? "Condition added. Couldn't return to automation. Try again."
                        : "Couldn't return to automation. Try again.",
                );
            }
        }
    }, [fallbackRoute, identity, isCurrentVisit, router, setVisitError]);

    useFocusEffect(
        useCallback(() => {
            focused.current = identity;
            if (acceptedIdentity.current === identity) void returnToParent();
            return () => {
                if (focused.current === identity) focused.current = "";
                if (returning.current === identity) returning.current = "";
            };
        }, [identity, returnToParent]),
    );

    const submit = async (value: AutomationConditionDraft) => {
        if (acceptedIdentity.current === identity) {
            await returnToParent();
            return;
        }
        if (lock.current === identity || !canSubmit()) return;
        lock.current = identity;
        setPending(true);
        pendingIdentity.current = identity;
        setVisitError("");
        try {
            if (!canSubmit()) return;
            if (!automationIdProvided) {
                if (!automationRef.current.appendCondition(sessionToken!, value)) {
                    setVisitError("This automation draft is no longer available.");
                    return;
                }
                acceptedIdentity.current = identity;
                setAccepted(true);
                await returnToParent();
                return;
            }

            let body: AutomationConditionInput;
            switch (value.conditionType) {
                case "BooleanCondition":
                    body = {
                        operationId: value.operationId,
                        conditionType: value.conditionType,
                        conditionConfiguration: value.conditionConfiguration,
                    };
                    break;
                case "NumberCondition":
                    body = {
                        operationId: value.operationId,
                        conditionType: value.conditionType,
                        conditionConfiguration: value.conditionConfiguration,
                    };
                    break;
                case "TextCondition":
                    body = {
                        operationId: value.operationId,
                        conditionType: value.conditionType,
                        conditionConfiguration: value.conditionConfiguration,
                    };
                    break;
            }
            const response = await httpRef.current.put(
                `${automationConditionUrl}/${automationId}`,
                body,
            );
            if (!response.isSuccess) {
                if (focused.current === identity && isCurrentVisit())
                    setVisitError("Couldn't add this condition. Try again.");
                return;
            }
            if (!isCurrentVisit()) return;
            acceptedIdentity.current = identity;
            setAccepted(true);
            if (appendIdentity.current !== identity) {
                appendIdentity.current = identity;
                automationRef.current.appendCondition(sessionToken!, value);
            }
            await returnToParent();
        } catch {
            if (focused.current === identity && isCurrentVisit())
                setVisitError("Couldn't add this condition. Try again.");
        } finally {
            if (lock.current === identity) lock.current = "";
            if (pendingIdentity.current === identity) {
                pendingIdentity.current = "";
                setPending(false);
            }
        }
    };

    const recover = async () => {
        if (focused.current !== identity || routeRef.current.identity !== identity) return;
        try {
            await router.replace("/automation/list");
        } catch {
            if (routeRef.current.identity === identity)
                setVisitError("Couldn't return to automations. Try again.");
        }
    };

    const currentSession = isCurrentVisit();
    const canEdit =
        currentSession &&
        (automationIdProvided
            ? homes.current?.isOwner === true
            : homes.current?.isOwner === true || homes.current?.canManage === true);
    const acceptedForVisit = accepted && acceptedIdentity.current === identity;
    const routePending = pending && pendingIdentity.current === identity;
    const routeError = errorIdentity.current === identity ? actionError : "";
    return canEdit ? (
        <AutomationConditionForm
            key={identity}
            pending={routePending}
            accepted={acceptedForVisit}
            actionError={routeError}
            onSubmit={submit}
        />
    ) : (
        <View style={[styles.recovery, { backgroundColor: colors.background }]}>
            <Text style={{ color: colors.authForeground }}>
                This automation link is unavailable. Return to automations and open a valid
                automation.
            </Text>
            {!!routeError && (
                <Alert icon={CircleAlert} variant="destructive" accessibilityRole="alert">
                    <AlertDescription>{routeError}</AlertDescription>
                </Alert>
            )}
            <Button name="Return to automations" type="auth" loading={false} onPress={recover} />
        </View>
    );
};

export default AddAutomationCondition;

const styles = StyleSheet.create({
    recovery: {
        flex: 1,
        justifyContent: "center",
        gap: 16,
        paddingHorizontal: 24,
    },
});
