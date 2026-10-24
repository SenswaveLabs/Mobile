# Dashboard details redesign handoff

## Goal

Finish the native redesign of `/device/dashboard/details`, verify it, then prepare a PR targeting `next-dev`. The user requested planning with Sol 6.1 Max, implementation with Luna 6 Max, Serena for code search, Android emulator verification, no worktrees, and continued work by another model. Stay on the current local `next-dev`; it was synced to `origin/next-dev` at `6d1bcfd` before implementation.

## Implementation state

Luna completed the implementation and self-review, without committing. The screen now uses an edit-only dashboard form, local errors and save state, a read-only grid summary, separate confirmed deletion, and the `dashboardId` route parameter for detail requests. Grid navigation passes both dashboard and device IDs. The header, legacy-toast suppression, focused tests, package script, and UI guidance were updated. Keep the default shared `IconSelector`: the `brand` variant hides global icon search.

Read the [design spec](../specs/2026-10-24-dashboard-details-design.md), [implementation plan](../plans/2026-10-24-dashboard-details.md), and [implementation report](../../.superpowers/sdd/2026-10-24-dashboard-details/task-1-report.md). The Impeccable surface contract exists locally at `.impeccable/surfaces/src-app-app-device-dashboard-details-tsx.md`; `.impeccable` is Git-ignored except for its config, so that contract is not part of the pending diff.

Changed code and tracked documentation are under:

- `src/app/(app)/device/dashboard/details.tsx`
- `src/components/device/dashboards/DashboardForm.tsx`
- `src/components/device/dashboards/Grid/GridDashboardView.tsx`
- `src/app/(app)/_layout.tsx`, `src/contexts/ToastProvider.tsx`
- `tests/dashboardDetails.test.mjs`, `tests/feedback.test.mjs`, `package.json`
- `AGENTS.md`, `docs/agent-guide/interface.md`, `docs/agent-guide/validation.md`
- `docs/superpowers/specs/2026-10-24-dashboard-details-design.md` and `docs/superpowers/plans/2026-10-24-dashboard-details.md`

No commit, push, or PR exists. No native verification has been performed on the redesigned screen.

## Verification already run

- `pnpm typecheck`: exit 0.
- `pnpm lint`: exit 0, with an unused `ContentSection` import warning at `src/components/device/dashboards/DashboardForm.tsx:2`.
- `pnpm test:poc`: 43/43 passed.
- `pnpm test:device-details`: 44/50 passed on the original run; all six new dashboard-details tests failed then. That log predates the current `DashboardForm` (modified at 00:48) and current test file (modified at 00:49). On 2026-10-24 the current focused adapter/feedback suite passed 16/16 with `pnpm exec node --test tests/dashboardDetails.test.mjs tests/feedback.test.mjs`. Treat the old result as historical; its exact route-versus-adapter cause cannot be fully reconstructed without the superseded snapshots. The current suite covers handler/request/state behavior only, not native views.
- `git diff --check` and the implementer's targeted Oxfmt run passed.

Failure output is in `/tmp/senswave-dashboard-details-qa/test-device-details.log`; other check logs are alongside it. Historical failing cases:

- `dashboard details use route identity and retry failed reads`: attempted to read `props` from an undefined form element at line 351.
- `dashboard form validates name and preserves icon and partial payloads`: expected a `{ name: 'Controls' }` PATCH payload but observed `undefined` at line 447.
- `dashboard save locks pending drafts and retains accepted baseline`: did not find `Dashboard saved.` at line 566.
- `dashboard deletion requires confirmation and shares mutation lock`: trigger lookup returned `undefined` at line 574.
- `accepted dashboard deletion survives refresh and navigation failures`: trigger lookup returned `undefined` at line 636.
- `dashboard lifecycles isolate routes and devices`: form lookup returned `undefined` at line 692.

At handoff, root cause had not been diagnosed. Follow-up comparison found the old form did not implement the new edit-only DashboardForm contract: it could not supply the expected changed-only payload or saved feedback, and did not render the details route's delete section children. The old retry/form-mount failures cannot be attributed to product or adapter from the surviving snapshot. The current logic suite passes; none of this is evidence of rendered native behavior.

