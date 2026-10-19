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
import ContentSection from "@/components/common/ContentSection";
import ListRow from "@/components/common/ListRow";
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
    const canManage = home?.isOwner === true || home?.canManage === true;
    const { colors } = useTheme().current;
    const [busy, setBusy] = useState<"save" | "unlink" | "remove" | null>(null);
    const [confirmAction, setConfirmAction] = useState<"unlink" | "remove" | null>(null);
    const dialogHost = useId();
    const [removeError, setRemoveError] = useState("");
    const [sourceError, setSourceError] = useState("");
    const [sourceActionError, setSourceActionError] = useState("");
    const [sourceLoading, setSourceLoading] = useState(false);
    const [dataSource, setDataSource] = useState<DataSourceDto>();
    const [sourceReload, setSourceReload] = useState(0);
    const [roomsLoading, setRoomsLoading] = useState(false);
    const [roomsError, setRoomsError] = useState("");
    const [roomsReload, setRoomsReload] = useState(0);
    const roomsRequest = useRef(0);
    const [unlinked, setUnlinked] = useState(false);
    const pending = useRef(false);
    const active = useRef(true);
    const sourceId = home?.dataSource?.id;

    useFocusEffect(
        useCallback(() => {
            active.current = true;
            if (!home && !homes.loading && !pending.current) router.replace("/home/list");
            if (home) {
                const homeId = home.id;
                const requestId = ++roomsRequest.current;
                setRoomsLoading(true);
                setRoomsError("");
                void homes.refreshRooms({ silent: true }).then((success) => {
                    if (
                        !active.current ||
                        requestId !== roomsRequest.current ||
                        homes.current?.id !== homeId
                    )
                        return;
                    if (!success) setRoomsError("Couldn't load rooms. Try again.");
                    setRoomsLoading(false);
                });
            }
            return () => {
                active.current = false;
                roomsRequest.current += 1;
            };
            // refresh on focus; HomeProvider method identity changes on renders.
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [home?.id, homes.loading, router, roomsReload]),
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
        if (!home || !canManage || pending.current || !active.current)
            throw new Error("Only a home manager can change these details.");
        pending.current = true;
        setBusy("save");
        try {
            const response = await httpClient.patch("v1/homes/" + home.id, values);
            if (!response.isSuccess) throw new Error("Couldn't save your home. Try again.");
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
        setConfirmAction(null);
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
        setConfirmAction(null);
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

    const sourceAssigned = !!sourceId && !unlinked;

    return (
        <AlertDialog
            open={confirmAction !== null}
            onOpenChange={(open) => {
                if (!open) setConfirmAction(null);
            }}
            asChild>
            <View style={styles.screen}>
                <NativeModal
                    visible={confirmAction !== null}
                    transparent
                    statusBarTranslucent
                    navigationBarTranslucent
                    accessibilityViewIsModal
                    onRequestClose={() => setConfirmAction(null)}>
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
                                {confirmAction === "unlink"
                                    ? "Unlink data source?"
                                    : home.isOwner
                                      ? "Delete “" + home.name + "”?"
                                      : "Leave “" + home.name + "”?"}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                {confirmAction === "unlink"
                                    ? "Unlink “" +
                                      (dataSource?.name ||
                                          home.dataSource?.name ||
                                          "this data source") +
                                      "” from “" +
                                      home.name +
                                      "”? This removes its MQTT subscriptions. You can assign a data source again later."
                                    : home.isOwner
                                      ? "All rooms, devices, automations, and settings in this home will be permanently deleted. This action cannot be undone."
                                      : "You will lose access to this home's devices and automations. The owner can re-invite you later."}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                    </ScrollView>
                    <AlertDialogFooter className="flex-col">
                        <AlertDialogCancel asChild>
                            <Button
                                name="Cancel"
                                type="brand-outline"
                                loading={false}
                                disabled={!!busy}
                                onPress={() => setConfirmAction(null)}
                            />
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <Button
                                name={
                                    confirmAction === "unlink"
                                        ? "Unlink"
                                        : home.isOwner
                                          ? "Delete"
                                          : "Leave"
                                }
                                type="brand-destructive"
                                loading={false}
                                disabled={!!busy}
                                onPress={() => {
                                    if (confirmAction === "unlink") void unlinkDataSource();
                                    else if (confirmAction === "remove") void removeHome();
                                }}
                            />
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                <HomeForm
                    key={home.id}
                    edit
                    onSubmit={editClicked}
                    disabled={!!busy}
                    readOnly={!canManage}
                    initIcon={home.icon}
                    initName={home.name}
                    initLatitude={home.location?.latitude}
                    initLongitude={home.location?.longitude}>
                    <ContentSection
                        title="Rooms"
                        helper="Organize devices by room."
                        separated
                        actions={
                            canManage ? (
                                <Button
                                    name="Add room"
                                    type="brand-outline"
                                    loading={false}
                                    disabled={!!busy}
                                    onPress={() => {
                                        if (!busy && !pending.current)
                                            router.push({ pathname: "home/room/add" });
                                    }}
                                />
                            ) : undefined
                        }>
                        {roomsLoading && (
                            <View
                                style={styles.roomsState}
                                accessibilityRole="progressbar"
                                accessibilityLabel="Loading rooms"
                                accessibilityState={{ busy: true }}>
                                <ActivityIndicator accessible={false} color={colors.authMuted} />
                                <Text style={[styles.description, { color: colors.authMuted }]}>
                                    Loading rooms…
                                </Text>
                            </View>
                        )}
                        {!!roomsError && (
                            <>
                                <Alert
                                    icon={CircleAlert}
                                    variant="destructive"
                                    accessibilityRole="alert"
                                    accessibilityLiveRegion="polite">
                                    <AlertDescription>{roomsError}</AlertDescription>
                                </Alert>
                                <Button
                                    name="Retry loading rooms"
                                    type="brand-outline"
                                    loading={roomsLoading}
                                    disabled={!!busy}
                                    onPress={() => setRoomsReload((value) => value + 1)}
                                />
                            </>
                        )}
                        {(home.rooms ?? []).length === 0 && !roomsLoading && !roomsError ? (
                            <Text style={[styles.description, { color: colors.authMuted }]}>
                                No rooms yet.
                            </Text>
                        ) : (
                            (home.rooms ?? []).map((room, index, rooms) => (
                                <ListRow
                                    key={room.id}
                                    title={room.name}
                                    separator={index < rooms.length - 1}
                                    onPress={
                                        canManage
                                            ? () =>
                                                  router.push({
                                                      pathname: "home/room/details",
                                                      params: { id: room.id },
                                                  })
                                            : undefined
                                    }
                                    accessibilityLabel={canManage ? `Edit ${room.name}` : room.name}
                                />
                            ))
                        )}
                    </ContentSection>
                    {home.isOwner && (
                        <>
                            <ContentSection
                                title="Data source"
                                helper="MQTT broker for this home."
                                separated
                                actions={
                                    sourceAssigned ? (
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
                                                style={[styles.sourceAction, styles.unlinkAction]}
                                                loading={busy === "unlink"}
                                                disabled={!!busy}
                                                onPress={() => setConfirmAction("unlink")}
                                            />
                                        </View>
                                    ) : (
                                        <View style={styles.actionSlot}>
                                            <Button
                                                name="Assign data source"
                                                type="brand-outline"
                                                loading={false}
                                                disabled={!!busy}
                                                onPress={() =>
                                                    router.push({
                                                        pathname: "home/dataSource/select",
                                                    })
                                                }
                                            />
                                        </View>
                                    )
                                }>
                                {(sourceAssigned || !!sourceActionError) && (
                                    <View style={styles.sourceContent}>
                                        {sourceAssigned && (
                                            <>
                                                <ListRow
                                                    title={dataSource?.name || home.dataSource.name}
                                                    description={dataSource?.url}
                                                    separator={false}
                                                    trailing={
                                                        <DataSourceState
                                                            connectionStatus={home.dataSource.state}
                                                        />
                                                    }
                                                />
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
                                                                { color: colors.authMuted },
                                                            ]}>
                                                            Loading data source…
                                                        </Text>
                                                    </View>
                                                )}
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
                                                                setSourceReload(
                                                                    (value) => value + 1,
                                                                )
                                                            }
                                                        />
                                                    </>
                                                )}
                                            </>
                                        )}
                                        {!!sourceActionError && (
                                            <Alert
                                                icon={CircleAlert}
                                                variant="destructive"
                                                accessibilityRole="alert"
                                                accessibilityLiveRegion="polite">
                                                <AlertDescription>
                                                    {sourceActionError}
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                    </View>
                                )}
                            </ContentSection>
                            <HomeSharingList disabled={!!busy} />
                        </>
                    )}
                    <ContentSection
                        title={home.isOwner ? "Delete home" : "Leave home"}
                        helper={
                            home.isOwner
                                ? "Permanently remove this home and everything in it."
                                : "Remove your access to this home's devices and automations."
                        }
                        separated
                        actions={
                            <View style={styles.actionSlot}>
                                <AlertDialogTrigger asChild disabled={!!busy}>
                                    <Button
                                        name={home.isOwner ? "Delete home" : "Leave home"}
                                        type="brand-destructive"
                                        loading={busy === "remove"}
                                        disabled={!!busy}
                                        onPress={() => {
                                            setRemoveError("");
                                            setConfirmAction("remove");
                                        }}
                                    />
                                </AlertDialogTrigger>
                            </View>
                        }
                        children={
                            removeError ? (
                                <Alert
                                    icon={CircleAlert}
                                    variant="destructive"
                                    accessibilityRole="alert"
                                    accessibilityLiveRegion="polite">
                                    <AlertDescription>{removeError}</AlertDescription>
                                </Alert>
                            ) : undefined
                        }
                    />
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
    description: { fontSize: 14, lineHeight: 20 },
    sourceContent: { gap: 16 },
    sourceLoading: { flexDirection: "row", alignItems: "center", gap: 12 },
    roomsState: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 },
    sourceActions: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    sourceAction: { flexGrow: 1, flexBasis: 160, width: "auto" },
    unlinkAction: { borderColor: "transparent" },
    actionSlot: { minHeight: 72, justifyContent: "center" },
});
