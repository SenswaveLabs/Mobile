# Native Dashboard Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The user already chose implementation by the Luna 6 Max coordinator; do not ask for another execution-method or design approval.

**Goal:** Complete native device dashboard selection, creation/details, grid area selection, widget placement/removal and inline widget command recovery.

**Architecture:** Reuse the existing creation/details forms and native primitives. Device entry binds the resource and exposes permitted actions; Grid owns placement geometry and one removal confirmation; the picker uses captured IDs. Narrow DeviceProvider guards prevent stale grids, while WidgetView shares widget command feedback without changing API semantics.

**Tech Stack:** React Native 0.81.5, React 19.1.0, Expo 54.0.34, TypeScript 5.9.3, Expo Router 6.0.23, current local React Native Reusables and Node assertion/handler regressions.

**Spec:** `docs/superpowers/specs/2026-10-24-dashboard-flow-design.md`; preserve the nested details decisions in `docs/superpowers/specs/2026-10-24-dashboard-details-design.md`.

## Global Constraints

- Stay on the current local `next-dev`; no worktree, checkout, branch switch or reset. Never merge or release autonomously.
- Planning is Sol 6.1 Max; implementation is the Luna 6 Max coordinator. No further implementer delegation is required.
- Preserve existing details dirt and its handoff/spec/plan; preserve unrelated `.codex/` and `.github/hooks/` files.
- Use useHttpClient only; no fetch outside httpClient. Preserve all backend endpoints, opaque IDs/icons and widget command values; no shared API/backend change.
- Management means `home?.isOwner === true || home?.canManage === true`. Deny configuration routes and retained mutation callbacks for Display/missing-home; Display retains viewing and live control.
- Use FC/interface props, StyleSheet.create(), useTheme(), existing primitives, English copy, native scaling and 48 × 48 dp effective targets. No dependency or global DESIGN changes.
- Keep creation's trimmed Name 3–64 characters, string Rows 1–10/Columns 1–5, icon keys and accepted-once behavior; details PATCH changes Name/Icon only.
- Retain `refresh(useLoading: boolean): Promise<void>` and `smartRefresh(deviceId: string): Promise<void>` compatibility.
- Use pnpm only and Node 26.12.1 from `.nvmrc`; preserve exact dependency versions, frozen lockfile and build approvals.
- Write focused logic regressions before the fix and verify their failure where practical. The user later authorized resolving every encountered failure autonomously; preserve the failure output, diagnose it, fix it and rerun the affected check. This task-specific authorization does not change AGENTS.md's global policy.
- Handler/adapter output proves only logic under that adapter. Android emulator alone supplies view/interaction QA. Skip TalkBack and 200% text; report physical hardware unverified.
- Planner makes documentation changes only. Commit/push/PR work remains with the coordinator under existing user authorization; no planning-only commit.

## Review Focus

- Selected/routed dashboard differs from retained grid or active device: no request/render can use the wrong resource; Task 2 stale-request assertions and Task 4 mismatched-provider placement.
- Concurrent callbacks before React rerenders: one command or placement/removal mutation; Tasks 1/3/4/5 duplicate assertions.
- Accepted write followed by refresh/navigation failure: baseline/local placement survives and no accepted write repeats; Tasks 1/3/4 recovery assertions.
- Display role, missing home or role loss with retained callbacks: zero configuration writes/navigation; Tasks 2/3/4 permission assertions, with live control still allowed in Task 5.
- Malformed grid/route/HTTP JSON and small windows: no array crash, invisible recovery or clipped inline error; Tasks 2/3/4 logic assertions and Task 6 actual native checks.

---

### Task 1: Finish the protected dashboard details work

**Files:** Preserve and finish `src/app/(app)/device/dashboard/details.tsx`, `src/components/device/dashboards/DashboardForm.tsx`, `tests/dashboardDetails.test.mjs`; use current `tests/nativeComponentHarness.mjs`, `tests/feedback.test.mjs` and existing details handoff. Do not rewrite creation or modify the shared harness to fake native rendering.

**Interfaces:** Keep `DashboardFormValues { name?: string; icon?: string }`, edit-only `DashboardForm` and the existing resource-keyed details editor. Route ID stays authoritative; accepted save updates baseline; accepted deletion remains latched.

