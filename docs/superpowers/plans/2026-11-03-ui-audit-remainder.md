# Remaining Native UI Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete every remaining UI audit entry with native controls, local recovery and accepted-once writes, then deliver Android evidence and a PR targeting `next-dev`.

**Architecture:** Complete existing screens in place, reuse local React Native Reusables and common components, and keep request ownership in the current routes/providers. Retain the unused operation-list URL as an alias to operations/widgets management. Preserve existing backend contracts and completed automation/dashboard/widget flows.

**Tech Stack:** React Native 0.81.5, Expo 54, React 19, TypeScript 5.9, Expo Router, NativeWind/Reusables, existing keyboard controller and native handler harness; Node 26.12.1 and pnpm 12.8.1.

**Spec:** [Approved design](../specs/2026-11-03-ui-audit-remainder-design.md), approved 2026-11-03. Baseline: `b40b990` on local `next-dev`.

## Global Constraints

- Execute sequentially in the original local `next-dev` checkout, without worktrees or a local branch switch. Use Luna 6 Max implementers and Sol 6.1 Max task/final reviewers as requested. Do not ask again whether to continue the approved work.
- “No merge or release is authorized.” Create the final PR from a new remote review branch, keeping public `main` and remote `next-dev` untouched.
- “It introduces no dependencies, API fields, backend changes, legal wording, store/support destinations, dashboard features or new navigation destinations.” Preserve opaque IDs, exact payload values and backend legal content/version.
- “Use one scroll per screen, a 448 dp content cap,” existing 16 dp edit/list or 24 dp auth gutters, and “48 dp minimum interactive targets.” Use themed `StyleSheet.create()` styles and existing brand components.
- Keep new reads/writes on existing transport boundaries: authenticated routes use `useHttpClient()`; public auth/legal providers retain `executeTimeout`. Never add `fetch` outside `src/utils/httpClient.tsx`.
- Every write has a synchronous lock, captured identity/permission checks and an accepted latch before refresh/return. Recovery after acceptance cannot repeat the write. Ignore stale screen feedback/navigation.
- Every migrated route owns persistent error/Retry before toast suppression is enabled. Silence the initiating provider where a late result could otherwise toast on another route.
- Install hooks once per clone. Preserve the frozen lockfile and exact dependency versions. Each code-task commit requires `pnpm typecheck`, `pnpm lint`, `pnpm test:poc`, its narrow suite and `git diff --check`.
- Expected failure of a newly added TDD characterization is an authorized red step. The earlier plan wording to pause on unexpected failures was superseded by the user's direct 2026-11-04 instruction: report failures, diagnose/fix/retest and continue the authorized work without asking whether to continue. Preserve failure output; do not hide failures or expand scope into unrelated work.
- Existing completed flows and their documented limitations remain intact. Tests establish handler behavior; Android captures establish the particular rendered/touch states actually exercised.

## Review Focus

1. Authentication changes during a delayed account read must not repopulate a cancelled or different account; test stale success as well as stale failure in Task 1.
2. A home's accepted source assignment can make that home “already assigned” before navigation; acceptance must take precedence over the pre-write guard and never offer another PUT, tested in Task 2.
3. A stored operation absent from the loaded filter must retain its opaque ID without auto-clearing; unrelated saves must work, tested in Task 3.
4. Manage access to one home does not authorize deleting an operation from another accessible home; require current-home device and operation membership, tested in Task 4.
5. A completed compatibility refresh and an unstable provider/parameter object must not cause stale Start navigation or repeated confirmation/legal reads; test state transitions rather than captured objects in Task 5.

## Execution and file structure

This is one coordinated completion release, split into six independently reviewable tasks. Tasks 1–5 each leave a working flow and task-local documentation; Task 6 verifies their integration and publishes the review artifact. Shared files (`ToastProvider`, Stack configuration, `package.json`, AGENTS and guides) are edited sequentially, never by concurrent implementers.

New product files are limited to `user/LegalDocumentView.tsx`; new test files stay in `tests/`. Preserve existing legal component exports and forwardRef APIs. Delete only the sole-use `operation/OperationList.tsx`; keep its route alias. Add no generic screen shell, shared mutation framework or new provider.

Preflight belongs to the coordinator: record existing check results, Node/pnpm, Git baseline, emulator identity and settings. Do not duplicate a completed preflight. The coordinator may keep local Metro/native fixture tooling outside tracked product code. A test-only Android user/account and temporary labelled fixtures must be cleaned up before final delivery.

