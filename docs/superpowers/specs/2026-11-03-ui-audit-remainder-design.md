# Complete the remaining native UI audit work

Date: 2026-11-03. Baseline: `next-dev` at `b40b990`.

Status: **approved on 2026-11-03**. The user approved the recommended direction
and instructed continued work. Execution uses the original local `next-dev`
checkout without worktrees, Sol 6.1 Max for planning/review and Luna 6 Max for
implementation, followed by Android verification and a PR targeting `next-dev`.
This is the approved design; the separate
[implementation plan](../plans/2026-11-03-ui-audit-remainder.md) defines execution.

## Intent and constraints

Complete every remaining entry in
[the UI audit](../../ui-refactor-audit-2026-10-28.md), so people can review legal
requirements, recover authentication and service access, choose a home source and
finish device configuration through the same native interface as current flows.
Preserve the incumbent Senswave visual system: themed canvas, system typography,
amber primary actions, outlined fields, brand headers and local feedback. These
are Operate surfaces; legal documents are Read surfaces.

Reuse `DefaultHeader`, `FormSection`, `ContentSection`, `SectionHeaderAction`,
`ListRow`, `BottomSheetSelect`, common buttons and local Reusables alerts/dialogs.
Use one scroll per screen, a 448 dp content cap, growing content instead of fixed
percentage heights, existing 16 dp edit/list or 24 dp auth gutters, and 48 dp
minimum interactive targets. Preserve safe-area handling in the root layout.
Forms retain keyboard-aware scrolling; read/status screens use ordinary scrolling.

This is completion of existing flows. It introduces no dependencies, API fields,
backend changes, legal wording, store/support destinations, dashboard features or
new navigation destinations. It does not redo automations, dashboards, widgets,
operation creation or device identity forms. Shared callers receive only the
small changes required below. No merge or release is authorized.

## Approaches considered

1. **Selected: finish existing native surfaces and consolidate the unused
   operation-list route.** Preserve the established components, improve request
   ownership and recovery at their current boundaries, and retain the legacy
   operation-list URL as an alias to existing operations/widgets management. This
   is the smallest complete change and avoids maintaining two management lists.
2. **Finish all surfaces, including a separate operation list.** Keep that route
   as another native list with its own requests, role gates and Add operation
   action. This preserves its standalone appearance for external callers, but
   adds permanent duplication despite no in-app entry or distinct task.

The user approved approach 1 on 2026-11-03. Its visible compatibility
tradeoff is that the old operation-list URL opens the existing combined
operations/widgets page. No in-app action currently reaches the old list.

## Evidence and shared behavior

The audit's automation entries are complete; their native limitations remain in
their existing report. The other audit entries still match source. In particular:

- `DataSourceList` and `OperationSelector` run both mount and focus loads. Replace
  each pair with one focus-scoped read and a request generation; retry/refresh
  cannot let older responses replace newer data.
- `DeviceForm` is already a native edit/create form. Only its Tile/Presence
  dropdowns, operation selectors and missing-operation feedback need migration.
- The only source references to `device/operation/list` are its route and Stack
  registration. `OperationList` has that single caller. Device details already
  opens `/device/widget/list` as “Manage operations and widgets”; `WidgetList`
  renders operation headings through `OperationTile`, which opens details.
- Backend source confirms source assignment is owner-only. Operation reads allow
  display access; deletion requires management access and rejects operations
  referenced by widgets or device tiles. The current delete warning claiming
  widgets will be deleted is inaccurate. The operation detail DTO has no
  `deviceId`, so client permission context cannot be inferred from that DTO.
- V1 source lists default to ten items; source selection must request
  `page=1&size=2147483647`. The backend accepts that existing full-collection size.
  Operation selectors use the same full-collection size already used by
  automations rather than their current arbitrary limit of 100.

For reads, distinguish loading, successfully empty, error and loaded content.
Never display a blank editable/read-only entity form after a failed read. Keep
previously loaded same-resource lists visible during refresh; errors and Retry
stay in their scroll content. Clear data immediately when its identity changes.
Validate consumed response fields before rendering, catch request/JSON failures
and release pending state in `finally`.

For writes, use a synchronous ref lock shared by every submit entry, then latch
accepted success before refresh or navigation. Failed writes retain drafts or
choices. Failed follow-up reads/returns can retry only that read/return; they must
not repeat an accepted POST, PUT or DELETE. Retained handlers recheck current
identity, focus and permission. Route/home/session changes invalidate local
feedback and navigation; provider-owned cache updates may finish only for their
captured resource. Close confirmations on blur or identity/permission change.