- [x] **Step 1: Diagnose the six existing failures without assuming the cause.** Compare route/form rendered lifecycle, response validation, focus setup, asynchronous settling and adapter traversal. The prior log is `/tmp/senswave-dashboard-details-qa/test-device-details.log`: missing form at 351, missing PATCH at 447, missing saved feedback at 566, missing delete triggers at 574/636, missing form at 692. Record whether each cause is product, adapter or both. Native rendering cannot be inferred from the adapter.
- [x] **Step 2: Apply the smallest correction retaining all existing behavior assertions.** Preserve exact route-ID requests, partial payloads, clean/accepted baseline, shared Save/Delete lock, native confirmation cancellation, stale-resource protection and navigation-only recovery. Remove the known unused ContentSection import if it is still unused. Do not bypass validation or weaken assertions to fit a tree.
- [x] **Step 3: Run bounded logic verification once implementation is ready.** `node --test tests/dashboardDetails.test.mjs tests/feedback.test.mjs` must exit 0. Diagnose and resolve any failure, then rerun. View/keyboard/dialog checks remain Task 6.

### Task 2: Bind dashboard entry and management routes to the correct resource

**Files:** Modify `src/contexts/custom/DeviceProvider.tsx`, `src/app/(app)/device/device.tsx`, `src/components/device/dashboards/DashboardView.tsx`, `src/app/(app)/device/details.tsx`, dashboard `add.tsx` / `details.tsx`, `src/app/(app)/_layout.tsx`; update `AddDashboardForm.tsx` only for a retained-handler permission guard. Add `tests/deviceDashboard.test.mjs`; adapt the selector regression in `tests/dashboardCreate.test.mjs` and management mocks/assertions in `tests/deviceDetails.test.mjs` / `tests/dashboardDetails.test.mjs`.

**Interfaces:** Add only `loadError: string | null` to DeviceContextProps/default/context value. Preserve other fields and signatures. Default `Device: FC` normalizes the first deviceId route string and rebinds on route-ID change. Use `DashboardView: FC<DashboardViewProps>` with `{ deviceId: string; canManage: boolean }`; it passes explicit dashboard/device identity to Grid and exposes Retry through existing `refresh(false)`.

- [x] **Step 1: Add logic regressions for stale dashboard data and management.** Cover A→B selection before A completes; old-device collection/detail completions after changing device; empty collection clearing detail; latest valid selected ID preserved through refresh; failed/thrown/malformed reads settling loading and exposing loadError; missing/array IDs; selected first fallback versus valid non-first selection. For example:

```js
assert.equal(context.currentDashboard, undefined); // immediately after selecting B
oldA.resolve(displayA);
await settle();
assert.equal(context.currentDashboardId, 'dashboard-b');
assert.notDeepEqual(context.currentDashboard, displayA);
assert.equal(configRequests.length, 0); // Display direct route or retained callback
```

Also assert manager/owner action paths preserve IDs, Display has no configuration navigation, and unknown presence is not offline. Update old selector lookup to BottomSheetSelect selection logic; do not describe that assertion as view QA.
- [x] **Step 2: Implement narrow provider guards.** Clear old-device collection/detail and mark loading synchronously on new device binding; clear mismatched detail on selection. Capture device/request/selection identity around each dashboard read and ignore stale completions. Preserve latest valid selection on collection refresh; empty clears selection/detail. Catch HTTP/JSON errors, settle loading and keep only safely owned cached content. Keep refresh callers and SignalR smartRefresh compatible; do not redesign operation/device providers.
- [x] **Step 3: Implement native entry and direct-route permission guards.** Use the spec's visible Device details, Dashboards/Add, BottomSheetSelect and Dashboard details actions, themed states and offline behavior. Missing ID sends no dashboard request. Guard device/details and dashboard add/details before editable mount/configuration GET and recheck current permission inside mutation/navigation callbacks. Use existing HomeProvider values, no new role framework. Preserve add form and details design.
- [x] **Step 4: Verify affected logic.** Run `node --test tests/deviceDashboard.test.mjs tests/dashboardCreate.test.mjs tests/dashboardDetails.test.mjs tests/deviceDetails.test.mjs`; all exit 0. No new failure is dismissed as a harness limitation.

### Task 3: Replace grid placement chrome and make unlink safe

**Files:** Modify `src/components/device/dashboards/Grid/GridDashboardView.tsx`, `src/components/device/dashboards/DashboardView.tsx`, `src/components/device/widgets/WidgetView.tsx`; add `src/utils/dashboardGrid.ts` and `tests/dashboardGrid.test.mjs`.