Recorded preflight: Node 26.12.1, typecheck/lint passed (281 formatted files), PoC 43/43 passed; only existing `MODULE_TYPELESS_PACKAGE_JSON` warning. Hooks are installed. The overnight reset removed the earlier `/tmp` runtime and captures. Preserve pre-existing Android users 0 and 11; only the fresh task QA user 10 is owned and may be removed. Its actual stored label is `Codex`, serial 12, created around 09:06 UTC; the intended descriptive full label was not stored. Current runtime tooling and captures live under the ignored Task 6 SDD runtime directory. The original `.env` was untouched; the task-owned ignored `.env.local` fixture override must be removed before production export. Do not present lost historical captures as current assets.

## Current execution status — 2026-11-04

Tasks 1–5 and the Task 6 source corrections are committed on the original local
`next-dev`. The final product source checkpoint is `a705c23` (20 commits ahead
of its original base). The reviewed F1/F2/M1/F3 correction wave is at
`8f4f7f4`; the final `a705c23` product change only shortens the App Info label
from Contact to Email and updates its existing value lookup. The corrected copy
was recommended in the Sol source review, and its rendering is captured at 320 ×
480 dp. The final whole-change Sol review of this documentation/evidence
addendum is still pending.

The current report and [asset manifest](../validation/assets/ui-audit-remainder/manifest.json)
record the bounded Android matrix, with each selected PNG/XML pinned to its
actual source and file hashes. Captures 127–130 on `8f4f7f4` prove accepted
operation and device-delete recovery without repeating DELETE. Final-source
captures include compact consent, legal, App Info, confirmation and maintenance
states. The earlier Android graphics ANRs and null-child fatal remain
unexplained; later selected flows are not evidence of cause or cure. TalkBack,
real backend/account, production MQTT and hardware are unverified. Development
client cold confirmation requires cached-project selection; release APK and
browser domain association are unverified.

The recorded relevant check set passes: typecheck and lint (290 files), PoC 103,
data-sources 75, device-details 242, homes 83, dashboard 53, icons 30,
automations 82 and build 2. Results are source-pinned in the validation report;
focused final follow-up checks are distinguished from suites not rerun after the
last optional Display metadata correction. The final clear-cache Android
production export succeeded with 55 assets and no fixture-origin matches.
Cleanup preserved original Android users 0/11 and `.env`, removed only owned QA
user 10 and `.env.local`, stopped QA services and restored the physical display.
The saved user 0 font/night settings were unchanged; the post-reboot service
night label differs and is not claimed restored.

Task 6 implementation, bounded native evidence, source checks, export and
cleanup are recorded. The documentation/evidence Sol gate and PR publication are
not complete. Root will retry the requested Sol review once after this
checkpoint. If the gate remains quota-blocked, the authorized fallback is a
Draft PR with the review status explicitly pending; do not substitute a reviewer,
claim overall approval, merge or release. Do not mark the plan complete until the
review gate and PR publication are actually recorded.

---

### Task 1: Complete the consent gate and shared Back interface

**Files:**
- Modify: `src/app/consents.tsx`, `src/contexts/domain/UserProvider.tsx`, `src/contexts/ThemeProvider.tsx`, `src/components/headers/DefaultHeader.tsx`, `src/contexts/ToastProvider.tsx`, `package.json`.
- Create: `tests/consents.test.mjs`.
- Modify/test: `tests/feedback.test.mjs`, `tests/profile.test.mjs` where realistic session mocks need updating; preserve legacy getter behavior outside silent/stale requests.
- Docs: approved spec and this plan; `AGENTS.md`, `docs/agent-guide/interface.md`, `docs/agent-guide/validation.md`, `docs/agent-guide/tooling.md` for the newly covered consent behavior.

**Interfaces:**
- Consume unchanged `makeConsents(): Promise<SimpleResult>`, `getUserData(options?: { silent?: boolean }): Promise<Result<UserData>>`, `session.logout(): void`.
- Extend `DefaultHeaderProps` with `onBack?: () => void` and `backFallback?: Href` (`Href` from `expo-router`). Existing default remains `/`; custom Back overrides route history while preserving keyboard dismissal. Task 5 uses `/start` fallback for public legal headers.
- Keep UserProvider public signatures unchanged. `makeConsents()` returns failures without a toast; `getUserData({silent:true})` stays silent even after leaving. Capture current authentication identity for user-data reads and prevent stale success from setting account data/theme or stale failure from toasting.
- Validate `hasActiveConsent` as a runtime boolean at the UserProvider response boundary; missing or non-boolean values are read failures. Extend `ThemeProvider.resetTheme(isCurrent?: () => boolean): Promise<void>` with a default-true predicate checked after SecureStore deletion before applying the reset. Forward the captured session predicate only for Default theme application; no-argument callers and synchronous Light/Dark application keep their behavior.
- Append `tests/consents.test.mjs` to existing `test:poc`; later tasks append their own tests without replacing earlier entries.