## Consent gate

`/consents` becomes a native auth-style scroll with Senswave/Back context, a
“Review and accept” heading, existing explanatory copy, separate named Terms and
Privacy links, local account/read feedback and stacked full-width actions. Accept
is the amber primary action; Cancel is outlined. The actions can grow toward the
bottom on tall screens while remaining in the same scroll. Pending never replaces
the whole page. Legal links keep their independent 48 dp targets.

An initial silent account read establishes whether consent is required. A failed
read shows Retry account check and blocks Accept; existing active consent returns
to the app. `makeConsents()` returns its failure to this sole caller without
calling the toast provider. Account reads use existing `{ silent: true }`; the
provider's session-initialization read is silent too, so its late failure cannot
surface on a later route. Ordinary getter calls keep legacy feedback unless their
captured authentication identity has changed.

Validate `hasActiveConsent` as a boolean at the UserProvider response boundary;
a string or missing value is a read failure, so only `true` permits entry and only
`false` permits acceptance. Retained Accept and Continue callbacks recheck focus and
cancellation before writing or navigating. A delayed Default theme reset receives
the captured session predicate and checks it after SecureStore deletion before
applying theme state. The optional predicate defaults to true, preserving existing
no-argument reset callers; Light and Dark still apply visible state synchronously.

Accept sends the existing empty consent POST once. On acceptance, latch success
before checking account state. If that GET fails or still reports no active
consent, show “Consent submitted. Check account status to continue.” with Retry
account check. Further presses never resend consent. Only a verified active
consent permits entry. A failed return offers Continue with navigation-only
recovery. Retain accepted state through blur/refocus in the mounted route.

Cancel, header Back and Android Back from the gate call existing session logout,
which clears the session and returns to Start. They must not merely replace the
route while keeping authentication alive. Cancellation is available during a
request; a request already sent may finish server-side, but cannot reopen the app
or show late feedback. Back from either legal document returns to the gate rather
than cancelling it. Guard delayed user-data state/theme updates against a changed
session so a cancelled account read cannot populate a later session.

## Data-source list and home-source choice

Both routes use brand headers and the same `DataSourceList`, preserving `ListRow`
and status badges. The list owns one FlatList scroll; its header contains a
`ContentSection` and a named Add data source `SectionHeaderAction`. Remove floating
Add controls and the extra bottom padding reserved for them. Keep row IDs as keys,
wrapping source names/endpoints, initial error/Retry and a genuine empty message.
Add stays available when a list read fails because creation does not depend on it.

The ordinary list remains account-scoped and opens source details. The selection
route names the destination home in its helper and uses row taps to assign; it
needs no additional confirmation or new selection/submit step. While assignment
is pending, keep rows visible, disable further choices/Add and label the selected
source as linking with busy semantics. Show action failure and Retry beside that
choice. Use safe general failure copy rather than blaming every failure on the
one-broker rule. List-row broker status reads own their persistent error and
Retry: reissue `GET v1/datasources/brokers/{id}/clients`, suppress legacy toasts,
stop row-action propagation and ignore results after focus, row-ID or authenticated
provider-lifetime changes. Default status-reader callers retain toast feedback.

Read the routed `homeId`, normalize it consistently and bind it to the current
home before permitting selection. Both existing entry points must pass that ID:
`HomeStateWidget` already does; Home details must add it. A missing home, another
selected home, an already assigned source, or lost ownership shows explanatory
recovery without a PUT. Manage and Display receive no assignment or Add action
from this flow. Retained row callbacks must recheck the current home and owner.

Latch successful assignment before refreshing that same home. Extend
`HomeProvider.refreshCurrent` minimally to accept an optional captured home ID
and background refresh mode and return success/failure. Preserve default callers'
loading behavior. The new caller keeps its list mounted; failed/malformed reads
always clear loading, return failure, and cannot overwrite a different current
home. Required Home detail fields are validated before replacing the cache, while
nullable/omitted source and location values and arbitrary string icon keys remain
valid. The captured-home guard is scoped to the authenticated app's `HomeProvider`
lifetime: logout unmounts it, while same-account token rotation retains it. If a
future account switch keeps the provider mounted, add a separate account-generation
guard. Existing `StartBrokerClientForm` and `BrokerClient` callers keep their
no-argument behavior and receive regression coverage. After accepted assignment,
Retry refreshes/returns only. Prefer Back; without history return to Home details
for that home. A changed home invalidates the old return and instead offers a
safe return to the current home; failed fallback navigation stays local and can
retry only that return.

## Device Tile/Presence and operation selection