**Interfaces:**
- `DashboardPlacement { row: number; column: number; rowSpan: number; columnSpan: number }` in dashboardGrid.ts.
- `readGridConfiguration(value: unknown): GridDashboardConfiguration | undefined` validates supported integer bounds and arrays/rectangles without changing persisted values.
- `parseDashboardPlacement(params: Record<string, string | string[] | undefined>): DashboardPlacement | undefined` uses first array entry and strict decimal strings.
- `isPlacementAvailable(grid: GridDashboardConfiguration, placement: DashboardPlacement): boolean` rejects out-of-bounds/occupied cells.
- `GridDashboardView: FC<GridDashboardViewProps>` consumes `{ deviceId: string; dashboardId: string; canManage: boolean }`; scope local state by both IDs.
- WidgetView's sole production caller is Grid. Add optional `onRemove?: () => void`; remove its request/toast/ConfirmDialog ownership. Grid captures dashboard/device/widget identity for one shared confirmation and DELETE.

- [x] **Step 1: Add pure grid and unlink handler regressions.** Assert zero-based top-left, inclusive supported dimensions (rows 1–10, columns 1–5), four edge bounds, span minimum, occupied rectangle growth, negative/fractional/nonfinite geometry, overlaps, malformed arrays and no in-place mutation. Strict route parser rejects `''`, `-1`, `1.5`, `1e2`, `2x`, missing/empty arrays; accepts zero row/column and positive spans. `dashboardGridActions.test.mjs` covers manager/Display callback availability, confirmation cancel, captured dashboard ID, same-turn confirmation lock, accepted local removal then refresh, failed request retention/retry, and stale selection suppression.

```js
assert.equal(isPlacementAvailable(grid, { row: 0, column: 0, rowSpan: 1, columnSpan: 1 }), true);
assert.equal(isPlacementAvailable(grid, { row: 0, column: 0, rowSpan: 0, columnSpan: 1 }), false);
assert.equal(parseDashboardPlacement({ row: '1e2', column: '0', rowSpan: '1', columnSpan: '1' }), undefined);
assert.deepEqual(deletes, ['v1/devices/dashboards/dashboard-a/widgets/widget-a']);
assert.equal(deletes.length, 1); // repeated confirmation, failed refresh or role loss
```

Unlink tests cover Cancel/dismiss callbacks, failed DELETE retaining placement, accepted DELETE removing only its local placement before refresh, stale-selection suppression and Display with no removal callback. Native Back/focus are Task 6.
- [x] **Step 2: Implement native Grid from the spec.** Use actual layout width, 8 dp gaps, 96 dp minimum row height and a scrollable full grid. Replace FAB/arrow overlays with visible Place widget, named free-cell selection, normal-flow Height/Width controls, Change position, Choose widget/Cancel and inline validation. Preserve zero-based data while showing one-based summaries. Selection scrolls to controls without animation; Back cancels place mode. Reset on device/dashboard change and use the shared validator before indexing.
- [x] **Step 3: Implement one Grid-owned native unlink confirmation.** Manager-only, synchronous ref lock, captured identity, exact DELETE, normal-flow failure + Retry, accepted local removal and matching-device refresh. Do not repeat DELETE after acceptance. Preserve remaining live widgets and no definition deletion.
- [x] **Step 4: Verify geometry and handlers.** `node --test tests/dashboardGrid.test.mjs tests/dashboardGridActions.test.mjs` passes 12/12. `pnpm typecheck` and `pnpm lint` pass. Serena confirms GridDashboardView is the sole WidgetView caller. These suites assert grid/handler logic only; native UI and Android Back remain Task 6 emulator checks.

### Task 4: Make widget selection and placement recoverable

**Files:** Modify `src/app/(app)/device/dashboard/placeWidget.tsx`, `src/components/device/widgets/WidgetList.tsx`, `src/components/device/widgets/WidgetListTile.tsx`, `src/app/(app)/device/operation/add.tsx`, `src/app/(app)/device/widget/add.tsx`, `src/app/(app)/device/widget/list.tsx`, placement header in `_layout.tsx`, `src/contexts/ToastProvider.tsx`, `tests/feedback.test.mjs`; add `tests/widgetPlacement.test.mjs`, `tests/widgetPicker.test.mjs` and `tests/widgetConfigPermissions.test.mjs`. Preserve WidgetForm behavior and standalone power controls.