- [x] **Step 1: Add failing real-route/provider tests.** Use `nativeComponentHarness` with deferred HTTP/providers and real ToastProvider where feedback matters. Add tests named `accepted consent retries only account verification`, `cancelled account read cannot restore session data`, and `consent Back signs out while legal Back returns to gate`. Cover retained Accept/Continue callbacks after legal blur, string/missing consent booleans, and deferred reset on the real ThemeProvider across session changes. Essential oracles after a successful POST and two failed GET retries are:
  ```js
  assert.equal(consentPosts.length, 1);
  assert.equal(homeReturns.length, 0);
  assert.equal(acceptButton.props.disabled, true);
  assert.equal(globalToasts.length, 0);
  ```
  Cover initial read error/Retry, active consent, failed/thrown POST, same-tick double press, accepted/refocus/failed navigation, Cancel during pending and old-session success/theme updates. Verify default Header behavior and `/start` fallback independently.
- [x] **Step 2: Run only the new characterization.** `pnpm exec node --test tests/consents.test.mjs`; expected FAIL on the specific legacy gate behavior. Unexpected harness/import errors are not proof of the intended red and must be corrected/reported before proceeding.
- [x] **Step 3: Implement the gate and provider/Header interfaces above.** Use one auth-style scroll, separate named legal links, stacked Accept/Cancel, persistent local read/write states and visible busy text. Only validated boolean consent status is acted on: true permits `/`, false permits Accept, and malformed data stays a read failure. Latch the empty consent POST before silent account verification. Use exact accepted-follow-up copy “Consent submitted. Check account status to continue.” Retry account check never posts; Continue retries only navigation and rechecks focus/session before returning. Retained actions cannot write or navigate after blur/cancellation. Guard Default theme reset with the captured session at the SecureStore deletion boundary; keep no-argument reset and synchronous Light/Dark updates unchanged. Cancel/header/system Back log out, including while pending. Keep an accepted latch through blur/refocus; invalidate it for a different session. Add `/consents` inline suppression only with this feedback in place.
- [x] **Step 4: Verify the task and write its policy notes.** Run `pnpm exec node --test tests/consents.test.mjs tests/profile.test.mjs tests/feedback.test.mjs`, then required `pnpm typecheck`, `pnpm lint`, `pnpm test:poc`, `git diff --check`. The focused suite includes real ThemeProvider deferred SecureStore coverage. Expected: zero failed tests, checks exit 0. Update the listed documentation in the same change; record exact checks, no native claims yet.
- [x] **Step 5: Commit only this task after its gate.** Stage the listed changed files explicitly and commit `feat: complete native consent gate`. Coordinator dispatches Sol review; resolve its concrete findings before Task 2.

### Task 2: Complete account sources and owner-bound home assignment

**Files:**
- Modify: `src/app/(app)/dataSource/list.tsx`, `src/app/(app)/home/dataSource/select.tsx`, `src/app/(app)/home/details.tsx`, `src/app/(app)/_layout.tsx`.
- Modify: `src/components/dataSource/DataSourceList.tsx`, `src/components/dataSource/tile/DataSourceTile.tsx`, `src/components/dataSource/state/DataSourceStateGet.tsx`, `src/contexts/domain/HomeProvider.tsx`, `src/contexts/ToastProvider.tsx`, `package.json`.
- Create: `tests/dataSourceList.test.mjs`, `tests/homeDataSourceSelect.test.mjs`.
- Read/regress: `HomeStateWidget.tsx` (already passes `homeId`), `BrokerClient.tsx`, `StartBrokerClientForm.tsx`; existing `tests/homeForm.test.mjs`, `tests/startBrokerClient.test.mjs`, `tests/dataSourceDetails.test.mjs`, `tests/feedback.test.mjs`.
- Docs: AGENTS; interface, API/client behavior, validation and tooling guides.

**Interfaces:**
- Consume Task 1's default brand Header; use `variant="brand"` in these Stack entries.
- Define `RefreshCurrentHomeOptions` with `homeId?: string; background?: boolean`; `refreshCurrent(options?: RefreshCurrentHomeOptions): Promise<boolean>`. No arguments preserve existing global-loading behavior. `{homeId,background:true}` refreshes only that still-current home without replacing the selection page. Invalid/malformed/failed/stale reads return `false` and always release owned loading state.
- Extend `DataSourceListProps`: existing `onListItemSelected?: (id: string) => void`; add `header?: ReactNode`, `feedback?: ReactNode`, `disabled?: boolean`, `selectedSourceId?: string`, `pending?: boolean`. List owns the only FlatList; route supplies ContentSection header and action feedback. Render selected-source feedback beside its row, with a header fallback when that row is unavailable.
- Extend `DataSourceTileProps` with optional `selected?: boolean`, `loading?: boolean`; forward to ListRow and show named linking feedback without losing the status badge. Existing callers keep their defaults.
- Extend `DataSourceStateGet` with optional `inlineRecovery?: boolean`. List tiles enable it; failed, malformed and thrown status reads show a local 48 dp `Retry status` action that repeats the client-status GET and stops row-action propagation. Keep existing toast behavior for default callers and ignore stale focus, broker-ID and authenticated-provider-lifetime completions.
- Append the two new tests to `test:data-sources`.