Keep DeviceForm's field order, disclosures, previews, partial PATCH, draft/reset
baseline, primary/additional readings and exact opaque IDs. Replace Tile type and
Presence type with `BottomSheetSelect` using their current values. Cancellation
changes nothing. Selectors and Add actions receive explicit disabled props as
well as callback guards; pointer-events wrappers alone are insufficient.

`OperationSelector` becomes a native selected-value field with a small labelled
field header and named Add operation action. It receives a field title/error and
disabled state from each DeviceForm caller, so primary, command, additional
readings and presence have distinct accessible names. It owns local operation
loading/error/Retry, preserves the selected ID on failures and refreshes on return
from creation. Add forwards the exact device ID and is owner/manager-only.

Filter the complete catalog by the existing allowed types. Zero, one and many
matching operations are distinct from a failed read; one operation is selectable.
Keep an explicit None option. Preserve a stored missing/incompatible operation ID
as unavailable instead of replacing it or emitting a choice callback. Unchanged
references remain unchanged on unrelated saves; users can choose a valid
replacement. Device/type changes reject stale reads and stale option callbacks.

Missing required command/display/presence operations produce persistent local
field errors, expand the relevant disclosure and prevent the write. Changing a
field clears its own error. Existing step/unit/label/duplicate-reading validation
and Reset stay intact. No configuration preview sends a command.

Device deletion keeps its existing confirmation but gains section-local error,
visible pending, synchronous guards and accepted-once refresh/return recovery.
Its confirmation is bound to the loaded device/home and dismissed when that
context changes. Successful deletion cannot be repeated after refresh/navigation
failure. Suppress its success/error toasts; save feedback remains local in the
existing form.

## Operation details and legacy list compatibility

Keep `OperationForm` read-only and mount it only after a validated operation read.
Add a narrow children/footer slot after its existing configuration so a separate
`ContentSection` for Delete operation remains in that same keyboard-aware scroll.
Do not change creation's growing action layout or nested operation configuration.
Details gets a brand header, inline load Retry, a separate destructive button,
pending state and persistent delete errors. Use the existing Reusables
Modal/PortalHost confirmation pattern with scrollable warning and stacked actions.

Pass optional `deviceId` through `OperationTile` from `WidgetList` for details and
return context. Because the detail DTO lacks ownership context, deletion requires
the selected home to be owner/manager, the bound device to belong to that home,
and the operation ID to appear in its full operation catalog. Reuse the existing
home device catalog for home membership; its current-home identity and load/error
state must be checked, not a stale provider selection. Missing context on an old
operationId-only deep link still permits the server-authorized read-only view,
but cannot expose Delete. Do not guess ownership or change the DTO.

Cancel/Back issue no DELETE. Confirm rechecks the captured operation, device,
home, session and permission; loss of context closes the dialog. Copy explains
that the operation must be removed from widgets/tiles first, that deletion is
permanent and that automations using it can stop working. Conflict recovery is
local and preserves the loaded configuration. After acceptance refresh only
matching device/home caches and return once; navigation failure offers Return to
operations, never another DELETE.

Retain `/device/operation/list` as a thin replacement/redirect to
`/device/widget/list`, forwarding an explicit normalized `deviceId` when present
and otherwise preserving the existing bound-device fallback. The canonical route
already owns missing-device and owner/manager recovery. Delete `OperationList.tsx`
and its sole import; retain the alias registration with no obsolete FAB/header.
Do not add a second menu entry or rewrite WidgetList. The alias uses replacement
so Back cannot bounce between the two routes.

## Email confirmation

`/confirmEmail` adopts the native auth/status scroll and width cap, with visible
Verifying, Verified and Unable to verify states, concise scalable text and local
feedback. A valid link failure offers Retry verification plus Sign in. Missing,
empty or ambiguous repeated parameters show invalid-link recovery and Sign in
without an API request. Sign in opens `/login`, where existing unverified-email
recovery can resend; do not add a new resend form without an email address.

Use public Expo Router parameter hooks, one request at a time and one accepted
success latch per parameter identity. Read `userId` and `code` as exact strings;
do not trim or decode them twice. Build the existing confirmation URL with
`URL.searchParams` rather than string interpolation, preserving `+`, `/`, `=`,
`&` and Unicode as values. Never put a token/code/whole URL into logs or feedback;
sanitize the confirmation catch log. Catch asynchronous rejection inside the
awaited request. Parameter changes/blur reject late status/navigation. Success
never repeats the POST merely because params/hooks rerender, and offers Sign in.

## Legal documents, maintenance and information

