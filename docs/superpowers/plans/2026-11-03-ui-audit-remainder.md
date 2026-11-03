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
- Expected failure of a newly added TDD characterization is an authorized red step. Any unexpected existing-test/check failure: notify the coordinator and STOP for the human; do not continue fixes or unrelated work without direction.
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

Recorded preflight: Node 26.12.1, typecheck/lint passed (281 formatted files), PoC 43/43 passed; only existing `MODULE_TYPELESS_PACKAGE_JSON` warning. Hooks are installed. The coordinator owns disposable emulator user 11 on `emulator-5554`, with original user 0 stopped, and prepares fixtures under `/tmp`; preserve that isolation rather than creating competing QA state.

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
- Modify: `src/components/dataSource/DataSourceList.tsx`, `src/components/dataSource/tile/DataSourceTile.tsx`, `src/contexts/domain/HomeProvider.tsx`, `src/contexts/ToastProvider.tsx`, `package.json`.
- Create: `tests/dataSourceList.test.mjs`, `tests/homeDataSourceSelect.test.mjs`.
- Read/regress: `HomeStateWidget.tsx` (already passes `homeId`), `BrokerClient.tsx`, `StartBrokerClientForm.tsx`; existing `tests/homeForm.test.mjs`, `tests/startBrokerClient.test.mjs`, `tests/dataSourceDetails.test.mjs`, `tests/feedback.test.mjs`.
- Docs: AGENTS; interface, API/client behavior, validation and tooling guides.

**Interfaces:**
- Consume Task 1's default brand Header; use `variant="brand"` in these Stack entries.
- Define `RefreshCurrentHomeOptions` with `homeId?: string; background?: boolean`; `refreshCurrent(options?: RefreshCurrentHomeOptions): Promise<boolean>`. No arguments preserve existing global-loading behavior. `{homeId,background:true}` refreshes only that still-current home without replacing the selection page. Invalid/malformed/failed/stale reads return `false` and always release owned loading state.
- Extend `DataSourceListProps`: existing `onListItemSelected?: (id: string) => void`; add `header?: ReactNode`, `feedback?: ReactNode`, `disabled?: boolean`, `selectedSourceId?: string`, `pending?: boolean`. List owns the only FlatList; route supplies ContentSection header and action feedback. Render selected-source feedback beside its row, with a header fallback when that row is unavailable.
- Extend `DataSourceTileProps` with optional `selected?: boolean`, `loading?: boolean`; forward to ListRow and show named linking feedback without losing the status badge. Existing callers keep their defaults.
- Append the two new tests to `test:data-sources`.

- [ ] **Step 1: Add failing list, provider and assignment tests.** Names: `source list loads all sources once per focus`, `accepted link survives assigned-home refresh`, `captured refresh cannot replace another home`. Pin these values:
  ```js
  assert.equal(listReads[0], "v1/datasources/brokers?page=1&size=2147483647");
  assert.deepEqual(linkCalls[0], ["v1/homes/home-a/datasource", { brokerId: "source-11" }]);
  assert.equal(linkCalls.length, 1); // accepted PUT, failed refresh, repeated Retry
  assert.equal(homeAfterLateResponse.id, "home-b");
  ```
  Cover empty 404 versus first failure, malformed/thrown reads, cached refresh failure, stable ID keys, old focus/session responses, double row taps, Manage/Display/route mismatch/already-assigned denial, ownership loss, post-acceptance assigned-home state, missing history and thrown return. Assert default no-argument refresh callers still settle and do not receive another home's data.
- [ ] **Step 2: Run the new characterization.** `pnpm exec node --test tests/dataSourceList.test.mjs tests/homeDataSourceSelect.test.mjs`; expected specific assertion failures on current duplicate/limited reads and unguarded assignment.
- [ ] **Step 3: Implement the interfaces and route behavior.** Replace mount+focus reads with one focus-generation read, clear mismatched data, retain same-list rows during refresh and keep Add available during list-read errors. Remove source FABs; supply named Add data source in `ContentSection.headerAction`. Read/forward exact `homeId` from both entry points. Require matched current home and owner before Add/PUT. Keep rows mounted and choices locked while linking. Use captured/background refresh only after accepted PUT, with read/return-only recovery and accepted state checked before the “already assigned” pre-write guard. Scope provider state updates to captured home and session. Add inline suppression for `/dataSource/list` and `/home/dataSource/select`.
- [ ] **Step 4: Verify task and document client behavior.** Run `pnpm test:data-sources`, `pnpm exec node --test tests/homeForm.test.mjs tests/homeDashboard.test.mjs`, required typecheck/lint/PoC and `git diff --check`; expected zero failures. Ensure existing caller mocks/types match the boolean result without broad edits. Update the guides in this task's commit.
- [ ] **Step 5: Commit and review.** Commit `feat: complete native data source selection` with only task files. Sol reviews stale-home completion, one accepted PUT and both no-argument refresh callers before Task 3.

