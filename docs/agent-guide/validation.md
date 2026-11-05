# Validation and completion

Start with the narrowest check that covers the change. Do not add a test framework
or rerun an expensive build for an unrelated documentation edit.

## Static and build checks

Expo Visual Review has dedicated Node checks in `pnpm test:visual-review` for route
discovery, test destinations, immutable captures, annotation bounds, SQLite
persistence, explicit approval, comparison identity, safe gateway methods and
Maestro serialization. Its separate workspace also needs `typecheck` and `build`.
Native screenshot evidence requires the emulator/Maestro/local-API flow described
in the [tool README](../../tools/expo-visual-review/README.md); static tests do not
establish route reachability or native appearance. Report failed/blocked attempts
and unverified platforms explicitly. Verification never accepts a finding.
Actual Android, sharing, MQTT and browser evidence is recorded in the
[Expo Visual Review validation report](../superpowers/validation/2026-11-05-expo-visual-review.md).

Automation details regressions cover the native modal/host binding, cancellation, captured confirmation identity and accepted-once deletion. Both child forms distinguish device loading, error/retry and true empty state while preserving drafts. Final Android evidence and remaining limits are recorded in the [automation validation report](../superpowers/validation/2026-10-31-automations.md).

The [UI audit 37 summary](../../reports/ui-audit-37.md) records the creation-action
layout, duplicate operation labels, What's New text and scrollable read recovery
checks, including their native keyboard and large-text limits.

- Automation flows run through `pnpm test:automations` (`automationList`, `automationCreate`, `automationDetails`, `automationChildren`, `automationState`). The child suite uses real form/route handlers to cover full operation reads, eleventh-item selection, distinct duplicate-name/type labels with colliding ID prefixes and matching selected values in both forms, exact raw names/IDs, supported condition types, finite numeric bounds, exact values, stale device reads, session and owner checks, local draft append, awaited existing-child PUTs, retry and accepted-once return. Run `pnpm exec node --test tests/bottomSheetSelect.test.mjs tests/iconSelector.test.mjs` when changing shared selection/icon controls. These harness checks do not establish native layout, keyboard reachability, touch ordering or TalkBack behavior; record Android verification separately.
- Documentation-only changes: check relative links, preserved instructions and
  `git diff --check`.