- [x] **Step 1: Add failing list, provider and assignment tests.** Names: `source list loads all sources once per focus`, `accepted link survives assigned-home refresh`, `captured refresh cannot replace another home`. Pin these values:
  ```js
  assert.equal(listReads[0], "v1/datasources/brokers?page=1&size=2147483647");
  assert.deepEqual(linkCalls[0], ["v1/homes/home-a/datasource", { brokerId: "source-11" }]);
  assert.equal(linkCalls.length, 1); // accepted PUT, failed refresh, repeated Retry
  assert.equal(homeAfterLateResponse.id, "home-b");
  ```
  Cover empty 404 versus first failure, malformed/thrown reads, cached refresh failure, stable ID keys, old focus/session responses, row-status 503/thrown/malformed recovery, status Retry's exact GET and non-row action, stale status results after focus/ID/unmount, double row taps, Manage/Display/route mismatch/already-assigned denial, ownership loss, post-acceptance assigned-home state, missing history and thrown return. Assert malformed matching-ID Home bodies retain the cache while nullable source/location and opaque icons remain valid. Assert default no-argument refresh callers still settle and do not receive another home's data.
- [x] **Step 2: Run the new characterization.** `pnpm exec node --test tests/dataSourceList.test.mjs tests/homeDataSourceSelect.test.mjs`; expected specific assertion failures on current duplicate/limited reads and unguarded assignment.
- [x] **Step 3: Implement the interfaces and route behavior.** Replace mount+focus reads with one focus-generation read, clear mismatched data, retain same-list rows during refresh and keep Add available during list-read errors. Remove source FABs; supply named Add data source in `ContentSection.headerAction`. Read/forward exact `homeId` from both entry points. Require matched current home and owner before Add/PUT. Keep rows mounted and choices locked while linking. Use captured/background refresh only after accepted PUT, with read/return-only recovery and accepted state checked before the “already assigned” pre-write guard. Validate required Home response fields before cache replacement while accepting nullable source/location and opaque icon values. Add route-fallback return recovery. Enable local status-read recovery on list rows, retry the exact status request, stop row-action propagation and invalidate completions after focus/ID/authenticated-provider-lifetime changes; preserve default callers. The authenticated app layout unmounts `HomeProvider` on logout, and same-account token rotation retains it. Add inline suppression for `/dataSource/list` and `/home/dataSource/select`.
- [x] **Step 4: Verify task and document client behavior.** Run `pnpm test:data-sources`, `pnpm exec node --test tests/homeForm.test.mjs tests/homeDashboard.test.mjs`, required typecheck/lint/PoC and `git diff --check`; expected zero failures. Ensure existing caller mocks/types match the boolean result without broad edits. Update the guides in this task's commit.
- [x] **Step 5: Commit and review.** Commit `feat: complete native data source selection` with only task files. Sol reviews stale-home completion, one accepted PUT and both no-argument refresh callers before Task 3.

**Authorized review follow-up — fix round 1:** `DataSourceStateGet` is now in scope for list-row status recovery. Its inline mode validates the client-state response and owns a named 48 dp Retry that repeats only the status GET, while default callers retain toast feedback. Focus/ID/teardown generations discard stale completions. The follow-up also validates matching-ID Home detail bodies before replacing provider cache and gives changed-home fallback navigation persistent local retry. Required fix-round checks and commit are recorded in `task-2-report.md`.

### Task 3: Finish Tile/Presence controls and device-delete recovery

**Files:**
- Modify: `src/components/device/DeviceForm.tsx`, `src/components/device/operation/OperationSelector.tsx`, `src/app/(app)/device/details.tsx`, `src/contexts/custom/DeviceListProvider.tsx`, `src/contexts/ToastProvider.tsx`, `package.json`.
- Create: `tests/operationSelector.test.mjs`.
- Modify: `tests/deviceDetails.test.mjs`, `tests/operationSelector.test.mjs`, `tests/nativeComponentHarness.mjs`, `tests/resourceIconForms.test.mjs`, `tests/feedback.test.mjs` for selector mocks, committed focus lifecycle and route deletion checks.
- Read/regress: `src/app/(app)/device/add.tsx`, `RoomSelector.tsx`, existing device tile preview logic. Do not change their public payloads or read/subscription behavior.
- Docs: AGENTS, interface/validation guides; narrowly append current DeviceForm surface evidence when verified.

