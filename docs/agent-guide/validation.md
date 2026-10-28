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
  legacy toasts cannot overlay redesigned routes, including data-source creation,
  broker subscription and late responses. Profile checks execute the real route and confirmation with
  fake provider hooks, covering exact theme values, read-only English, synchronous
  mutation locks, inline failures, deletion cancellation, stale feedback after blur,
  navigation and missing-identity recovery. They also check that the decorative
  avatar initial stays within the fixed circle, that the dialog uses the shared
  `common/Button`, and that its real label renders as scalable native `Text` with
  a 48 dp minimum target and preserved accessibility state. A real `UserProvider` check confirms
  profile mutation failures return `SimpleResult` without emitting global toast feedback.
  A delayed identity-retry test composes the real `UserProvider` and `ToastProvider`,
  requiring Profile's silent getter not to toast or dismiss the destination keyboard
  after navigation, while the default getter retains its legacy toast.
  The focused profile, feedback and sheet
  checks are `pnpm exec node --test tests/profile.test.mjs tests/feedback.test.mjs tests/bottomSheetSelect.test.mjs`.
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
  Home-source checks exercise real `ProfileHeader` and `HomeStateWidget` across every
  exact backend state, missing/empty assignment with stale-state precedence,
  Owner/Manage/Display permissions,
  owner navigation targets, and home/role transitions. They also assert accessible
  notices, wrapping subtitle styles and preserved header targets; they do not prove
  native fitting or TalkBack behavior.
- Device creation and tile settings: run `pnpm test:device-details`. Create checks cover home/name/icon/room payloads, shared keyboard/button submission locks, inline POST failure without a legacy toast, accepted creation through refresh failure, late completion after blur, refocus recovery, empty-history navigation fallback and duplicate-POST prevention. Tile checks cover multiple Display readings, Boolean read-only selection, duplicate-reference validation, metadata stripping and reset baselines, plus Slider/Options
  operation filtering, retained step/unit drafts and partial edit payloads, plus
  the tile selector's fixed busy icon slot, current-choice guard, changed-choice
  submission, cancellation and focus callbacks. The handler adapter cannot prove
  native slider targets, sheet focus or rendering during a React async action.
- Dashboard creation is also in `pnpm test:device-details` (`tests/dashboardCreate.test.mjs`). It executes the real form and route handlers for trimmed name and exact grid bounds, preserved global icon keys and payload, shared Go/touch duplicate locking, editable-but-guarded pending fields, draft recovery after POST rejection/throw, accepted-once matching-device refresh/navigation, blur/refocus behavior, navigation-only recovery and missing/array route IDs. A Device route regression checks first-option fallback for empty/stale current IDs and preserves valid non-first selection. These handler checks do not establish native layout, keyboard behavior or screen-reader behavior.
- Dashboard details are also in `pnpm test:device-details` (`tests/dashboardDetails.test.mjs`). Real form/route handlers cover route-ID requests despite a different provider selection, malformed/failed reads and Retry, missing/array IDs, trimmed Name boundaries, exact partial Name/Icon PATCHes, historical keys and invalid grid configuration, pending locks and saved baselines, confirmation cancellation/Back, delete failure, accepted-once return recovery and stale route/device work. The PR #29 follow-up must replace the current global-search expectation with the required brand bottom sheet restricted to 16 dashboard keys, including preservation of an unchanged historical key. These checks do not establish native layout, keyboard behavior, dialog focus restoration or TalkBack behavior.
- Dashboard flow state and widget interactions are also in `pnpm test:device-details`: `deviceDashboard.test.mjs` covers dashboard provider/route identity and stale response handling; `dashboardGrid.test.mjs` and `dashboardGridActions.test.mjs` cover geometry, gesture snapping/clamping/collision rejection, an immediately visible grid, direct free-cell navigation and dashboard-bound unlink handlers; `widgetPlacement.test.mjs` and `widgetPicker.test.mjs` cover routed area validation, selection-only rows, exclusion of placed widgets, gesture responder wiring, the latest valid draft, request identity and recovery; `widgetActions.test.mjs` covers exact command payloads, locking, control acceptance and inline error handlers; `widgetConfigPermissions.test.mjs` covers configuration gates; `widgetFormValidation.test.mjs` covers Slider creation validity after step changes. These `nativeComponentHarness` suites are adapter/handler logic only, never rendered-view QA.
- Data-source creation, details and broker/subscription actions: run `pnpm test:data-sources`.
  It executes the real create form/route, settings form, details route, overview panel, broker-client start form/route and Add subscription form handlers.
  Create checks cover exact payload fields and MQTT/TLS values, required field
  errors after submit, malformed ports, shared keyboard/button pending locks,
  failed-save draft retention, stale error clearing, accepted-create duplicate
  prevention and blur/refocus recovery. Details checks cover failed-save draft
  retention, successful saved baseline without a Reset action, duplicate
  save/client-action locks, detail and client retries, mounted tab state, client
  status updates, exact TLS/MQTT selector values, bottom-sheet choice/cancellation/disabled state/focus callbacks,
  dismissal completion and repeated-choice guards, and subscription removal cancellation/failure/recovery. Broker-client start checks cover route ID normalization/recovery, credential restore/read failures and late cleanup, required/length boundaries, exact values and storage order, checkbox draft state, Go/Start locks, deferred storage/POST with busy editable fields that reject draft changes, failed storage/POST recovery and accepted-once navigation after blur. They also inspect restore/accepted field disabling, the 48 dp checkbox target and accessibility state. These checks do not establish native layout, keyboard, system Back or screen-reader behavior.
  Add subscription checks cover route ID recovery and array normalization, exact topic payloads with the 256-character boundary, required-topic focus, synchronous Go/button locking, editable-but-guarded pending input, rejected/thrown POST recovery, accepted-once navigation and blur/refocus completion. Feedback checks include its legacy-toast suppression. These checks do not establish native keyboard behavior, layout or screen-reader behavior.