### Task 3: Finish Tile/Presence controls and device-delete recovery

**Files:**
- Modify: `src/components/device/DeviceForm.tsx`, `src/components/device/operation/OperationSelector.tsx`, `src/app/(app)/device/details.tsx`, `src/contexts/ToastProvider.tsx`, `package.json`.
- Create: `tests/operationSelector.test.mjs`.
- Modify: `tests/deviceDetails.test.mjs`, `tests/resourceIconForms.test.mjs`, `tests/feedback.test.mjs` for new selector mocks and route deletion checks.
- Read/regress: `src/app/(app)/device/add.tsx`, `RoomSelector.tsx`, existing device tile preview logic. Do not change their public payloads or read/subscription behavior.
- Docs: AGENTS, interface/validation guides; narrowly append current DeviceForm surface evidence when verified.

**Interfaces:**
- Keep `OperationSelectorProps`'s `deviceId`, `initialOperationId?`, `filterTypes: OperationType[]`, `onSelected(value: string): void`; add `title?: string` (default `Operation`), `error?: string`, `disabled?: boolean`. No caller receives an automatic None callback when loading/filtering fails.
- Add optional `disabled?: boolean` to DeviceForm props for route-owned delete/accepted state; default false leaves creation unchanged. All form submit/selection/reset handlers honor combined own pending and external disabled state; preserve `DeviceFormRef` and partial submission shape.
- Title each selector distinctly: `Tile operation`, `Primary reading operation`, `Reading N operation`, `Presence operation`. Add operation forwards exact routed `deviceId` and remains owner/manager-only.
- Append `tests/operationSelector.test.mjs` to `test:device-details`.

- [ ] **Step 1: Add failing selector and delete-handler tests.** Names: `one compatible operation remains selectable`, `missing stored operation survives unrelated save`, `retained choices cannot mutate a pending form`, `accepted device deletion retries return only`. Required assertions include:
  ```js
  assert.match(operationReads[0], /size=2147483647/);
  assert.equal(chosenIds[0], "operation-101");
  assert.equal(unrelatedPatch.operationId, undefined);
  assert.equal(deleteCalls.length, 1); // accepted DELETE, refresh/return failed
  ```
  Test zero/one/101 operations, exact type filters/IDs and None, thrown/malformed/404 reads, local Retry, returning from Add, stale device/filter/option callbacks, historical selection retention, disabled Add and setter guards. Update Dropdown-based assertions to BottomSheetSelect. Pin required command/display/presence errors, disclosure opening and independent error clearing; retain readings/reset/preview invariants. Delete tests cover Cancel/Back, lost role/home/device, double confirm, failure/Retry and accepted/refocus/navigation-only recovery.
- [ ] **Step 2: Run the characterization.** `pnpm exec node --test tests/operationSelector.test.mjs tests/deviceDetails.test.mjs`; expected failures confined to the new migration behavior.
- [ ] **Step 3: Implement native selectors and local recovery.** Use BottomSheetSelect for Tile/Presence, preserve current options and exact values, and build OperationSelector from existing field/section-action/alert primitives. One focus read loads the complete per-device catalog; rendering/filtering must not mutate the selected ID. Keep loaded same-device choices on refresh failure. Missing required selections stay as local field errors, with no toast. Preserve compatible type-transition drafts and PATCH omission of untouched references. Bind device confirmation/accepted deletion to loaded device/home/session and external disabled state; route errors/Retry stay above Delete. Remove device detail success/error toasts and add `/device/details` inline suppression only now.
- [ ] **Step 4: Verify task and update UI policy.** Run `pnpm test:device-details`, `pnpm test:icons`, required typecheck/lint/PoC and `git diff --check`; expected zero failures. In policy, record title/disabled/error behavior and unchanged values/partial saves, not unverified native claims.
- [ ] **Step 5: Commit and review.** Commit `feat: finish native device tile and presence settings`. Sol checks unrelated edits with an unavailable historical operation, hidden disclosures and retained callback locks before Task 4.

