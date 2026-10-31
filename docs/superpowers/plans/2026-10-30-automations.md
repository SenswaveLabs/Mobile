# Native Automations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make home automations reachable and migrate their four forms without losing drafts, permissions, or accepted writes.

**Architecture:** A separate home-scoped list links to native parent/child forms. The existing automation provider holds one explicit session and performs no implicit GET; routes own HTTP, pending locks, accepted return, and saved baselines.

**Tech Stack:** React Native 0.81.5, Expo 54 / Expo Router 6, React 19, TypeScript 5.9, local React Native Reusables, existing nativeComponentHarness and node:test.

**Spec:** [Approved design](../specs/2026-10-30-automations-design.md), approved 2026-10-30; builder review found no important gaps.

## Global Constraints

- Work stays in the original local checkout, without worktrees. The eventual PR targets `next-dev`; it is not merged autonomously.
- No dependency, backend, infrastructure, release, or shared API contract changes are included.
- Native styling uses `StyleSheet.create()` / `useTheme()`, FC components and interface props; reuse existing fields, sheets, sections, dialogs and keyboard-aware scrolling.
- One scroll, maximum form width 448 dp, minimum 48 dp named targets; actions stay in scroll and grow toward the bottom on tall creation screens.
- All requests use `useHttpClient()`. Preserve the current fourteen automation quick icons and global browser/search with exact stored keys.
- POST create requires 1–7 conditions and 1–7 results and has no `isEnabled`; creation defaults enabled. Existing-child PUTs have no collection cap or deduplication.
- Owner/Manage: create, metadata PATCH and state PUT. Owner only: existing-child PUT and automation DELETE. All roles: list/read. Recheck live permission inside callbacks.
- Result create/read/local state uses `valueToSend`; existing-result PUT uses `value`. Entered result/text strings remain exact; do not parse or trim them.
- Write focused failing tests first. Expected RED for the missing feature is evidence; an unexpected regression/failure must be reported to the human and work paused.
- Tasks share files and run sequentially. Do not commit partial/broken boundaries; controller commits only after integration and required checks. User already authorized implementation; no additional approval gate.

## Review Focus

1. A previous home's slow response must never populate the new home's list/session (Task 1 tests).
2. Owner downgraded while a child form is open must not retain PUT permission (Task 3 tests).
3. Successful writes followed by blur or broken navigation must not repeat writes or append rows twice (Tasks 2–3 tests).
4. Historical icons, one-sided numeric configurations and non-string read values must survive unrelated metadata edits unchanged (Task 2 tests).
5. Repeated operation IDs are separate rows; removing one draft row must preserve the other, and persisted counts above seven remain readable/addable (Tasks 1–3 tests).

## File responsibilities and shared interfaces

Keep existing paths. `AutomationsTypes.tsx` defines exact write/input types while retaining read DTO support for historical configurations and primitive result values. The provider owns collection identity; parent forms own field drafts, parent routes own request lifecycle. Child forms own selections/configuration/loading; child routes decide local append versus awaited PUT. No generic draft/form framework.

Task 1 must export these names from `src/types/AutomationsTypes.tsx`:

```ts
type AutomationConditionInput =
  | { operationId: string; conditionType: "BooleanCondition"; conditionConfiguration: { isOn: boolean } }
  | { operationId: string; conditionType: "NumberCondition"; conditionConfiguration: { minValue: number; maxValue: number } }
  | { operationId: string; conditionType: "TextCondition"; conditionConfiguration: { requiredValue: string } };
type AutomationConditionDraft = AutomationConditionInput & { operationName: string };
interface AutomationResultDraft { operationId: string; operationName: string; valueToSend: string }
interface AutomationFormValues { name: string; icon: string; conditionConnector: ConditionConnector; isEnabled: boolean }
interface CreateAutomationRequest {
  homeId: string; name: string; icon: string; conditionConnector: ConditionConnector;
  conditions: AutomationConditionInput[];
  results: { operationId: string; valueToSend: string }[];
}
type PatchAutomationRequest = Partial<Pick<AutomationFormValues, "name" | "icon" | "conditionConnector">>;
interface PutAutomationResultRequest { operationId: string; value: string }
interface AutomationSession {
  token: string; homeId: string; automationId?: string;
  conditions: AutomationConditionDto[]; results: AutomationResultDto[];
}
```

`useAutomation()` exposes the following from Task 1 (keep old members temporarily only while required by unmigrated callers):

```ts
session: AutomationSession | undefined;
beginSession(homeId: string, automation?: AutomationDto): string;
clearSession(token: string): void;
isCurrentSession(token: string): boolean;
appendCondition(token: string, value: AutomationConditionDraft): boolean;
appendResult(token: string, value: AutomationResultDraft): boolean;
removeDraftCondition(token: string, index: number): boolean;
removeDraftResult(token: string, index: number): boolean;
```

