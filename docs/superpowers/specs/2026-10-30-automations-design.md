# Native automation flows

Date: 2026-10-30. Status: approved by the user on 2026-10-30.
Builder review found no important gaps. The user explicitly authorized implementation.

This design addresses the automation work identified in
[the UI audit](../../ui-refactor-audit-2026-10-28.md). It covers a reachable list,
automation creation and details, condition creation, and result creation.
The implementation plan is [Native Automations Implementation Plan](../plans/2026-10-30-automations.md).

## Intent and constraints

People should find automations for the selected home, understand their conditions
and results, and complete supported changes without losing drafts or seeing an
unaccepted change appear saved. Native controls, inline recovery, and the current
Senswave theme replace the old previews, floating actions, colored condition
surfaces, dropdowns, and toast-only failures.

Work stays in the original local checkout, without worktrees. The eventual PR
targets `next-dev`; it is not merged autonomously. No dependency, backend,
infrastructure, release, or shared API contract changes are included. There is no
new persisted condition/result editing or deletion feature, automation execution
button, navigation tab system, or general form framework.

Follow [the UI policy](../../agent-guide/interface.md),
[repository conventions](../../agent-guide/repository.md),
[API contracts](../../agent-guide/api-and-data.md), and
[validation rules](../../agent-guide/validation.md).

## Approaches and decision ownership

The user selected a separate `/automation/list` screen reached through a named
`Automations` action on the home screen. This keeps the device dashboard focused
and gives automations their own list, refresh, and recovery states.

Two alternatives were considered:

- A section below devices in the existing home scroll avoids another list route,
  but automations become harder to find in homes with many devices and the two
  collections need coordinated loading and refreshing.
- A Devices/Automations switch on the home screen makes both destinations equally
  prominent, but changes existing home navigation and introduces retained panel,
  filter, and refresh state. This is larger than the requested migration.

The remaining decisions below are implementation proposals, based on the current
code and backend, rather than additional user requirements. In particular, the
create form will explain that new automations start enabled and omit its currently
ineffective enabled control. The backend create request has no `isEnabled` field
and creation defaults to enabled. There is no additional post-create state request.

## Existing contracts to preserve

### Roles

Backend permissions are asymmetric. Do not replace them with one configuration
gate. `canManage` means `home.isOwner === true || home.canManage === true`.

| Capability | Owner | Manage | Display |
| --- | --- | --- | --- |
| List and read details | Yes | Yes | Yes |
| Create, including initial conditions/results | Yes | Yes | No |
| Save name, icon, connector; change enabled state | Yes | Yes | No |
| Add conditions/results to an existing automation | Yes | No | No |
| Delete an existing automation | Yes | No | No |

These rules come from `AutomationAccessService` and the corresponding handlers
under the sibling backend's `src/Modules/Automations`. Existing mobile screens do
not enforce them consistently. Display details remain readable; Manage sees
metadata controls but no persisted child-add or delete controls. A short section
helper can explain that only the home owner changes existing conditions/results.
Management-only routes deny access before loading management forms and recheck
identity and permission inside retained callbacks. Backend authorization remains
the authority.

### Requests and values

All requests use `useHttpClient()`. Preserve these endpoint shapes:

| Action | Method and path | Body |
| --- | --- | --- |
| List for home | GET `v1/automations/display?homeId={homeId}` | None; response `{ items }` |
| Read details | GET `v1/automations/{automationId}` | None |
| Create | POST `v1/automations/` | `homeId`, `name`, `icon`, `conditionConnector`, `conditions`, `results` |
| Save metadata | PATCH `v1/automations/{automationId}` | Only changed `name`, `icon`, `conditionConnector` |
| Change enabled state | PUT `v1/automations/{automationId}/state` | `{ isEnabled: boolean }` |
| Add existing condition | PUT `v1/automations/conditions/{automationId}` | `operationId`, `conditionType`, `conditionConfiguration` |
| Add existing result | PUT `v1/automations/results/{automationId}` | `{ operationId, value: string }` |
| Delete automation | DELETE `v1/automations/{automationId}` | None |

The result naming mismatch is intentional compatibility: create/read/local state
use `valueToSend`; the existing-result PUT uses `value`. Result entry remains a
string, including `"0"` and `"false"`. Do not parse it into numbers, booleans, or
JSON, trim its content, or rename either backend field. Display `operationName`
is local/read metadata and is not required in write bodies.