### Task 4: Complete operation details and consolidate the legacy list

**Files:**
- Modify: `src/app/(app)/device/operation/details.tsx`, `src/app/(app)/device/operation/list.tsx`, `src/app/(app)/_layout.tsx`, `src/components/device/operation/OperationForm.tsx`, `src/components/device/operation/OperationTile.tsx`, `src/components/device/widgets/WidgetList.tsx`, `src/contexts/ToastProvider.tsx`, `package.json`.
- Delete: `src/components/device/operation/OperationList.tsx` (only its legacy route imports it).
- Create: `tests/operationDetails.test.mjs`.
- Modify/test: `tests/operationForm.test.mjs`, `tests/widgetPicker.test.mjs`, `tests/widgetConfigPermissions.test.mjs`, `tests/feedback.test.mjs`.
- Docs: AGENTS; repository/interface/validation guides, noting retained URL alias and proven role context.

**Interfaces:**
- Add `children?: ReactNode` to OperationForm props and render it after configuration inside its existing KeyboardAwareScrollView. Preserve edit read-only behavior and create-only growing actions/feedback/returnAction. No new shared dialog component is needed.
- Add `deviceId?: string` to OperationTile props; WidgetList passes its explicit resolved device ID. Details route receives `operationId?: string|string[]`, `deviceId?: string|string[]`, normalizes opaque nonempty IDs and requests the routed operation.
- Consume current-home `useDeviceList(): { devices, loading, error, refresh, ... }`, existing home roles, and the full per-device operation catalog. These establish deletion context; an operationId-only old link permits server-authorized read-only detail and no Delete.
- Legacy route replaces itself with `/device/widget/list`, forwarding valid explicit `deviceId` and otherwise retaining canonical bound-device fallback. Keep registration without the old header/FAB; no new destination or DTO.
- Append `tests/operationDetails.test.mjs` to `test:device-details`.

- [ ] **Step 1: Add failing route/membership/alias tests.** Names: `failed operation read never mounts a blank form`, `management in another home cannot delete this operation`, `accepted operation deletion retries only return`, `legacy operation list replaces to widgets with routed device`. Pin:
  ```js
  assert.equal(renderedOperationForms.length, 0); // failed GET
  assert.equal(deleteCalls.length, 0); // current home manages A, operation belongs to B
  assert.equal(deleteCalls.length, 1); // accepted then failed navigation
  assert.deepEqual(replacements[0], { pathname: "/device/widget/list", params: { deviceId: "device-a" } });
  ```
  Cover read/parse failure and Retry, missing/array IDs, known operation ID mismatch, Display read-only, owner/manager membership, stale/error device catalog, operation absent from bound device, old link without context, Cancel/Back, lost focus/role/context, widget/tile conflicts, thrown requests, synchronous DELETE lock and accepted/refocus fallback. Preserve selection-only WidgetList and creation form assertions.
- [ ] **Step 2: Run characterization.** `pnpm exec node --test tests/operationDetails.test.mjs tests/operationForm.test.mjs tests/widgetPicker.test.mjs`; expected new detail/alias assertions fail before implementation.
- [ ] **Step 3: Implement details and compatibility alias.** Only mount a validated matching read-only form. Render separate Delete ContentSection through the children slot. Follow existing native Modal/named PortalHost Reusables confirmation with scrollable body and stacked buttons. Delete requires a loaded current-home device, exact operation membership and current owner/manager permission; stale/unavailable membership offers local read recovery rather than Delete. Accurate copy explains detach/unlink requirements and automation consequences, without claiming widgets are cascaded. Capture confirmation identity, latch accepted DELETE before matching-cache refresh, ignore late feedback/return and provide navigation-only return recovery. Add both operation routes to inline suppression, forward `deviceId`, replace the old list and delete its unused component.
- [ ] **Step 4: Verify task and update conventions.** Run `pnpm test:device-details`, required typecheck/lint/PoC and `git diff --check`; expected zero failures. Confirm `rg -n 'OperationList|device/operation/list' src` finds no stale component import and only intentional compatibility references. Record the alias and safe deletion context in guides.
- [ ] **Step 5: Commit and review.** Commit `feat: complete native operation details and list compatibility`. Sol reviews membership proof, full catalog, preserved read-only values and unchanged widget picker/create behavior before Task 5.

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

