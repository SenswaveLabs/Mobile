# Native device dashboard flow design

## Intent, authority and existing work

Complete the native dashboard flow: open a device, choose a dashboard, create or
edit its identity, select a free grid area, place a widget, and deliberately unlink
a widget or delete a layout. Daily device control and DIY configuration remain
equally important. This is an Android Operate surface within the existing Senswave
world, using MD3 interaction, the shadcn brand reference, shared theme roles and
existing React Native Reusables components. It is code-led; no new identity,
shipping assets, dependencies or global DESIGN changes are needed.

The user delegated design decisions and authorized implementation without another
question or approval gate. Planning uses Sol 6.1 Max; the coordinator implements
with Luna 6 Max. Work stays on the current local `next-dev`; this planning subtask
does not change source, run tests, alter runtime data, create worktrees, switch
branches, reset, commit, push or create a PR. Never merge or release autonomously.

The existing uncommitted details redesign is protected in-progress work, not a
baseline to discard. Keep its [handoff](../handoffs/2026-10-24-dashboard-details-redesign.md),
[design](2026-10-24-dashboard-details-design.md) and
[plan](../plans/2026-10-24-dashboard-details.md) intact. Their Name/Icon partial
saves, fixed grid summary, confirmed deletion, route identity, saved baseline and
accepted-once recovery remain authoritative. This integrated design expands the
scope, adds management guards and supersedes their old native verification matrix:
verify on Android emulator; skip TalkBack and 200% text as currently instructed.

Protected tracked changes include AGENTS, interface/validation guides, package
script, app header, details route/form, Grid's added device parameter, ToastProvider
and feedback tests. Preserve `tests/dashboardDetails.test.mjs` and unrelated
`.codex/` / `.github/hooks/` dirt. Change those task files only as needed to finish
the authorized flow; do not restore them from HEAD or stage unrelated work.

## Evidence and scope

Serena source discovery covered all production callers of DashboardView,
GridDashboardView, WidgetView and WidgetList, plus DeviceProvider consumers.
Impeccable context loaded for device entry and placement; the existing add/details
surface briefs and global PRODUCT/DESIGN were read. Native Home/Device patterns,
BottomSheetSelect, SectionHeaderAction, FormSection and the web theme establish
the visual authority. The old details screenshot and handoff are historical
evidence, not proof of the current full flow.

| Surface | Existing gap | Decision |
| --- | --- | --- |
| `device/device.tsx` | Legacy horizontal selector/FAB, no route-array guard, mount-only device binding, weak empty/offline states | Visible native selection/actions, distinct recovery states, resource binding and management permission |
| `DashboardView.tsx` | Generic failure text, no Retry, implicit mutable selection | Render only the correct loaded selection; local recovery and supported-type boundary |
| `GridDashboardView.tsx` | Viewport-sized rows, tiny floating resize controls, FAB actions, toast validation | Scrollable grid, visible placement action and normal-flow size controls; confirmed local unlink recovery |
| `dashboard/add.tsx` / `AddDashboardForm.tsx` | Creation already meets current policy | Preserve form, payload, icons and lifecycle; add only management guard and update the changed selector regression |
| `dashboard/details.tsx` / `DashboardForm.tsx` | Protected in-progress redesign; an older 44/50 handler run predates current files | Preserve the edit contract, use current passing logic coverage, finish emulator verification and add management guard |
| `dashboard/placeWidget.tsx` | Ignores routed dashboard ID, coerces numeric params, logs payloads, leaves on failure | Identity-bound validated selection, explicit Place widget, inline recovery and accepted-once return |
| `WidgetList.tsx` / `WidgetListTile.tsx` | Provider-only reads; loading failures resemble empty; picker retains unrelated power mutation | Explicit-device picker, grouped native list, local Retry and selection-only rows |
| `WidgetView.tsx` | Unlink uses mutable selection, legacy dialog/toasts and no synchronous lock | Delegate to one Grid-owned native confirmation and identity-bound locked request |
| Button/Switch/Radio/Color/Slider widgets | Command failures use toasts; several commands can duplicate or stay pending after throw | Inline compact feedback and one synchronous command lock; preserve endpoint/value semantics |
| `DeviceProvider.tsx` | Old device/selection data survives and late reads overwrite the active grid | Narrow dashboard request identity guards and a local load error; retain context method signatures |