**Interfaces:**
- Keep `OperationSelectorProps`'s `deviceId`, `initialOperationId?`, `filterTypes: OperationType[]`, `onSelected(value: string): void`; add `title?: string` (default `Operation`), `error?: string`, `disabled?: boolean`. No caller receives an automatic None callback when loading/filtering fails.
- Add optional `disabled?: boolean` to DeviceForm props for route-owned delete/accepted state; default false leaves creation unchanged. All form submit/selection/reset handlers honor combined own pending and external disabled state; preserve `DeviceFormRef` and partial submission shape.
- For accepted DeviceForm deletion, reuse and await the existing DeviceListProvider collection loader while preserving `refresh(): Promise<boolean>`. Its boolean must describe the completed collection read, not request scheduling. Do not duplicate the GET or let create/save callers observe an early success.
- Title each selector distinctly: `Tile operation`, `Primary reading operation`, `Reading N operation`, `Presence operation`. Add operation forwards exact routed `deviceId` and remains owner/manager-only.
- Append `tests/operationSelector.test.mjs` to `test:device-details`.

- [x] **Step 1: Add failing selector and delete-handler tests.** Names: `one compatible operation remains selectable`, `missing stored operation survives unrelated save`, `retained choices cannot mutate a pending form`, `accepted device deletion retries return only`. Required assertions include:
  ```js
  assert.match(operationReads[0], /size=2147483647/);
  assert.equal(chosenIds[0], "operation-101");
  assert.equal(unrelatedPatch.operationId, undefined);
  assert.equal(deleteCalls.length, 1); // accepted DELETE, refresh/return failed
  ```
  Test zero/one/101 operations, exact type filters/IDs and None, thrown/malformed/404 reads, local Retry, returning from Add, stale device/filter/option callbacks, historical selection retention, disabled Add and setter guards. Update Dropdown-based assertions to BottomSheetSelect. Pin required command/display/presence errors, disclosure opening and independent error clearing; retain readings/reset/preview invariants. Delete tests cover Cancel/Back, lost role/home/device/catalog membership, double confirm, failure/Retry and accepted/refocus/navigation-only recovery, including refocus before DELETE acceptance and while accepted refresh is pending.
- [x] **Step 2: Run the characterization.** `pnpm exec node --test tests/operationSelector.test.mjs tests/deviceDetails.test.mjs`; expected failures confined to the new migration behavior.
- [x] **Step 3: Implement native selectors and local recovery.** Use BottomSheetSelect for Tile/Presence, preserve current options and exact values, and build OperationSelector from existing field/section-action/alert primitives. One focus read loads the complete per-device catalog; rendering/filtering must not mutate the selected ID. Keep loaded same-device choices on refresh failure. Missing required selections stay as local field errors, with no toast. Preserve compatible type-transition drafts and PATCH omission of untouched references. Before exposing management, prove routed device membership in the selected home's existing complete `useDeviceList().devices`; recheck live membership and role before DELETE. Retain that verified target after accepted deletion even if refresh removes it from the catalog. Same-home list-read errors must not unmount a form whose membership was already proven. Bind confirmation/recovery to the loaded device/home/session and external disabled state; accepted follow-up resumes in the current matching focus generation after pending work releases, never with another DELETE. Route errors/Retry stay above Delete. Remove device detail success/error toasts and add `/device/details` inline suppression only now.
- [x] **Step 4: Verify task and update UI policy.** Run `pnpm test:device-details`, `pnpm test:icons`, required typecheck/lint/PoC and `git diff --check`; expected zero failures. In policy, record title/disabled/error behavior and unchanged values/partial saves, not unverified native claims.
- [x] **Step 5a: Commit implementation.** Commit `feat: finish native device tile and presence settings` was completed at `739a190` and follow-up provider correction at `ec47b34`.
- [x] **Step 5b: Complete scoped review.** Sol approved the Task 3 collection-loader correction with no findings. The native ec47 captures 079/080 verified local Retry after collection 503; current-source recheck is in captures 129/130.

**Authorized review follow-up — fix round 1:** Require selected-home catalog membership before device management; resume accepted DELETE refresh/return after early blur/refocus; and test route/selector focus through committed harness effects. `nativeComponentHarness` may accept `modules` as either its existing object or a factory called once with the harness React object. Keep object callers unchanged; focused tests register `useFocusEffect` with that React object's `useEffect(..., [callback])`, and explicit focus/blur only invoke committed registrations/cleanup. No product dependency or new generic abstraction.

**Authorized provider follow-up — fix round 3/5, 2026-11-04:** Native capture 077 on source 59cb891 reproduced an accepted device DELETE followed by a collection GET 503 and immediate return to Widgets. Commit `ec47b34` reuses and awaits the existing collection loader, preserves its boolean refresh contract, keeps accepted writes latched and covers pending, failure, 404, latest-read, home-change and real route composition. Captures 079/080 on ec47b34 verify local Retry after collection 503 and return after the matching read recovers without another DELETE. Task 3 scoped Sol review approved with no findings. Current-source recovery is independently retested in captures 129/130.

