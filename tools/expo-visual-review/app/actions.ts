"use server";

import { revalidatePath } from "next/cache";
import { withStore } from "../lib/server";
import type { Geometry, Priority, Status } from "../lib/types";

function result(action: Parameters<typeof withStore>[0]) {
    try {
        withStore(action);
        revalidatePath("/");
        return { ok: true, error: "" };
    } catch (error) {
        return {
            ok: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Local review could not be saved. Try again.",
        };
    }
}

export async function addFinding(
    captureId: string,
    geometry: Geometry,
    comment: string,
    priority: Priority,
) {
    return result((store) => store.addAnnotation(captureId, { geometry, comment, priority }));
}

export async function changeFinding(
    id: string,
    status: Exclude<Status, "accepted">,
    comment: string,
    priority: Priority,
) {
    if (status === ("accepted" as string))
        return { ok: false, error: "Use the explicit approval action." };
    return result((store) => store.updateAnnotation(id, { status, comment, priority }));
}

export async function approveFinding(id: string) {
    return result((store) => store.updateAnnotation(id, { status: "accepted" }, true));
}

export async function deleteFinding(id: string) {
    return result((store) => store.deleteAnnotation(id));
}