The provider change is required by these dashboard paths, not a general device
lifecycle redesign. Today selecting B changes `currentDashboardId` immediately
while `currentDashboard` still contains A. Grid can therefore send B's ID with A's
geometry. A's late detail response can also overwrite B. Changing device retains
the previous collection/detail, and old-device requests can commit after the new
device loads. Prevent those exact paths; do not introduce a cache framework,
pagination redesign, operation provider changes or new API contracts.

## Approaches and selected direction

1. **Selected: finish one coherent native flow within existing files.** Keep the
   completed creation form and details decisions. Replace discovery and placement
   chrome; narrowly fix identity, permissions and recovery in their shared callers.
   This reaches the user's full task without adding an editor framework.
2. A details-only completion would be smaller but leave the entry and placement
   defects the user explicitly included. Reject.
3. A new canvas editor with drag, reorder, resize of saved widgets and a widget
   builder would add unsupported work and risk saved configuration. Reject.

Planner decisions below are implementation direction, not invented user quotes.

## Native composition

Use the shared themed background, native system typography, 16 dp side gutters,
24 dp section starts, 12–16 dp action/feedback gaps and 48 × 48 dp effective
targets. Reuse semantic colors through `useTheme()` and StyleSheet.create(); use
existing Reusables fields, buttons, sheets and alerts. Forms retain centered
448 dp maximum width. Do not add decorative cards, custom gradients, floating
action menus, absolute action bars or new motion. Text wraps with system scaling.

### Device entry and dashboard selection

- Use the brand Device app bar and native Back. A compact device identity uses
  its known name; use `Device dashboard` while no name is available rather than
  presenting an ID. Managers have a labelled `Device details` quiet action.
- Show `Dashboards` with existing SectionHeaderAction `Add` for a nonempty list.
  Use existing BottomSheetSelect with `Dashboard` / `Choose dashboard`, readable
  saved names, selected state, native dismissal and focus restoration. Preserve
  the first listed fallback for empty/stale selected IDs, and valid non-first
  selection. Never render a grid merely because the selector has a fallback.
- Expose `Dashboard details` as a labelled secondary action for the selected
  dashboard. Grid owns the visible `Place widget` action; no duplicated FAB menu.
- Initial loading hides old-device/old-selection content. A failed collection or
  detail read shows persistent `Couldn't load dashboards. Try again.` and Retry.
  A failed refresh can retain only matching-device/selection cached content, with
  its error visible. Refresh state always settles after rejection or thrown JSON.
- A genuine empty list says `No dashboards yet.` Managers get `Create dashboard`;
  Display members see `Ask a home manager to add a dashboard.` No empty message
  substitutes for a failed read.
- A known `presence.value === false` keeps an offline notice: `Device offline.`
  and `The live dashboard is unavailable until this device comes back online.`
  Do not render interactive widget controls or offer placement while offline.
  Existing permitted Device details and Add remain available; selected dashboard
  details remain configurable through the backend. Unknown presence is not offline.
- Device content uses a flex column with compact selection context and the Grid's
  single vertical scroll; empty/offline/error states use their own single scroll.
  Keep all actions reachable on short windows; no nested virtualized scrolls.

### Grid and area selection

- Grid owns one vertical scroll containing its Widgets heading, contextual panel
  and geometry. Compute width from actual layout; use 8 dp gaps and a minimum
  96 dp row height rather than dividing a short screen into tiny controls. Width
  changes recompute geometry. Preserve widget types, values, commands, ordering
  and persisted zero-based positions. Change widget internals only as required for
  visible command feedback, command locking and fitting; do not redesign their
  operation/value model.