**Interfaces:** Keep `WidgetList.overrideOnClick?: (widgetId: string) => Promise<void>` and `hideAddButtons?: boolean`; add optional `deviceId?: string`, `selectedWidgetId?: string`, `disabled?: boolean`. Explicit device wins over provider. Add `selected?: boolean` to WidgetListTile; existing `disablePress` handles pending. Override/picker mode uses a selected indicator and no power mutation. Operation/add accepts optional normalized deviceId with provider fallback for existing callers, keys its form to that ID and applies the same management guard.

- [x] **Step 1: Add request/state assertions.** Mismatched provider B still reads/places routed A; bad IDs/numbers cause no writes; display GET retry, occupied area, list failure/empty, explicit device query, select-without-PUT, hidden power action, pending lock, PUT rejection/throw keeping selection, blur/refocus, accepted-once refresh/navigation failure and role loss. Logic suites pin exact request:

```js
assert.deepEqual(puts, [['v1/devices/dashboards/dashboard-a/widgets', {
  widgetId: 'widget-a', row: 0, column: 1, rowSpan: 2, columnSpan: 1,
}]]);
assert.equal(puts.length, 1); // two same-turn Place calls
assert.equal(navigation.length, 0); // rejected PUT
assert.deepEqual(refreshCalls, []); // another active device
```

Also assert old standalone WidgetListTile power/state behavior and WidgetForm preview are unchanged; captured-device Add operation and operation-bound Add widget navigate correctly. These remain handler assertions.
- [x] **Step 2: Implement captured identity, validated area and explicit placement.** Follow spec's display GET, shared rectangle validation, selected widget state, persistent inline errors, synchronous lock and accepted-once return. No payload/body logs or automatic Back after rejected PUT. Guard direct route/retained callbacks by latest management state; refresh only matching originating device. Handle navigation recovery without another PUT.
- [x] **Step 3: Adapt the shared picker minimally.** Use captured device for list/focus refresh, distinguish empty from failed/malformed reads, add Retry, ignore stale reads and disable selection/create links while pending. Preserve per-operation Add widget and labelled Add operation. Picker groups do not navigate to operation details. Keep one SectionList and normal-flow footer; no overlay or nested scroll. Retain standalone list and form-preview semantics.
- [x] **Step 4: Wire brand headers and inline-feedback suppression.** Added the Place widget brand header and inline-toast suppression after the route gained inline recovery. `node --test tests/widgetPlacement.test.mjs tests/widgetPicker.test.mjs tests/widgetConfigPermissions.test.mjs tests/feedback.test.mjs` passes 28/28; `pnpm typecheck` and `pnpm lint` pass. These are handler/adapter assertions only; no view QA claim.

### Task 5: Keep widget commands visible, locked and recoverable

**Files:** Add `src/hooks/useWidgetAction.ts`; modify `src/components/device/widgets/WidgetView.tsx`, `widgets/ButtonWidget.tsx`, `SwitchWidget.tsx`, `SliderWidget.tsx`, `RadioWidget.tsx`, `ColorWidget.tsx`, `DisplayWidgets.tsx`, and Grid feedback sizing. Add `tests/widgetActions.test.mjs`; adapt impacted Slider assertions in `tests/deviceTileActions.test.mjs` to its command callback. Do not change home-tile endpoints, operation forms or widget definitions.

**Interfaces:** `useWidgetAction({ widgetId, disabled })` returns `{ pending: boolean; error: string; send: (value: string | number | boolean) => Promise<boolean> }`; false covers blocked/rejected/stale work. WidgetView owns this hook and compact Alert; it passes `onAction: (value: string | number | boolean) => Promise<boolean>` and `pending: boolean` to the five actionable controls. Preserve their `widget`, `operations` and `disabled` props. Add `onFeedbackHeightChange?: (height: number) => void` to WidgetView; Grid stores measurements by stable dashboard/widget placement key and grows row height to include feedback. No fixed-height error or new action framework.

