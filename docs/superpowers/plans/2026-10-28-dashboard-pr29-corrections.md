# PR #29 Native UI Corrections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task in the existing checkout. Steps use checkbox (`- [ ]`) syntax for tracking. Native execution is recommended because these changes share form, picker and feedback interfaces; obtain a whole-change review before delivery.

**Goal:** Resolve all ten screenshot findings with the existing Senswave native UI patterns and prevent their recurrence through explicit project policy and validation.

**Architecture:** Reuse Home's form, section-action and icon-sheet components. Introduce one color field/editor shared by configuration and live Color widgets, plus one dashboard-local snackbar for failed commands. Remove error-driven grid resizing; preserve API payloads, routed identities, permissions and accepted-once writes.

**Tech Stack:** React Native 0.81.5, Expo 54, TypeScript 5.9, React Native Reusables, installed `reanimated-color-picker` and keyboard controller; Node 26.12.1 and pnpm 12.8.1.

**Spec:** [Approved design](../specs/2026-10-28-dashboard-pr29-corrections-design.md). Implementation is in progress in the existing PR branch.

## Global Constraints

- Use `feat/dashboard-flow-2026-10-24` and existing PR #29 targeting `next-dev`; no worktree, merge, production release or backend/API change.
- Keep the existing checkout's untracked `.codex/` and `.github/hooks/` untouched.
- Use Node from `.nvmrc`, pnpm and the frozen lockfile. Add no dependency.
- Use native components, FC/interface props, StyleSheet and shared theme roles.
- Owners/managers configure; Display retains viewing and live commands.
- Preserve exact icon keys, MQTT topics, option names, primitive values and IDs.
- Keep 48 dp touch targets, keyboard/Back recovery, synchronous locks and accepted-once mutations.
- Notify on test failure and wait for the human as required by AGENTS.md.
- Use only disposable local data and test topics for Android checks; restore emulator settings.

## Preparation completed

- [x] Inspect all reported screens, connected components, Create Home, the home dashboard and the historical main palettes.
- [x] Confirm the swatch/HEX bottom-sheet color field with the user and research the requested Material feedback guidance.
- [x] Obtain the Superpowers design builder check: no important unanswered questions.
- [x] Record the required policy in project documentation, explicitly distinguishing it from unimplemented product code.

Implementation and verification are tracked in the task checklists below.

## Review Focus

- Historic icon outside the new palette: cancelling or saving an unrelated name must preserve the exact stored key (Task 2 regression).
- Conditional operation fields: hidden range/Boolean/JSON drafts must not leak into a different operation type or block a valid submission (Task 4 regression).
- Unsent color draft: HEX edits, picker gestures and Cancel/Back must never issue a live command or a widget-creation request (Task 5 regression).
- Stale retries: changing route/home identity, losing access or unlinking a placement must invalidate an old Retry closure and preserve another widget's newer failure; a change to Display still permits commands (Task 6 regression).
- Short windows, keyboard and long error text: all primary actions remain reachable while widget bounds and grid coordinates stay stable (Tasks 1, 5, 6 native checks).

## File ownership and sequence

| Task | Implementation files | Verification |
| --- | --- | --- |
| 1. Section actions and creation actions | `src/app/(app)/device/widget/list.tsx`, `src/app/(app)/device/dashboard/placeWidget.tsx`, `src/components/device/widgets/WidgetForm.tsx`, `src/components/device/widgets/forms/Radio/RadioOptionFormModal.tsx` | Existing widget/placement/permission suites; Android before/after 03, 04, 16, 26 |
| 2. Restricted icon sheets | `src/components/device/dashboards/DashboardForm.tsx`, `src/components/device/widgets/forms/Radio/RadioOptionFormModal.tsx`; only if a real shared defect is found, `src/components/common/IconSelector.tsx` | `dashboardDetails`, `dashboardCreate`, `widgetTypeForms`, `iconSelector`; Android 12, 13, 26 |
| 3. Placement appearance | `src/components/device/dashboards/Grid/WidgetPlacementCanvas.tsx` | Existing geometry/responder checks; native drag/resize screenshot 09 |
| 4. Operation creation | Operation route/form and conditional subforms listed below, `JsonPathSelector`, app header and toast-route policy | New `tests/operationCreate.test.mjs` and `tests/operationForm.test.mjs`, existing permission/feedback checks; Android 28 and conditional states |
| 5. Color editor | New `src/components/common/ColorPickerField.tsx`, `ButtonForm.tsx`, `ColorWidget.tsx`, narrowly extended `BottomSheetSelect.tsx` | New `tests/colorPickerField.test.mjs`, existing color/type/sheet suites; Android 29 and live editor |
| 6. Stable command errors | New `src/components/device/widgets/WidgetCommandSnackbar.tsx`, `WidgetView.tsx`, `useWidgetAction.ts`, `GridDashboardView.tsx` | Widget-action/grid tests, new snackbar lifecycle checks; Android 33 plus simultaneous failures |