- Empty online layouts say `No widgets placed.` and explain the next permitted
  action. Managers get a visible amber `Place widget`; nonempty grids use the
  same labelled action in the Widgets heading. Display members retain control
  widgets but see no configuration/removal action.
- Place mode disables device commands and shows `Choose widget area` with helper
  `Select the top-left empty cell, then set the size.` Name empty targets
  `Row 1, column 1, empty` using one-based display numbers. Occupied cells cannot
  start a selection. Maintain at least 48 dp effective cell targets without
  overlapping neighbours; use horizontal scrolling only if a window is too narrow
  for the supported five columns at that minimum.
- After selection, keep the preview on the grid and show normal-flow `Height`
  and `Width` controls, each with named 48 dp decrease/increase buttons and a
  readable value. The top-left cell stays fixed; grow down/right only, shrink to
  one cell minimum. `Change position` clears the selection. Every valid rectangle
  remains reachable by choosing its top-left cell; no saved widget is moved.
- Place controls precede the grid inside its scroll. On cell selection scroll to
  that panel without animation, keeping the chosen area summary and next action
  reachable. The summary uses `Row {r} · Column {c} · {h} rows × {w} columns`.
  Disable unavailable growth rather than silently changing shape. An impossible
  final area shows `Choose an empty area within the dashboard grid.` inline.
- `Choose widget` navigates with captured `deviceId`, `dashboardId`, `row`,
  `column`, `rowSpan` and `columnSpan`. `Cancel` and Android Back in place mode
  clear local selection and return to normal grid before leaving the device.
  Changing device/dashboard also clears local placement state.
- Validate server geometry before indexing it. Noninteger/negative positions,
  zero/invalid spans, out-of-bounds/overlapping placements or malformed arrays show
  `Grid unavailable. Refresh this dashboard and try again.` with Retry. Never
  repair stored layout, invent dimensions or send a changed configuration.

### Widget picker and placement lifecycle

- Brand `Place widget` app bar; compact `Choose widget` heading, helper
  `Choose a widget for the selected dashboard area.`, and the same one-based area
  summary. Use WidgetList's single SectionList, grouped by existing operation.
  Keep labels/types readable and operation groups non-navigating in selection mode.
- Tapping a widget selects it without sending a request. Show selection through
  named selected/radio semantics and a visible check. Hide its power toggle in
  picker mode: choosing a definition must not enable/disable it. The standalone
  widget list and form previews retain their existing state controls.
- A labelled `Add operation` action remains available while idle. Keep each
  operation's named `Add widget` path, including when it has no widgets; returning
  reloads the explicit device list. Selection-mode create links pass the captured
  device where needed. Only adapt operation/add's optional device parameter and
  management guard; do not redesign operation or widget definition forms.
- A normal-flow footer below the flexing list holds persistent action feedback
  above full-width `Place widget`. It is disabled until a widget is selected,
  validation succeeded and no mutation is pending. It never overlays the last row.
  Loading/empty/read failures remain distinguishable; WidgetList owns local Retry.
- Normalize route arrays to their first string and preserve opaque IDs. Require
  nonblank `dashboardId`; obtain `deviceId` from its route parameter or only from
  a provider whose selected dashboard already matches. Otherwise show
  `Placement unavailable. Return to the dashboard and choose an area again.`
  with a navigation-only return. Do not issue a list/placement request.
- Numeric route values must be decimal-digit strings: row/column are nonnegative,
  spans positive integers. Reject blank, missing, nonfinite, fractional, negative,
  exponential and suffixed strings before coercion. Fetch
  `v1/devices/dashboards/${dashboardId}/display` through useHttpClient to validate
  the routed rectangle against current bounds/occupancy, independent of provider
  selection. Failed/malformed reads show Retry and no enabled placement action.
- If the area is no longer free, show `This area is no longer available. Return
  to the dashboard and choose another area.` with `Return to dashboard`; do not
  automatically leave. The backend remains authority for concurrent layout changes.
- A synchronous lock covers all Place callbacks. PUT exactly
  `v1/devices/dashboards/${dashboardId}/widgets` with
  `{ widgetId, row, column, rowSpan, columnSpan }`. Pending disables selection and
  create actions, preserves the chosen widget/area and reports busy semantics.