`beginSession` makes a fresh opaque string token and stores state plus a synchronous ref. New sessions require current-home Manage/Owner; saved sessions require matching `automation.homeId` and allow Display reads. Mutation methods check current session/home and live permissions; draft appends/removals enforce 0–7 items, saved appends require Owner and have no cap. Home change clears session; create permission loss invalidates the draft. Never clear a newer session from old cleanup. No implicit network read. An accepted saved append is called exactly once by its route.

`useAutomationList()` exposes `homeId?: string`, `automations: AutomationDto[]`, `loading: boolean`, `error?: string`, and `refresh(expectedHomeId?: string): Promise<boolean>`. Expose rows only for the current home. Auto-load once when selected home changes; `refresh` awaits the request before clearing loading, rejects stale/malformed results, retains same-home rows on refresh failure, and returns false without HTTP if `expectedHomeId` no longer matches. No provider toasts.

Task 2 parent forms use these props; Task 3 child forms use the exact callback names/types below:

```ts
interface AutomationFormProps {
  mode: "create" | "details"; sessionToken: string; initialValues: AutomationFormValues;
  readOnly: boolean; canAddChildren: boolean; pending: boolean;
  accepted?: boolean; actionError?: string; footer?: ReactNode;
  onSubmit(values: AutomationFormValues): Promise<void>;
}
interface AutomationConditionFormProps {
  pending: boolean; accepted: boolean; actionError?: string;
  onSubmit(value: AutomationConditionDraft): Promise<void>;
}
interface AutomationResultFormProps {
  pending: boolean; accepted: boolean; actionError?: string;
  onSubmit(value: AutomationResultDraft): Promise<void>;
}
```

Child route params are `{ sessionToken: string, automationId?: string }`: omit `automationId` only for a matching live create session. Normalize array params to first string, reject missing/blank token or mismatched ID/session without loading the form or sending HTTP. Metadata stays in mounted `AutomationForm` state; `initialValues` updates the saved baseline, never resets a dirty field through an effect. `accepted` locks editing and makes the action retry return only. Parent owns create/delete accepted state; child route owns child accepted state and append-once flag.

---

### Task 1: Session state, exact types, reachable list and home navigation

**Files:** Modify `src/types/AutomationsTypes.tsx`, `src/contexts/custom/AutomationProvider.tsx`, `src/contexts/custom/AutomationListProvider.tsx`, `src/components/automations/AutomationList.tsx`, `src/components/automations/AutomationTile.tsx`, `src/app/(app)/index.tsx`, `src/app/(app)/_layout.tsx`. Create `src/app/(app)/automation/list.tsx`, `tests/automationState.test.mjs`, `tests/automationList.test.mjs`. Modify `tests/homeDashboard.test.mjs` only for the new entry.

**Interfaces:** Consumes `useHomes()`, `useHttpClient()`, existing `ListRow`/section APIs. Produces all type/provider contracts above, plus working list navigation. Do not change DeviceList/HTTP contracts.

- [x] **1. Write real-provider/list regression tests with the existing harness.** Pin these assertions and deferred home-change requests:
  ```js
  assert.equal(await list.refresh("other-home"), false); // no request
  assert.equal(providerRequests.length, 0); // beginSession never GETs
  assert.equal(staleAppend, false); assert.equal(newSession.results.length, 0);
  assert.equal(remainingDuplicateRows.length, 1); // index-based removal
  assert.equal(oneOperationAutomationRows.length, 1); // no false empty list
  assert.equal(refreshFailureRows.length, previousRows.length);
  ```
  Add named cases `list rejects late previous-home data`, `empty differs from failure`, `home entry exists for Display without a source`, `draft cap does not cap saved collections`, and `stale cleanup cannot clear new session`.
- [x] **2. Run RED:** `pnpm exec node --test tests/automationState.test.mjs tests/automationList.test.mjs`; expected missing-contract/entry assertions fail, without unrelated failures.
- [x] **3. Implement exact types/session/list contracts.** Reuse refs and React state; no implicit session GET or toast. Add Automations link in the existing home list header outside Devices actions. List owns one FlatList, current-home helper, local loading/empty/Retry/refresh feedback, and manager Add action. Keep readable Enabled/Disabled rows, open details for all roles, and remove hidden row long-press deletion.
- [x] **4. Verify GREEN:** rerun the two focused files and `pnpm test:dashboard`; expected all pass. Keep old provider signatures as thin transitional adapters if needed for existing forms; remove adapters in Task 3. Leave changes uncommitted for integrated controller validation.