- [ ] **Step 1: Add failing public-provider and route tests.** Names: `confirmation sends exact opaque query values`, `confirmation succeeds once across rerenders`, `legal content and version remain authoritative`, `maintenance exits using updated provider state`. Essential oracles:
  ```js
  assert.equal(sentUrl.searchParams.get("code"), "a+b/=&✓");
  assert.equal(confirmationPosts.length, 1); // success plus rerender/refocus
  assert.equal(loggedText.includes("a+b/=&✓"), false);
  assert.equal(renderedMarkdown, serverDocument.content);
  assert.equal(startReplacements.length, 0); // compatibility restored, now authenticated
  ```
  Confirmation cases include missing/empty/repeated params, exact strings without double decoding, failure/throw/Retry, parallel presses, changed params/server and blur. Legal tests cover each kind and all four wrappers, parse/shape/error/Retry, empty summary allowed but nonempty version/full content required, stale kind/server/unmount and no initial Version placeholder. Maintenance covers still-blocked neutral copy, shared pull/button lock, updated auth state and blurred local completion. Info tests pin every existing metadata value/legal destination, wrapping scroll and final-row access through host props.
- [ ] **Step 2: Run characterization.** `pnpm exec node --test tests/confirmEmail.test.mjs tests/legalDocuments.test.mjs tests/statusScreens.test.mjs`; expected failures on query encoding, recovery and old wrappers, with no unrelated suite failures accepted.
- [ ] **Step 3: Implement the supporting screens.** Use the existing auth/status grammar, themed growing scrolls and separate real Retry/Sign in controls. Encode confirmation through `URL.searchParams` and remove exception interpolation that could contain a token; retain exact code strings, one in-flight request and success latch per parameter identity. Reject ambiguous parameters locally. Legal provider catches request/JSON/consumed-shape failures; shared view owns local read/Retry and exact summary/content/version. Both wrapper types use brand headers without nested scrolling. Maintenance awaits existing initialization and reacts to the resulting live provider state, routing authenticated recovery to consents and other compatible recovery to Start; keep the provider's own authentication routing. Explicit Retry and optional pull share one lock. Info keeps its existing values/navigation inside one 448 dp scroll. Add route suppression only after local recovery exists.
- [ ] **Step 4: Verify task and update architecture/policy.** Run `pnpm test:poc`, `pnpm test:data-sources`, `pnpm test:device-details`, required typecheck/lint and `git diff --check`; expected zero failures. Add delayed provider failure/keyboard checks to feedback tests. Update guides for the shared legal component, exact token encoding, status recovery and test commands. Do not mark audit entries natively verified yet.
- [ ] **Step 5: Commit and review.** Commit `feat: complete native account and service support screens`. Sol checks token-containing error paths, URL identity changes, all four legal wrappers and absence of stale maintenance navigation.

### Task 6: Verify Android integration, update the audit and open the PR

**Files:**
- Create: `docs/superpowers/validation/2026-11-03-ui-audit-remainder.md`, selected numbered PNG/XML captures and `manifest.json` under `docs/superpowers/validation/assets/ui-audit-remainder/`.
- Modify: `docs/ui-refactor-audit-2026-10-28.md`; final corrections to task-local guides/spec/plan status and `.impeccable/surfaces/src-app-app-device-add-tsx.md`, `.impeccable/surfaces/src-app-app-index-tsx.md` only for actual affected DeviceForm behavior/evidence.
- Product/test edits occur only when an observed issue demands correction; each receives its owning task's narrow test/check gate and Sol review before completion.

