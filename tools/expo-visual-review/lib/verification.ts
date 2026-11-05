import { captureKey } from "./comparison.ts";
import type { Annotation, Capture, Manifest } from "./types.ts";

export function verificationTargets(
    manifest: Manifest,
    annotations: Annotation[],
    options: { captureId?: string; all?: boolean } = {},
) {
    if (options.captureId && !manifest.captures.some((capture) => capture.id === options.captureId))
        throw new Error("Requested verification capture does not exist.");
    const pending = new Set(
        annotations
            .filter((annotation) => annotation.status !== "accepted")
            .map((annotation) => annotation.captureId),
    );
    const targets = manifest.captures.filter((capture) =>
        options.captureId
            ? capture.id === options.captureId
            : options.all || pending.has(capture.id),
    );
    return [...new Map(targets.map((capture) => [captureKey(capture), capture])).values()];
}

export function verificationRuntime(
    captures: Capture[],
    requested: { platform?: string; device?: string },
) {
    const first = captures[0];
    if (!first) throw new Error("No verification targets.");
    if (
        captures.some(
            (capture) => capture.platform !== first.platform || capture.device !== first.device,
        )
    )
        throw new Error(
            "Verification targets use different platforms/devices. Select one capture with --capture ID, or verify each runtime separately.",
        );
    if (
        (requested.platform && requested.platform !== first.platform) ||
        (requested.device && requested.device !== first.device)
    )
        throw new Error(
            "Requested runtime does not match the original screenshot. Use the original platform/device for a valid comparison.",
        );
    return { platform: first.platform, device: first.device };
}