No new global provider, form framework, dependency or general catalog service is needed.

## Task 1: Put secondary and primary actions in their established positions

**Interfaces:** Keep all existing route/form props and mutation handlers. FormSection's public interface and default action placement remain unchanged.

- [x] In `device/widget/list.tsx`, pass Add operation through `ContentSection.headerAction`, replacing the current `actions` slot. Preserve its full accessible label, device ID and permission guards.
- [x] In `dashboard/placeWidget.tsx`, put Add operation in the trailing heading slot while choosing, parallel to the existing Change action while positioning. The helper remains below the heading.
- [x] In `WidgetForm`, render creation feedback, return recovery and Create widget in a sibling action group after FormSection. Make its content wrapper grow and use `marginTop: "auto"`/top padding as HomeForm does. Keep read-only children and deletion immediately after their configuration.
- [x] In `RadioOptionFormModal`, use one keyboard-aware growing scroll, fields in FormSection and the Add option action group after it. Preserve its modal shell, exact option payload and synchronous accepted guard.
- [x] Run `pnpm exec node --test tests/widgetCreate.test.mjs tests/widgetDetails.test.mjs tests/widgetPicker.test.mjs tests/widgetPlacement.test.mjs tests/widgetConfigPermissions.test.mjs tests/widgetTypeForms.test.mjs`. Expected: zero failures. Adapt harness traversal only if composition changed; add no tests that merely restate margins.
- [ ] On Android at 320 dp Dark/448 dp Light, check long headings, short/tall windows, keyboard reachability, Add operation navigation and one submit. Capture replacements for 03, 04, 16 and 26.
- [ ] Update the affected action/creation rules in `interface.md` and commit this independently working change as `fix: align widget flow action placement`, after the repository's required pre-commit checks.

## Task 2: Use contextual icon bottom sheets

**Interfaces:** `IconSelector` already accepts `variant?: "default" | "brand"`, `iconList?: string[]`, `defaultIcon?: string`, `onIconSelected?: (icon: string) => void` and `disabled?: boolean`. Use this interface; retain Home/Device catalog and Automation behavior.

- [x] Set `variant="brand"` in DashboardForm and RadioOptionFormModal, keeping their existing 16- and 15-entry lists. Do not remove the global icon inventory or introduce backend calls for these palettes.
- [x] Update the existing icon regression assertions to require the brand branch and contextual list. Assert that every offered key matches the historical list and that outside keys are not offered through search.
- [x] Keep the historical-key regression: open/cancel preserves the stored key, a name-only save omits `icon`, and explicitly choosing an offered icon sends its exact lowercase key. Keep Radio details read-only with historical values intact.
- [x] Run `pnpm exec node --test tests/dashboardCreate.test.mjs tests/dashboardDetails.test.mjs tests/widgetTypeForms.test.mjs tests/iconSelector.test.mjs`. Expected: zero failures. If an assertion still requires global dashboard search, replace that superseded requirement rather than weakening unrelated icon tests.
- [ ] Verify four columns, selected state, long labels, scrolling, Android Back and focus restoration from the Radio modal and dashboard details. Capture replacements for 12, 13 and the icon part of 26.
- [ ] Update the contextual-icon rules in `AGENTS.md`, `interface.md`, `api-and-data.md` and `validation.md`; commit as `fix: use contextual icon sheets for dashboard and radio` after required checks.