**Interfaces:**
- Consume completed Tasks 1–5, their commits/review records and coordinator-owned emulator/fixture tooling. No new product interface, dependency or unreviewed fixture export survives.
- Production export: `pnpm exec expo export --platform android --output-dir /tmp/senswave-ui-audit-android-export`.
- Final remote review branch: `feat/ui-audit-remainder`; PR base `next-dev`, title `feat: complete remaining native UI audit flows`. Keep local branch `next-dev` and do not merge.

- [ ] **Step 1: Run the final relevant regression set.** After source/fixture cleanup, run `pnpm typecheck`, `pnpm lint`, `pnpm test:poc`, `pnpm test:data-sources`, `pnpm test:device-details`, `pnpm test:homes`, `pnpm test:dashboard`, `pnpm test:icons`, `pnpm test:automations`, the production Android export and `git diff --check`. Expected: checks exit 0 and tests report zero failures. Do not rerun unchanged suites after documentation-only edits; rerun the affected suites after any source correction. Record existing warnings precisely.
- [ ] **Step 2: Exercise the actual Android flows and capture evidence.** Use `emulator-5554` when still available; record original settings first. Verify each changed route at 448 dp Light and 320 dp Dark, font scales 1.0 and 1.3, with a short 480 dp window and tall window represented. Confirm first/last content, native 48 dp targets, large names/URLs/legal text, pending/error/Retry, all sheet/dialog Cancel/Back/Confirm paths, gate logout/legal return, and IME reachability for DeviceForm. Use disposable data for writes; preserve original household metadata/configuration. Include Owner/Manage/Display source/operation gates, accepted-write recovery, legacy operation URL, exact token confirmation failure/retry, every legal wrapper, maintenance recovery and info navigation. Label fixtures on screen; they prove layout/handlers, not real backend or hardware writes. Capture real happy-path reads and disposable request behavior separately. Restore settings and remove temporary routes/exports.
- [ ] **Step 3: Write the native report and audit corrections.** Manifest records revision, device, viewport/density/font/theme/state and fixture/live origin for each numbered capture. Keep useful original PNG/XML evidence, link it from the report and document cleanup. Update every remaining audit row from actual implementation/check evidence; distinguish unexercised TalkBack, physical MQTT, hardware and backend paths. Preserve completed automation/dashboard evidence and historical audit findings. Check relative links and `git diff --check`.
- [ ] **Step 4: Run the whole-change Sol review and commit delivery documentation.** Reviewer reads the complete diff from `b40b990`, approved spec, task checks and native captures. Address concrete findings using the owning task's checks, then confirm no fixture/product residue, credentials or token URLs appear in the diff. For any final source change, run the required commit gate. Commit `chore: document remaining UI audit completion` after documentation checks; record limitations in the report and PR.
- [ ] **Step 5: Publish the reviewable result.** Verify clean status and branch/commit identities; push local HEAD only to the new remote branch (`git push origin HEAD:refs/heads/feat/ui-audit-remainder`). Create the PR targeting `next-dev` with the exact title above and a normal-prose body written to a temporary file and passed by `--body-file`. Describe resulting behavior, meaningful check/native evidence, compatibility alias and material limits. Do not push to remote `next-dev`/`main`, merge or release. Report PR URL and unverified behavior to the user.

## Plan self-review

- **Spec coverage:** Consent → Task 1; sources/captured refresh → Task 2; Tile/Presence/selector/device delete → Task 3; operation detail/role/alias → Task 4; email/legal/four wrappers/maintenance/info → Task 5; native acceptance/audit/PR → Task 6. Feedback, brand headers, documentation and tests belong to the implementing task rather than a late generic cleanup.
- **Step scan:** Every task has named failing tests/oracles, one implementation boundary, explicit verification commands and a reviewable commit. Product bodies and a new abstraction framework are deliberately absent.
- **Type consistency:** Header overrides, background home refresh result, source list/tile props, OperationSelector fields, DeviceForm external disabled state, OperationForm children and optional OperationTile device ID are defined at their owner before consumption. Existing public auth/legal/provider signatures remain stable except the explicitly extended home refresh result.
- **Review Focus:** All five input classes above have named tests in their owner task. Pending and acceptance precede post-write state guards; legacy links never manufacture ownership.
- **Proportion:** Six sequential tasks cover the approved completion release. Native evidence remains separate from handler tests; no repeated permission, unrelated dependency work or product scope expansion is planned.
