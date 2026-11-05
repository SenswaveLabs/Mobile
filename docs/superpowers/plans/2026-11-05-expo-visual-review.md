# Expo Visual Review implementation plan

**Goal:** Review native Expo screens locally, annotate immutable captures, export Codex tasks and compare verification captures without accepting findings automatically.

**Architecture:** A separate pnpm workspace in `tools/expo-visual-review` owns a Node CLI and a localhost-only Next.js/Tailwind/react-konva gallery. Expo Router's installed route parser plus TypeScript syntax analysis discover routes without importing application modules. Maestro replays explicit, asserted, read-only journeys against the Android emulator. A local HTTP gateway blocks application writes except login/refresh, explicitly scoped review-widget controls and opt-in test invitation/join/consent flows. Artifacts and SQLite live under the user's data directory, outside Git.

**Constraints:** Keep mobile production code unchanged; use exact dependencies, Node 26.12.1 and pnpm 12.8.1. Use the supplied local test account and MQTT environment keys without logging credentials. Test setup may create clearly named local resources; exploration may not delete resources; device commands are limited to explicitly enabled review widgets and isolated topics. Dynamic destinations require real test fixtures. User approval alone accepts findings.

**Scope:** CLI, discovery, capture, safe test setup, local storage, gallery, export, Codex handoff, verification, scripts, lockfile, ignore rules and repository/tooling/validation documentation. No mobile runtime dependency or public hosting change.

## Deliverables and checks

- [x] Discovery/storage/export: first add Node tests for groups, layouts, dynamic and catch-all routes, query fixtures, immutable captures, annotation bounds, SQLite persistence, approval and version-matched comparisons. Run red, implement, run green.
- [x] Native capture: detect emulator/Maestro, start isolated Metro and read-only gateway, navigate known routes and explicit safe states, assert destination markers, preserve replay steps and failures. Test gateway method restrictions and failure coverage.
- [x] Gallery: responsive grouped thumbnails, search/filter, full-resolution canvas, point/rectangle annotations with keyboard-accessible numeric controls, comments/priorities/statuses, before/after and route coverage. Test real gallery with Playwright.
- [x] Codex: JSON/Markdown exports of pending findings with image dimensions, pixel coordinates, navigation and commit context. `review:fix` prepares a local handoff by default; optional Codex execution is explicit. `review:verify` replays affected scenarios and records comparisons, never approvals.
- [x] Integration: root commands, exact workspace lockfile and guide updates. Run dedicated tests, gallery typecheck/build, repository typecheck/lint/test:poc and native route → screenshot → annotation → task → local correction → recapture. Record actual gaps.

## Review focus

- Auth redirects and missing data must become failed/blocked attempts, never mislabeled screenshots.
- Old captures, annotations and exports survive later scans and capture failures.
- Coordinates remain original screenshot pixels when the canvas is resized.
- Comparison pairs match route, state, platform, resolution and device; a failed verification preserves pending review.
- Local file endpoints cannot read arbitrary paths; writes are bounded, SQLite statements are parameterized, secrets stay out of manifests and exports.

## Results

Implemented and validated against the local Android emulator, API, MQTT broker and test accounts. See the [validation report](../validation/2026-11-05-expo-visual-review.md) for evidence, checks and remaining platform/state limits.