### Task 4: Complete operation details and consolidate the legacy list

**Files:**
- Modify: `src/app/(app)/device/operation/details.tsx`, `src/app/(app)/device/operation/list.tsx`, `src/app/(app)/_layout.tsx`, `src/components/device/operation/OperationForm.tsx`, `src/components/device/operation/OperationTile.tsx`, `src/components/device/widgets/WidgetList.tsx`, `src/contexts/custom/DeviceListProvider.tsx`, `src/contexts/ToastProvider.tsx`, `package.json`.
- Delete: `src/components/device/operation/OperationList.tsx` (only its legacy route imports it).
- Create: `tests/operationDetails.test.mjs`.
- Modify/test: `tests/operationForm.test.mjs`, `tests/homeDashboard.test.mjs`, `tests/widgetPicker.test.mjs`, `tests/widgetConfigPermissions.test.mjs`, `tests/feedback.test.mjs`.
- Docs: AGENTS; repository/interface/validation guides, noting retained URL alias and proven role context.

**Interfaces:**
- Add `children?: ReactNode` to OperationForm props and render it after configuration inside its existing KeyboardAwareScrollView. Preserve edit read-only behavior and create-only growing actions/feedback/returnAction. No new shared dialog component is needed.
- Add `deviceId?: string` to OperationTile props; WidgetList passes its explicit resolved device ID. Details route receives `operationId?: string|string[]`, `deviceId?: string|string[]`, normalizes opaque nonempty IDs and requests the routed operation.
- Consume current-home `useDeviceList(): { devices, loading, error, refresh, ... }`, existing home roles, and the full per-device operation catalog. These establish deletion context; an operationId-only old link permits server-authorized read-only detail and no Delete.
- `refreshDevice(deviceId)` returns `Promise<boolean>` for the validated matching current-home read. Failure, malformed, missing, mismatched or stale reads return false without replacing cache; live-update callers may ignore the result and remain fire-and-forget. No backend DTO or API field changes.
- Legacy route replaces itself with `/device/widget/list`, forwarding valid explicit `deviceId` and otherwise retaining canonical bound-device fallback. Keep registration without the old header/FAB; no new destination or DTO.
- Append `tests/operationDetails.test.mjs` to `test:device-details`.

- [x] **Step 1: Add failing route/membership/alias tests.** Names: `failed operation read never mounts a blank form`, `management in another home cannot delete this operation`, `accepted operation deletion retries only return`, `legacy operation list replaces to widgets with routed device`. Pin:
  ```js
  assert.equal(renderedOperationForms.length, 0); // failed GET
  assert.equal(deleteCalls.length, 0); // current home manages A, operation belongs to B
  assert.equal(deleteCalls.length, 1); // accepted then failed navigation
  assert.deepEqual(replacements[0], { pathname: "/device/widget/list", params: { deviceId: "device-a" } });
  ```
  Cover read/parse failure and Retry, missing/array IDs, known operation ID mismatch, Display read-only, owner/manager membership, stale/error device catalog, operation absent from bound device, old link without context, Cancel/Back, lost focus/role/context, widget/tile conflicts, thrown requests, synchronous DELETE lock and accepted/refocus fallback. Preserve selection-only WidgetList and creation form assertions.
- [x] **Step 2: Run characterization.** `pnpm exec node --test tests/operationDetails.test.mjs tests/operationForm.test.mjs tests/widgetPicker.test.mjs`; expected new detail/alias assertions fail before implementation.
- [x] **Step 3: Implement details and compatibility alias.** Only mount a validated matching read-only form. Render separate Delete ContentSection through the children slot. Follow existing native Modal/named PortalHost Reusables confirmation with scrollable body and stacked buttons. Delete requires a loaded current-home device, exact operation membership and current owner/manager permission; stale/unavailable membership offers local read recovery rather than Delete. Accurate copy explains detach/unlink requirements and automation consequences, without claiming widgets are cascaded. Capture confirmation identity, latch accepted DELETE before matching-cache refresh, ignore late feedback/return and provide navigation-only return recovery. Add both operation routes to inline suppression, forward `deviceId`, replace the old list and delete its unused component.
- [x] **Step 4: Verify task and update conventions.** Run `pnpm test:device-details`, required typecheck/lint/PoC and `git diff --check`; expected zero failures. Confirm `rg -n 'OperationList|device/operation/list' src` finds no stale component import and only intentional compatibility references. Record the alias and safe deletion context in guides.
- [x] **Step 5: Commit and review.** Commit `feat: complete native operation details and list compatibility`; scoped Sol review approved the Task 4 fix with no findings. Task 6 retested both accepted-read recovery boundaries on source 8f4f7f4 in captures 127–130.