- [x] **Step 1: Pin exact commands and failure behavior.** `tests/widgetActions.test.mjs` covers exact endpoint/primitive values, same-turn locking, failure and throw recovery, disabled preview, widget identity/blur suppression, accepted Switch/Slider/Radio/Color values, read-only Display, manager unlink action and WidgetView compact feedback measurement. These are adapter/handler assertions, not view QA.
- [x] **Step 2: Extract only the common widget command boundary.** `useWidgetAction` owns synchronous lock, current identity/focus/disabled guards, exact POST, pending/error and cleanup. Control-specific accepted state remains local. Removed widget command HTTP/toast branches. Preserved color draft across rejected modal confirmation and reported/accepted Switch/Slider/Radio/Color state. Home-tile behavior is unchanged.
- [x] **Step 3: Render one compact feedback block under its widget.** WidgetView uses compact Alert/AlertDescription with 12 dp spacing and Slider inset. It measures error height; Grid stores it by dashboard/widget/placement key and grows uniform rows by the largest `feedbackHeight / rowSpan`. Display has read-only semantics and no toast action.
- [x] **Step 4: Verify affected logic.** `pnpm exec node --test tests/widgetActions.test.mjs tests/deviceTileActions.test.mjs` passed 26/26; `pnpm typecheck` and `pnpm lint` passed. These are adapter/handler assertions only. Actual error placement, control reachability and command gestures remain Task 6 emulator checks.

### Task 6: Document, verify on Android and hand back concrete evidence

**Files:** Update `AGENTS.md`, `docs/agent-guide/interface.md`, `docs/agent-guide/validation.md`, `docs/agent-guide/api-and-data.md` only for the narrow client context contract, and `package.json` test scripts. Preserve current details documentation. Add the new dashboard/provider/grid/picker/widget-action logic suites to `test:device-details`; do not add dependencies. Store runtime evidence in `.impeccable/review/` and a concise task handoff if needed.

- [x] **Step 1: Bring guides and scripts into alignment.** Guides and `package.json` now describe visible dashboard actions, management guards, geometry/identity rules, inline feedback and accepted-once recovery. Adapter suites are described as logic coverage; native rendering is reported separately.
- [x] **Step 2: Run required final checks after review fixes.** `pnpm typecheck`, `pnpm lint`, `pnpm test:poc` (43/43), `pnpm test:device-details` (111/111), `pnpm test:dashboard` (45/45) and `git diff --check` all exited 0. No shared contract changed, so no backend build was needed.
- [x] **Step 3: Verify actual Android behavior.** On `emulator-5554`, verified device entry and non-first dashboard selection; creation, dashboard details, icon search/cancel/save, keyboard reachability and confirmed deletion of a disposable dashboard; all four grid columns at 320 dp, matching 66 dp cell/preview geometry, 48×48 dp resize targets, 1×1→2×2 growth, Android Back/Cancel, picker area carry/Back, accepted placement followed by dashboard-scoped unlink; and inline Button command failure. Inspected Light/Dark at normal text and 320 dp. Restored the original dashboard/device, System theme, 1344×2992 display, 480 dpi, font scale 1.0 and ADB reverse mappings. TalkBack, 200% text and physical hardware were skipped. Native list-empty/offline/request-failure injection, Display-role interaction and forced native unlink rejection were unavailable; handler suites cover rejection logic, and unlink failure was left unforced.
- [x] **Step 4: Inspect and review.** Inspected the final emulator capture batch against the flow spec, dashboard-details direction, Android reference and craft floor. Resolved the three pre-fix Sol findings: Grid child stability during load-error changes, first-render narrow geometry, and accepted Slider track/readout synchronization. A final follow-up also found and fixed stale Slider rollback when a newer runtime report arrives during a pending action. The final Impeccable record is `.impeccable/review/dashboard-flow/finish-review.md` with `ship` disposition; `documenter-report.md` records why no system update was needed. Global `DESIGN.md` was preserved. No HTML/CSS detector ran.
- [x] **Step 5: Review the complete diff and hand off.** The separate Sol 6.1 Max follow-up review reported no material findings. Staged only the 53 authorized implementation, test and documentation files; preserved unrelated `.codex/` and `.github/hooks/` dirt outside the commit. Commit `dbe8029` (`feat: complete dashboard management and widget placement flow`) is pushed to `feat/dashboard-flow-2026-10-24`; PR [#29](https://github.com/SenswaveLabs/Mobile/pull/29) targets `next-dev` and remains open. No merge or release was performed.

## Planner self-review

Scope maps to six connected deliverables in one dashboard flow, not independent
new products. Existing creation remains intact. Identity, permission, geometry,
accepted-once and command-payload risks each have an owning logic regression plus
explicit Android evidence. New code is limited to shared grid validation and a
widget-specific command boundary needed by five controls. The six historical
details failures were rerun against current files in Task 1: the details and
feedback adapter suites pass 16/16. The earlier log predates the current form and
test file, so it cannot establish a complete old-run product-versus-adapter cause.
No adapter pass is presented as native view evidence.