- Non-trivial source changes: run `pnpm typecheck` and `pnpm lint`.
- Auth validation, route boundaries or submission behavior: run `pnpm test:poc`.
  `theme.test.mjs` covers explicit Light/Dark versus System, late initialization
  and reset work, storage-read rejection and AA contrast for operation markers
  (all six types and unknown) and Create room in both real theme palettes.
  Auth and reset checks execute their real forms with `tests/nativeComponentHarness.mjs`.
  Feedback checks distinguish field validation from action failures and verify
  global toast infrastructure is absent from all routes, including data-source creation,
  broker subscription and late responses. Profile checks execute the real route and confirmation with
  fake provider hooks, covering exact theme values, read-only English, synchronous
  mutation locks, inline failures, deletion cancellation, stale feedback after blur,
  navigation and missing-identity recovery. They also check that the decorative
  avatar initial stays within the fixed circle, that the dialog uses the shared
  `common/Button`, and that its real label renders as scalable native `Text` with
  a 48 dp minimum target and preserved accessibility state. A real `UserProvider` check confirms
  profile mutation failures return `SimpleResult` without emitting global toast feedback.
  Account feedback checks execute UserProvider/HttpClientProvider without global toast infrastructure and cover local Result failures, session logout/refresh and late Home responses. Source/dependency invariants reject reintroducing global toast infrastructure on current or future routes.
  Consent checks in `tests/consents.test.mjs` run the real route and `UserProvider`
  with deferred HTTP. They cover account read retry,
  active consent, failed/thrown POST, synchronous double-press locking, accepted
  POST recovery without duplicate writes, refocus, navigation-only Continue,
  cancellation/logout, legal Back, stale-session data/theme guards and shared
  header fallback behavior. Retained actions are invoked after legal navigation,
  malformed consent booleans and consumed email/language/theme fields are rejected,
  and transport/JSON failures resolve through `Result` without an unhandled silent
  initialization rejection. Rejected theme persistence remains handled after valid
  account data and the synchronous visible theme update; a deferred reset on the real
  `ThemeProvider` cannot overwrite a newer session theme. These checks establish
  handler behavior, not native layout, keyboard, safe-area or TalkBack behavior.
  Email confirmation checks use the real `SessionProvider` and `executeTimeout`
  with rejected fetches, verifying exact `URL.searchParams` values and that neither
  request log exposes raw or encoded code. Route checks cover missing/repeated
  parameters, request locking, retry, accepted-once success, stale identity and
  blur/refocus. Native confirmation tests pass external URIs through the installed
  Router extractor, state query parser and `useLocalSearchParams`, then call the
  real session provider. They cover literal percent sequences, encoded separators,
  alternate confirmation URI forms, malformed/duplicate recovery without a POST
  and unchanged non-confirmation routes. Retained Retry tests verify route/server
  and focus changes prevent obsolete requests, while provider recreation at the same
  identity preserves queued work through its captured method without auto-repeat.
  Legal checks cover exact consumed server fields, malformed/request
  recovery, kind/server binding, local Retry, shared wrappers, public history Back
  and the `/start` fallback through the real `DefaultHeader`. Maintenance and info
  checks cover completion-gated session routing, lock/Retry/pull-refresh behavior,
  inline failures, unchanged destinations and wrapping values. These handler tests
  do not verify native layout, keyboard, safe areas, hardware Back or screen-reader
  behavior.
  The focused profile, feedback and sheet
  checks are `pnpm exec node --test tests/profile.test.mjs tests/feedback.test.mjs tests/bottomSheetSelect.test.mjs`.
  Dialog action checks execute the real label styling against both theme palettes,
  requiring at least 4.5:1 text contrast for Delete account and Cancel in idle and pressed states.
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
- `pnpm test:homes` also runs `homeSharing.test.mjs`: Home Back/Cancel/Exit in
  loading, empty, error and populated branches; exact routed/current owner binding;
  retained submit and delayed-response guards; submitted home name through rename;
  duplicate POST prevention, code copying and accepted-code parsing recovery.
  Native Android Back and dialog visibility still require emulator verification.
- Main home dashboard, room filtering, device-tile controls and dashboard slider: run `pnpm test:dashboard`
  (`node --test tests/homeDashboard.test.mjs tests/deviceTileActions.test.mjs`). It executes the real provider and
  component handlers, covering selected-room retention, failed/malformed reads,
  cached data and late responses across homes, malformed consumed tile/configuration/readings/presence shapes retaining the prior cache, valid historical opaque keys and nullable optional fields, complete collections beyond the API's
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
- Device creation and tile settings: run `pnpm test:device-details`. Create checks cover home/name/icon/room payloads, shared keyboard/button submission locks, inline POST failure without a legacy toast, accepted creation through refresh failure, late completion after blur, refocus recovery, empty-history navigation fallback and duplicate-POST prevention. Tile checks cover native Tile/Presence selectors, per-device full-catalog operation reads, zero/one/many choices, exact type filters and IDs, explicit None, historical unavailable IDs, local malformed/throw/404 recovery, stale identity/filter callbacks, Add return refresh, disabled mutation guards, required-field errors and independent clearing. Device details also cover malformed consumed response Retry before mounting DeviceForm, preserved valid optional/null fields and opaque keys, Cancel, double confirmation, lost route/home/device/access binding, failure Retry, accepted-once refresh/navigation recovery and refocus without repeating DELETE. Both areas retain multiple Display readings, Boolean read-only selection, duplicate-reference validation, metadata stripping and reset baselines, plus Slider/Options
  operation filtering, retained step/unit drafts and partial edit payloads, plus
  the tile selector's fixed busy icon slot, current-choice guard, changed-choice
  submission, cancellation and focus callbacks. The handler adapter cannot prove
  native slider targets, sheet focus or rendering during a React async action.