## Integrated dashboard-flow update (2026-10-24)

The wider flow is tracked in `../specs/2026-10-24-dashboard-flow-design.md`
and `../plans/2026-10-24-dashboard-flow.md`. The user explicitly authorized
fixing every encountered failure autonomously; that task-specific instruction
supersedes this repository's normal wait-on-test-failure rule. Keep
`AGENTS.md`'s global rule intact.

The most recent combined dashboard adapter/handler run passed 54/54, with
`pnpm typecheck`, `pnpm lint`, `pnpm test:poc`, and `git diff --check` passing.
These suites assert request, state, identity and permission logic only. One
current test initially still looked for the retired Grid FAB; its fixture now
checks the Dashboard details action on the Device screen and uses a stubbed Grid.
That failure was fixed and rerun. It does not represent view QA. All screen,
keyboard, dialog, touch and Back checks remain for `emulator-5554`; skip TalkBack
and 200% text scale.

## Emulator setup and remaining checks

The integrated dashboard-flow instruction supersedes the original verification
matrix below: all view and touch checks run on Android emulator `emulator-5554`;
skip TalkBack and 200% text scale. Use normal text scale and report any uncovered
state. The physical Pixel device is not the QA target.

Android API 37 emulator is `emulator-5554`; development Metro was started on port 8081. The `.env` points to the local API through emulator port 7070. Baseline screenshot and UI tree are in `/tmp/senswave-dashboard-details-qa/before.png` and `before.xml`; the old screen showed a preview, disabled grid fields and a FAB. A disposable local dashboard already exists:

- Dashboard `01a16ad0-2acd-77c3-b910-55d81cdb8442`, name `QA dashboard details 20261024`.
- Device `01a15dc3-7288-73d9-9297-55f458bf0792`.
- Original dashboard `01a16a6b-faa9-7e30-b4cc-a911dc997c3e` (`UI first 2026-10-23`) must remain untouched.

Native scenario checklist: `/tmp/senswave-dashboard-details-qa/native-verification.md`. Inspect the screen on emulator and verify route identity while a different dashboard is selected, keyboard reachability, search and cancel in icon selection, save/retry/clean state, delete cancellation via dialog and Android Back, and one accepted deletion of the disposable dashboard. Capture and inspect the actual result. Restore emulator window settings and app theme afterward. Skip TalkBack and 200% text scale.

## Finish

Keep work on the current branch and do not create a worktree. The user later authorized resolving failures autonomously; diagnose and fix any new failing check, then rerun it. After the focused suite passes, run required `pnpm typecheck`, `pnpm lint`, `pnpm test:poc`, `pnpm test:device-details`, and `git diff --check`, then perform Android checks. Review the final diff and prepare a `feat:` commit. Push as a separate remote feature branch without switching the local `next-dev`, and create the PR against `next-dev`. Never merge it.

## Final integrated verification (2026-10-24)

