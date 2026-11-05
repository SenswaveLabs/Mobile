import type { Capture, Manifest } from "./types.ts";

export const sameCaptureContext = (a: Capture, b: Capture) =>
    (a.account ?? "AGENT") === (b.account ?? "AGENT") &&
    ["routeId", "state", "href", "platform", "device", "width", "height"].every(
        (key) => a[key as keyof Capture] === b[key as keyof Capture],
    );

export const captureKey = (capture: Capture) =>
    JSON.stringify([
        capture.routeId,
        capture.state,
        capture.href,
        capture.platform,
        capture.device,
        capture.width,
        capture.height,
        capture.account ?? "AGENT",
    ]);

export function latestStateAttempts(manifest: Pick<Manifest, "attempts">, routeId: string) {
    const states = new Map();
    for (const attempt of manifest.attempts)
        if (attempt.routeId === routeId) states.set(attempt.state, attempt);
    return [...states.values()] as Manifest["attempts"];
}

export function comparisonFor(manifest: Pick<Manifest, "captures">, captureId: string) {
    const before = manifest.captures.find((capture) => capture.id === captureId);
    if (!before) throw new Error("Screenshot not found.");
    const after =
        manifest.captures
            .slice(manifest.captures.indexOf(before) + 1)
            .findLast((capture) => sameCaptureContext(capture, before)) ?? null;
    return { before, after };
}
