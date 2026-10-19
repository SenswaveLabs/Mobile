import ConfirmDialog from "@/components/common/ConfirmDialog";
import FAB, { FABAction } from "@/components/common/FAB";
import Loading from "@/components/common/Loading";
import RoomForm, { RoomFormHandle } from "@/components/room/RoomForm";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Room } from "@/types/HomeTypes";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";

function Details() {
    const { id } = useLocalSearchParams();
    const roomId = Array.isArray(id) ? id[0] : id;
    const router = useRouter();
    const homes = useHomes();
    const httpClient = useHttpClient();
    const toast = useToast();
    const formRef = useRef<RoomFormHandle>(null);
    const active = useRef(true);
    const pending = useRef(false);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [room, setRoom] = useState<Room>();
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const home = homes.current;
    const hasHome = !!home;
    const canManage = home?.isOwner === true || home?.canManage === true;
    const homeId = home?.id;

    useFocusEffect(
        useCallback(() => {
            active.current = true;
            if (!hasHome && !homes.loading) router.replace("/home/list");
            else if (hasHome && !canManage) router.replace("/home/details");
            return () => {
                active.current = false;
            };
        }, [hasHome, canManage, homes.loading, router]),
    );

    const editClicked = async (values: any) => {
        if (!homeId || !roomId || !canManage || pending.current || !active.current) return;
        pending.current = true;
        setBusy(true);
        try {
            const response = await httpClient.patch(`v1/homes/${homeId}/rooms/${roomId}`, values);
            if (response.isSuccess) {
                if (homes.current?.id === homeId) await homes.refreshRooms({ silent: true });
                if (active.current && homes.current?.id === homeId) {
                    toast.success("Room updated successfully.");
                    router.back();
                }
            } else toast.httpError(response);
        } catch {
            if (active.current) toast.error("Failed to update room. Try again.");
        } finally {
            pending.current = false;
            if (active.current) setBusy(false);
        }
    };

    const deleteRoom = async () => {
        if (!homeId || !roomId || !canManage || pending.current || !active.current) return;
        pending.current = true;
        setBusy(true);
        try {
            const response = await httpClient.delete(`v1/homes/${homeId}/rooms/${roomId}`);
            if (response.isSuccess) {
                if (homes.current?.id === homeId) await homes.refreshRooms({ silent: true });
                if (active.current && homes.current?.id === homeId) {
                    toast.success("Room removed successfully.");
                    router.back();
                }
            } else toast.httpError(response);
        } catch {
            if (active.current) toast.error("Failed to remove room. Try again.");
        } finally {
            pending.current = false;
            if (active.current) setBusy(false);
        }
    };

    useEffect(() => {
        let current = true;
        if (!canManage || !homeId || !roomId) {
            setLoading(false);
            return () => {
                current = false;
            };
        }
        setLoading(true);
        const load = async () => {
            try {
                const response = await httpClient.get(`v1/homes/${homeId}/rooms/${roomId}`);
                if (!response.isSuccess || !response.response) throw new Error();
                const content = (await response.response.json()) as Room;
                if (current && active.current && homes.current?.id === homeId) setRoom(content);
            } catch {
                if (current && homes.current?.id === homeId)
                    toast.error("Failed to load room details.");
            } finally {
                if (current) setLoading(false);
            }
        };
        void load();
        return () => {
            current = false;
        };
        // Reload for a different room/home; the HTTP hook changes identity on renders.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId, homeId, canManage]);

    if (!canManage) return <Loading activityColor="textOnBackground" />;
    if (loading || !room) return <Loading activityColor="textOnBackground" />;

    const fabActions: FABAction[] = [
        ...(isFormDirty
            ? [
                  {
                      icon: "checkmark-outline",
                      label: "Save",
                      onPress: () => {
                          if (!busy) formRef.current?.triggerSave();
                      },
                  },
                  {
                      icon: "refresh-outline",
                      label: "Restore",
                      onPress: () => {
                          if (!busy) formRef.current?.triggerReset();
                      },
                  },
              ]
            : []),
        {
            icon: "trash-outline",
            label: "Delete Room",
            onPress: () => {
                if (!busy) setShowDeleteDialog(true);
            },
        },
    ];

    return (
        <View style={{ flex: 1 }}>
            <ConfirmDialog
                visible={showDeleteDialog}
                title="Delete Room"
                content="The room will be permanently deleted. Devices assigned to it will become unassigned. This action cannot be undone."
                confirmLabel="Delete"
                onConfirm={() => {
                    setShowDeleteDialog(false);
                    void deleteRoom();
                }}
                onCancel={() => setShowDeleteDialog(false)}
            />
            <RoomForm
                ref={formRef}
                initName={room.name}
                onSubmit={editClicked}
                edit
                onDirtyChange={setIsFormDirty}
            />
            <FAB actions={fabActions} forceExpanded={isFormDirty || busy} />
        </View>
    );
}

export default Details;