The integrated dashboard flow is implemented on the existing local `next-dev`.
The required final checks passed after the last source/test changes:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:poc` — 43/43
- `pnpm test:device-details` — 111/111
- `pnpm test:dashboard` — 45/45
- `git diff --check`

Android view and interaction checks ran on `emulator-5554` only. The normal phone
window is 1344×2992 at 480 dpi (448 dp); the narrow run used 960×1920 at 480 dpi
(320 dp). Text scale remained 1.0. Light and Dark were inspected, then the app
theme was returned to System. Emulator window size, original device/dashboard,
and ADB reverse mappings (8081 and 7070) were restored. `android-phone.png` and
`user-320.png` are retained native captures; target-size and UI-tree evidence is
beside them.

Native coverage included device entry and dashboard selection, creation/details,
icon search/cancel/save, keyboard reachability, deletion of a disposable QA
dashboard, all four grid columns, 1×1 and 2×2 area selection, Android Back and
Cancel, picker return, accepted widget placement followed by dashboard-scoped
unlink, and inline Button command failure. The resize steppers measured 144×144
physical px at 480 dpi (48 dp); placement actions measured at least 48 dp when
fully visible after scrolling. The original `UI Review 2026-10-23`
dashboard/device remain intact; the disposable QA dashboard was deleted.

Native request-failure injection for dashboard reads/placement, offline and
empty-dashboard-list states, Display-role gestures, and a forced unlink DELETE
failure were not exercised. Handler suites cover the rejection paths. Native
unlink failure remained unforced. Physical hardware, TalkBack and 200% text were
not tested; TalkBack and 200% text were explicitly skipped. No backend contract
changed. A transient geolocation-unavailable toast after cold launch was
unrelated to dashboard flows and is excluded from retained evidence.

The Impeccable finish review is recorded at
`../../../.impeccable/review/dashboard-flow/finish-review.md` with disposition
`ship`. The documenter pass found that the existing global `DESIGN.md` still
matches the inspected theme and component patterns, so it was left unchanged.
The final Sol 6.1 Max review reported no material findings. Commit `dbe8029`
(`feat: complete dashboard management and widget placement flow`) was pushed to
`feat/dashboard-flow-2026-10-24`. PR [#29](https://github.com/SenswaveLabs/Mobile/pull/29)
targets `next-dev` and remains open for review; it has not been merged.

## Post-review fixes and evidence

The initial Sol review found three material issues, all fixed before the final
verification run:

1. A dashboard read error could replace Grid in the route tree after an
   accepted unlink and failed refresh. `DashboardView` now reserves the same
   Grid child slot while showing inline retry feedback. The regression in
   `tests/dashboardView.test.mjs` confirms the same child index remains mounted.
2. At 320 dp, a zero-width first layout briefly drew 48 dp cells while the
   measured viewport later drew 66 dp cells and a 66 dp preview. Grid now uses
   `windowWidth - 32` until measurement, and keys measured width to the window
   size. Final Android UIA bounds show four 198×288 px (66×96 dp) cells, with
   preview aligned to the same cell geometry. The final captures and native
   bounds are in `.impeccable/review/dashboard-flow/place-selected-col1-320-light.png`,
   `place-selected-col4-320-light.png`, `place-grid-320-dark-final.png`, and
   the adjacent XML evidence.
3. An accepted Slider command left its thumb/readout at the old reported value
   after the pending transition. Accepted values now become the controlled
   Slider value and the rollback baseline. Adapter coverage confirms 35 remains
   rendered after acceptance and a later move to 20 sends a second action; a
   rejected command returns to the last accepted value.
4. The final follow-up found a race where a newer live report could arrive
   during a pending command, then a rejection restored the older value captured
   by the action closure. SliderWidget now reads the latest committed/reported
   baseline from a ref when the action settles. The focused adapter test
   reproduces report 20→50 during the pending action and verifies rejection
   leaves both the track source and readout at 50.

After those fixes, `pnpm typecheck`, `pnpm lint`, `pnpm test:poc` (43/43),
`pnpm test:device-details` (111/111), `pnpm test:dashboard` (45/45) and
`git diff --check` all passed. A stale expectation in the dashboard suite was
updated because the rollback contract is the last accepted value, not the
original reported value; the home-tile Slider regressions still pass in
`deviceTileActions.test.mjs`. The pending-report race regression is in
`tests/widgetActions.test.mjs`.

Final native placement evidence includes the `/device/dashboard/placeWidget`
picker at 320 dp with the selected area carried as “Row 1 · Column 3 · 1×1”,
an operation with no widgets, all four free cells tapped, the Back return from
picker to placement, and Back cancellation that retained the existing device
and dashboard. Native UIA measured the fully visible 320 dp grid slots at
66×96 dp and the resize stepper targets at 144×144 physical px (48×48 dp) at
480 dpi. The selected preview is visible in the light capture; both Light and
Dark use the same normal-text 320 dp geometry. Screenshots and UI trees are
under `.impeccable/review/dashboard-flow/`.

Native picker loading/error injection, dashboard read/placement failure,
offline and Display-role interaction were unavailable; their retry/rejection
paths are adapter-covered. Native unlink rejection stayed unforced. The app
theme is restored to System, the original `UI Review 2026-10-23` dashboard and
device are selected and untouched, the temporary QA dashboard is deleted, and
the emulator is back at 1344×2992, 480 dpi, font scale 1.0 with ADB reverse
ports 8081 and 7070. TalkBack and 200% text were explicitly skipped; physical
hardware was not tested.