- The accepted device-delete regression in `tests/deviceDetails.test.mjs` checks
  that Manage disables after acceptance and retained callbacks reject accepted
  deletes and changed route/home bindings.
- Device-list collection refresh is covered by `pnpm test:dashboard`
  (`tests/homeDashboard.test.mjs`). It checks that `refresh()` waits through HTTP
  and JSON, returns true for valid and 404 reads and false for failed, malformed,
  stale or missing-home reads, preserves cached rows on failure and prevents older
  or previous-home requests from changing current data, error or loading state.
  Matching-ID display reads and collection entries with malformed consumed tile,
  configuration, readings or presence fields cannot replace the cache; valid nulls
  and historical opaque icon/operation keys pass through unchanged.
- Accepted device deletion composes the real `DeviceListProvider` and
  `DeviceDetails` route in `pnpm test:device-details` (`tests/deviceDetails.test.mjs`).
  A deferred collection 503 keeps the route local with cached membership, disabled
  management and form, and accepted Retry. A repeated tap shares one successful
  follow-up read, removes the deleted device, returns once and never repeats DELETE.
- Operation details and the legacy list alias are in `pnpm test:device-details` (`tests/operationDetails.test.mjs`). Real route handlers cover validated matching reads and Retry, array/missing IDs, Display view-only access, owner/manager gates, current-home device and full operation catalog membership, catalog recovery, stale confirmations, Cancel/Android Back, conflict and thrown DELETE recovery, real DeviceListProvider HTTP 503 and malformed matching-ID reads followed by accepted-read Retry without repeating DELETE, accepted-once device refresh/navigation, early refocus before DELETE acceptance and while refresh is pending, and replacement with device-ID forwarding. `tests/homeDashboard.test.mjs` checks `refreshDevice` success only for matching current-home members and false/cache preservation on failed, malformed or stale reads. `operationForm.test.mjs` keeps the footer in its keyboard scroll without changing create actions; `widgetPicker.test.mjs` checks bound-device forwarding; `widgetConfigPermissions.test.mjs` protects Display read-only access; `feedback.test.mjs` suppresses both operation routes' legacy toasts. These handler checks do not establish native layout, keyboard reachability, touch ordering or TalkBack behavior.
  Operation-form checks also exercise selectable read-only values, ordered JSON
  segments, Boolean false, numeric/text zero, unlimited numeric bounds and the
  absence of editable controls/writes. Native pixels and copy/scroll behavior
  require emulator/device verification separately.