Condition payloads remain exactly:

- Boolean: `BooleanCondition`, `{ isOn: boolean }`.
- Number and Integer operations: `NumberCondition`, `{ minValue: number, maxValue: number }`.
- Text, HexColor, and Options operations: `TextCondition`, `{ requiredValue: string }`.
- Connector: `And` or `Or` for the entire condition collection.

Continue offering both numeric bounds as the existing mobile flow does. Require
finite values and `minValue < maxValue`; zero and negative bounds are valid.
Require nonempty exact text and result values without changing their contents.
The backend can represent one-sided numeric ranges; existing saved configurations
remain readable without being rewritten by a metadata save.

Create requires 1–7 conditions and 1–7 results. Show errors beside each section
when missing, show the draft count, and disable that section's Add action at seven.
Allow removal of an unsaved draft row so a mistaken choice can be corrected
without restarting creation. Remove one row by its draft position/identity;
repeated operation IDs are not all removed together.

The existing-child PUT validators, handlers, and repositories impose neither a
seven-item collection cap nor operation-ID uniqueness. Do not impose those create
limits on existing automation additions or deduplicate existing data. The backend
has a unique automation name per home; a rejection remains an inline save error.

Automation icons retain the current fourteen quick choices and the global icon
browser/search. Preserve exact keys, including saved keys outside the quick list.
Do not replace this with Home/Device catalogs or Dashboard/Radio palettes. The
current `IconSelector` default behavior provides the global browser; its restricted
`brand` palette behavior must not accidentally remove it. Opening or cancelling
the picker sends no request and changes no selection.

## Screen hierarchy

All screens use the shared theme background and brand `DefaultHeader`. Forms use
one keyboard-aware vertical scroll, maximum width 448 dp, native fields, and the
existing spacing scale. Actions remain inside that scroll, reachable with the
keyboard open. Creation actions grow toward the bottom on tall screens. Named
targets are at least 48 dp. Long labels, section rows, and values can wrap.

### Home entry and list

Place a quiet, visible, icon-and-label `Automations` navigation action in the home
list header, outside the Devices add/layout action group. It is available to all
roles whenever a home is selected and does not depend on source health. Preserve
the home screen's existing single list, room filtering, and device controls.

`/automation/list` owns one `FlatList`. Its header identifies automations and the
current home; managers/owners get `SectionHeaderAction` `Add automation` beside
the `ContentSection` heading. Reuse existing `ListRow` rows with icon, name, and
textual Enabled/Disabled state. Tapping opens readable details for every role.
Deletion belongs to the details screen; remove the row's hidden long-press
deletion shortcut so the feature has one confirmed deletion lifecycle.

Cover first load, loaded empty, loaded rows, initial failure with Retry, refresh
failure with retained rows, and pull-to-refresh. Empty-state wording distinguishes
people who can create from people who can only view. Keep the add action available
while loading or recovering when permission permits. With no selected home, show
recovery to home selection rather than an empty automation collection.

### Create automation

Use one `FormSection` introduction naming the selected home. Order: Name, Icon,
then Conditions and Results sections. Conditions include a labelled single-choice
control for `All conditions` (`And`) / `Any condition` (`Or`). Each child collection
uses `ContentSection.headerAction` and `SectionHeaderAction` `Add condition` or
`Add result`, quiet readable summary rows, draft removal, and local empty/count
feedback. Keep the global icon browser. Explain that creation starts enabled.

Trim Name for validation and submission; require 3–64 characters. Keep name errors
attached to Name. Require both collections before POST. One full-width
`Create automation` action follows inline action feedback and the child sections.
The form remains mounted through pending requests and failures; no loading branch
replaces it. Remove the old tile preview and imperative save handle.

### Automation details

A guarded read must succeed and match the requested automation and selected home
before showing a form. Malformed IDs, mismatched home identity, failed reads, and
malformed payloads show local recovery; never render an empty editable automation
after a failed GET. Normalize a route array ID to its first value as existing new
routes do; reject a missing/blank ID without a request.

