import React, { FC, useCallback, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { CircleAlert, Info, Plus } from "lucide-react-native";
import Button from "@/components/common/Button";
import ContentSection from "@/components/common/ContentSection";
import Loading from "@/components/common/Loading";
import SectionHeaderAction from "@/components/common/SectionHeaderAction";
import DataSourceList from "@/components/dataSource/DataSourceList";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useTheme } from "@/contexts/ThemeProvider";

interface AcceptedLink {
    homeId: string;
    sourceId: string;
}

interface ActionFeedback {
    message: string;
    error: boolean;
    returnToCurrent?: boolean;
}

interface FallbackNavigationError {
    homeId: string;
    currentHomeId?: string;
    focusId: number;
    message: string;
}

const SelectHomeDataSource: FC = () => {
    const { homeId: rawHomeId } = useLocalSearchParams();
    const homeIdValue = Array.isArray(rawHomeId) ? rawHomeId[0] : rawHomeId;
    const homeId = typeof homeIdValue === "string" ? homeIdValue.trim() : "";
    const router = useRouter();
    const homes = useHomes();
    const httpClient = useHttpClient();
    const { colors } = useTheme().current;
    const home = homes.current;
    const homeRef = useRef(home);
    homeRef.current = home;
    const homeIdRef = useRef(homeId);
    homeIdRef.current = homeId;
    const homesRef = useRef(homes);
    homesRef.current = homes;
    const routerRef = useRef(router);
    routerRef.current = router;
    const active = useRef(true);
    const focusId = useRef(0);
    const submitLock = useRef(false);
    const accepted = useRef<AcceptedLink | undefined>(undefined);
    const [pending, setPending] = useState(false);
    const [selectedSourceId, setSelectedSourceId] = useState<string>();
    const [feedback, setFeedback] = useState<ActionFeedback>();
    const [fallbackNavigationError, setFallbackNavigationError] =
        useState<FallbackNavigationError>();

    const isFocused = (capturedFocus: number) =>
        active.current && focusId.current === capturedFocus;

    const returnToCurrentHome = (capturedFocus: number) => {
        if (!isFocused(capturedFocus)) return;
        try {
            setFeedback(undefined);
            routerRef.current.replace("/home/details");
        } catch {
            if (isFocused(capturedFocus))
                setFeedback({
                    message: "Couldn't return to the current home. Try again.",
                    error: true,
                    returnToCurrent: true,
                });
        }
    };

    const recoverAccepted = async (link: AcceptedLink, capturedFocus: number) => {
        if (!isFocused(capturedFocus)) return;
        setSelectedSourceId(link.sourceId);
        if (homeRef.current?.id !== link.homeId) {
            setFeedback({
                message: "Data source was linked to another home. Return to the current home.",
                error: false,
                returnToCurrent: true,
            });
            return;
        }

        let refreshed = false;
        try {
            refreshed = await homesRef.current.refreshCurrent({
                homeId: link.homeId,
                background: true,
            });
        } catch {
            // Accepted assignment remains complete; recovery only refreshes and returns.
        }
        if (!isFocused(capturedFocus)) return;
        if (homeRef.current?.id !== link.homeId) {
            setFeedback({
                message: "Data source was linked to another home. Return to the current home.",
                error: false,
                returnToCurrent: true,
            });
            return;
        }
        if (!refreshed) {
            setFeedback({
                message: "Data source linked, but the home couldn't refresh. Retry refresh.",
                error: true,
            });
            return;
        }

        try {
            setFeedback(undefined);
            if (routerRef.current.canGoBack()) routerRef.current.back();
            else routerRef.current.replace("/home/details");
        } catch {
            if (isFocused(capturedFocus))
                setFeedback({
                    message: "Data source linked, but couldn't return to Home details. Retry.",
                    error: true,
                });
        }
    };

    const retryAccepted = async () => {
        const link = accepted.current;
        if (!link || submitLock.current) return;
        submitLock.current = true;
        setPending(true);
        try {
            await recoverAccepted(link, focusId.current);
        } finally {
            submitLock.current = false;
            setPending(false);
        }
    };
    const retryRef = useRef(retryAccepted);
    retryRef.current = retryAccepted;

    useFocusEffect(
        useCallback(() => {
            active.current = true;
            focusId.current += 1;
            if (
                accepted.current &&
                !homes.loading &&
                (accepted.current.homeId === homeId || home?.id !== accepted.current.homeId)
            )
                void retryRef.current();
            return () => {
                active.current = false;
                focusId.current += 1;
                setPending(false);
                if (!accepted.current) {
                    setSelectedSourceId(undefined);
                    setFeedback(undefined);
                }
            };
        }, [homeId, home?.id, homes.loading]),
    );

    const onDataSourceSelected = async (sourceId: string) => {
        if (submitLock.current) return;
        if (accepted.current?.homeId === homeId) {
            await retryAccepted();
            return;
        }
        const current = homeRef.current;
        if (
            !homeId ||
            homeIdRef.current !== homeId ||
            current?.id !== homeId ||
            current.isOwner !== true ||
            current.dataSource?.id
        )
            return;

        const capturedFocus = focusId.current;
        submitLock.current = true;
        setPending(true);
        setSelectedSourceId(sourceId);
        setFeedback({
            message: `Linking this data source to ${current.name}…`,
            error: false,
        });
        try {
            const response = await httpClient.put(`v1/homes/${homeId}/datasource`, {
                brokerId: sourceId,
            });
            if (!response.isSuccess) throw new Error("Assignment failed");
            const link = { homeId, sourceId };
            accepted.current = link;
            if (!isFocused(capturedFocus)) return;
            await recoverAccepted(link, capturedFocus);
        } catch {
            if (!accepted.current && isFocused(capturedFocus) && homeRef.current?.id === homeId)
                setFeedback({
                    message: "Couldn't link this data source. Check your connection and try again.",
                    error: true,
                });
        } finally {
            submitLock.current = false;
            setPending(false);
            if (accepted.current && active.current && focusId.current !== capturedFocus)
                void retryRef.current();
        }
    };

    const retry = () => {
        if (accepted.current?.homeId === homeId) void retryAccepted();
        else if (selectedSourceId) void onDataSourceSelected(selectedSourceId);
    };

    const canAssign =
        !!homeId &&
        home?.id === homeId &&
        home.isOwner === true &&
        (!home.dataSource?.id || accepted.current?.homeId === homeId);
    const addDataSource = () => {
        const current = homeRef.current;
        if (
            !homeId ||
            !homeIdRef.current ||
            homeIdRef.current !== homeId ||
            current?.id !== homeIdRef.current ||
            current.isOwner !== true ||
            current.dataSource?.id ||
            accepted.current?.homeId === homeIdRef.current ||
            submitLock.current
        )
            return;
        routerRef.current.push("dataSource/add");
    };

    const issue = !homeId
        ? {
              message: "This home selection is unavailable. Return to the home list.",
              action: "Return to home list",
              path: "/home/list",
          }
        : homes.loading && !home
          ? undefined
          : !home
            ? {
                  message: "Couldn't load this home. Return to the home list.",
                  action: "Return to home list",
                  path: "/home/list",
              }
            : home.id !== homeId
              ? {
                    message:
                        accepted.current?.homeId === homeId
                            ? "Data source was linked to another home. Return to the current home."
                            : "This home is no longer selected. Return to the current home.",
                    action: "Return to current home",
                    path: "/home/details",
                }
              : !home.isOwner && accepted.current?.homeId !== homeId
                ? {
                      message:
                          "Only the home owner can link a data source. Return to Home details.",
                      action: "Return to Home details",
                      path: "/home/details",
                  }
                : home.dataSource?.id && accepted.current?.homeId !== homeId
                  ? {
                        message: "This home already has a data source. Return to Home details.",
                        action: "Return to Home details",
                        path: "/home/details",
                    }
                  : undefined;

    const currentFallbackError =
        fallbackNavigationError?.homeId === homeId &&
        fallbackNavigationError.currentHomeId === home?.id &&
        fallbackNavigationError.focusId === focusId.current
            ? fallbackNavigationError
            : undefined;
    const fallbackFocusId = focusId.current;

    const navigateFromFallback = (
        path: string,
        capturedHomeId: string,
        capturedCurrentHomeId: string | undefined,
        capturedFocus: number,
    ) => {
        if (
            !isFocused(capturedFocus) ||
            homeIdRef.current !== capturedHomeId ||
            homeRef.current?.id !== capturedCurrentHomeId
        )
            return;

        setFallbackNavigationError(undefined);
        try {
            routerRef.current.replace(path);
        } catch {
            if (
                isFocused(capturedFocus) &&
                homeIdRef.current === capturedHomeId &&
                homeRef.current?.id === capturedCurrentHomeId
            )
                setFallbackNavigationError({
                    homeId: capturedHomeId,
                    currentHomeId: capturedCurrentHomeId,
                    focusId: capturedFocus,
                    message:
                        path === "/home/list"
                            ? "Couldn't return to the home list. Try again."
                            : "Couldn't return to the current home. Try again.",
                });
        }
    };

    if (homes.loading && !home && homeId) return <Loading activityColor="textOnBackground" />;
    if (issue) {
        return (
            <View style={styles.fallback}>
                <Alert
                    variant="destructive"
                    icon={CircleAlert}
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite">
                    <AlertDescription>
                        {currentFallbackError?.message ?? issue.message}
                    </AlertDescription>
                </Alert>
                <Button
                    name={currentFallbackError ? "Retry" : issue.action}
                    type="brand-outline"
                    loading={false}
                    onPress={() =>
                        navigateFromFallback(issue.path, homeId, home?.id, fallbackFocusId)
                    }
                />
            </View>
        );
    }

    const actionFeedback = feedback ? (
        <View style={styles.feedback}>
            <Alert
                variant={feedback.error ? "destructive" : undefined}
                icon={feedback.error ? CircleAlert : Info}
                accessibilityRole={feedback.error ? "alert" : "text"}
                accessibilityLiveRegion="polite">
                <AlertDescription>{feedback.message}</AlertDescription>
            </Alert>
            {(feedback.returnToCurrent || feedback.error) && (
                <Button
                    name={feedback.returnToCurrent ? "Return to current home" : "Retry"}
                    type="brand-outline"
                    loading={pending}
                    disabled={pending}
                    onPress={
                        feedback.returnToCurrent
                            ? () => returnToCurrentHome(focusId.current)
                            : retry
                    }
                />
            )}
        </View>
    ) : undefined;

    const header = (
        <ContentSection
            title="Choose a data source"
            helper={`Choose a data source for ${home!.name}.`}
            headerAction={
                <SectionHeaderAction
                    label="Add data source"
                    accessibilityLabel="Add data source"
                    icon={<Plus size={18} color={colors.authForeground} />}
                    disabled={!canAssign || pending || accepted.current?.homeId === homeId}
                    busy={pending}
                    onPress={addDataSource}
                />
            }
        />
    );

    return (
        <DataSourceList
            header={header}
            onListItemSelected={onDataSourceSelected}
            feedback={actionFeedback}
            disabled={!canAssign}
            selectedSourceId={selectedSourceId}
            pending={pending}
        />
    );
};

export default SelectHomeDataSource;

const styles = StyleSheet.create({
    fallback: {
        flex: 1,
        width: "100%",
        maxWidth: 448,
        alignSelf: "center",
        justifyContent: "center",
        gap: 16,
        paddingHorizontal: 24,
        paddingVertical: 24,
    },
    feedback: { gap: 12, paddingTop: 12 },
});
