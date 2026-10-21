# Validation and completion

Start with the narrowest check that covers the change. Do not add a test framework
or rerun an expensive build for an unrelated documentation edit.

## Static and build checks

- Documentation-only changes: check relative links, preserved instructions and
  `git diff --check`.
- Non-trivial source changes: run `pnpm typecheck` and `pnpm lint`.
- Auth validation, route boundaries or submission behavior: run `pnpm test:poc`.
  Auth and reset checks execute their real forms with `tests/nativeComponentHarness.mjs`.
  Feedback checks distinguish field validation from action failures and verify
  legacy toasts cannot overlay redesigned routes, including after late responses.
  Dialog action checks execute the real label styling against both theme palettes,
  requiring at least 4.5:1 text contrast for Delete, Leave and Cancel in idle and pressed states.
  Data-source badge checks cover backend-state labels, updates after state changes,
  accessible status text and at least 4.5:1 contrast in both theme palettes.
- Home selection, joining, creation, settings, loading or recovery behavior: run `pnpm test:homes`.
  It executes real list, row and join form handlers with the same hook/host adapter,
  checking OTP native cell editing, paste/autofill, Backspace and focus progression, focus loads, pending/duplicate
  submissions, failed switches, row errors,
  list retries, invite validation/paste, action errors above Join home and navigation after
  acceptance or leaving the form. The recovery checks also execute the real home
  picker route without a current home and the provider's initializer, verifying
  failure cleanup and caller-owned feedback.
  Home-form checks cover name validation/normalization, synchronous submit locks,
  preserved drafts, initial/saved icons and coordinates, partial edit payloads,
  pending location requests, first-home activation recovery, local source/access errors,
  successful saves completed after blur, accepted-create recovery after refocus,
  name errors preserved while changing icons or locations,
  owner/member actions, empty-room Add permissions and save locks, room-loading recovery, unlink refresh failure, destructive confirmation locks
  and controlled AlertDialog cancellation without a deletion request,
  and recovery/invalidation after deletion or leaving, including late completion
  and a different current selection.
  Map checks cover address-only display, draft confirmation/cancellation, zero and
  negative coordinates, native longitude/latitude order, duplicate confirmation,
  late results after cancellation, load retry/timeout, failed native tile requests
  (including a misleading full-render event) and invalid native coordinates.
  These checks do not establish native rendering, keyboard or assistive-technology behavior.
- Room creation and editing are included in `pnpm test:homes`. Checks execute the real form and route handlers for normalized name validation, keyboard/button submission locks, failed-save draft retention, saved baselines after blur, load retry, accepted-create recovery without duplicate writes, delete cancellation/failure and stale completion after changing rooms.
- Main home dashboard, room filtering, device-tile controls and dashboard slider: run `pnpm test:dashboard`
  (`node --test tests/homeDashboard.test.mjs tests/deviceTileActions.test.mjs`). It executes the real provider and
  component handlers, covering selected-room retention, failed/malformed reads,
  cached data and late responses across homes, complete collections beyond the API's
  default ten results and filtering devices from later results, retained live callbacks, manager/owner
  actions, command locks and failures, inactive previews, exact readouts,
  retained feedback after failed refresh and recovery after a successful same-value
  refresh, and the large-text column fallback. Slider checks cover the 48 dp native
  height/tint props, finite range/step guards and 10,000-step cap, changed-release
  commands, non-touch adjustments and duplicate completion suppression, reported-value synchronization, zero with a negative minimum and widget
  pending/failure recovery. Shared-switch checks cover branded overrides and legacy
  color defaults. Action checks execute the root optimistic provider and the shared
  home-tile hook for Switch, Slider and Options: immediate values, independent
  completion of concurrent devices, synchronous duplicate guards, accepted-value
  retention, rollback and recovery alerts, stale-read rejection, late completion
  after unmount, and preview isolation. Manual timers cover no spinner before
  300 ms, spinner after 300 ms even beyond four seconds, and cancellation for quick
  actions. Presentation checks retain the same layout slots while pending; mixed
  grid rows preserve order and give Slider a complete row. These checks do not establish
  native layout, touch ordering, screen-reader behavior or hardware command delivery.
- Device tile settings: run `pnpm test:device-details`. It covers multiple Display readings, Boolean read-only selection, duplicate-reference validation, metadata stripping and reset baselines, plus Slider/Options
  operation filtering, retained step/unit drafts and partial edit payloads, plus
  the tile selector's fixed busy icon slot, current-choice guard, changed-choice
  submission, cancellation and focus callbacks. The handler adapter cannot prove
  native slider targets, sheet focus or rendering during a React async action.
- Data-source details and broker/subscription actions: run `pnpm test:data-sources`.
  It executes the real settings form, details route and overview panel handlers,
  covering failed-save draft retention, successful saved baseline without a Reset action, duplicate
  save/client-action locks, detail and client retries, mounted tab state, client
  status updates, exact TLS/MQTT selector values, bottom-sheet choice/cancellation/disabled state/focus callbacks,
  dismissal completion and repeated-choice guards, and subscription removal cancellation/failure/recovery. These
  checks do not establish native layout, keyboard, system Back or screen-reader behavior.
- Before committing: run `pnpm typecheck`, `pnpm lint` and `pnpm test:poc`, plus
  the affected flow checks above.
- Native auth bundling, routing or asset changes: use the Android export checks in
  [native auth UI](../native-auth-ui.md).