### Task 2: Parent forms, route lifecycles and collection summaries

**Files:** Modify `src/components/automations/AutomationForm.tsx`, `conditions/AutomationConditions.tsx`, `conditions/AutomationConditionItem.tsx`, `results/AutomationResults.tsx`, `results/AutomationResultItem.tsx`, `src/app/(app)/automation/add.tsx`, `src/app/(app)/automation/details.tsx`. Create `tests/automationCreate.test.mjs`, `tests/automationDetails.test.mjs`. Delete `ConditionResultTile.tsx` / `LogicalConjuction.tsx` only after no callers remain.

**Interfaces:** Consumes Task 1 session/list/types. Produces `AutomationFormProps` above and child links containing the exact session token plus optional saved automation ID. Until Task 3 migrates child callers, leave the integrated work uncommitted; do not ship a broken task boundary.

- [x] **1. Write real-form/route tests for create and details before code.** Use deferred HTTP, focus/blur hooks and router failures; exact request assertions:
  ```js
  assert.equal("isEnabled" in createBody, false);
  assert.deepEqual(createBody.results, [{ operationId: "op", valueToSend: "false" }]);
  assert.deepEqual(metadataBody, { name: "New name" }); // no children/state/icon
  assert.deepEqual(stateBody, { isEnabled: false });
  assert.equal(statePutCountAfterPatchRetry, 1);
  assert.equal(postCountAfterReturnRecovery, 1); assert.equal(deleteCountAfterCancel, 0);
  ```
  Cover 3/64 name limits and trimming; 1/7 collection limits and local row removal; false/0/historical values; global icon preservation and picker cancellation; latest draft versus stale closure; create rejection/throw retains draft; Display read-only, Manage metadata only, Owner delete/add; malformed/missing/array IDs and mismatched home; late reads and live role loss; accepted-after-blur, historyless recovery, duplicate keyboard/touch and deletion Cancel/Back. Cover state-only/metadata-only, state failure stops PATCH, state acceptance + PATCH failure advances only state baseline, success + refresh failure never repeats writes.
- [x] **2. Run RED:** `pnpm exec node --test tests/automationCreate.test.mjs tests/automationDetails.test.mjs`; expected current-flow assertions fail.
- [x] **3. Implement parent forms/routes using existing native primitives.** One keyboard-aware scroll/FormSection with Name, global Icon, connector and quiet Conditions/Results header actions; create explains enabled default, omits enabled field and validates both collection sections. Details supports read-only Display, partial saves, current stored icon, and owner-only native AlertDialog deletion in its footer. Remove preview/FAB/imperative save handle. Keep mounted drafts and field/action errors separate.
- [x] **4. Bind session and request lifecycles.** Create begins once per visit; details seeds only after guarded GET; cleanup clears only its own token. Reuse collection state after child return. Synchronous route locks use live home/permissions, release through finally, capture request identity, and prevent stale feedback. Accepted state precedes refresh/navigation; fallback returns to `/automation/list`. Save state first, advance its baseline immediately, then PATCH dirty metadata only; do not mutate the input or resend arrays.
- [x] **5. Verify GREEN:** rerun parent suites plus Task 1 suites; expected all pass. Keep compatibility/transitional child wiring uncommitted until Task 3 completes.

### Task 3: Child forms/routes, integration, feedback and documentation

**Files:** Modify `src/components/automations/conditions/AutomationConditionForm.tsx`, `src/components/automations/results/AutomationResultForm.tsx`, `src/components/common/BottomSheetSelect.tsx`, `src/app/(app)/automation/conditions/add.tsx`, `src/app/(app)/automation/results/add.tsx`, `src/app/(app)/_layout.tsx`, `src/contexts/ToastProvider.tsx`, `package.json`, `tests/feedback.test.mjs`, `tests/bottomSheetSelect.test.mjs`, `AGENTS.md`, `docs/agent-guide/{interface,api-and-data,repository,validation,tooling}.md`, and `docs/ui-refactor-audit-2026-10-28.md`. Create `tests/automationChildren.test.mjs`; remove transitional automation provider members once all references migrate.

**Interfaces:** Consumes exact child props, session token params and provider/write contracts above. Forms await `onSubmit`; routes own pending/error/accepted, local append versus awaited PUT, and return. No implicit callback HTTP in form, no callback typed `void`, no persisted child deletion feature.

Duplicate operation names must still select different exact IDs: add real `BottomSheetSelect` duplicate-label tests and a child exact-ID regression, then minimally use label-plus-index render keys and `option.selected` for the current-choice guard; preserve cancellation, repeated-choice suppression, all other callers, and the existing public API.