- Before committing: run `pnpm typecheck`, `pnpm lint` and `pnpm test:poc`, plus
  the affected flow checks above.
- Widget polish is included in `pnpm test:device-details`: `widgetTypeForms`,
  `widgetFormValidation`, `widgetCreate` and `widgetDetails` execute type-specific
  value/step/unit/option validation, read-only and pending guards, stale read
  rejection, trimmed names, inline creation/deletion recovery, synchronous locks,
  accepted-once return and Cancel/Back handlers. Widget action checks also cover
  discarded Color drafts, Radio scroll/selection and retained pending labels.
  These remain handler adapters; check native keyboard reachability, 48 dp targets,
  normal-text 320/448 dp layouts, both themes, shared dashboard scrolling,
  placement, selection-only picking and unlink on the emulator. For this polish
  pass, enlargement and TalkBack are explicitly excluded by the user.
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
For Profile, open Theme and verify Light/Dark/System persistence, read-only English,
Data sources and App information navigation, wrapping for long identity text at
normal and 200% scale, the avatar initial at 200% scale, and fully visible scalable
Cancel/Delete account labels in 48 dp minimum targets. Verify deletion cancellation
with both Cancel and Android Back.
Verify the dialog returns focus to Delete account; never confirm deletion on a real
account. Handler checks do not verify native fit, Back handling or focus restoration.
For the home dashboard, exercise home switching, source/room/device navigation,
room filtering and selection after pull-to-refresh. Check one/two/three-column
layouts at their width/text-scale boundaries, wrapping labels/readouts and the
complete informational footer in both themes. Verify the switch target does not
open the device dashboard, pending commands cannot repeat, and failure feedback
can recover; report hardware commands separately from fixture or handler checks.
For dashboard creation, check both themes, normal text, a short/narrow
window, keyboard reachability, icon choice/cancel, Back, field validation, failed
request draft recovery and one accepted create on isolated local data. Confirm the
Device selector remains usable while its refreshed current dashboard ID resolves.
For dashboard details, use a disposable local dashboard: verify routed identity,
both themes, normal text, narrow/short windows, keyboard reachability, icon
choice/cancel, fixed grid copy, Save failure recovery and one confirmed deletion.
Keep original dashboards untouched; handler checks do not prove native layout or
Back/focus behavior.
For the integrated dashboard-flow task, perform every visual and interaction
check on Android emulator `emulator-5554` at normal text. Skip TalkBack and 200%
text scaling under the user's instruction. Exercise manager and Display access,
device/dashboard switching, loading/empty/offline/retry states, the full Grid
scroll and free-cell sizing, picker selection without power mutation, accepted
placement once, command failure/retry without grid movement, and unlink Cancel/Back/confirm.
Use only disposable local data for writes and preserve the original dashboard.
`nativeComponentHarness` results remain adapter/handler evidence and do not
substitute for emulator screenshots or touch behavior.