- Dashboard creation is also in `pnpm test:device-details` (`tests/dashboardCreate.test.mjs`). It executes the real form and route handlers for trimmed name and exact grid bounds, preserved global icon keys and payload, shared Go/touch duplicate locking, editable-but-guarded pending fields, draft recovery after POST rejection/throw, accepted-once matching-device refresh/navigation, blur/refocus behavior, navigation-only recovery and missing/array route IDs. A Device route regression checks first-option fallback for empty/stale current IDs and preserves valid non-first selection. These handler checks do not establish native layout, keyboard behavior or screen-reader behavior.
- Dashboard details are also in `pnpm test:device-details` (`tests/dashboardDetails.test.mjs`). Real form/route handlers cover route-ID requests despite a different provider selection, malformed/failed reads and Retry, missing/array IDs, trimmed Name boundaries, exact partial Name/Icon PATCHes, historical keys and invalid grid configuration, pending locks and saved baselines, confirmation cancellation/Back, delete failure, accepted-once return recovery and stale route/device work. The contextual brand sheet is restricted to the 16 historical dashboard keys, while a name-only save preserves an unchanged historical key. Radio's contextual sheet uses its 15 historical keys. These checks do not establish native layout, keyboard behavior, dialog focus restoration or TalkBack behavior.
- Dashboard flow state and widget interactions are also in `pnpm test:device-details`: `deviceDashboard.test.mjs` covers dashboard provider/route identity and stale response handling; `dashboardGrid.test.mjs` and `dashboardGridActions.test.mjs` cover geometry, gesture snapping/clamping/collision rejection, an immediately visible grid, direct free-cell navigation, dashboard-bound unlink handlers and snackbar ownership; `widgetPlacement.test.mjs` and `widgetPicker.test.mjs` cover routed area validation, selection-only rows, exclusion of placed widgets, gesture responder wiring, the latest valid draft, request identity and recovery; `widgetActions.test.mjs` covers exact command payloads, locking, control acceptance and guarded failure/retry; `widgetConfigPermissions.test.mjs` covers configuration gates; `widgetFormValidation.test.mjs` covers Slider creation validity after step changes. These `nativeComponentHarness` suites are adapter/handler logic only, never rendered-view QA.
- Data-source list/assignment, status recovery, creation, details and broker/subscription actions: run `pnpm test:data-sources`.
  It executes the account list, owner-bound home assignment, HomeProvider refresh and broker status reader handlers, create form/route, settings form, details route, overview panel, broker-client start form/route and Add subscription form handlers. List checks cover the full query and one focus read, 404 versus error/malformed/throw recovery, cached rows, ID keys, selected-row feedback and stale focus/session reads. Status checks cover 503, thrown and malformed responses, a Retry that repeats the client status GET, row-action propagation, default local recovery and stale focus/ID/unmount results. Assignment checks cover required and optional/null Home response fields, malformed cache retention, routed/current home identity, owner-only Add/PUT, Manage/Display and already-assigned denial, pending duplicate locks, ownership loss, exact accepted PUT, background refresh recovery without repeat, changed-home return and navigation recovery, missing history, thrown navigation, and default no-argument refresh callers. `homeForm` also checks Home details forwards its routed home ID; dashboard checks retain the HomeStateWidget entry point. These handler checks do not establish native layout, touch ordering or screen-reader behavior.
  Create checks cover exact payload fields and MQTT/TLS values, required field
  errors after submit, malformed ports, shared keyboard/button pending locks,
  failed-save draft retention, stale error clearing, accepted-create duplicate
  prevention and blur/refocus recovery. Details checks cover failed-save draft
  retention, successful saved baseline without a Reset action, duplicate
  save/client-action locks, detail and client retries, mounted tab state, client
  status updates, exact TLS/MQTT selector values, bottom-sheet choice/cancellation/disabled state/focus callbacks,
  dismissal completion and repeated-choice guards, and subscription removal cancellation/failure/recovery. Broker-client start checks cover route ID normalization/recovery, credential restore/read failures and late cleanup, required/length boundaries, exact values and storage order, checkbox draft state, Go/Start locks, deferred storage/POST with busy editable fields that reject draft changes, failed storage/POST recovery and accepted-once navigation after blur. They also inspect restore/accepted field disabling, the 48 dp checkbox target and accessibility state. These checks do not establish native layout, keyboard, system Back or screen-reader behavior.
  Add subscription checks cover route ID recovery and array normalization, exact topic payloads with the 256-character boundary, required-topic focus, synchronous Go/button locking, editable-but-guarded pending input, rejected/thrown POST recovery, accepted-once navigation and blur/refocus completion. Feedback checks cover the global absence of toast infrastructure and local errors. These checks do not establish native keyboard behavior, layout or screen-reader behavior.
- Before committing: run `pnpm typecheck`, `pnpm lint` and `pnpm test:poc`, plus
  the affected flow checks above.