- Native modules or Android build configuration: verify prebuild and the affected
  native build; see [Tooling](tooling.md). Use a development build when the changed
  module is unavailable in Expo Go.
- Shared API contracts: verify the backend build at `Senswave.sln` level.

CI verifies lint, types, auth/build tests, production Android JS export and ARM64
debug compilation on PRs. Gradle profiles are uploaded for timing analysis.
Validate release-only tasks and other supported architectures during release
verification. Production and private next-dev build profiles are unchanged.
Pushes and manual runs on `next-dev` also run the Android check to populate cache
for new PRs. After integration, verify a completed `next-dev` build followed by
a fresh PR restoring Gradle state from the base branch; rerunning an existing PR
only proves reuse within that PR.
Next-dev pushes can request an infrastructure version PR; all public jobs stay
on GitHub-hosted runners. A human merge in private infra starts the VPS build.
Production deployment and EAS remote version changes remain manual.
For this pipeline, run `pnpm test:build`, the private infra mobile tests, workflow
syntax checks and a local container/signing/download check when tools are available.
Report GitHub App, VPS and physical installation checks separately; local tests
do not prove that the external credentials, runner access or DNS are configured.

## Runtime checks

For Home/Device icon changes, also run `pnpm test:icons`. It executes the catalog
hook, shared selector and real form handlers with the existing native host adapter,
checking create/edit, constrained full search, exact-key submission, default and
wrong-resource validation, stored selection/reset, historical keys, loading,
failure/retry, cached success, server/account changes and late responses. Presentation
checks compare every catalog key's installed Lucide SVG primitives with the shared
geometry fixture and retain the legacy Ionicons checks. These checks do not establish
native layout, keyboard or screen-reader behavior.

For user-facing changes, exercise the affected flow in a native development build
or emulator when available. Check navigation/Back, keyboard/scrolling, safe areas,
light/dark mode, text scaling and applicable loading, empty, success and error
states. Check screen-reader labels, focus order and usable touch targets.
For the home dashboard, exercise home switching, source/room/device navigation,
room filtering and selection after pull-to-refresh. Check one/two/three-column
layouts at their width/text-scale boundaries, wrapping labels/readouts and the
complete informational footer in both themes. Verify the switch target does not
open the device dashboard, pending commands cannot repeat, and failure feedback
can recover; report hardware commands separately from fixture or handler checks.
For home Switch, Slider and Options actions, observe the immediate selected value
before the response, then delayed spinner and final value/rollback. Keep an action
pending beyond four seconds to confirm it retains only the spinner and unchanged
tile geometry. Check the entire home list stays visible in intermediate frames;
handler tests cannot detect a native Fabric/Suspense fallback blink. Exercise a
second device while the first is pending to verify its feedback finishes
independently. Options current selection, Back, Close and scrim send no command.
Check Slider's full-row packing, changed release and real 48 dp SeekBar target in
both themes and with large text; verify settings previews send no commands or live
subscriptions. Separate isolated demo-topic checks from physical device delivery.
For the dashboard slider, verify an enabled native SeekBar has a usable 48 dp
target, including its margins; wrapper dimensions alone are insufficient. Check
thumb, active track and rail contrast in both themes from actual pixels, since
Android can dim its native rail. Exercise dragging without intermediate commands,
changed release, reported-value updates, pending/error recovery and the configured
dashboard grid sizes. A local slider fixture proves touch behavior without proving
hardware delivery or native pending/error states.
For home location, pan/zoom the native map, confirm its center, cancel without
changing the draft and reopen settings with the saved location. Verify map
loading/retry and visible OpenStreetMap attribution. A JavaScript export cannot replace the native
MapLibre build and device check.

React Native Web previews can help check native component layouts with fixture
providers, but do not verify device safe areas, hardware Back or screen readers.
For auth/reset/join layout changes, check actions and first/last fields remain
reachable in the same scroll content, including with the keyboard open, short/tall
windows, both themes and normal/200% text. Exercise validation, duplicate submit,
pending and recovery. Handler tests do not prove native rendering or touch ordering.

Respect user instructions about tools and devices; do not restart verification
they have stopped. If a backend, device or tool is unavailable, report exactly
what remains unverified instead of claiming a pass.

## Handoff

Confirm the requested behavior, preserved API/application boundaries, relevant
checks and documentation updates. Report failures and any known limitations.
Notify on test failure and wait for human; never merge PRs autonomously. Keep
`next-dev` separate from `main` until integration is explicitly requested.

The dashboard suite also covers neutral compact surfaces, distinct Inactive/No data chips beside the room, read-only Boolean On/Off, multi-reading labels and units, zero/missing readings, inactive command guards with continued live updates, retained callback guards, list row packing and layout preference restoration without late-hydration races. Native screenshots verify layout, not hardware delivery. Changes to the shared Display contract also require the sibling backend's solution build and Devices unit, integration and end-test projects.

The native handler adapter traverses the `heading` slot used by Slider tile navigation. Its navigation, permissions and preview regression runs across all five tile types. No data tests distinguish missing data from zero/false and from a valid additional reading. Layout write ordering is checked with a delayed previous write.

General-screen control checks cover the single-choice List/Grid group, ignored empty/current selections, keyboard focus and the Options trigger's expanded state and focus outline. Native verification remains necessary for compact selection rendering, radio announcements, 48 dp targets and sheet cancellation.