### Preventing configuration UI regressions

The [PR #29 correction plan](../superpowers/plans/2026-10-28-dashboard-pr29-corrections.md)
maps these required checks to implementation tasks. The planned operation, color
field and snackbar tests do not exist yet; add them to `test:device-details` with
their implementations. A plan or handler assertion is not evidence of native fit.

For every affected UI change, check the relevant items before delivery:

- **Section actions:** Compare against Devices/Add device. Add operation stays
  beside the heading in picker and management views, with a named 48 dp target;
  test long headings and owner/Manage/Display permissions.
- **Creation actions:** Compare against Create Home. Check all widget types,
  operation creation and nested option forms on tall and short windows with IME
  open. The action grows to the bottom while staying in the same scroll as fields
  and feedback. Read-only details keep their normal content/deletion sequence.
- **Icon choices:** Verify dashboard create/details offer exactly 16 historical
  keys and Radio offers 15, in four-column brand bottom sheets. Check Cancel,
  Back, focus return and a stored outside-palette key with a name-only save.
  Home/Device catalogs and Automation must still follow their existing contracts.
- **Placement selection:** Verify the neutral 1 dp preview, small resize visual
  inside its 48 dp target, active focus/blocked states, actual drag/resize, snapping,
  clamping, collisions and handle visibility after release. Styling alone must
  not change geometry or responder behavior.
- **Color:** Check exact short/full HEX and case, invalid input, local-only Button
  configuration, live Confirm, same-tick duplicates, rejected/thrown send recovery,
  late reported values, pending dismissal guards and Cancel/Back draft discard.
  Opening or moving a picker must issue no command; only live Confirm sends.
- **Operation subforms:** Exercise all six types, Plain Text/JSON mapping, Boolean
  default/inverse/custom values, numeric range/separator, typed Options and ordered
  JSON paths. Assert false/0/"0" distinction, active-field validation, draft
  retention and accepted-once POST return. Pin current JSON segments at 1–63
  characters, maximum five, with quote/backslash/control rejection; preserve the
  existing contract rather than silently widening it during styling work.
- **Stable dashboard errors:** Compare widget bounds, free-cell coordinates and
  scroll offset before failure, during feedback and after retry. Test long
  messages, last-row reachability, one snackbar at a time and two widgets failing
  independently. A's late success cannot dismiss B; route/home/access-loss/unlink
  changes invalidate retained retries, while Display retains live commands/Retry.
  Color shows failure inside its open editor with
  no duplicate dashboard message. Keep Home tile feedback regression checks.

Capture numbered before/after images at 320 dp Dark and 448 dp Light, with the
commit, viewport and state recorded in a manifest. For this PR follow-up, retain
the existing normal-text scope and user exclusions for enlargement/TalkBack;
general accessibility requirements still apply to implementation. Use disposable
local data/test topics and verify cleanup and restored emulator settings.
Also inspect source status in both themes: connected subtitle with no extra content
notice; Connecting and Restarting; disconnected, Error, missing and unavailable
notices; owner-only details/setup routes with Back; no source action for Manage or
Display; and unchanged Display device controls. Change home and role while notices
are visible. At normal and 200% text scale, use a long home name in a narrow 320 dp
window to check subtitle/name wrapping, avatar/settings reachability, 48 dp actions,
notice wrapping and scrolling. Exercise accessibility order/announcement only with
native tooling; report TalkBack behavior not exercised.
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