**Fix round 3/5 status, 2026-11-04:** Commit 59cb891 implements the boolean per-device refresh result and keeps accepted read Retry until success. Task 4 tests and selected native captures 075/076 passed, including one accepted DELETE and two matching-device reads after Retry. Scoped Sol review approved with no findings. Because Task 3 later changed the shared provider collection loader in ec47b34, Task 6 replayed both recovery boundaries on current source 8f4f7f4 in captures 127–130.

### Task 5: Complete confirmation, legal, maintenance and app information screens

**Files:**
- Modify: `src/app/confirmEmail.tsx`, `src/app/maintenance.tsx`, `src/app/privacy.tsx`, `src/app/terms.tsx`, `src/app/(app)/user/privacy.tsx`, `src/app/(app)/user/terms.tsx`, `src/app/(app)/user/info.tsx`, `src/app/(app)/_layout.tsx`.
- Modify: `src/contexts/SessionProvider.tsx`, `src/contexts/domain/LegalProvider.tsx`, `src/contexts/ToastProvider.tsx`, `src/components/user/PrivacyPolicy.tsx`, `src/components/user/TermsAndConditions.tsx`, `package.json`.
- Create: `src/components/user/LegalDocumentView.tsx`; `tests/confirmEmail.test.mjs`, `tests/legalDocuments.test.mjs`, `tests/statusScreens.test.mjs`.
- Modify/test: `tests/feedback.test.mjs`; read/regress AuthFlow/AuthPanel legal links, existing sign-in resend flow, ConfigurationProvider and Markdown. Do not add a resend flow, compatibility API, generic status shell or factual copy.
- Docs: AGENTS; repository/interface/API-client behavior/validation/tooling guides.

**Interfaces:**
- Consume Task 1 Header `onBack?`/`backFallback?`: public legal wrappers set `variant="brand" backFallback="/start"`; private legal/info headers remain Stack-owned.
- Define `interface LegalDocumentViewProps { kind: "privacy" | "terms" }`; component is `FC<LegalDocumentViewProps>`. Existing default legal wrappers return the appropriate kind, preserving imports.
- Preserve `getTerms(): Promise<Result<LegalDocument>>`, `getPrivacy(): Promise<Result<LegalDocument>>`, `confirmEmail(userId: string, code: string): Promise<SimpleResult>`, `initialize(): Promise<void>`. Legal failure/parse validation returns Result; no transport/public contract change. Key view requests by kind and `configuration.getBaseUrl().toString()`, never an unstable provider object.
- Append all three test files to `test:poc`. Inline routes: `/confirmEmail`, `/maintenance`, `/privacy`, `/terms`, `/user/privacy`, `/user/terms`, `/user/info`.

- [x] **Step 1: Add failing public-provider and route tests.** Names: `confirmation sends exact opaque query values`, `confirmation succeeds once across rerenders`, `legal content and version remain authoritative`, `maintenance exits using updated provider state`. Essential oracles:
  ```js
  assert.equal(sentUrl.searchParams.get("code"), "a+b/=&✓");
  assert.equal(confirmationPosts.length, 1); // success plus rerender/refocus
  assert.equal(loggedText.includes("a+b/=&✓"), false);
  assert.equal(renderedMarkdown, serverDocument.content);
  assert.equal(startReplacements.length, 0); // compatibility restored, now authenticated
  ```
  Confirmation cases include missing/empty/repeated params, exact strings without double decoding, failure/throw/Retry, parallel presses, changed params/server and blur. Legal tests cover each kind and all four wrappers, parse/shape/error/Retry, empty summary allowed but nonempty version/full content required, stale kind/server/unmount and no initial Version placeholder. Maintenance covers still-blocked neutral copy, shared pull/button lock, updated auth state and blurred local completion. Info tests pin every existing metadata value/legal destination, wrapping scroll and final-row access through host props.
- [x] **Step 2: Run characterization.** `pnpm exec node --test tests/confirmEmail.test.mjs tests/legalDocuments.test.mjs tests/statusScreens.test.mjs`; expected failures on query encoding, recovery and old wrappers, with no unrelated suite failures accepted.
- [x] **Step 3: Implement the supporting screens.** Use the existing auth/status grammar, themed growing scrolls and separate real Retry/Sign in controls. Encode confirmation through `URL.searchParams` and remove exception interpolation that could contain a token; retain exact code strings, one in-flight request and success latch per parameter identity. Reject ambiguous parameters locally. Legal provider catches request/JSON/consumed-shape failures; shared view owns local read/Retry and exact summary/content/version. Both wrapper types use brand headers without nested scrolling. Maintenance awaits existing initialization and reacts to the resulting live provider state, routing authenticated recovery to consents and other compatible recovery to Start; keep the provider's own authentication routing. Explicit Retry and optional pull share one lock. Info keeps its existing values/navigation inside one 448 dp scroll. Add route suppression only after local recovery exists.
- [x] **Step 4: Verify task and update architecture/policy.** Run `pnpm test:poc`, `pnpm test:data-sources`, `pnpm test:device-details`, required typecheck/lint and `git diff --check`; expected zero failures. Add delayed provider failure/keyboard checks to feedback tests. Update guides for the shared legal component, exact token encoding, status recovery and test commands. Do not mark audit entries natively verified yet.
- [x] **Step 5: Commit and review.** Commit `feat: complete native account and service support screens`; the Task 5 fix review addressed the retained-callback findings with no new important breakage. Broader native artifact loss and release-link limits remain documented in Task 6.

