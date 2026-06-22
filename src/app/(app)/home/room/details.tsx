import ConfirmDialog from "@/components/common/ConfirmDialog";
import FAB, { FABAction } from "@/components/common/FAB";
import Loading from "@/components/common/Loading";
import RoomForm, { RoomFormHandle } from "@/components/room/RoomForm";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Room } from "@/types/HomeTypes";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";

function Details() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const homes = useHomes();
    const httpClient = useHttpClient();
    const toast = useToast();
    const formRef = useRef<RoomFormHandle>(null);

    const [loading, setLoading] = useState(false);
    const [room, setRoom] = useState<Room | undefined>(undefined);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const editClicked = async (values: any) => {
        setLoading(true);
        const response = await httpClient.patch(
            `v1/homes/${homes.current?.id}/rooms/${id}`,
            values,
        );

        if (response.isSuccess) {
            toast.success("Room updated successfully.");
            homes.refreshRooms();
            router.back();
        } else {
            toast.httpError(response);
        }

        setLoading(false);
    };

    const deleteRoom = async () => {
        const response = await httpClient.delete(`v1/homes/${homes.current?.id}/rooms/${id}`);

        if (response.isSuccess) {
            toast.success("Room removed successfully.");
            homes.refreshRooms();
            router.back();
        } else {
            toast.error("Failed to remove room.");
            const data = await response.response?.text();
            console.error("[Room Details] Error: " + data);
        }
    };

    const deleteAlert = () => {
        setShowDeleteDialog(true);
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const response = await httpClient.get(`v1/homes/${homes.current?.id}/rooms/${id}`);

            if (response.isSuccess) {
                const content = (await response.response?.json()) as Room;
                setRoom(content);
            } else {
                toast.httpError(response);
            }

            setLoading(false);
        };

        loadData();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    if (loading) return <Loading activityColor="textOnBackground" />;

    const fabActions: FABAction[] = [
        ...(isFormDirty
            ? [
                  {
                      icon: "checkmark-outline",
                      label: "Save",
                      onPress: () => formRef.current?.triggerSave(),
                  },
                  {
                      icon: "refresh-outline",
                      label: "Restore",
                      onPress: () => formRef.current?.triggerReset(),
                  },
              ]
            : []),
        { icon: "trash-outline", label: "Delete Room", onPress: deleteAlert },
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
                    deleteRoom();
                }}
                onCancel={() => setShowDeleteDialog(false)}
            />
            <RoomForm
                ref={formRef}
                initName={room?.name}
                onSubmit={editClicked}
                edit={true}
                onDirtyChange={setIsFormDirty}
            />

            <FAB actions={fabActions} forceExpanded={isFormDirty} />
        </View>
    );
}

export default Details;