- Rejected/thrown PUT stays on the picker with selection intact and
  `Couldn't place this widget. Try again.` above the action. Keep an explicit
  return-to-dashboard path for changing the area. Do not log IDs, drafts, response
  bodies or request payloads.
- Accepted PUT latches before best-effort matching-device refresh. Return once
  using Back, or replace `/device/device` with captured deviceId if no history;
  use `/` only if no device can be recovered. Refresh/navigation failure never
  repeats PUT. Navigation failure shows `Widget placed. Return to the dashboard
  to continue.` and navigation-only `Return to dashboard`.
- Ignore stale reads and feedback after blur/unmount/resource change. Accepted
  retained state survives blur and resumes its one return on refocus. A changed
  provider selection cannot retarget reads, writes or refresh another device.

### Details, creation and widget removal

Keep the existing creation form and detailed edit design, including exact opaque
icons, all 16 dashboard quick icons/global search, strict string grid bounds,
3–64 trimmed Name, changed-only Name/Icon PATCH, fixed grid summary, editable but
guarded native pending fields, inline errors, clean saved baseline and deliberate
accepted-once layout deletion. Finish their failing handler coverage and actual
native verification rather than rewriting the completed creation flow.

Widget removal remains a dashboard-layout action; it never deletes the definition.
Grid owns one native Reusables AlertDialog/Modal/PortalHost and passes an optional
remove callback to its sole WidgetView caller. Remove WidgetView's old HTTP,
toast and legacy ConfirmDialog ownership. Preserve existing widget long-press
behavior for managers, and expose the equivalent named native accessibility action.
No callback is passed for Display members.

Use `Remove widget from dashboard?` and `The widget definition stays available.`
with Cancel and `Remove widget`. Cancel/dismiss/Android Back before confirmation
sends no request. Confirm captures immutable dashboard/device/widget IDs, closes
the dialog and sends one DELETE to
`v1/devices/dashboards/${dashboardId}/widgets/${widgetId}` under a synchronous
lock. Show `Couldn't remove this widget. Try again.` with Retry in the Grid's
normal-flow action feedback area after failure; preserve other controls and layout.
On acceptance remove only that local placement before best-effort matching-device
refresh. An accepted unlink cannot be repeated to recover refresh; provider Retry
recovers stale reads. Route/selection/permission changes invalidate confirmation
and suppress late local feedback. Retain the existing informational-values note
as wrapping secondary text, without allocating space for a FAB.

### Widget command feedback

Root explicitly includes native command feedback in this flow. Reuse the compact
Alert/AlertDescription treatment and the synchronous lock/error/lifecycle pattern
from useDeviceTileAction. Do not call that home-tile hook unchanged: its endpoint
and optimistic lifecycle are different. Current `ActionFeedback` is a type, not an
existing reusable component.

Keep POST `v1/devices/widgets/${widget.id}/action` and exact bodies: Button sends
`{ value: '' }`, Switch a Boolean, Radio the exact optionName, Color the exact hex
string, Slider a number. Preserve reported-value synchronization and supported
control interactions. A same-turn duplicate or disabled/preview callback sends
no second command. Rejected/thrown requests settle pending, retain/restore the
last accepted/reported value and show `Couldn't control this widget. Try again.`
in normal flow 12 dp below its control; Slider also keeps 12 dp horizontal inset.
Use the same control to retry. Do not add an error card, toast or extra retry
button. Error text wraps without covering neighbouring cells; grid row height
must grow to include feedback instead of clipping fixed-height slots.

WidgetView owns one small widget-specific command hook and its compact alert,
passing command/pending callbacks to the five existing controls. This is the
selected shared-code boundary: no generic action framework or home-tile API
change. Widget/control replacement or blur suppresses late feedback; accepted
results never target another widget. Display remains read-only and uses native
read-only semantics instead of a no-action informational toast. Invalid widgets
retain their fallback and manager removal. No other operation/widget form moves
into this scope.

