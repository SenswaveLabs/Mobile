# Dashboard details design

## Intent and authority

Unify `/device/dashboard/details` with Senswave's native editable-details forms.
People configuring a device should recognize its saved name, icon and grid,
save a change confidently, or deliberately remove its layout. The user delegated
screen and design choice and requested Superpowers, Impeccable, Sol 6.1 Max for
planning, Luna 6 Max for implementation, Serena discovery, Android verification
and a PR targeting `next-dev`. These choices belong to the planner, not to an
additional user requirement or approval. The mobile UI policy explicitly treats
this as a routine migration without another approval gate.

This is a local Operate-mode extension of the existing Senswave world. Keep
PRODUCT.md, DESIGN.md, the mobile UI policy and the web brand language. The
Impeccable context launcher ran successfully once for this target; code-led is
the existing default. Preserve global DESIGN artifacts and existing dependencies.

## Evidence, selection and approaches

The inspected Android baseline is
`/tmp/senswave-dashboard-details-qa/before.png`: a RoomTile preview and divider,
raised Name/Icon controls, disabled Rows/Columns inputs and Save/Restore/Delete
inside a floating menu. The placeholder says `Your home name`. Serena references
show `DashboardForm` has exactly one production caller, this details route;
creation already owns `AddDashboardForm`. The Grid caller supplies `dashboardId`,
but details ignores it and reads/mutates `useDevice().currentDashboardId`.

Dashboard details is the next bounded gap after dashboard creation. Automation
creation carries conditions/results and a much larger form; widget creation
branches across operation types. Neither is needed to finish this screen.

1. **Selected: rewrite the existing edit-only DashboardForm** with FormSection,
   a normal Save action and separate confirmed deletion. Remove its unused create
   mode and imperative handle after updating its sole caller. Reuse existing
   Input, IconSelector, Button, Alert and AlertDialog patterns.
2. A visual-only restyle would retain hidden actions, disabled input affordances
   and selection-dependent requests; reject because it leaves the UX defects.
3. A full grid/widget editor would add new behavior and expand the API scope;
   reject because Name/Icon are the supported dashboard PATCH fields.

The web `styles/theme.css` and native Home/Room details establish restrained
semantic colors, familiar field shapes and action hierarchy. No new visual world,
assets, typography, motion or provider abstraction is needed.

## Composition and interaction

- Use the brand Dashboard app bar and existing native Back. One themed
  KeyboardAwareScrollView, shared keyboardOffset, `keyboardShouldPersistTaps="handled"`,
  16 dp gutters, 24 dp top and 16 dp bottom padding, centered 448 dp maximum width.
  Keep keyboard spacer free of extra section gaps; no fixed footer or nested scroll.
- FormSection title **Dashboard details**, helper **Update the name and icon for
  this dashboard.** Its existing 24/32 dp heading, 14/20 dp helper, 24 dp field/action
  spacing and 12 dp feedback gap own the rhythm.
- Order: Name, Icon, then read-only grid information, followed by full-width amber
  **Save changes**. Use auth Input, dashboard-specific **Living room controls**
  placeholder, the existing searchable IconSelector and auth Button. Keep its 16
  dashboard quick icons and global full-icon search. Show **Grid layout** with
  **Rows: 6 · Columns: 4** for a 6-by-4 grid and helper **Grid size is fixed after
  creation.** This is text, not disabled inputs. Missing/nonfinite/noninteger or
  nonpositive dimensions say **Grid size unavailable.** Never invent default
  saved dimensions or submit configuration.
- Preserve all 16 current dashboard quick icons and global search, including exact
  historical selected strings. Do not use the Home/Device catalog or a new whitelist.
- Separate **Delete dashboard** ContentSection by 40 dp. Helper **Remove this
  layout. Your widgets will stay available.** Keep error above its full-width
  `brand-destructive` action in the established 72 dp action slot.
- Use the native Reusables AlertDialog/Modal/PortalHost pattern already in Room
  details, not the legacy ConfirmDialog. Title **Delete “{saved name}”?**; retain
  **The dashboard layout will be permanently deleted. Widgets themselves are not
  removed. This action cannot be undone.** Stack Cancel and Delete dashboard
  actions. Cancel, outside dismissal and Android Back send no request; restore
  focus to the trigger. Scroll long text within a dialog capped at 90% height.
- No preview, divider, FAB, Restore action or toast. Back remains available;
  leaving the route discards an unsubmitted local draft as before. Icon selection
  cancellation preserves the draft. Use wrapping text, native scaling and named
  targets of at least 48 × 48 dp; all actions remain scroll-reachable at 200% text.

## Identity, loading and save lifecycle