- Audit A06 regressions use the existing dashboard, device-details and data-source
  suites. They execute malformed/mismatched live and command responses, cache updates
  retained across homes, unavailable preview Retry, operation option/range shapes,
  widget configuration fields and broker/subscription read recovery. Subscription
  errors retain cached current-broker rows and Retry repeats only GET. Valid exact
  option names, scalar values and historical keys remain unchanged. These are handler
  checks; native fixtures and real API verification are recorded separately.
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

Issue 39's data-source list regression executes the real tile and `ListRow` at
font scales 1, 1.29, 1.3 and 2, checking side/stacked layout selection, exact
navigation identity and a separate status/recovery target. These adapter checks
do not prove native fit; verify the full-width broker address and GET-only Retry
on Android with enlarged text, then recheck normal text and both themes.

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
For email confirmation, test opaque links with `+`, `%`, `&` and Unicode values,
missing/duplicate parameters, request failure/Retry and Sign in. For legal pages,
check public history Back and `/start` fallback, private Stack Back, long server
markdown and local Retry. For maintenance, confirm refresh waits for initialization
and respects current authenticated/loading/maintenance state. For App information,
check full value wrapping and legal navigation in the shared scroll.
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

Automated suites map these required checks to implementation boundaries. `operationCreate.test.mjs`
and `operationForm.test.mjs` run in `test:device-details` and cover route identity,
accepted-once creation, active-field validation and typed option/path boundaries.
`colorPickerField.test.mjs` covers draft confirmation, cancellation, HEX boundaries,
pending locks and recovery. `widgetCommandSnackbar.test.mjs` covers retry/dismiss
lifecycles; grid tests cover ownership and stale callbacks. A plan or handler assertion
is not evidence of native fit.

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

Issue 36 regressions exercise real V1 broker `protocolVersion`/`useTls` reads,
required edit errors, synchronous Save/Delete exclusion, confirmation cancellation,
accepted-delete return-only recovery and retired overview callbacks. Row status
tests reject unknown lifecycle strings and retry only GET. Automation suites cover
status names and first-invalid selector scroll/accessibility focus. Device tests
cover ready-home/role/focus/payload guards, accepted navigation-only return and
Expander semantics. Home sharing tests preserve initial read-error Retry/Choose
home separately from confirmed empty onboarding. Adapter evidence does not prove
native layout, keyboard, TalkBack speech or physical device delivery.

Confirm the requested behavior, preserved API/application boundaries, relevant
checks and documentation updates. Report failures and any known limitations.
Notify on test failure and wait for human; never merge PRs autonomously. Keep
`next-dev` separate from `main` until integration is explicitly requested.

The dashboard suite also covers neutral compact surfaces, distinct Inactive/No data chips beside the room, read-only Boolean On/Off, multi-reading labels and units, zero/missing readings, inactive command guards with continued live updates, retained callback guards, list row packing and layout preference restoration without late-hydration races. Native screenshots verify layout, not hardware delivery. Changes to the shared Display contract also require the sibling backend's solution build and Devices unit, integration and end-test projects.

The native handler adapter traverses the `heading` slot used by Slider tile navigation. Its navigation, permissions and preview regression runs across all five tile types. No data tests distinguish missing data from zero/false and from a valid additional reading. Layout write ordering is checked with a delayed previous write.

General-screen control checks cover the single-choice List/Grid group, ignored empty/current selections, keyboard focus and the Options trigger's expanded state and focus outline. Native verification remains necessary for compact selection rendering, radio announcements, 48 dp targets and sheet cancellation.

Issue 32 regression: `tests/feedback.test.mjs` checks retired infrastructure across every source path and dependencies (including future routes), caller-owned account/HTTP failures, native confirmation callbacks, confirmed-empty versus failed/malformed Home initialization, cache retention and late retry responses. `tests/iconSelector.test.mjs` checks the complete 318-key virtualized palette, exact resource/context palettes, historical selections, cancellation and retained disabled/catalog callbacks. Automation create/details and all shared caller suites remain required. These handler/source checks do not prove native layout, virtualization performance, focus restoration or TalkBack. Report native verification and limitations in the PR description.