Keep `PrivacyPolicy` and `TermsAndConditions` public exports, delegating their
duplicated loading/rendering to one small `LegalDocumentView` keyed by document
kind. It owns the single scroll, loading text, local persistent error/Retry,
version, summary and full Markdown. Render version/content only after a valid
document arrives; empty failures never look like a document. Changing document
kind/server invalidates old work. LegalProvider keeps its existing public
`executeTimeout` transport, returns request/parse failures as `Result`, and
validates the consumed version/summary/content fields. No direct fetch is added.

The backend remains the authority for wording, version and consent acceptance.
Preserve Markdown content exactly; do not invent dates, summaries, cached
substitutes or new consent-version bindings. Public `/privacy` and `/terms` gain
brand Back headers with `/start` fallback; authenticated `/user/privacy` and
`/user/terms` gain the corresponding Stack brand headers. Both public callers
from auth and consent, and private callers from App information, remain valid.
DefaultHeader may gain a small explicit fallback/Back override for public legal
and consent use, retaining its existing default behavior elsewhere.

`/maintenance` becomes a growing status scroll with the incumbent Senswave brand,
clear service/update copy and a visible Retry action. Pull to refresh may remain,
but shares the same synchronous request lock. Run existing session initialization
and react to the updated provider state after completion rather than reading the
stale `session.maintenance` closure. Compatible authenticated sessions proceed to
consents; compatible unauthenticated sessions proceed to Start. While still
blocked, keep a local persistent notice and Retry. The existing compatibility
boolean combines unavailable and incompatible servers: copy must say service is
unavailable or an app update may be needed, not claim which cause is known. No
invented store link, countdown or polling. Ignore screen-owned late feedback and
navigation after blur; preserve provider-owned authentication initialization.

`/user/info` becomes one ordinary native scroll with brand header, 448 dp cap and
16 dp gutters. Preserve all values and Terms/Privacy navigation. Existing ListRow
wrapping and separators remain; long version/contact values must be readable and
the final row reachable. No new metadata fields or links.

## Scope map

| Boundary | Expected files and reach |
| --- | --- |
| Public routes | `src/app/consents.tsx`, `confirmEmail.tsx`, `maintenance.tsx`, `privacy.tsx`, `terms.tsx` |
| Authenticated routes | `(app)/_layout.tsx`; `dataSource/list.tsx`; `home/dataSource/select.tsx`; Home details source entry; device details; operation details/list alias; user info/privacy/terms |
| Shared components | `headers/DefaultHeader`; `dataSource/DataSourceList` and existing `DataSourceTile` disabled/busy presentation as needed; `device/DeviceForm`; `operation/OperationSelector`, `OperationTile`, `OperationForm` footer; `widgets/WidgetList` forwards device ID; legal wrappers and new `user/LegalDocumentView` |
| Deletion | Remove sole-use `device/operation/OperationList.tsx`; keep legacy URL alias |
| Providers | `UserProvider`: result-owned consent failure, boolean consent validation and stale session read guard; `ThemeProvider`: optional session-guarded Default reset at the SecureStore boundary; `HomeProvider`: captured/background refresh result; `SessionProvider`: encoded confirmation URL and safe catch logging; `LegalProvider`: reliable validated Result failures; `ToastProvider`: inline-route suppression |
| Other callers | Read/regress unchanged `BrokerClient`, `StartBrokerClientForm`, profile/account reads, HomeStateWidget, public auth legal links, WidgetList picker/management variants, operation creation/read-only form |
| Tests | Focused consent/confirmation/maintenance/legal/info route checks; source-list/assignment checks; operation-selector/details/alias checks; update device-details selectors and feedback expectations; preserve icon/form/widget-picker regressions |
| Config and exports | Add focused tests to existing `test:poc`, `test:data-sources` and `test:device-details` scripts; no dependencies, lockfile, platform/env/build config or domain DTO change; retain existing legal component exports |
| Documentation | This spec, later implementation plan; audit status and native report; affected AGENTS index/interface/repository/API-client behavior/validation/tooling command descriptions; narrowly update affected Impeccable surface notes without replacing DESIGN.md |

Suppress legacy overlays on each migrated route only after its local feedback
exists: consent, confirmation, maintenance, both source list/selection routes,
device details, operation details/list alias, all four legal routes and user info.
Route suppression alone cannot prevent a provider error emitted after leaving:
use silent/result-returning operations at the initiating boundary too. Keep
unrelated callers' default behavior. Cover delayed errors and keyboard preservation
with the real ToastProvider harness.

## Verification and acceptance

Planning does not run tests or claim native evidence. Implementation adds small
handler tests for non-trivial behavior using `nativeComponentHarness`, not tests
that merely mirror style declarations. Required cases include:

- Consent initial failure/Retry, already active consent, POST failure/throw,
  double tap, accepted POST plus failed/repeated account checks, blur/refocus,
  cancelled pending work, logout/Back, navigation-only recovery and late-session
  responses. Assert only one accepted consent POST.
- Source first-load failure versus empty 404, retained refresh content, malformed
  payload, focus single-load, eleventh source, stale session/home results and
  disabled callbacks. Assignment covers owner/Manage/Display, routed-home
  mismatch, already assigned home, accepted PUT plus failed refresh/return,
  changed-home protection and unchanged broker refresh callers.
- Tile/Presence native choices and cancellation, exact IDs/filter types,
  zero/one/many operations including item 101, local retry, unavailable stored
  references, explicit disabled guards, required-operation errors/disclosure,
  stale device/type responses, unchanged partial writes/readings/reset/previews.
  Device management must prove routed-device membership in the selected home's
  complete current `useDeviceList().devices` before exposure, confirmation or
  DELETE; live membership and role are rechecked at send time. Same-home read
  errors retain a form whose membership was already proven. Delete tests cover
  cancellation, permission/home/device/catalog changes, failure, pending
  duplicates, blur/refocus before DELETE acceptance and during accepted refresh,
  and accepted-once recovery after catalog removal.
- Operation read failure/malformed data/Retry, no blank form, Display read-only
  access, owner/manager Delete only with matching membership, missing old-link
  context, conflict response, confirmation cancellation/stale capture, duplicate
  DELETE, accepted deletion/return recovery; alias replacement/ID forwarding and
  no regression to operation creation or selection-only widget pickers.
- Email exact query encoding, invalid/repeated params, rejection/Retry, concurrent
  presses, success rerender, changed params and blurred completion; logs contain
  no submitted token. Legal checks cover both document kinds and four wrappers,
  authoritative exact Markdown/version, failure/throw/malformed payload, Retry and
  stale server/unmounted responses. Maintenance checks include one pending action,
  latest-state recovery and still-blocked copy; info retains values/navigation.
- Inline-route suppression, hidden previous overlays, delayed initiating-provider
  failures after navigation and no keyboard dismissal on affected routes.

Use Node from `.nvmrc`, pnpm and existing frozen dependencies. Install hooks once
per clone. Before committing run `pnpm typecheck`, `pnpm lint`, `pnpm test:poc`,
`pnpm test:data-sources`, `pnpm test:device-details`, relevant homes/dashboard/icon
regressions for changed callers, production Android JavaScript export and
`git diff --check`. No backend build is needed while API contracts stay unchanged.
An expected failing new TDD characterization is a planned red step; an unexpected
existing-suite/check failure must be reported and work paused for the human, per
AGENTS. Do not silently fix unrelated failures.

Use available Android emulator for every changed flow at narrow 320 dp Dark and
448 dp Light, normal and enlarged text, short/tall windows and IME where fields
exist. Capture numbered PNG/XML evidence with viewport, theme, state and revision
in a manifest. Check real 48 dp targets, large names/URLs/Markdown, first/last row
reachability, visible pending/error/Retry, selection-sheet Cancel/Back/focus return,
dialog Back/Cancel/Confirm, consent legal return and gate logout, and keyboard
reachability in Tile/Presence. Verify a saved device's unrelated metadata and
configuration remain unchanged. Exercise network failure and delayed completion
with clearly identified local fixtures or disposable records; never make writes
to non-disposable household data. Remove temporary fixture routes and restore
emulator settings. Native captures establish layout/touch behavior; handler
checks establish request logic. Report TalkBack, real MQTT and physical hardware
only if actually exercised. Preserve previous audit evidence and its limits.

Task 3 lifecycle tests may extend `nativeComponentHarness` so `modules` accepts
either its existing object form or a factory invoked once with the harness React
object. The focus mocks register through its committed `useEffect` cleanup/setup;
rendering a new callback alone does not focus it. This is test infrastructure
only and does not add a product abstraction.

## Approved decisions

Approved technical calls: reuse existing native components; preserve the
legacy list URL as a compatibility alias; add exact URL encoding; make accepted
writes irreversible within their route session while recovery remains read/return
only; keep legal content backend-owned; bind destructive actions to proven
home/device/operation membership; retain ordinary callers' defaults.

The approval covers the complete direction, including consolidation of the orphan
list and cancellation of consent by signing out. No further product or legal
decision is needed to execute this scope. Changes to that direction still require
clear justification; routine implementation choices belong to the builder.