- Normalize `dashboardId` and optional `deviceId` route arrays to their first
  string. Preserve opaque values; whitespace-only dashboard IDs are missing.
  Missing ID shows **Dashboard not found.** and **Return to home** (`/`) without
  any HTTP call. The Grid caller passes both IDs; keep old dashboard-only links
  readable. Capture an originating device ID once from the parameter, or from the
  provider only when its selected dashboard matches. Key the editor by route
  identity; never retarget it when the provider selection changes.
- GET, PATCH and DELETE use exactly `v1/devices/dashboards/${dashboardId}` through
  useHttpClient. The route parameter is authoritative even when currentDashboardId
  differs. GET waits locally; unsuccessful, thrown, malformed JSON or invalid
  identity/name/icon responses show **Couldn't load this dashboard. Try again.**
  with inline Retry. Mount no default editable form on failed reads. Ignore reads
  after unmount/resource replacement. Do not widen backend or shared DTO contracts.
- Form owns Name/Icon drafts and their last accepted baseline. Trim Name only on
  submission and require 3–64 characters. Empty/whitespace: **Name is required.**;
  other invalid lengths: **Use 3–64 characters.** Validate on submit and focus Name.
  Clear the name error only when Name changes; changing Icon must preserve it.
- Dirty compares trimmed name and exact icon with the accepted baseline. Save
  stays disabled when clean. PATCH contains changed `name` and/or `icon` only;
  never rows, columns, configuration, deviceId or unrelated metadata.
- Done and touch share a synchronous form ref lock; route save/delete share
  another synchronous mutation lock. Pending keeps the form mounted and native
  Name editable with busy semantics, but ignores draft changes. Set
  `submitBehavior="submit"`; do not dismiss the IME. Disable Icon, Save and Delete.
- Rejected/thrown PATCH keeps the draft, releases locks and shows **Couldn't save
  this dashboard. Try again.** in a persistent destructive Alert above Save.
  Relevant edits/new attempts clear stale action feedback; no arbitrary refocus.
- On accepted PATCH, update the saved Name/Icon and local route baseline before
  best-effort `refresh(false)` for the matching originating device. Stay in the
  editor; show **Dashboard saved.** above disabled clean Save. A thrown refresh
  cannot turn acceptance into failed save or allow an identical retry. A response
  after blur may update its own retained accepted baseline but must not navigate,
  announce or show stale error feedback. A different resource receives nothing.

## Deletion and recovery

- Open confirmation only while idle. Confirm closes it and submits one DELETE;
  same-turn repeats and concurrent Save/Delete cannot issue another mutation.
  Failure releases the lock, retains Name/Icon drafts and shows **Couldn't delete
  this dashboard. Try again.** above the Delete action.
- Latch accepted deletion before refresh. Disable all mutations permanently for
  that retained editor. Best-effort refresh only the matching originating device;
  let the existing provider choose another dashboard or its empty state. The
  route must not load or mutate that replacement dashboard.
- Return once via Back; without history replace `/device/device` with the captured
  `{ deviceId }`, or `/` when no originating device is known. Ignore navigation
  after blur; an accepted retained editor resumes return on refocus. If navigation
  throws, show **Dashboard deleted. Return to the device to continue.** with a
  navigation-only **Return to device** action; use home wording/action when the
  originating device is unknown. Never repeat DELETE to recover refresh/navigation.

## Scope and verification

Reach includes DashboardForm, its sole details caller, the Grid navigation
callback, dashboard/details header, ToastProvider's inline-route list, focused
handler/feedback tests, package test script, AGENTS index and affected interface
and validation guides. No API, backend, provider, creation, grid editing, widget
placement, dependency or release change belongs here. Server authorization stays
unchanged. Do not log response bodies, credentials or full drafts.

Use the existing native handler adapter for exact requests, field/pending states,
saved baselines, retries, confirmation cancellation, stale/lifecycle isolation and
accepted-once deletion. The repository requires reporting test failure and waiting;
write focused tests first but do not deliberately run a red test phase. Coordinator
runs `pnpm typecheck`, `pnpm lint`, `pnpm test:poc`, `pnpm test:device-details`
and `git diff --check` before the final commit.

Coordinator verifies actual Android light/dark, normal/200% text, short/narrow
windows, keyboard, icon selection/cancel, native Back, inline recovery, one saved
change and confirmed deletion on a disposable local dashboard. Preserve existing
dashboards. Prove an explicitly routed dashboard is targeted while another is
selected. Inspect one screenshot batch, fix material issues together and confirm
at most once; follow Impeccable finish review/documentation while preserving global
DESIGN artifacts. Handler tests and emulator screenshots do not establish TalkBack,
physical hardware delivery or production/backend deployment. Never merge or release.