## Task 3: Calm the placement preview

**Interfaces:** Keep `WidgetPlacementCanvasProps`, `DashboardPlacement`, geometry helpers, gesture responders and named accessibility actions unchanged.

- [x] Change the resting draft to a 1 dp `deviceTileBorder` outline and neutral surface; use `authFocus` for active gesture/focus. Preserve blocked-state error text and color.
- [x] Replace the inverse corner block with a subtle neutral visual and 16 dp diagonal icon inside the existing 48 × 48 dp resize target. Keep the target inside the draft, the move target at least 48 dp and the name legible.
- [x] Run `pnpm exec node --test tests/dashboardGrid.test.mjs tests/widgetPlacement.test.mjs`. Expected: zero failures; no geometry/parser rewrite is necessary.
- [ ] Verify native move, resize to 2×2, collision rejection, edge clamping, cancellation, pending lock and resize-handle visibility after release. Capture replacement 09 in both themes.
- [ ] Update DESIGN.md's placement-preview rule and commit as `fix: quiet dashboard placement selection` after required checks.

## Task 4: Complete the operation creation redesign

**Files:**
- Modify `src/app/(app)/device/operation/add.tsx` and `src/app/(app)/_layout.tsx`.
- Modify `src/components/device/operation/OperationForm.tsx`.
- Modify `src/components/device/operation/forms/Boolean/BooleanOperationForm.tsx` and `forms/Numeric/NumericOperationForm.tsx`.
- Modify `src/components/device/operation/forms/Options/OptionsOperationForm.tsx` and `OptionsOperationFormModal.tsx`.
- Modify `src/components/common/JsonPathSelector.tsx` and `src/contexts/ToastProvider.tsx`.
- Add `tests/operationCreate.test.mjs`, `tests/operationForm.test.mjs`; include them in `test:device-details` in `package.json`.
- Update `tests/widgetConfigPermissions.test.mjs` and `tests/feedback.test.mjs` where the route contract/composition changes.

**Interfaces:** Retain `OperationFormHandle.triggerSave(): void`, existing initialization props and `onSubmit(values): Promise<void>`. Add optional `pending?: boolean`, `disabled?: boolean`, `feedback?: ReactNode`, `returnAction?: ReactNode` and `onChange?: () => void`; forward them through the existing provider wrapper. Add `disabled?: boolean` to conditional forms and `onValidChange?: (valid: boolean) => void` to JsonPathSelector so invalid active path drafts cannot submit a previous value. `OptionInfo` remains `{ name: string; value: string | number | boolean }`.

- [ ] Add failing handler tests using `mountNativeComponent` for every operation type and mapping branch. Assert exact Topic and payload keys, false/0/"0" distinction, option bounds/duplicates, finite active numeric values, ordered JSON paths, and read-only details with no mutations. Pin Name 3/64 and Topic 3/256 boundaries, JSON segment 63 accepted/64 rejected, five-segment maximum and forbidden characters.
- [ ] Add route regressions for explicit/array/missing device IDs, Display denial, retained callbacks after role/route change, simultaneous keyboard/button submit, rejection preserving drafts, blur suppression and accepted-once return recovery. Assert zero second POSTs after accepted creation and failed navigation/refresh.
- [ ] Run `pnpm exec node --test tests/operationCreate.test.mjs tests/operationForm.test.mjs tests/widgetConfigPermissions.test.mjs tests/feedback.test.mjs` and confirm the new behavior tests fail for the intended reason before implementation.
- [ ] Give operation/add the brand Operation header. Remove its detached KeyboardStickyView action and the form's preview tile/divider. Let OperationForm render FormSection fields and a growing creation action group in one keyboard-aware scroll capped at 448 dp.
- [ ] Replace old Dropdown/SwitchDropdown controls with labelled native selection sheets; use auth Inputs/InputNumber, quiet ListRows and SectionHeaderAction in Options. Modernize the option modal and JSON path editor as part of this flow. Keep all controls reachable, paths ordered and exact option values unchanged.
- [ ] Move validation to fields and request feedback above Create operation. Guard draft setters while pending without destroying the focused native input; validate only active conditional controls. Remove toast-based validation from the changed subforms and suppress legacy overlays on operation/add.
- [ ] Keep the route's valid device identity and permission checks at submission time. Latch an accepted POST before navigation; offer navigation-only recovery to `/device/widget/list` with that captured device ID when Back/refresh fails. Return to the retained picker/list once, preserving its placement context.
- [ ] Run the focused command above to green, plus `pnpm test:device-details`. Verify the read-only operation-details caller still displays every saved configuration; do not redesign its deletion lifecycle in this task.
- [ ] Capture operation creation for Boolean custom, Number/Integer ranges, Text, HexColor, Options with values and JSON mapping. Check failed submit recovery and one accepted create on disposable local data. Update repository/interface/validation documentation and commit as `fix: redesign native operation creation` after required checks.

