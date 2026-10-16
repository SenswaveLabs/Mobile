import React, { FC, useCallback, useEffect, useId, useRef, useState } from "react";
import {
    AccessibilityInfo,
    ActivityIndicator,
    Modal as NativeModal,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { PortalHost } from "@rn-primitives/portal";
import { useFocusEffect, useRouter } from "expo-router";
import { CircleAlert } from "lucide-react-native";
import Button from "@/components/common/Button";
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
import Loading from "@/components/common/Loading";
import HomeForm, { HomeFormValues } from "@/components/home/HomeForm";
import HomeSharingList from "@/components/homeSharing/HomeSharingList";
import DataSourceState from "@/components/dataSource/state/DataSourceState";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Text } from "@/components/ui/text";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { DataSourceDto } from "@/types/DataSourcesTypes";

const DetailsPage: FC = () => {
    const router = useRouter();
    const httpClient = useHttpClient();
    const homes = useHomes();
    const home = homes.current;
    const { colors } = useTheme().current;
    const [busy, setBusy] = useState<"save" | "unlink" | "remove" | null>(null);
    const [showRemoveDialog, setShowRemoveDialog] = useState(false);
    const dialogHost = useId();
    const [removeError, setRemoveError] = useState("");
    const [sourceError, setSourceError] = useState("");
    const [sourceActionError, setSourceActionError] = useState("");
    const [sourceLoading, setSourceLoading] = useState(false);
    const [dataSource, setDataSource] = useState<DataSourceDto>();
    const [sourceReload, setSourceReload] = useState(0);
    const [unlinked, setUnlinked] = useState(false);
    const pending = useRef(false);
    const active = useRef(true);
    const sourceId = home?.dataSource?.id;

    useFocusEffect(
        useCallback(() => {
            active.current = true;
            if (!home && !homes.loading && !pending.current) router.replace("/home/list");
            return () => {
                active.current = false;
            };
        }, [home, homes.loading, router]),
    );

    useEffect(() => {
        let current = true;
        setDataSource(undefined);
        setSourceError("");
        setUnlinked(false);
        if (!home?.isOwner || !sourceId) {
            setSourceLoading(false);
            return;
        }
        setSourceLoading(true);
        const load = async () => {
            try {
                const response = await httpClient.get("v1/datasources/brokers/" + sourceId);
                if (!response.isSuccess || !response.response) throw new Error();
                const source = (await response.response.json()) as DataSourceDto;
                if (current) setDataSource(source);
            } catch {
                if (current) setSourceError("Couldn't load the data source. Try again.");
            } finally {
                if (current) setSourceLoading(false);
            }
        };
        void load();
        return () => {
            current = false;
        };
        // The HTTP client changes identity on renders; reload only when the binding changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [home?.id, home?.isOwner, sourceId, sourceReload]);

    const editClicked = async (values: Partial<HomeFormValues>) => {
        if (!home || pending.current || !active.current) throw new Error("Home is unavailable.");
        pending.current = true;
        setBusy("save");
        try {
            const response = await httpClient.patch("v1/homes/" + home.id, values);
            if (!response.isSuccess)
                throw new Error("Couldn't save your home. Check your connection and try again.");
            if (!active.current) return;
            try {
                if (await homes.setCurrent(home.id)) return;
            } catch {
                // The save succeeded; a failed refresh must not be reported as a failed save.
            }
            return "Home saved. Pull down on the dashboard to refresh the details.";
        } finally {
            pending.current = false;
            setBusy(null);
        }
    };

    const unlinkDataSource = async () => {
        if (!home?.isOwner || pending.current || !active.current) return;
        pending.current = true;
        setBusy("unlink");
        setSourceActionError("");
        try {
            const response = await httpClient.delete("/v1/homes/" + home.id + "/datasource");
            if (!response.isSuccess) throw new Error("Couldn't unlink the data source. Try again.");
            if (!active.current) return;
            setUnlinked(true);
            try {
                if (!(await homes.setCurrent(home.id))) throw new Error();
            } catch {
                if (active.current)
                    setSourceActionError(
                        "Data source unlinked. Pull down on the dashboard to refresh the details.",
                    );
            }
        } catch (error) {
            if (active.current)
                setSourceActionError(
                    error instanceof Error ? error.message : "Couldn't unlink the data source.",
                );
        } finally {
            pending.current = false;
            setBusy(null);
        }
    };

    const removeHome = async () => {
        if (!home || pending.current || !active.current) return;
        pending.current = true;
        setBusy("remove");
        setRemoveError("");
        setShowRemoveDialog(false);
        try {
            const path = home.isOwner
                ? "v1/homes/" + home.id
                : "v1/homes/sharings/leave/" + home.id;
            const response = await httpClient.delete(path);
            if (!response.isSuccess)
                throw new Error(
                    home.isOwner
                        ? "Couldn't delete your home. Try again."
                        : "Couldn't leave this home. Try again.",
                );
            let ready = false;
            try {
                ready = await homes.initializeCurrentHome({ silent: true, removedHomeId: home.id });
            } catch {
                // Deletion succeeded; recover without sending the destructive request again.
            }
            if (!active.current) return;
            AccessibilityInfo.announceForAccessibility(
                home.isOwner ? "Home deleted." : "Left home.",
            );
            if (!ready) router.replace("/home/list");
            else if (!home.isOwner && router.canGoBack()) router.back();
            else router.replace("/");
        } catch (error) {
            if (active.current)
                setRemoveError(
                    error instanceof Error
                        ? error.message
                        : "Couldn't complete the action. Try again.",
                );
        } finally {
            pending.current = false;
            setBusy(null);
        }
    };

    if (!home) return <Loading activityColor="textOnBackground" />;

    return (
        <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog} asChild>
            <View style={styles.screen}>
                <NativeModal
                    visible={showRemoveDialog}
                    transparent
                    statusBarTranslucent
                    navigationBarTranslucent
                    accessibilityViewIsModal
                    onRequestClose={() => setShowRemoveDialog(false)}>
                    <PortalHost name={dialogHost} />
                </NativeModal>
                <AlertDialogContent
                    portalHost={dialogHost}
                    accessibilityViewIsModal
                    className="max-w-md"
                    style={styles.dialogContent}>
                    <ScrollView style={styles.dialogBody}>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                {home.isOwner ? "Delete home" : "Leave home"}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                {home.isOwner
                                    ? "All rooms, devices, automations, and settings in this home will be permanently deleted. This action cannot be undone."
                                    : "You will lose access to this home's devices and automations. The owner can re-invite you later."}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                    </ScrollView>
                    <AlertDialogFooter className="sm:flex-col-reverse">
                        <AlertDialogCancel asChild>
                            <Button
                                name="Cancel"
                                type="brand-outline"
                                loading={false}
                                disabled={!!busy}
                                onPress={() => setShowRemoveDialog(false)}
                            />
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <Button
                                name={home.isOwner ? "Delete" : "Leave"}
                                type={home.isOwner ? "brand-destructive" : "auth"}
                                loading={false}
                                disabled={!!busy}
                                onPress={() => void removeHome()}
                            />
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                <HomeForm
                    key={home.id}
                    edit
                    onSubmit={editClicked}
                    disabled={!!busy}
                    initIcon={home.icon}
                    initName={home.name}
                    initLatitude={home.location?.latitude}
                    initLongitude={home.location?.longitude}>
                    {home.isOwner && (
                        <>
                            <View style={[styles.section, { borderColor: colors.authBorder }]}>
                                <View style={styles.sectionIntro}>
                                    <Text
                                        accessibilityRole="header"
                                        style={[styles.heading, { color: colors.authForeground }]}>
                                        Data source
                                    </Text>
                                    <Text style={[styles.description, { color: colors.authMuted }]}>
                                        Connect an MQTT broker to receive data from your devices.
                                    </Text>
                                </View>
                                {!!sourceId && !unlinked ? (
                                    <>
                                        <View
                                            style={[
                                                styles.source,
                                                {
                                                    borderColor: colors.authBorder,
                                                    backgroundColor: colors.authFieldBackground,
                                                },
                                            ]}>
                                            <View style={styles.sourceHeader}>
                                                <Text
                                                    style={[
                                                        styles.sourceName,
                                                        { color: colors.authForeground },
                                                    ]}>
                                                    {dataSource?.name || home.dataSource.name}
                                                </Text>
                                                <DataSourceState
                                                    connectionStatus={home.dataSource.state}
                                                />
                                            </View>
                                            {!!dataSource?.url && (
                                                <Text
                                                    style={[
                                                        styles.description,
                                                        { color: colors.authMuted },
                                                    ]}>
                                                    {dataSource.url}
                                                </Text>
                                            )}
                                            {sourceLoading && (
                                                <View
                                                    accessible
                                                    accessibilityRole="progressbar"
                                                    accessibilityLabel="Loading data source"
                                                    accessibilityState={{ busy: true }}
                                                    style={styles.sourceLoading}>
                                                    <ActivityIndicator
                                                        accessible={false}
                                                        color={colors.authMuted}
                                                    />
                                                    <Text
                                                        style={[
                                                            styles.description,
                                                            styles.loadingText,
                                                            { color: colors.authMuted },
                                                        ]}>
                                                        Loading data source…
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        {!!sourceError && (
                                            <>
                                                <Alert
                                                    icon={CircleAlert}
                                                    variant="destructive"
                                                    accessibilityRole="alert"
                                                    accessibilityLiveRegion="polite">
                                                    <AlertDescription>
                                                        {sourceError}
                                                    </AlertDescription>
                                                </Alert>
                                                <Button
                                                    name="Retry loading"
                                                    type="brand-outline"
                                                    loading={sourceLoading}
                                                    disabled={!!busy}
                                                    onPress={() =>
                                                        setSourceReload((value) => value + 1)
                                                    }
                                                />
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <Text style={[styles.description, { color: colors.authMuted }]}>
                                        No data source assigned.
                                    </Text>
                                )}
                                {!!sourceActionError && (
                                    <Alert
                                        icon={CircleAlert}
                                        variant="destructive"
                                        accessibilityRole="alert"
                                        accessibilityLiveRegion="polite">
                                        <AlertDescription>{sourceActionError}</AlertDescription>
                                    </Alert>
                                )}
                                {!!sourceId && !unlinked ? (
                                    <View style={styles.sourceActions}>
                                        <Button
                                            name="Open data source"
                                            type="brand-outline"
                                            style={styles.sourceAction}
                                            loading={false}
                                            disabled={!!busy}
                                            onPress={() =>
                                                router.push({
                                                    pathname: "dataSource/details",
                                                    params: { id: sourceId },
                                                })
                                            }
                                        />
                                        <Button
                                            name="Unlink data source"
                                            type="brand-destructive"
                                            style={styles.sourceAction}
                                            loading={busy === "unlink"}
                                            disabled={!!busy}
                                            onPress={unlinkDataSource}
                                        />
                                    </View>
                                ) : (
                                    <Button
                                        name="Assign data source"
                                        type="brand-outline"
                                        loading={false}
                                        disabled={!!busy}
                                        onPress={() =>
                                            router.push({ pathname: "home/dataSource/select" })
                                        }
                                    />
                                )}
                            </View>
                            <View style={[styles.section, { borderColor: colors.authBorder }]}>
                                <View style={styles.sectionIntro}>
                                    <Text
                                        accessibilityRole="header"
                                        style={[styles.heading, { color: colors.authForeground }]}>
                                        Sharing
                                    </Text>
                                    <Text style={[styles.description, { color: colors.authMuted }]}>
                                        Invite someone and manage their access to this home.
                                    </Text>
                                </View>
                                <HomeSharingList disabled={!!busy} />
                            </View>
                        </>
                    )}
                    <View style={[styles.section, { borderColor: colors.authBorder }]}>
                        <View style={styles.sectionIntro}>
                            <Text
                                accessibilityRole="header"
                                style={[styles.heading, { color: colors.authForeground }]}>
                                {home.isOwner ? "Delete home" : "Leave home"}
                            </Text>
                            <Text style={[styles.description, { color: colors.authMuted }]}>
                                {home.isOwner
                                    ? "Permanently remove this home and everything in it."
                                    : "Remove your access to this home's devices and automations."}
                            </Text>
                        </View>
                        {!!removeError && (
                            <Alert
                                icon={CircleAlert}
                                variant="destructive"
                                accessibilityRole="alert"
                                accessibilityLiveRegion="polite">
                                <AlertDescription>{removeError}</AlertDescription>
                            </Alert>
                        )}
                        <AlertDialogTrigger asChild disabled={!!busy}>
                            <Button
                                name={home.isOwner ? "Delete home" : "Leave home"}
                                type="brand-destructive"
                                style={styles.removeAction}
                                loading={busy === "remove"}
                                disabled={!!busy}
                                onPress={() => {
                                    setRemoveError("");
                                    setShowRemoveDialog(true);
                                }}
                            />
                        </AlertDialogTrigger>
                    </View>
                </HomeForm>
            </View>
        </AlertDialog>
    );
};

export default DetailsPage;

const styles = StyleSheet.create({
    screen: { flex: 1 },
    dialogContent: { maxHeight: "90%" },
    dialogBody: { flexShrink: 1 },
    section: { borderTopWidth: 1, paddingTop: 24, gap: 16 },
    sectionIntro: { gap: 4 },
    heading: { fontSize: 20, lineHeight: 28, fontWeight: "600" },
    description: { fontSize: 14, lineHeight: 20 },
    source: { borderWidth: 1, borderRadius: 8, padding: 16, gap: 12 },
    sourceHeader: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
    sourceName: { fontSize: 16, lineHeight: 24, fontWeight: "600", flexShrink: 1, flexGrow: 1 },
    sourceLoading: { flexDirection: "row", alignItems: "center", gap: 12 },
    loadingText: { flex: 1 },
    sourceActions: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    sourceAction: { flexGrow: 1, flexBasis: 160, width: "auto" },
    removeAction: { width: "auto", maxWidth: "100%", alignSelf: "flex-start" },
});
