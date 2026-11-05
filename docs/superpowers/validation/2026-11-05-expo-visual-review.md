# Expo Visual Review validation

Validated locally on 2026-11-05–06 on `next-dev`. Production mobile source,
authentication logic and API contracts were not changed.
The implementation was subsequently isolated on `feat/expo-visual-review`, based
on `next-dev` commit `6857026`, without updating or merging into `next-dev`.

## Environment and scope

- Node 26.12.1, pnpm 12.8.1; frozen workspace install passed.
- Existing Expo SDK 54.0.34, Expo Router 6.0.23, React Native 0.81.5.
- Android `emulator-5554`, installed next-dev development client, 1344 × 2992 PNGs.
- Maestro 2.12.1, isolated Metro 8090 and WSL ADB server 5038.
- Local test API only. Expo MCP was not configured; discovery used the installed
  Expo Router parser without evaluating application screens.
- Artifacts, private invitation codes, SQLite, replay diagnostics and exports
  remain in the user data directory printed by `pnpm review:open`, outside Git.

## Native evidence

All 46 discovered routes have at least one asserted Android capture. The final
artifact manifest contains 92 immutable screenshots and 81 distinct
route/state/account combinations, including
public authentication and recovery, private screens, all six widget form/detail
types, icon and color sheets, both draft automation children, data-source tabs,
the source chooser, homes without sources, and sharing roles. Route coverage does
not mean every possible UI/data/permission combination has been exercised.

Test fixtures contain three homes, nine devices, fourteen operations, fourteen
widgets, one dashboard and one automation. Only the main home has an assigned
source; Loft and Garden intentionally exercise empty/no-source states. The API
permits one home per broker and one broker per host/port.

`mqtt-final.json` records publish/subscribe on fourteen topics under the exact
repository review namespace and five widget commands returning HTTP 204. Control
probes first validate the widget, device, operation and topic binding. Messages
are non-retained. This proves local broker/API delivery, not physical hardware.

The owner created real invitations through the native UI. AGENT2 joined with
Manage permission; AGENT3 joined with Display permission. API reads confirmed
`isOwner: false` for both and `canManage: true` / `false` respectively.
`sharing-proof.json` and the immutable screenshots hold local evidence. Both
codes are latched used. AGENT4 remains unjoined and unconsented; its authenticated
consent-screen verification succeeded without accepting consent.

The final alternate-home/source run (`6261a163-ad66-4eee-b54b-61368681f27c`)
captured five states with zero failures. The manifest retains earlier failed
attempts. One historical source-selection `default` attempt expected the chooser
on a home that already had a source; the correct already-linked recovery and the
chooser on an unlinked owned home were subsequently captured as explicit states.

## Review → task → correction → verification

1. Native Home capture `4d78fb4f-b958-484c-bd4c-e907a5b1d849` included a development
   LogBox overlay.
2. A local point finding (`4a62e1b3-29dd-4260-87da-a769abfd56a4`) requested a clean
   capture. SQLite retained its geometry, priority, comment and navigation.
3. `pnpm review:export` and `pnpm review:fix` produced JSON, Markdown and the Codex
   handoff with the real image path and screenshot-pixel coordinates.
4. Codex changed only the review tool: its isolated Metro uses `--no-dev` to
   remove development overlays and `--clear` to avoid a stale inlined gateway URL.
5. Native verification produced clean matching-resolution Home screenshot
   `57f4f7e3-8aeb-4f05-a906-d7a55e7cebf2` (run
   `6c66dab8-0beb-4e39-aedd-a5ffedc00de0`, one capture, zero failures);
   the gallery pairs immutable Before/After images. The finding remains `open`.

The current Codex session applied the correction from the generated handoff.
The optional nested `review:fix --run` command was not executed.

## Automated checks

- `pnpm test:visual-review`: 15 passed. Covers discovery, dynamic/catch-all
  fixtures, immutable storage, SQLite, pixel bounds, explicit approval, comparison
  identity, safe replay validation, HTTP/WebSocket gateway cleanup, scoped sharing
  with accepted-once joining, MQTT topic/control binding, failed recapture and
  finding deletion without losing screenshots or unrelated findings.
- `pnpm test:visual-review:gallery`: passed against a real native PNG. Exercised
  point and rectangle comments, priority, persistence after reload, JSON download,
  Codex handoff, before/after mechanics, desktop/mobile layout, touch scrolling,
  Fit to height / Fit to width / 100% resolution in both the editor and comparison at mobile,
  desktop, 2560 × 1440 and 3840 × 2160 viewport sizes, and cancelled/confirmed
  finding deletion with persistence and export updates. Fit fills the viewport
  even when it is wider than the original screenshot. Height fit shows the whole
  image below the compact toolbar; screenshot coordinates remain original pixels.
  Desktop notes scroll beside the preview, mobile notes remain reachable below it,
  and the version picker stays directly on the toolbar. Switching versions updates
  the displayed capture and its findings; the original-image action is removed.
  The regressions reproduced
  before fixing viewport measurement, comparison zoom and the 100% fit-scale cap.
  Latest browser evidence: `browser-checks/87c966a5-82b3-4107-b8b6-1aebf1582b29`.
  Its comparison fixture deliberately uses two copies of the same PNG; the native
  correction above separately proves real recapture.
- Gallery TypeScript and optimized Next.js build passed.
- Repository `pnpm typecheck`, `pnpm lint` and `pnpm test:poc` passed; the latter
  ran 112 tests. `git diff --check` passed.
- Metadata/exports were checked against configured passwords/tokens and private
  invitation codes: no matches. Screenshots themselves may show account details
  and invitation codes and must stay private.
- Independent code and UI reviews were performed. Reported replay, cleanup,
  comparison, mobile scrolling and placeholder-contrast defects were addressed;
  placeholders measured 6.74:1 contrast in the live gallery.

## Limits

iOS/simctl was not available on this Linux workspace and remains unverified.
One-time invitation creation, pre-join and accepted-consent states need fresh
test identities for another equivalent capture; verification does not reset data
or repeat accepted writes. Destructive operations and physical device control
were not tested. Full screen-reader and multi-device accessibility testing was
not performed. Tooling is committed locally on its dedicated branch; no push,
merge or release was made. A private standalone checkout/build service is not
part of this repository-local MVP.