For Owner/Manage, one keyboard-aware edit `FormSection` contains Name, Icon,
Enabled state, and connector, then Conditions and Results with their current
summaries. A full-width `Save changes` action saves only dirty metadata/state.
Display sees the same information read-only without save or mutation actions.
Only the owner sees child Add actions and a separated `Delete automation` section
after the edit content. Persisted child additions save immediately on their own
screen; metadata Save never sends the child arrays again.

Use the local native `AlertDialog` pattern for deletion: named trigger, explicit
Cancel/Delete, native modal portal, Android Back cancellation, stacked accessible
actions, and inline failure on the details screen. Retain the form while pending.
Confirmed deletion returns to the automation list after acceptance.

### Add condition and add result

Each route uses one keyboard-aware `FormSection`: Device, Operation, then active
configuration fields. Use `BottomSheetSelect` for device/operation and labelled
single-choice controls for Boolean values. Text and numeric fields use the existing
auth-style native inputs. Conditional fields participate in the same scroll.

Devices come from the current home's existing device provider. Operations use
`v1/devices/operations/display?deviceId={deviceId}&size=2147483647` to load the
full collection using the existing convention instead of the ten-item default.
Show loading, true zero-operation empty state, and load failure
with Retry separately. Exactly one operation is selectable. Changing device clears
the old operation, type/configuration, error, and options before another read; a
late response for the previous device cannot restore them. Validate that the final
operation still belongs to the selected device and current loaded collection.

`Add condition` / `Add result` is the one full-width action, below relevant inline
feedback. Pending text inputs remain natively editable while their change handlers
ignore edits, following current creation forms; selection/navigation controls are
guarded. Back before submission discards only this child form. There are no new
operation-creation shortcuts, type-specific result editors, or persisted child CRUD.

## Draft ownership and request lifecycle

Keep the existing automation provider as the shared child-collection boundary;
remove its duplicate implicit detail GET and implicit resets. The parent route
owns its GET and establishes the provider session explicitly. A small session
identity must distinguish selected home, new draft versus saved automation ID,
and a particular creation visit. Do not build a general draft store.

Creation initializes an empty collection once on entering a fresh creation visit,
not on every focus. Pushing a child route and returning preserves Name, Icon,
connector, and both collections. Child creation routes receive the active draft
identity; absence of an automation ID alone is not permission to edit an arbitrary
old draft. A direct child route without a matching live parent session shows
recovery. A new creation visit, parent disposal, selected-home change, or access
loss invalidates its draft and retained callbacks. Cleanup must check session
identity before clearing a newer session.

Details seeds the same provider from its accepted, identity-checked read once.
Returning from a child addition must not reinitialize the metadata draft or
overwrite accepted local children with an older GET. Refocusing an unchanged
parent does not fetch and reset its form. A deliberate read Retry is available
before a valid details form exists.

For a new draft, child Add validates and appends locally once, without HTTP, then
returns. Only Create sends these collections. For a saved automation, child Add
awaits its PUT. Append to the matching provider session only after acceptance;
on rejection/throw remain on the child form with the unchanged draft and inline
Retry. A request accepted after blur may update only its still-matching session,
and return navigation runs only when that route regains focus and is still valid.

Every mutation uses a synchronous ref lock shared by button and keyboard paths,
`try/finally`, and captured home/automation/session identity. Recheck permission
at invocation. Ignore stale read results and stale feedback; a home/role change
must not let a retained callback submit to another context. No child list is
optimistically mutated before an existing-automation request succeeds.

Accepted writes are distinct from refresh/navigation recovery. Mark acceptance
before refreshing or navigating. After accepted creation, child addition, or
deletion, retry only return/navigation, never the write. Use matching-home list
refresh as best effort. Normal history goes back once; empty history uses a safe
replacement to the list or matching details screen. An accepted creation retained
in history stays locked and completes return on refocus. A child already appended
cannot be appended again when return recovery is retried.

Details preserves the current state-before-metadata endpoint order but checks each
response. If state changed, PUT state first and advance only the saved state
baseline after acceptance. Stop if it fails. If metadata changed, PATCH only the
dirty name/icon/connector and advance those baselines after acceptance. If PATCH
fails after state succeeded, explain the partial save and retain the metadata
draft; Retry sends PATCH only. State-only saves make no empty PATCH. Metadata-only
saves make no state request. Successful saves do not leave the screen and do not
overwrite unrelated drafts or repeat an accepted endpoint after refresh failure.

