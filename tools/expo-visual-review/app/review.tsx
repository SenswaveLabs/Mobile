"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState, type FC } from "react";
import {
    captureKey,
    comparisonFor,
    latestStateAttempts,
    sameCaptureContext,
} from "../lib/comparison";
import type {
    Annotation,
    Capture,
    Geometry,
    Priority,
    ReviewData,
    Status,
    ZoomMode,
} from "../lib/types";
import { addFinding, approveFinding, changeFinding, deleteFinding } from "./actions";

const ScreenshotCanvas = dynamic(() => import("./canvas"), {
    ssr: false,
    loading: () => <p className="muted">Loading screenshot editor…</p>,
});
const imageUrl = (capture: Capture) => `/api/image/${capture.id}`;

interface FindingProps {
    annotation: Annotation;
    index: number;
    onError: (message: string) => void;
}
const Finding: FC<FindingProps> = ({ annotation, index, onError }) => {
    const router = useRouter();
    const [comment, setComment] = useState(annotation.comment);
    const [priority, setPriority] = useState(annotation.priority);
    const [status, setStatus] = useState(annotation.status);
    const [busy, setBusy] = useState(false);
    const submit = async (action: "update" | "approve" | "delete" = "update") => {
        setBusy(true);
        onError("");
        try {
            const result =
                action === "delete"
                    ? await deleteFinding(annotation.id)
                    : action === "approve"
                      ? await approveFinding(annotation.id)
                      : await changeFinding(
                            annotation.id,
                            status as Exclude<Status, "accepted">,
                            comment,
                            priority,
                        );
            if (!result.ok) onError(result.error);
            else router.refresh();
        } catch {
            onError(
                `Could not ${action === "delete" ? "delete" : "save"} this finding. Check the local server and try again.`,
            );
        } finally {
            setBusy(false);
        }
    };
    return (
        <article className="finding space-y-3" aria-label={`Finding ${index + 1}`}>
            <div className="flex justify-between gap-3">
                <strong>#{index + 1}</strong>
                <span className="status">{annotation.status.replace("_", " ")}</span>
            </div>
            <code>{JSON.stringify(annotation.geometry)}</code>
            <label>
                Comment
                <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    disabled={annotation.status === "accepted"}
                />
            </label>
            <div className="grid grid-cols-2 gap-3">
                <label>
                    Priority
                    <select
                        aria-label="Priority"
                        value={priority}
                        onChange={(event) => setPriority(event.target.value as Priority)}
                        disabled={annotation.status === "accepted"}>
                        {["low", "medium", "high", "critical"].map((value) => (
                            <option key={value}>{value}</option>
                        ))}
                    </select>
                </label>
                <label>
                    Status
                    <select
                        aria-label="Status"
                        value={status}
                        onChange={(event) => setStatus(event.target.value as Status)}
                        disabled={annotation.status === "accepted"}>
                        {[
                            "open",
                            "in_progress",
                            "fixed",
                            ...(annotation.status === "accepted" ? ["accepted"] : []),
                        ].map((value) => (
                            <option key={value} value={value}>
                                {value.replace("_", " ")}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
            {annotation.status !== "accepted" && (
                <div className="flex flex-wrap gap-2">
                    <button disabled={busy} onClick={() => void submit()}>
                        Save changes
                    </button>
                    <button
                        disabled={busy}
                        onClick={() => {
                            if (
                                window.confirm(
                                    "Accept this finding after reviewing the screenshot comparison? This is your manual approval.",
                                )
                            )
                                void submit("approve");
                        }}>
                        Accept after review
                    </button>
                </div>
            )}
            <button
                className="error"
                disabled={busy}
                onClick={() => {
                    if (
                        window.confirm(
                            "Permanently delete this finding? Its screenshot will be kept.",
                        )
                    )
                        void submit("delete");
                }}>
                Delete finding
            </button>
        </article>
    );
};

const Review: FC<ReviewData> = ({ manifest, annotations, directory }) => {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [group, setGroup] = useState("all");
    const [filter, setFilter] = useState(manifest.captures.length ? "captured" : "all");
    const [platform, setPlatform] = useState("all");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [view, setView] = useState<"gallery" | "coverage">("gallery");
    const [mode, setMode] = useState<"point" | "rect">("point");
    const [geometry, setGeometry] = useState<Geometry | null>(null);
    const [comment, setComment] = useState("");
    const [priority, setPriority] = useState<Priority>("medium");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [zoom, setZoom] = useState<ZoomMode>("height");
    const [compare, setCompare] = useState(false);
    const selected = manifest.captures.find((capture) => capture.id === selectedId);
    const reviewing = Boolean(selected && view === "gallery");
    const groups = [...new Set(manifest.routes.map((route) => route.groups.join("/") || "public"))];
    const routeCaptures = (id: string) =>
        manifest.captures.filter(
            (capture) =>
                capture.routeId === id && (platform === "all" || capture.platform === platform),
        );
    const latestAttempt = (id: string) =>
        manifest.attempts.findLast((attempt) => attempt.routeId === id);
    const covered = manifest.routes.filter((route) =>
        manifest.captures.some((capture) => capture.routeId === route.id),
    ).length;
    const pending = annotations.filter((annotation) => annotation.status !== "accepted").length;
    const filtered = manifest.routes.filter((route) => {
        const captures = routeCaptures(route.id);
        const findings = annotations.filter((annotation) =>
            captures.some((capture) => capture.id === annotation.captureId),
        );
        return (
            (group === "all" || (route.groups.join("/") || "public") === group) &&
            `${route.id} ${route.pathname} ${route.source} ${captures.map((capture) => capture.state).join(" ")}`
                .toLowerCase()
                .includes(query.toLowerCase()) &&
            (filter === "all" ||
                (filter === "captured" && captures.length) ||
                (filter === "missing" && !captures.length) ||
                (filter === "failed" &&
                    latestStateAttempts(manifest, route.id).some(
                        (attempt) => attempt.status === "failed",
                    )) ||
                (filter === "findings" &&
                    findings.some((finding) => finding.status !== "accepted")))
        );
    });
    const selectedAnnotations = annotations.filter(
        (annotation) => annotation.captureId === selected?.id,
    );
    let comparison = selected ? comparisonFor(manifest, selected.id) : null;
    if (selected && !comparison?.after) {
        const previous = manifest.captures
            .slice(0, manifest.captures.indexOf(selected))
            .findLast((capture) => sameCaptureContext(capture, selected));
        if (previous) comparison = { before: previous, after: selected };
    }
    const save = async () => {
        if (!selected || !geometry) {
            setError("Select a point or rectangle first.");
            return;
        }
        setBusy(true);
        setError("");
        try {
            const result = await addFinding(selected.id, geometry, comment, priority);
            if (!result.ok) setError(result.error);
            else {
                setGeometry(null);
                setComment("");
                router.refresh();
            }
        } catch {
            setError("Could not save the comment. Check the local server and try again.");
        } finally {
            setBusy(false);
        }
    };
    const pick = (capture: Capture) => {
        setSelectedId(capture.id);
        window.scrollTo(0, 0);
        setGeometry(null);
        setCompare(false);
        setError("");
        setComment("");
    };
    const coordinate = (key: "x" | "y" | "width" | "height", value: string) => {
        const base: Geometry =
            geometry ??
            (mode === "point"
                ? { type: "point", x: 0, y: 0 }
                : { type: "rect", x: 0, y: 0, width: 1, height: 1 });
        setGeometry({ ...base, [key]: Number(value) });
    };
    const workflowActions = (
        <div className="flex flex-wrap gap-2">
            <button
                onClick={() => {
                    router.refresh();
                }}>
                Refresh
            </button>
            <a className="button" href="/api/tasks?format=json">
                Export JSON
            </a>
            <a className="button" href="/api/tasks?format=md">
                Export Markdown
            </a>
        </div>
    );
    return (
        <>
            {!reviewing && (
                <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d8d2c7] px-4 py-5 md:px-7">
                    <div>
                        <h1>Expo Visual Review</h1>
                        <p className="muted">
                            Senswave · {covered}/{manifest.routes.length} routes captured ·{" "}
                            {pending} pending findings
                        </p>
                    </div>
                    {workflowActions}
                </header>
            )}
            <div className={`workspace${selected && view === "gallery" ? " reviewing" : ""}`}>
                <aside className="sidebar space-y-5">
                    <div className="flex gap-2">
                        <button
                            aria-pressed={view === "gallery"}
                            onClick={() => setView("gallery")}>
                            Screens
                        </button>
                        <button
                            aria-pressed={view === "coverage"}
                            onClick={() => {
                                setView("coverage");
                                setSelectedId(null);
                                setFilter("all");
                            }}>
                            Coverage
                        </button>
                    </div>
                    <label>
                        Search routes and states
                        <input
                            type="search"
                            placeholder="Route, source, state…"
                            value={query}
                            onChange={(event) => {
                                setQuery(event.target.value);
                                setSelectedId(null);
                            }}
                        />
                    </label>
                    <label>
                        Show
                        <select
                            value={filter}
                            onChange={(event) => {
                                setFilter(event.target.value);
                                setSelectedId(null);
                            }}>
                            <option value="all">All routes</option>
                            <option value="captured">Captured</option>
                            <option value="missing">Missing captures</option>
                            <option value="failed">Failed attempts</option>
                            <option value="findings">Pending findings</option>
                        </select>
                    </label>
                    <label>
                        Platform
                        <select
                            value={platform}
                            onChange={(event) => {
                                setPlatform(event.target.value);
                                setSelectedId(null);
                            }}>
                            <option value="all">All platforms</option>
                            <option value="android">Android</option>
                            <option value="ios">iOS</option>
                        </select>
                    </label>
                    <nav aria-label="Route groups">
                        <button
                            aria-pressed={group === "all"}
                            onClick={() => {
                                setGroup("all");
                                setSelectedId(null);
                            }}>
                            All groups<span>{manifest.routes.length}</span>
                        </button>
                        {groups.map((item) => (
                            <button
                                key={item}
                                aria-pressed={group === item}
                                onClick={() => {
                                    setGroup(item);
                                    setSelectedId(null);
                                }}>
                                {item}
                                <span>
                                    {
                                        manifest.routes.filter(
                                            (route) =>
                                                (route.groups.join("/") || "public") === item,
                                        ).length
                                    }
                                </span>
                            </button>
                        ))}
                    </nav>
                    <details>
                        <summary>Local workflow</summary>
                        <p className="muted">
                            Scan → capture → annotate → export → fix → verify → manually accept.
                        </p>
                        <p className="mt-3">
                            <code>pnpm review:fix</code>
                        </p>
                        <p>
                            <code>pnpm review:verify</code>
                        </p>
                        <p className="mt-3 break-all muted">{directory}</p>
                    </details>
                </aside>
                <main className="main">
                    {selected && view === "gallery" ? (
                        <>
                            <div className="viewer-toolbar">
                                <button
                                    onClick={() => {
                                        setSelectedId(null);
                                        setError("");
                                    }}>
                                    Back to gallery
                                </button>
                                <div className="viewer-identity">
                                    <h2 title={selected.routeId}>{selected.routeId}</h2>
                                    <p
                                        className="muted"
                                        title={`${selected.state} · ${selected.platform} · ${selected.width} × ${selected.height}`}>
                                        {selected.state} · {selected.platform} · {selected.width} ×{" "}
                                        {selected.height} · {selectedAnnotations.length} findings
                                    </p>
                                </div>
                                <div className="flex gap-1" role="group" aria-label="Preview view">
                                    <button
                                        aria-pressed={!compare}
                                        onClick={() => setCompare(false)}>
                                        Annotate
                                    </button>
                                    <button aria-pressed={compare} onClick={() => setCompare(true)}>
                                        Before / after
                                    </button>
                                </div>
                                <div
                                    className="flex gap-1"
                                    role="group"
                                    aria-label="Screenshot zoom">
                                    {(
                                        [
                                            ["height", "Fit height", "Fit to height"],
                                            ["width", "Fit width", "Fit to width"],
                                            ["actual", "100%", "100% resolution"],
                                        ] as const
                                    ).map(([value, label, name]) => (
                                        <button
                                            key={value}
                                            aria-label={name}
                                            aria-pressed={zoom === value}
                                            onClick={() => setZoom(value)}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                <label className="viewer-version">
                                    Version
                                    <select
                                        aria-label="Screenshot version"
                                        value={selected.id}
                                        onChange={(event) => {
                                            const capture = manifest.captures.find(
                                                (item) => item.id === event.target.value,
                                            );
                                            if (capture) pick(capture);
                                        }}>
                                        {manifest.captures
                                            .filter((capture) =>
                                                sameCaptureContext(capture, selected),
                                            )
                                            .map((capture) => (
                                                <option key={capture.id} value={capture.id}>
                                                    {new Date(capture.createdAt).toLocaleString()} ·{" "}
                                                    {capture.commit.slice(0, 8)} ·{" "}
                                                    {capture.platform}
                                                </option>
                                            ))}
                                    </select>
                                </label>
                                {workflowActions}
                            </div>
                            {error && (
                                <p role="alert" className="error mb-4">
                                    {error}
                                </p>
                            )}
                            {compare ? (
                                comparison?.after ? (
                                    <div className={`comparison zoom-${zoom}`}>
                                        <figure>
                                            <figcaption>
                                                Before · {comparison.before.commit.slice(0, 10)}
                                            </figcaption>
                                            <div className="canvas-wrap">
                                                <img
                                                    src={imageUrl(comparison.before)}
                                                    alt={`Before: ${selected.routeId}`}
                                                />
                                            </div>
                                        </figure>
                                        <figure>
                                            <figcaption>
                                                After · {comparison.after.commit.slice(0, 10)}
                                                {comparison.after.dirty ? " + working changes" : ""}
                                            </figcaption>
                                            <div className="canvas-wrap">
                                                <img
                                                    src={imageUrl(comparison.after)}
                                                    alt={`After: ${selected.routeId}`}
                                                />
                                            </div>
                                        </figure>
                                    </div>
                                ) : (
                                    <div className="empty">
                                        <h2>No matching verification capture yet</h2>
                                        <p className="muted mt-3">
                                            Run <code>pnpm review:verify</code> after applying the
                                            fix. Comparisons require the same route, state, device,
                                            platform and resolution. Select an earlier version to
                                            compare with a later one.
                                        </p>
                                    </div>
                                )
                            ) : (
                                <div className="editor">
                                    <ScreenshotCanvas
                                        capture={selected}
                                        annotations={selectedAnnotations}
                                        geometry={geometry}
                                        mode={mode}
                                        zoom={zoom}
                                        onSelect={setGeometry}
                                    />
                                    <section className="space-y-4" aria-label="Annotations">
                                        <h2>Add finding</h2>
                                        <div className="flex gap-2">
                                            <button
                                                aria-pressed={mode === "point"}
                                                onClick={() => {
                                                    setMode("point");
                                                    setGeometry(null);
                                                }}>
                                                Point
                                            </button>
                                            <button
                                                aria-pressed={mode === "rect"}
                                                onClick={() => {
                                                    setMode("rect");
                                                    setGeometry(null);
                                                }}>
                                                Rectangle
                                            </button>
                                        </div>
                                        <p className="muted">
                                            Click a point or drag a rectangle. Coordinates use
                                            original screenshot pixels; fields also support keyboard
                                            input.
                                        </p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                "x",
                                                "y",
                                                ...(mode === "rect" ? ["width", "height"] : []),
                                            ].map((key) => (
                                                <label key={key}>
                                                    {key}
                                                    <input
                                                        aria-label={`Annotation ${key}`}
                                                        type="number"
                                                        min={
                                                            key === "width" || key === "height"
                                                                ? 1
                                                                : 0
                                                        }
                                                        value={
                                                            geometry && key in geometry
                                                                ? geometry[key as "x" | "y"]
                                                                : ""
                                                        }
                                                        onChange={(event) =>
                                                            coordinate(
                                                                key as
                                                                    | "x"
                                                                    | "y"
                                                                    | "width"
                                                                    | "height",
                                                                event.target.value,
                                                            )
                                                        }
                                                    />
                                                </label>
                                            ))}
                                        </div>
                                        <label>
                                            Comment
                                            <textarea
                                                placeholder="What should change, and why?"
                                                value={comment}
                                                onChange={(event) => setComment(event.target.value)}
                                                maxLength={10000}
                                            />
                                        </label>
                                        <label>
                                            Priority
                                            <select
                                                aria-label="Priority"
                                                value={priority}
                                                onChange={(event) =>
                                                    setPriority(event.target.value as Priority)
                                                }>
                                                {["low", "medium", "high", "critical"].map(
                                                    (value) => (
                                                        <option key={value}>{value}</option>
                                                    ),
                                                )}
                                            </select>
                                        </label>
                                        <button
                                            className="primary w-full"
                                            disabled={busy || !geometry || !comment.trim()}
                                            onClick={() => void save()}>
                                            {busy ? "Saving…" : "Save finding"}
                                        </button>
                                        <h2 className="pt-5">
                                            Findings ({selectedAnnotations.length})
                                        </h2>
                                        {selectedAnnotations.map((annotation, index) => (
                                            <Finding
                                                key={annotation.id + annotation.updatedAt}
                                                annotation={annotation}
                                                index={index}
                                                onError={setError}
                                            />
                                        ))}
                                        <details>
                                            <summary>Replay and capture context</summary>
                                            <pre>
                                                {JSON.stringify(
                                                    {
                                                        href: selected.href,
                                                        device: selected.device,
                                                        commit: selected.commit,
                                                        dirty: selected.dirty,
                                                        steps: selected.steps,
                                                    },
                                                    null,
                                                    2,
                                                )}
                                            </pre>
                                        </details>
                                    </section>
                                </div>
                            )}
                        </>
                    ) : view === "coverage" ? (
                        <>
                            <h2>Routing coverage</h2>
                            <p className="muted mt-2 mb-5">
                                Routes are distinct from UI states. Prior successful captures remain
                                available when a later attempt fails.
                            </p>
                            <div className="overflow-x-auto">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Route / source</th>
                                            <th>States / captures</th>
                                            <th>Latest attempt</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((route) => {
                                            const captures = routeCaptures(route.id);

                                            return (
                                                <tr key={route.id}>
                                                    <td>
                                                        <strong>{route.id}</strong>
                                                        <div className="muted text-xs">
                                                            {route.source}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {
                                                            new Set(
                                                                captures.map(
                                                                    (capture) => capture.state,
                                                                ),
                                                            ).size
                                                        }{" "}
                                                        / {captures.length}
                                                    </td>
                                                    <td>
                                                        {latestStateAttempts(manifest, route.id)
                                                            .length ? (
                                                            latestStateAttempts(
                                                                manifest,
                                                                route.id,
                                                            ).map((state) => (
                                                                <details key={state.state}>
                                                                    <summary>
                                                                        {state.state}:{" "}
                                                                        <span className="status">
                                                                            {state.status}
                                                                        </span>
                                                                    </summary>
                                                                    {state.reason && (
                                                                        <p className="muted">
                                                                            {state.reason}
                                                                        </p>
                                                                    )}
                                                                </details>
                                                            ))
                                                        ) : (
                                                            <span className="status">
                                                                not attempted
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="mb-4">
                                <h2>Screen gallery</h2>
                                <p className="muted">
                                    {filtered.length} routes · screenshots stay versioned
                                </p>
                            </div>
                            {!manifest.routes.length && (
                                <div className="empty">
                                    <h2>Start with a route scan</h2>
                                    <p className="muted mt-3">
                                        Run <code>pnpm review:scan</code> to discover routes, then{" "}
                                        <code>pnpm review:scan --capture</code> with your local test
                                        environment.
                                    </p>
                                </div>
                            )}
                            {!!manifest.routes.length && !filtered.length && (
                                <p className="empty muted">
                                    No routes match these filters. Change the search or filter.
                                </p>
                            )}
                            {filtered.map((route) => {
                                const captures = routeCaptures(route.id);
                                const states = [
                                    ...new Set(captures.map((capture) => captureKey(capture))),
                                ];
                                const latest = states.map((state) =>
                                    captures.findLast((capture) => captureKey(capture) === state)!,
                                );
                                const attempt = latestAttempt(route.id);
                                return (
                                    <section className="route-card" key={route.id}>
                                        <h3 className="break-all">
                                            {route.id}{" "}
                                            <span className="badge ml-2">
                                                {latest.length} states
                                            </span>
                                        </h3>
                                        <p className="muted mb-4 text-xs">
                                            {route.source}
                                            {route.presentation ? ` · ${route.presentation}` : ""}
                                        </p>
                                        {latest.length ? (
                                            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                                                {latest.map((capture) => {
                                                    const count = annotations.filter((annotation) =>
                                                        manifest.captures.some(
                                                            (version) =>
                                                                version.id ===
                                                                    annotation.captureId &&
                                                                sameCaptureContext(
                                                                    version,
                                                                    capture,
                                                                ),
                                                        ),
                                                    ).length;
                                                    return (
                                                        <button
                                                            key={capture.id}
                                                            className="shot"
                                                            onClick={() => {
                                                                const pendingVersion =
                                                                    captures.find(
                                                                        (version) =>
                                                                            sameCaptureContext(
                                                                                version,
                                                                                capture,
                                                                            ) &&
                                                                            annotations.some(
                                                                                (annotation) =>
                                                                                    annotation.captureId ===
                                                                                        version.id &&
                                                                                    annotation.status !==
                                                                                        "accepted",
                                                                            ),
                                                                    );
                                                                pick(pendingVersion ?? capture);
                                                            }}>
                                                            <img
                                                                src={imageUrl(capture)}
                                                                alt={`${route.id}, ${capture.state}`}
                                                                loading="lazy"
                                                            />
                                                            <strong>{capture.state}</strong>
                                                            <div className="muted text-xs">
                                                                {capture.platform} · {capture.width}{" "}
                                                                × {capture.height}
                                                            </div>
                                                            <div className="mt-2 text-xs">
                                                                {count} findings ·{" "}
                                                                {
                                                                    captures.filter((version) =>
                                                                        sameCaptureContext(
                                                                            version,
                                                                            capture,
                                                                        ),
                                                                    ).length
                                                                }{" "}
                                                                versions
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="muted">
                                                {attempt?.status ?? "Not captured"}
                                                {attempt?.reason
                                                    ? `: ${attempt.reason}`
                                                    : ". A verified test scenario is required."}
                                            </p>
                                        )}
                                        {latest.length > 0 &&
                                            attempt?.status !== "captured" &&
                                            attempt?.reason && (
                                                <p className="muted mt-3">
                                                    Latest attempt: {attempt.status} —{" "}
                                                    {attempt.reason}
                                                </p>
                                            )}
                                    </section>
                                );
                            })}
                        </>
                    )}
                </main>
            </div>
        </>
    );
};
export default Review;