## Permission and identity boundaries

Root clarified that the existing DeviceList policy applies consistently:
`home?.isOwner === true || home?.canManage === true` permits configuration.
Device details, dashboard Add/details/Place and removal are hidden/denied for
Display or missing-home state. Display continues viewing dashboards and using
permitted live widget commands. Do not change server authorization.

Guard direct routes before mounting editable forms or sending configuration reads;
show `You don't have permission to manage this device.` with a navigation-only
return. Recheck the latest management permission in mutation/navigation callbacks
so retained handlers cannot bypass a role change. Guard Device details only;
do not redesign that screen. Creation's existing lifecycle and validation remain
intact. Operation/add receives the same narrow guard for its placement affordance.

DeviceProvider retains `refresh(useLoading: boolean): Promise<void>`,
`smartRefresh(deviceId: string): Promise<void>`, setters and existing fields. Add
only `loadError: string | null` for dashboard loading. Clear/hide old-device data
synchronously when binding a new device, clear mismatched current detail on
selection, and accept collection/detail completions only for their current device,
request generation and selected dashboard. A collection refresh preserves the
latest valid selection; a removed/invalid selection falls back to its first item.
Empty collections clear both selection and detail. Handle rejected/thrown/malformed
reads locally, settle loading in finally, and retain only correctly owned cached
content on refresh failure. Preserve add/details/widget/SignalR refresh callers.

## Non-goals

No saved-widget drag/reorder/resize, automatic layout repair, new dashboard type,
widget/operation form redesign, backend or shared API change, catalog migration,
new dependency, generic editor/cache/permission framework, global theme change,
pagination overhaul, iOS verification, production-data mutation or release work.

## Proof and remaining uncertainty

The original `test:device-details` run was 44/50 and predates the current
dashboard form and tests. The current edit contract has route, partial-save,
baseline and deletion assertions. The integrated adapter-only dashboard suite
most recently passed 54/54. During integration, one current route test still
looked for the old Grid FAB even though Dashboard details moved to the Device
screen; its fixture now exercises that current action and stubs the Grid. Keep
the historical log as history, not as an unresolved current failure or view
evidence.

Existing nativeComponentHarness suites are strictly adapter/handler logic
regressions. They cannot prove native views, touch, text fitting, focus, keyboard,
dialogs or rendering. Prefer pure assertions for shared grid validation; keep
existing suites for exact HTTP/state/navigation regression where useful. All view
and interaction QA comes from the Android emulator.

Use pnpm only and Node 26.12.1 from `.nvmrc`; preserve exact dependencies, frozen
lockfile and build approvals. Required checks before any authorized commit:
`pnpm typecheck`, `pnpm lint`, `pnpm test:poc`, `pnpm test:device-details` and
`git diff --check`; include focused new logic and impacted dashboard suites once.
The user explicitly authorized resolving every encountered failure in this
task. Preserve failure output, diagnose the cause, fix it and rerun the affected
check; do not edit AGENTS.md's global rule. Use deliberate red tests where the
implementation plan calls for them.

The coordinator first verifies current emulator/Metro/API state. Reuse only
confirmed disposable local fixtures from the handoff; preserve the original
dashboard and real device configuration. Native checks cover entry selection,
empty/offline/error/retry, manager/Display behavior, whole-grid scrolling and area
controls, creation, details save/icon cancel/deletion, picker selection, failed
placement recovery, accepted placement once, unlink Cancel/Back/confirm, both
themes and a narrow/short phone window at normal text. Skip TalkBack and 200% text;
report those and physical-device delivery unverified. Do not infer failure states
or native behavior from handler-tree output.

Capture and open one meaningful emulator screenshot batch in
`.impeccable/review/`, fix material issues together, and confirm at most once.
Use the native Impeccable finish reviewer and documenter with this scope, existing
details contract, Android guidance and actual captures; no HTML/CSS detector runs.
Preserve PRODUCT.md, DESIGN.md and global sidecars because this flow extends their
existing world. Finish with exact checks, native evidence and remaining limits.