## Task 5: Share the swatch/HEX color editor

**Interfaces:** Create `ColorPickerFieldProps` with `title: string`, `value: string`, `onConfirm: (hex: string) => boolean | Promise<boolean>`, `disabled?: boolean`, `pending?: boolean`, `error?: string`, `readOnly?: boolean`, `variant?: "field" | "tile"`. Successful confirmation returns true; false keeps the draft/editor open. No picker callback sends a command before Confirm.

Reuse `BottomSheetSelect`'s `leading` and `renderOptions(close)` content slots and `onClosed` reset. Add only the required opt-in `dismissDisabled?: boolean` and `keyboardAware?: boolean`, both false by default; existing selection callers retain their behavior. Honor the dismissal guard for Cancel, close, scrim and system Back. Avoid nested vertical scrollers.

- [ ] Add failing tests in `tests/colorPickerField.test.mjs`: valid short/full HEX, invalid drafts, unchanged case preservation, Cancel/Back/scrim reset, no confirm callback during typing/dragging, synchronous double-confirm lock, false/throw recovery, disabled/pending guards and read-only presentation. Update the existing Color handler tests to exercise the shared editor rather than the old embedded wheel.
- [ ] Run `pnpm exec node --test tests/colorPickerField.test.mjs tests/bottomSheetSelect.test.mjs tests/widgetTypeForms.test.mjs tests/widgetActions.test.mjs` to confirm the new cases fail for the intended reason.
- [ ] Implement ColorPickerField with the established sheet chrome, auth HEX input, labelled preview and installed rectangular panel/hue control. Keep full error text and Cancel/Confirm reachable with the keyboard and short windows. The form caller commits configuration locally; the live caller commits the existing exact HEX action.
- [ ] Replace ButtonForm's exposed RGB bars with the new field. Preserve its provider validation registration and read-only value. Replace ColorWidget's embedded/center-modal split with one named tile opening the same sheet at every grid size; preserve manager unlink and last accepted/reported color.
- [ ] Keep failed live confirmation inside the open sheet, pending duplicate protection and accepted-once close. Dismissing after failure discards the unsent draft; reopening uses the latest accepted/reported value.
- [ ] Run the focused command to green, then widget creation/details/configuration suites. Include `colorPickerField.test.mjs` in `test:device-details`; no dependency or native build change is needed.
- [ ] Capture replacement 29, the open editor, invalid HEX and failed Confirm in both themes and narrow/short windows. Update the color rules and commit as `fix: unify themed color editing` after required checks.

## Task 6: Keep command errors out of grid geometry

**Interfaces:** Export `WidgetActionFailure { message: string; retry: () => Promise<boolean> }` from `useWidgetAction.ts`. Add optional `onFailure?: (failure: WidgetActionFailure) => void` and `onSuccess?: () => void` to its input; keep the existing `{ pending, error, send }` return and primitive `send` values. Add matching optional callbacks to WidgetView. The grid supplies callbacks bound to its captured identity and widget ID/name.

Create `WidgetCommandSnackbarProps` with `widgetName: string`, `message: string`, `onRetry: () => Promise<boolean>`, `onDismiss: () => void`. Its local retrying state disables duplicate Retry; an accepted retry dismisses only the still-current failure. A failed retry retains feedback. Ordinary widget controls remain another retry path.