### Task 6: Verify Android integration, update the audit and open the PR

**Files:**
- Create: `docs/superpowers/validation/2026-11-03-ui-audit-remainder.md`, selected numbered PNG/XML captures and `manifest.json` under `docs/superpowers/validation/assets/ui-audit-remainder/`.
- Modify: `docs/ui-refactor-audit-2026-10-28.md`; final corrections to task-local guides/spec/plan status and `.impeccable/surfaces/src-app-app-device-add-tsx.md`, `.impeccable/surfaces/src-app-app-index-tsx.md` only for actual affected DeviceForm behavior/evidence.
- Product/test edits occur only when an observed issue demands correction; each receives its owning task's narrow test/check gate and Sol review before completion.

**Interfaces:**
- Consume completed Tasks 1–5, their commits/review records and coordinator-owned emulator/fixture tooling. No new product interface, dependency or unreviewed fixture export survives.
- Production export: `pnpm exec expo export --platform android --output-dir /tmp/senswave-ui-audit-android-export`.
- Final remote review branch: `feat/ui-audit-remainder`; PR base `next-dev`, title `feat: complete remaining native UI audit flows`. Keep local branch `next-dev` and do not merge.

- [x] **Step 1: Run the final relevant regression set and production export.** Typecheck, lint, PoC, data-sources, device-details, homes, dashboard, icons, automations, build and the final clear-cache Android export passed. Their latest source and outcome are listed in the validation report; several unchanged owning suites were not repeated after the optional Display metadata follow-up.
- [x] **Step 2: Exercise the bounded Android matrix.** Root completed the planned disposable-fixture cases across normal and compact viewports, Light and Dark themes, font scales, role gates, keyboard reachability, accepted-write recovery, confirmation, legal, maintenance and App Info. The report distinguishes exact-source captures, historical failures and unverified TalkBack/backend/hardware/release-link behavior.
- [x] **Step 3: Prepare the native report, curated manifest and audit corrections.** Selected actual PNG/XML pairs are hash- and source-pinned; the audit covers remaining rows, preserves the legacy OperationList history and automation/dashboard evidence, and records cleanup and limits. Relative links, manifest hashes and diff checks are part of this docs checkpoint.
- [ ] **Step 4: Obtain the final whole-change Sol review of documentation and evidence.** Source review approved the F1/F2/M1/F3 correction wave, but the final documentation addendum, including the App Info label follow-up, is still pending review because the reviewer tool reported its usage limit. Root will retry once after this checkpoint. If unavailable, keep the gate explicitly pending and use the Draft-only publication rule below; do not substitute another reviewer or claim overall approval.
- [ ] **Step 5: Publish the reviewable result.** No PR exists yet. After the documentation checkpoint, publish the local `next-dev` result to `feat/ui-audit-remainder`, targeting `next-dev` with title `feat: complete remaining native UI audit flows`. If the Sol documentation gate remains quota-blocked, create a Draft PR that says so plainly. Do not push to remote `next-dev`/`main`, merge or release; report the resulting PR URL and limits.

## Plan self-review

- **Spec coverage:** Consent → Task 1; sources/captured refresh → Task 2; Tile/Presence/selector/device delete → Task 3; operation detail/role/alias → Task 4; email/legal/four wrappers/maintenance/info → Task 5; native acceptance/audit/PR → Task 6. Feedback, brand headers, documentation and tests belong to the implementing task rather than a late generic cleanup.
- **Step scan:** Every task has named failing tests/oracles, one implementation boundary, explicit verification commands and a reviewable commit. Product bodies and a new abstraction framework are deliberately absent.
- **Type consistency:** Header overrides, background home refresh result, source list/tile props, OperationSelector fields, DeviceForm external disabled state, OperationForm children and optional OperationTile device ID are defined at their owner before consumption. Existing public auth/legal/provider signatures remain stable except the explicitly extended home refresh result.
- **Review Focus:** All five input classes above have named tests in their owner task. Pending and acceptance precede post-write state guards; legacy links never manufacture ownership.
- **Proportion:** Six sequential tasks cover the approved completion release. Native evidence remains separate from handler tests; no repeated permission, unrelated dependency work or product scope expansion is planned.
