import AutomationForm from "@/components/automations/AutomationForm";
import Button from "@/components/common/Button";
import ContentSection from "@/components/common/ContentSection";
import Loading from "@/components/common/Loading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useAutomationList } from "@/contexts/custom/AutomationListProvider";
import { useAutomation } from "@/contexts/custom/AutomationProvider";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import {
    AutomationDto,
    AutomationFormValues,
    PatchAutomationRequest,
} from "@/types/AutomationsTypes";
import { CircleAlert } from "lucide-react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { FC, useCallback, useEffect, useId, useRef, useState } from "react";
import { Modal as NativeModal, ScrollView, StyleSheet, View } from "react-native";
import { PortalHost } from "@rn-primitives/portal";

const automationUrl = "v1/automations/";

interface DetailVisit {
    id: string;
    homeId: string;
    token: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const isCondition = (value: unknown): boolean => {
    if (
        !isRecord(value) ||
        typeof value.operationId !== "string" ||
        typeof value.operationName !== "string"
    )
        return false;
    const configuration = value.conditionConfiguration;
    if (value.conditionType === "InvalidCondition")
        return configuration === undefined || isRecord(configuration);
    if (!isRecord(configuration)) return false;
    if (value.conditionType === "BooleanCondition") return typeof configuration.isOn === "boolean";
    if (value.conditionType === "NumberCondition")
        return (
            (typeof configuration.minValue === "number" &&
                Number.isFinite(configuration.minValue)) ||
            (typeof configuration.maxValue === "number" && Number.isFinite(configuration.maxValue))
        );
    if (value.conditionType === "TextCondition")
        return typeof configuration.requiredValue === "string";
    return false;
};

const isResult = (value: unknown): boolean =>
    isRecord(value) &&
    typeof value.operationId === "string" &&
    typeof value.operationName === "string" &&
    (typeof value.valueToSend === "string" ||
        typeof value.valueToSend === "number" ||
        typeof value.valueToSend === "boolean" ||
        value.valueToSend === null);

const isAutomation = (value: unknown, id: string, homeId: string): value is AutomationDto =>
    isRecord(value) &&
    value.id === id &&
    value.homeId === homeId &&
    typeof value.name === "string" &&
    typeof value.icon === "string" &&
    (value.conditionConnector === "And" || value.conditionConnector === "Or") &&
    typeof value.isEnabled === "boolean" &&
    (value.conditions === undefined ||
        (Array.isArray(value.conditions) && value.conditions.every(isCondition))) &&
    (value.results === undefined ||
        (Array.isArray(value.results) && value.results.every(isResult)));

const Details: FC = () => {
    const params = useLocalSearchParams<{ automationId?: string | string[] }>();
    const rawId = Array.isArray(params.automationId) ? params.automationId[0] : params.automationId;
    const automationId = typeof rawId === "string" && rawId.trim() ? rawId.trim() : undefined;
    const homes = useHomes();
    const httpClient = useHttpClient();
    const automations = useAutomationList();
    const automation = useAutomation();
    const router = useRouter();
    const { colors } = useTheme().current;
    const homesRef = useRef(homes);
    const automationRef = useRef(automation);
    const automationsRef = useRef(automations);
    const httpRef = useRef(httpClient);
    homesRef.current = homes;
    automationRef.current = automation;
    automationsRef.current = automations;
    httpRef.current = httpClient;
    const homeIdRef = useRef<string | undefined>(homes.current?.id);
    const routeIdRef = useRef(automationId);
    const invalidHome = useRef(false);
    if (homeIdRef.current && homes.current?.id !== homeIdRef.current) invalidHome.current = true;
    routeIdRef.current = automationId;

    const [details, setDetails] = useState<AutomationDto>();
    const [initialValues, setInitialValues] = useState<AutomationFormValues>();
    const [sessionToken, setSessionToken] = useState("");
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [actionError, setActionError] = useState("");
    const [deleteError, setDeleteError] = useState("");
    const [pending, setPending] = useState(false);
    const [accepted, setAccepted] = useState(false);
    const [deleteVisit, setDeleteVisit] = useState<DetailVisit>();
    const dialogHost = useId();
    const savedRef = useRef<AutomationFormValues | undefined>(undefined);
    const tokenRef = useRef("");
    const detailsRef = useRef<AutomationDto | undefined>(undefined);
    const requestVersion = useRef(0);
    const writeLock = useRef(false);
    const pendingRef = useRef(false);
    const activeWrite = useRef<DetailVisit | undefined>(undefined);
    const deletionAccepted = useRef<DetailVisit | undefined>(undefined);
    const focused = useRef(false);
    const focusVersion = useRef(0);
    const returning = useRef<DetailVisit | undefined>(undefined);
    const isOwner = homes.current?.isOwner === true;
    const canManage = isOwner || homes.current?.canManage === true;

    const currentVisit = useCallback((id: string, homeId: string, token?: string) => {
        if (homeIdRef.current && homesRef.current.current?.id !== homeIdRef.current)
            invalidHome.current = true;
        return (
            !invalidHome.current &&
            routeIdRef.current === id &&
            homesRef.current.current?.id === homeId &&
            homeIdRef.current === homeId &&
            (!token ||
                (tokenRef.current === token &&
                    automationRef.current.session?.token === token &&
                    automationRef.current.isCurrentSession(token)))
        );
    }, []);

    const clearOwnSession = useCallback(() => {
        const token = tokenRef.current;
        if (token) automationRef.current.clearSession(token);
        tokenRef.current = "";
    }, []);

    const releaseWrite = (visit: DetailVisit) => {
        if (activeWrite.current !== visit) return;
        activeWrite.current = undefined;
        writeLock.current = false;
        pendingRef.current = false;
        setPending(false);
    };

    const load = useCallback(async () => {
        setDeleteVisit(undefined);
        activeWrite.current = undefined;
        writeLock.current = false;
        pendingRef.current = false;
        deletionAccepted.current = undefined;
        returning.current = undefined;
        setPending(false);
        setAccepted(false);
        setDeleteError("");
        if (!automationId) {
            clearOwnSession();
            setLoadError("This automation link is missing a valid automation ID.");
            return;
        }
        const homeId = homeIdRef.current ?? homesRef.current.current?.id;
        if (!homeId) {
            clearOwnSession();
            setLoadError("Select a home to view this automation.");
            return;
        }
        if (!homeIdRef.current) homeIdRef.current = homeId;
        if (homesRef.current.current?.id !== homeId || invalidHome.current) {
            clearOwnSession();
            invalidHome.current = true;
            setLoadError("This automation belongs to a different selected home.");
            return;
        }

        const version = ++requestVersion.current;
        const sessionBeforeLoad = automationRef.current.session;
        const ownTokenBeforeLoad = tokenRef.current;
        clearOwnSession();
        const expectedSessionToken =
            sessionBeforeLoad?.token === ownTokenBeforeLoad && ownTokenBeforeLoad
                ? undefined
                : sessionBeforeLoad?.token;
        const focusVersionAtStart = focusVersion.current;
        const sessionUnchangedSinceLoad = () => {
            const currentToken = automationRef.current.session?.token;
            return (
                currentToken === expectedSessionToken ||
                (!!ownTokenBeforeLoad && currentToken === ownTokenBeforeLoad)
            );
        };
        const isCurrentRead = () =>
            focused.current &&
            focusVersion.current === focusVersionAtStart &&
            currentVisit(automationId, homeId) &&
            version === requestVersion.current &&
            sessionUnchangedSinceLoad();
        setDetails(undefined);
        detailsRef.current = undefined;
        savedRef.current = undefined;
        setInitialValues(undefined);
        setSessionToken("");
        setActionError("");
        setLoadError("");
        setLoading(true);
        try {
            const response = await httpRef.current.get(`${automationUrl}${automationId}`);
            if (!isCurrentRead()) return;
            if (!response.isSuccess) throw new Error("read failed");
            const content: unknown = await response.response?.json();
            if (!isCurrentRead()) return;
            if (!isAutomation(content, automationId, homeId)) throw new Error("invalid automation");
            const token = automationRef.current.beginSession(homeId, content);
            if (!token) throw new Error("session unavailable");
            const values: AutomationFormValues = {
                name: content.name,
                icon: content.icon,
                conditionConnector: content.conditionConnector,
                isEnabled: content.isEnabled,
            };
            tokenRef.current = token;
            detailsRef.current = content;
            savedRef.current = values;
            setDetails(content);
            setInitialValues(values);
            setSessionToken(token);
        } catch {
            if (isCurrentRead()) setLoadError("Couldn't load this automation. Try again.");
        } finally {
            if (currentVisit(automationId, homeId) && version === requestVersion.current)
                setLoading(false);
        }
    }, [automationId, clearOwnSession, currentVisit]);

    useEffect(() => {
        void load();
        return () => {
            // eslint-disable-next-line react-hooks/exhaustive-deps -- Advance the live request counter to invalidate any read started by this visit.
            requestVersion.current++;
        };
    }, [load, clearOwnSession]);

    useEffect(
        () => () => {
            clearOwnSession();
        },
        [clearOwnSession],
    );

    const returnAfterDelete = useCallback(
        async (visit: DetailVisit) => {
            if (
                !focused.current ||
                returning.current === visit ||
                deletionAccepted.current !== visit ||
                !currentVisit(visit.id, visit.homeId, visit.token)
            )
                return;
            returning.current = visit;
            try {
                if (router.canGoBack()) await router.back();
                else await router.replace("/automation/list");
                setActionError("");
            } catch {
                if (returning.current === visit) returning.current = undefined;
                if (
                    deletionAccepted.current === visit &&
                    currentVisit(visit.id, visit.homeId, visit.token)
                )
                    setActionError("Automation deleted. Return to automations to continue.");
            }
        },
        [currentVisit, router],
    );

    useFocusEffect(
        useCallback(() => {
            focused.current = true;
            if (deletionAccepted.current) void returnAfterDelete(deletionAccepted.current);
            return () => {
                focused.current = false;
                focusVersion.current++;
                setDeleteVisit(undefined);
            };
        }, [returnAfterDelete]),
    );

    useEffect(() => {
        if (!isOwner) setDeleteVisit(undefined);
    }, [isOwner]);

    const save = async (values: AutomationFormValues) => {
        const current = detailsRef.current;
        const homeId = homeIdRef.current;
        const token = tokenRef.current;
        const baseline = savedRef.current;
        const acceptedVisit = deletionAccepted.current;
        if (
            acceptedVisit &&
            current?.id === acceptedVisit.id &&
            homeId === acceptedVisit.homeId &&
            token === acceptedVisit.token
        ) {
            await returnAfterDelete(acceptedVisit);
            return;
        }
        if (
            writeLock.current ||
            pendingRef.current ||
            !focused.current ||
            !current ||
            !homeId ||
            !token ||
            !baseline ||
            (homesRef.current.current?.isOwner !== true &&
                homesRef.current.current?.canManage !== true) ||
            !currentVisit(current.id, homeId, token)
        )
            return;

        const metadata: PatchAutomationRequest = {};
        if (values.name.trim() !== baseline.name) metadata.name = values.name.trim();
        if (values.icon !== baseline.icon) metadata.icon = values.icon;
        if (values.conditionConnector !== baseline.conditionConnector)
            metadata.conditionConnector = values.conditionConnector;
        const stateChanged = values.isEnabled !== baseline.isEnabled;
        if (!stateChanged && Object.keys(metadata).length === 0) return;

        const visit = { id: current.id, homeId, token };
        activeWrite.current = visit;
        writeLock.current = true;
        pendingRef.current = true;
        setPending(true);
        setActionError("");
        let stateAccepted = false;
        let acceptedValues = baseline;
        let acceptedDetails = current;
        const sameVisit = () => currentVisit(current.id, homeId, token);
        const canContinueWrite = () =>
            focused.current &&
            homesRef.current.current?.id === homeId &&
            (homesRef.current.current?.isOwner === true ||
                homesRef.current.current?.canManage === true) &&
            sameVisit();
        const publishAcceptedBaseline = (
            nextValues: AutomationFormValues,
            nextDetails: AutomationDto,
        ) => {
            savedRef.current = nextValues;
            detailsRef.current = nextDetails;
            setInitialValues(nextValues);
            setDetails(nextDetails);
        };
        try {
            if (stateChanged) {
                const response = await httpRef.current.put(`${automationUrl}${current.id}/state`, {
                    isEnabled: values.isEnabled,
                });
                if (!response.isSuccess) {
                    if (currentVisit(current.id, homeId, token))
                        setActionError("Couldn't update automation state. Try again.");
                    return;
                }
                stateAccepted = true;
                acceptedValues = { ...baseline, isEnabled: values.isEnabled };
                acceptedDetails = { ...current, isEnabled: values.isEnabled };
                if (sameVisit()) publishAcceptedBaseline(acceptedValues, acceptedDetails);
            }

            if (Object.keys(metadata).length > 0) {
                if (!canContinueWrite()) return;
                const response = await httpRef.current.patch(
                    `${automationUrl}${current.id}`,
                    metadata,
                );
                if (!response.isSuccess) {
                    if (currentVisit(current.id, homeId, token))
                        setActionError(
                            stateAccepted
                                ? "State saved, but other changes were not. Try again."
                                : "Couldn't save automation changes. Try again.",
                        );
                    return;
                }
                acceptedValues = { ...acceptedValues, ...metadata };
                acceptedDetails = { ...acceptedDetails, ...metadata };
                if (sameVisit()) publishAcceptedBaseline(acceptedValues, acceptedDetails);
            }
        } catch {
            if (sameVisit())
                setActionError(
                    stateAccepted
                        ? "State saved, but other changes were not. Try again."
                        : "Couldn't save automation changes. Try again.",
                );
            return;
        } finally {
            releaseWrite(visit);
        }

        if (!sameVisit()) return;
        try {
            await automationsRef.current.refresh(homeId);
        } catch {
            // The accepted endpoints are final; refresh cannot make them safe to repeat.
        }
    };

    const deleteAutomation = async (visit: DetailVisit) => {
        const current = detailsRef.current;
        const homeId = homeIdRef.current;
        const token = tokenRef.current;
        const acceptedVisit = deletionAccepted.current;
        if (
            acceptedVisit &&
            acceptedVisit === visit &&
            current?.id === acceptedVisit.id &&
            homeId === acceptedVisit.homeId &&
            token === acceptedVisit.token
        ) {
            await returnAfterDelete(acceptedVisit);
            return;
        }
        if (
            writeLock.current ||
            pendingRef.current ||
            !focused.current ||
            homesRef.current.current?.isOwner !== true ||
            !current ||
            current.id !== visit.id ||
            homeId !== visit.homeId ||
            token !== visit.token ||
            !currentVisit(visit.id, visit.homeId, visit.token)
        )
            return;

        activeWrite.current = visit;
        writeLock.current = true;
        pendingRef.current = true;
        setPending(true);
        setDeleteError("");
        try {
            const response = await httpRef.current.delete(`${automationUrl}${current.id}`);
            if (!response.isSuccess) {
                if (currentVisit(current.id, homeId, token))
                    setDeleteError("Couldn't delete this automation. Try again.");
                return;
            }
            if (currentVisit(visit.id, visit.homeId, visit.token)) {
                deletionAccepted.current = visit;
                setAccepted(true);
            }
            try {
                await automationsRef.current.refresh(homeId);
            } catch {
                // Deletion was accepted; return recovery must never repeat it.
            }
        } catch {
            if (currentVisit(current.id, homeId, token))
                setDeleteError("Couldn't delete this automation. Try again.");
        } finally {
            releaseWrite(visit);
        }
        if (deletionAccepted.current === visit) await returnAfterDelete(visit);
    };

    const openDeleteConfirmation = () => {
        const current = detailsRef.current;
        const homeId = homeIdRef.current;
        const token = tokenRef.current;
        if (
            !focused.current ||
            homesRef.current.current?.isOwner !== true ||
            !current ||
            !homeId ||
            !token ||
            !currentVisit(current.id, homeId, token)
        )
            return;
        setDeleteVisit({ id: current.id, homeId, token });
    };

    const deleteDialogOpen =
        !!deleteVisit &&
        focused.current &&
        isOwner &&
        currentVisit(deleteVisit.id, deleteVisit.homeId, deleteVisit.token);

    const ownerFooter =
        isOwner && !accepted ? (
            <ContentSection
                title="Delete automation"
                helper="Delete this automation and all its conditions and results."
                separated
                actions={
                    <>
                        {!!deleteError && (
                            <Alert
                                icon={CircleAlert}
                                variant="destructive"
                                accessibilityRole="alert"
                                accessibilityLiveRegion="polite">
                                <AlertDescription>{deleteError}</AlertDescription>
                            </Alert>
                        )}
                        <View style={styles.actionSlot}>
                            <AlertDialogTrigger asChild disabled={pending}>
                                <Button
                                    name="Delete automation"
                                    type="brand-destructive"
                                    loading={false}
                                    disabled={pending}
                                    onPress={openDeleteConfirmation}
                                />
                            </AlertDialogTrigger>
                        </View>
                    </>
                }
            />
        ) : undefined;

    const currentHomeId = homeIdRef.current;
    const validDetails =
        !!details &&
        !!initialValues &&
        !!sessionToken &&
        !!currentHomeId &&
        !!automationId &&
        currentVisit(automationId, currentHomeId, sessionToken);

    if (
        loading &&
        automationId &&
        currentHomeId &&
        !invalidHome.current &&
        currentVisit(automationId, currentHomeId)
    )
        return <Loading />;
    if (!validDetails) {
        const message = invalidHome.current
            ? "This automation belongs to a different selected home. Return to automations and choose it from that home's list."
            : loadError || "Automation details are unavailable.";
        return (
            <View style={[styles.recovery, { backgroundColor: colors.background }]}>
                <Alert
                    icon={CircleAlert}
                    variant="destructive"
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite">
                    <AlertDescription>{message}</AlertDescription>
                </Alert>
                {automationId && !invalidHome.current && (
                    <Button name="Retry" type="auth" loading={false} onPress={() => void load()} />
                )}
                <Button
                    name="Return to automations"
                    type="auth"
                    loading={false}
                    onPress={() => {
                        if (router.canGoBack()) router.back();
                        else router.replace("/automation/list");
                    }}
                />
            </View>
        );
    }

    return (
        <AlertDialog
            open={deleteDialogOpen}
            onOpenChange={(open) => {
                if (open) openDeleteConfirmation();
                else setDeleteVisit(undefined);
            }}
            asChild>
            <View style={styles.screen}>
                <NativeModal
                    visible={deleteDialogOpen}
                    transparent
                    statusBarTranslucent
                    navigationBarTranslucent
                    accessibilityViewIsModal
                    onRequestClose={() => setDeleteVisit(undefined)}>
                    <PortalHost name={dialogHost} />
                </NativeModal>
                <AlertDialogContent
                    portalHost={dialogHost}
                    accessibilityViewIsModal
                    className="max-w-md"
                    style={styles.dialogContent}>
                    <ScrollView style={styles.dialogBody}>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete this automation?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This also deletes all conditions and results. This action cannot be
                                undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                    </ScrollView>
                    <AlertDialogFooter className="flex-col">
                        <AlertDialogCancel asChild>
                            <Button
                                name="Cancel"
                                type="brand-outline"
                                loading={false}
                                disabled={pending}
                                onPress={() => setDeleteVisit(undefined)}
                            />
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <Button
                                name="Delete automation"
                                type="brand-destructive"
                                loading={pending}
                                disabled={pending}
                                onPress={() => {
                                    if (!deleteVisit) return;
                                    setDeleteVisit(undefined);
                                    return deleteAutomation(deleteVisit);
                                }}
                            />
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                <AutomationForm
                    key={sessionToken}
                    mode="details"
                    sessionToken={sessionToken}
                    initialValues={initialValues}
                    readOnly={!canManage}
                    canAddChildren={isOwner}
                    pending={pending}
                    accepted={accepted}
                    actionError={actionError}
                    footer={ownerFooter}
                    onSubmit={save}
                />
            </View>
        </AlertDialog>
    );
};

export default Details;

const styles = StyleSheet.create({
    recovery: { flex: 1, gap: 16, justifyContent: "center", padding: 24 },
    screen: { flex: 1 },
    actionSlot: { minHeight: 72, justifyContent: "center" },
    dialogContent: { maxHeight: "90%" },
    dialogBody: { flexShrink: 1 },
});