- [ ] Replace the existing measured-inline-feedback assertion in `tests/widgetActions.test.mjs` with regressions for failure publication and exact captured retries, same-tick duplicate protection, superseding actions, blur/identity/access-loss invalidation and retained callbacks. Keep endpoint/value and Color cancellation checks; assert Display still permits live commands and Retry without `canManage`.
- [ ] Add snackbar lifecycle checks in `tests/widgetCommandSnackbar.test.mjs` and grid ownership checks in `tests/dashboardGridActions.test.mjs`: A's late success cannot dismiss B, a new failure replaces the previous message, close sends nothing, and unlink/dashboard changes invalidate retries. Assert that error publication does not change the grid's row height or widget coordinates.
- [ ] Run `pnpm exec node --test tests/widgetActions.test.mjs tests/widgetCommandSnackbar.test.mjs tests/dashboardGridActions.test.mjs` and confirm the new contract fails before implementation.
- [ ] In the hook, publish only actual failures from current sends, not disabled/stale returns. Capture the failed primitive value and guard retry with the failed request's identity/version and the existing active/pending checks. Invoke success callbacks only for current accepted writes.
- [ ] Remove WidgetView's external measured alert and `onFeedbackHeightChange`; remove `feedbackHeights` and the error-dependent row-height calculation from GridDashboardView. Render one root-overlay snackbar using the latest current failure and safe-area clearance, `secondary`/`textOnSecondary` surface/text and `authPrimary` text action. Do not use ToastProvider, a global queue or a modal for dashboard feedback.
- [ ] Wire non-Color failures to the snackbar. Keep Color feedback inside its open editor with no duplicate snackbar. Ignore callbacks after a different dashboard/widget takes ownership; clear shown feedback when its widget is unlinked or its accepted command supersedes the failure.
- [ ] Run the focused command to green and include `widgetCommandSnackbar.test.mjs` in `test:device-details`. Inspect local long-message wrapping and bottom clearance; do not add style-mirroring unit tests.
- [ ] On Android, capture frame sequences before/failure/retry for Color and an ordinary control. Compare card bounds, free cells, scroll offset and last-row reachability; test two widgets failing independently. Replace 33 and record expected inline error in the Color sheet.
- [ ] Update the dashboard-specific feedback rules in AGENTS/interface/DESIGN/validation and commit as `fix: keep widget command feedback outside grid layout` after required checks.

## Documentation and delivery gates

The user requested durable project documentation immediately after planning.
Update the policy now, explicitly marking these corrections as required behavior
whose implementation is tracked by this plan. Do not claim the new components,
tests or screenshots already exist. During implementation, keep the policy and
the actual component/test inventory synchronized in each affected commit.

- [x] Record action placement, bottom-aligned creation, contextual icon sheets,
  quiet placement handles, shared color editing and stable command feedback in
  `AGENTS.md`, `DESIGN.md`, `docs/agent-guide/interface.md`,
  `repository.md`, `api-and-data.md` and `validation.md` as applicable.
- [ ] Check every user screenshot finding against Tasks 1–6; retain numbered
  before/after captures and a manifest stating theme, viewport, commit and state.
- [ ] Before each implementation commit, run `pnpm typecheck`, `pnpm lint` and
  `pnpm test:poc`, plus the task's focused checks. Run `pnpm test:device-details`
  after integration and the affected icon selector/form tests separately. Stop
  on any failure and report it as required by AGENTS.md.
- [ ] Verify production Android JavaScript with
  `pnpm exec expo export --platform android`; use the installed development client
  for native UI checks, rebuilding only if a real native-input change requires it.
- [ ] Exercise the listed native flows at 320 dp Dark and 448 dp Light, normal
  text, including keyboard, short windows, cancellation, role gates and one
  accepted create/delete. Preserve the earlier exclusions for TalkBack and text
  enlargement; report hardware delivery separately.
- [ ] Remove disposable data, restore theme/viewport/font settings, verify
  `git diff --check` and inspect the whole change. Request a final independent
  review through Superpowers before delivering changes to existing PR #29.
- [ ] Push only the approved implementation on this branch to PR #29 and update
  its description with the final scope and actual verification. Never merge it.