- [x] **1. Write child real-form/route and feedback tests.** Cover zero/one/many operations, selector loading/error/Retry, rapidly changed devices and stale responses, current device ownership, duplicate touch/Go, permission downgrade with child open, invalid/direct token recovery and blur/refocus. For both child forms, add `all eleven operations are offered and the eleventh can be submitted`: the HTTP fixture defaults to ten items unless `size=2147483647` is requested, then select operation eleven and assert its exact ID in the submitted condition/result. Pin exact values and acceptance order:
  ```js
  assert.deepEqual(booleanBody.conditionConfiguration, { isOn: false });
  assert.deepEqual(numberBody.conditionConfiguration, { minValue: -1, maxValue: 0 });
  assert.equal(textBody.conditionConfiguration.requiredValue, " exact text ");
  assert.deepEqual(resultPutBody, { operationId: "op", value: "0" });
  assert.equal(operationsGetPath, "v1/devices/operations/display?deviceId=device-a&size=2147483647");
  assert.equal(selectedEleventhOperation.operationId, "operation-11");
  assert.equal(draftHttpRequests.length, 0);
  assert.equal(appendedBeforePutAcceptance, 0); assert.equal(backBeforePutAcceptance, 0);
  assert.equal(appendCountAfterReturnRetry, 1); assert.equal(toastCount, 0);
  ```
  Reject NaN/Infinity/blank/reversed/equal bounds, missing device/operation and empty values; accept false, zero and negative bounds. Verify mapping Boolean→BooleanCondition, Number/Integer→NumberCondition, Text/HexColor/Options→TextCondition; no trim/coercion. Persisted counts above seven and repeated operations remain supported.
- [x] **2. Run RED:** `pnpm exec node --test tests/automationChildren.test.mjs tests/feedback.test.mjs`; only new expected feature assertions may fail.
- [x] **3. Implement both keyboard-aware FormSections with auth-style inputs, BottomSheetSelect and labelled Boolean control.** Load the full operation collection through `v1/devices/operations/display?deviceId={deviceId}&size=2147483647`, following the existing full-collection convention; do not silently accept the endpoint's ten-item default. Reset selected operation/type/config/error immediately on device change. Guard and ignore late operation reads. Treat only zero operations as empty; validate selected operation belongs to current loaded device. Inputs stay natively editable while pending but ignore changes; guard selection/navigation. Show field errors locally and persistent request Alert above one bottom-growing Add action.
- [x] **4. Implement session-bound child routes.** Draft append is synchronous/local once; existing condition PUT strips operationName, existing result PUT maps valueToSend→value and awaits acceptance. Failures retain form/draft and do not append/navigate; accepted writes append to matching session once and recover navigation only after blur/refresh/router failure. Match parent permission and identity checks at every retained invocation. Existing fallback goes to matching details; draft fallback goes to its still-live parent or list recovery.
- [x] **5. Integrate and document.** In `src/app/(app)/_layout.tsx`, add `variant="brand"` to the existing `DefaultHeader` registrations for `automation/add`, `automation/details`, `automation/conditions/add`, and `automation/results/add`; the new list already uses it. Do not change the shared `DefaultHeader` primitive or add tests for these four trivial JSX prop edits; verify the real Back target is at least 48 dp during final native checks on all five screens. Suppress toasts on `/automation/list`, `/automation/add`, `/automation/details`, `/automation/conditions/add`, `/automation/results/add`. Add `test:automations` running the five new automation test files. Update audit status honestly and affected guide/index contracts; no claim of native verification from handler tests. Remove dead legacy helpers/adapters and imports after `rg` checks.
- [x] **6. Verify GREEN and mandatory checks:** `pnpm test:automations`, `pnpm test:dashboard`, `pnpm typecheck`, `pnpm lint`, `pnpm test:poc`. If shared selectors/icons changed, run `pnpm exec node --test tests/bottomSheetSelect.test.mjs tests/iconSelector.test.mjs`. Expected all pass; report any unexpected failure and wait for human. Run `git diff --check`, inspect exact payloads and changed callers, then request Sol review through the controller.
- [x] **7. Native flow verification and controller handoff.** On the available Android emulator/development build, use disposable local data to exercise home→list→create/details, all roles, each condition type, zero/one-operation selection, exact result strings, child return/draft retention, failure/retry, accepted writes, partial save, and delete Cancel/Back/confirm. Check both themes at 320 dp Dark / 448 dp Light, short/tall windows and IME, safe areas, wrapping and 48 dp targets; record before/after image manifest. Restore emulator settings and clean disposable data. Report TalkBack/text scaling/physical delivery separately if not exercised. Controller commits only after required checks/review and creates PR targeting `next-dev`; never merge.


Final evidence and remaining limits: [Android and automated validation](../validation/2026-10-31-automations.md).