Add all five automation paths to legacy toast suppression and remove automation
provider/component toast emissions that now have inline owners. Action failures
use the local destructive `Alert` immediately above their action; field errors
stay beside their fields. Inline success/recovery never dismisses the keyboard
through a late toast.

## Concrete implementation scope

- Routes: add `src/app/(app)/automation/list.tsx`; update automation `add.tsx`,
  `details.tsx`, `conditions/add.tsx`, `results/add.tsx`, plus the home `index.tsx`
  entry and automation registrations in `(app)/_layout.tsx`.
- Automation UI: `AutomationForm`, `AutomationList`, `AutomationTile`,
  `conditions/AutomationConditionForm`, `AutomationConditions`,
  `AutomationConditionItem`, `results/AutomationResultForm`, `AutomationResults`,
  and `AutomationResultItem`. Delete `ConditionResultTile` and `LogicalConjuction`
  only after their remaining references disappear.
- State/contracts: `AutomationProvider`, `AutomationListProvider`,
  `AutomationsTypes.tsx`, and `ToastProvider`. Replace touched loose callback/write
  types with the small exact request/result types needed by these flows. Do not
  rewrite unrelated device or HTTP providers.
- Shared components: compose `FormSection`, `ContentSection`,
  `SectionHeaderAction`, `Input`, `Button`, `BottomSheetSelect`, existing
  single-choice controls, `IconSelector`, and `AlertDialog`. Change a shared
  primitive only if the existing API cannot preserve the automation contract;
  keep all other callers' behavior and tests.
- Checks/docs: focused automation handler tests using
  `tests/nativeComponentHarness.mjs`, relevant feedback/home-entry regression
  tests, a `pnpm test:automations` script, this design and the approved plan, the
  audit status, and affected guide/index entries in the same implementation PR.

## Delivery groups and evidence

After design approval, write the detailed implementation plan before product
changes. The controller can give these bounded groups to Luna, with Sol reviewing
the assembled change. Shared-file work stays sequential in the original checkout.

1. Define the exact types, session-bound collection behavior, and silent,
   identity-safe list state. Test new-visit reset, child-return preservation,
   duplicate operation rows, invalid session rejection, home/access changes,
   late list reads, initial failure versus empty, and retained rows on refresh
   failure.
2. Add the home entry and native list, parent create/details forms and routes.
   Test role matrix, exact global icon keys, trimmed name bounds, 1–7 create
   collections, local row removal, exact create payload without `isEnabled`,
   failed-save draft retention, accepted-once return, routed/home identity,
   current-draft saves, partial endpoint success, saved baselines, and confirmed
   deletion cancellation/failure/recovery.
3. Migrate the condition and result forms/routes against that session contract.
   Test operation collections of zero/one/many, rapid device changes and stale
   responses, load Retry, active-field validation, false/zero/negative bounds,
   ordered finite range checks, preserved exact text, precise operation mapping,
   `value` versus `valueToSend`, local-only draft addition, awaited existing PUT,
   rejection/throw recovery, and duplicate/accepted-once behavior after blur.
4. Integrate feedback/docs and run the focused automation suite,
   `pnpm test:dashboard` for the home entry, then required `pnpm typecheck`,
   `pnpm lint`, and `pnpm test:poc` before commit. Run existing selector/icon
   regressions if those shared components change. Report a test failure and wait
   for the human; do not merge the PR.

Native verification uses the available Android development build/emulator and
disposable local automation data. Check home-to-list-to-create/details navigation,
all roles, zero/one-operation selectors, every condition type, result creation,
new-draft child return, failed/accepted saves, partial state/metadata recovery,
confirmed-delete Cancel/Back/confirm, and home changes. Check both themes, 320 dp
Dark and 448 dp Light, short/tall windows, keyboard reachability, safe areas,
48 dp targets, wrapping, and screen-reader labels/focus where tooling permits.
Record before/after images and their state/viewport/commit manifest. Report text
scaling, TalkBack, physical-device delivery, and any other unexercised runtime
behavior separately; handler tests do not establish native fit or Back/focus.

## Remaining decisions

No unresolved API or permission choice requires a product change. The user chose
the separate list approach and approved this design, including the enabled-at-creation
explanation and the exact existing role asymmetry. Visual details that do not change
these flows remain implementer choices within the established theme and components.
