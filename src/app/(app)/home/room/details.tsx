import React, { FC, useCallback, useEffect, useId, useRef, useState } from "react";
import {
    AccessibilityInfo,
    Modal as NativeModal,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { PortalHost } from "@rn-primitives/portal";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { CircleAlert } from "lucide-react-native";
import Button from "@/components/common/Button";
import ContentSection from "@/components/common/ContentSection";
import Loading from "@/components/common/Loading";
import RoomForm, { RoomFormValues } from "@/components/room/RoomForm";
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
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { Room } from "@/types/HomeTypes";

const Details: FC = () => {
    const { id } = useLocalSearchParams();
    const roomId = Array.isArray(id) ? id[0] : id;
    const router = useRouter();
    const homes = useHomes();
    const httpClient = useHttpClient();
    const home = homes.current;
    const homeRef = useRef(home);
    homeRef.current = home;
    const homeId = home?.id;
    const resourceKey = `${homeId}/${roomId}`;
    const resourceRef = useRef(resourceKey);
    resourceRef.current = resourceKey;
    const canManage = home?.isOwner === true || home?.canManage === true;
    const active = useRef(true);
    const pending = useRef(false);
    const completed = useRef<string | undefined>(undefined);
    const [busy, setBusy] = useState<"save" | "delete" | null>(null);
    const [details, setDetails] = useState<{ key: string; room?: Room; error?: string }>();
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [deleteError, setDeleteError] = useState("");
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const dialogHost = useId();

    const returnToRooms = useCallback(() => {
        if (router.canGoBack()) router.back();
        else router.replace("/home/details");
    }, [router]);

    useFocusEffect(
        useCallback(() => {
            active.current = true;
            if (!homeId && !homes.loading) router.replace("/home/list");
            else if (homeId && !canManage) router.replace("/home/details");
            else if (completed.current === resourceKey) returnToRooms();
            return () => {
                active.current = false;
            };
        }, [homeId, canManage, homes.loading, resourceKey, returnToRooms, router]),
    );

    useEffect(() => {
        let current = true;
        setDetails(undefined);
        setDeleteError("");
        setShowDeleteDialog(false);
        if (!canManage || !homeId || !roomId) {
            setDetails({ key: resourceKey, error: "This room is unavailable." });
            return;
        }
        const load = async () => {
            try {
                const response = await httpClient.get(`v1/homes/${homeId}/rooms/${roomId}`);
                if (!response.isSuccess || !response.response) throw new Error();
                const room = (await response.response.json()) as Room;
                if (current && homeRef.current?.id === homeId)
                    setDetails({ key: resourceKey, room });
            } catch {
                if (current && homeRef.current?.id === homeId)
                    setDetails({ key: resourceKey, error: "Couldn't load this room. Try again." });
            }
        };
        void load();
        return () => {
            current = false;
        };
        // Reload for this room/home or retry; the HTTP hook changes identity on renders.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [homeId, roomId, canManage, resourceKey, loadAttempt]);

    const mutate = async (values?: RoomFormValues) => {
        const current = homeRef.current;
        if (
            !homeId ||
            !roomId ||
            resourceRef.current !== resourceKey ||
            current?.id !== homeId ||
            (!current.isOwner && !current.canManage) ||
            pending.current ||
            completed.current === resourceKey ||
            !active.current
        ) {
            if (values) throw new Error("Couldn't save this room. Try again.");
            return;
        }
        pending.current = true;
        setBusy(values ? "save" : "delete");
        setDeleteError("");
        setShowDeleteDialog(false);
        try {
            const path = `v1/homes/${homeId}/rooms/${roomId}`;
            const response = values
                ? await httpClient.patch(path, values)
                : await httpClient.delete(path);
            if (!response.isSuccess)
                throw new Error(
                    values
                        ? "Couldn't save this room. Try again."
                        : "Couldn't delete this room. Try again.",
                );
            completed.current = resourceKey;
            if (homeRef.current?.id !== homeId || resourceRef.current !== resourceKey) return;
            try {
                await homes.refreshRooms({ silent: true });
            } catch {
                // The mutation already succeeded; the parent can reload its rooms.
            }
            if (
                active.current &&
                homeRef.current?.id === homeId &&
                resourceRef.current === resourceKey
            ) {
                AccessibilityInfo.announceForAccessibility(
                    values ? "Room saved." : "Room deleted.",
                );
                returnToRooms();
            }
        } catch (error) {
            if (values) throw error;
            if (
                active.current &&
                homeRef.current?.id === homeId &&
                resourceRef.current === resourceKey
            )
                setDeleteError(
                    error instanceof Error
                        ? error.message
                        : "Couldn't delete this room. Try again.",
                );
        } finally {
            pending.current = false;
            setBusy(null);
        }
    };

    if (!home || !canManage || details?.key !== resourceKey)
        return <Loading activityColor="textOnBackground" />;
    const room = details.room;
    if (!room) {
        return (
            <ScrollView contentContainerStyle={styles.loadContent}>
                <Alert
                    icon={CircleAlert}
                    variant="destructive"
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite">
                    <AlertDescription>{details.error}</AlertDescription>
                </Alert>
                <Button
                    name="Retry"
                    type="auth"
                    loading={false}
                    onPress={() => setLoadAttempt((attempt) => attempt + 1)}
                />
            </ScrollView>
        );
    }

    return (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog} asChild>
            <View style={styles.screen}>
                <NativeModal
                    visible={showDeleteDialog}
                    transparent
                    statusBarTranslucent
                    navigationBarTranslucent
                    accessibilityViewIsModal
                    onRequestClose={() => setShowDeleteDialog(false)}>
                    <PortalHost name={dialogHost} />
                </NativeModal>
                <AlertDialogContent
                    portalHost={dialogHost}
                    accessibilityViewIsModal
                    className="max-w-md"
                    style={styles.dialogContent}>
                    <ScrollView style={styles.dialogBody}>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete “{room.name}”?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This room will be permanently deleted. Devices assigned to it will
                                become unassigned. This action cannot be undone.
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
                                onPress={() => setShowDeleteDialog(false)}
                            />
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <Button
                                name="Delete room"
                                type="brand-destructive"
                                loading={false}
                                disabled={!!busy}
                                onPress={() => mutate()}
                            />
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                <RoomForm
                    key={resourceKey}
                    homeName={home.name}
                    initName={room.name}
                    onSubmit={mutate}
                    edit
                    disabled={!!busy}>
                    <ContentSection
                        title="Delete room"
                        helper="Devices will stay in your home and become unassigned."
                        separated
                        actions={
                            <View style={styles.actionSlot}>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        name="Delete room"
                                        type="brand-destructive"
                                        loading={busy === "delete"}
                                        disabled={!!busy}
                                        onPress={() => setShowDeleteDialog(true)}
                                    />
                                </AlertDialogTrigger>
                            </View>
                        }>
                        {!!deleteError && (
                            <Alert
                                icon={CircleAlert}
                                variant="destructive"
                                accessibilityRole="alert"
                                accessibilityLiveRegion="polite">
                                <AlertDescription>{deleteError}</AlertDescription>
                            </Alert>
                        )}
                    </ContentSection>
                </RoomForm>
            </View>
        </AlertDialog>
    );
};

export default Details;

const styles = StyleSheet.create({
    screen: { flex: 1 },
    loadContent: { width: "100%", maxWidth: 448, alignSelf: "center", padding: 24, gap: 24 },
    actionSlot: { minHeight: 72, justifyContent: "center" },
    dialogContent: { maxHeight: "90%" },
    dialogBody: { flexShrink: 1 },
});
