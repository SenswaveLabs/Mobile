# Dashboard Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy dashboard creation screen with one native form that preserves drafts, validates its grid and creates a dashboard once.

**Architecture:** Add a create-only `AddDashboardForm` using existing FormSection, Input, IconSelector, Button and Alert. The existing add route normalizes its parameter and mounts that form; legacy DashboardForm and details remain intact. The form owns its local draft and accepted-once mutation lifecycle through existing HTTP and device providers.

**Tech Stack:** React Native 0.81.5, React 19.1.0, Expo 54.0.34, TypeScript 5.9.3, Expo Router 6.0.23, local React Native Reusables and existing native handler tests.

**Spec:** `docs/superpowers/specs/2026-10-23-dashboard-create-design.md`

## Global Constraints

- Use the existing local branch only; no worktrees or branch checkout/creation. Final PR targets `next-dev`; never merge or release.
- No API/provider changes, new dependencies, assets, dashboard editor work or widget placement work belong here.
- Submit only through `useHttpClient().post("v1/devices/dashboards", body)` where `body` is `{ deviceId, name, icon, configuration: { rows, columns } }`; dimensions are numbers.
- Default key remains `grid-outline`; no Home/Device catalog or new local whitelist. Preserve exact selected icon strings.
- Name is trimmed at submission and requires 3–64 characters. Defaults remain 6 rows and 4 columns; valid ranges are Rows 1–10 and Columns 1–5, finite integers only.
- `StyleSheet.create()`, `useTheme()` colors, `FC` with interface props, English UI copy, native text scaling and 48 dp touch targets remain binding.
- Use pnpm only and Node 26.12.1 from `.nvmrc`; preserve frozen lockfile and dependency/build approvals.
- The repository requires notifying the user and waiting after any test failure; do not deliberately run a red test phase.

## Review Focus

- Empty, whitespace, fractional, exponent, NaN or infinite grid drafts must never reach the POST (Task 1 validation tests).
- Go and button callbacks called before React rerenders must create only once and keep native focus (Task 1 pending test).
- A successful POST followed by refresh/navigation failure must never become a retryable create (Task 1 accepted-recovery tests).
- Blur, refocus or a different device must not receive stale feedback/navigation/refresh (Task 1 lifecycle tests).
- Missing/array route parameters and the existing edit form must retain sensible recovery/current behavior (Task 1 route and legacy smoke checks).

---

### Task 1: Deliver the native dashboard creation flow

**Files:**
- Create: `src/components/device/dashboards/AddDashboardForm.tsx` — form, validation and create lifecycle.
- Modify: `src/app/(app)/device/dashboard/add.tsx` — FC route, normalized `deviceId`, missing-device recovery and themed root.
- Modify: `src/app/(app)/device/device.tsx` — keep the selector valid while a refreshed nonempty list has no matching current ID.
- Modify: `src/app/(app)/_layout.tsx` — only dashboard/add brand header.
- Modify: `src/contexts/ToastProvider.tsx` — add `/device/dashboard/add` to inline-feedback routes.
- Create: `tests/dashboardCreate.test.mjs` — real form/route handlers and Device selection regression.
- Modify: `tests/feedback.test.mjs` — include the add route in overlay-suppression checks.
- Modify: `package.json` — append `tests/dashboardCreate.test.mjs` to `test:device-details`; no dependency changes.
- Modify: `AGENTS.md`, `docs/agent-guide/interface.md`, `docs/agent-guide/validation.md` — scoped UI rule and checks.
- Create: `.impeccable/surfaces/<generated-dashboard-add-slug>.md` through `surface-brief write`, using this spec's direction.

**Interfaces:**
- Produce default `AddDashboardForm: FC<AddDashboardFormProps>` with `interface AddDashboardFormProps { deviceId: string; }`.
- Consume `useHttpClient().post`, `useDevice(): { deviceId: string; refresh(useLoading: boolean): Promise<void>; ... }`, and existing Expo Router/focus hooks.
- Existing `DashboardFormHandle`, legacy form and `device/dashboard/details.tsx` stay unchanged. Keep Device and Grid routes and their `deviceId` parameters unchanged. The Device selector falls back to the first listed option while a refreshed nonempty list has no matching current ID.

- [x] **Step 1: Load only the required references before UI edits.** Read the spec, `docs/agent-guide/interface.md`, `validation.md`, `tooling.md` and Impeccable `reference/craft-floor.md`. Context already ran successfully once this session: do not rerun it. Use Serena symbol/pattern tools for source discovery. Inspect baseline Android screenshot supplied by the coordinator. Model execution was explicitly assigned to Luna 6 Max; do not spawn further implementers.

- [x] **Step 2: Write focused handler tests before implementation.** Reuse `tests/addSubscription.test.mjs` and `nativeComponentHarness.mjs`, without a new framework. Assert:
  - idle form has no errors; default icon `grid-outline`, dimension drafts `"6"`/`"4"`; name whitespace rejects; 3/64 trimmed name lengths pass and 2/65 fail;
  - Rows 1/10 and Columns 1/5 pass; `""`, `" "`, `"0"`, `"-1"`, `"1.5"`, `"1e0"`, `"NaN"`, `"Infinity"`, Rows `"11"` and Columns `"6"` reject with exact spec errors;
  - valid submission produces exactly `['v1/devices/dashboards', { deviceId: 'device-a', name: 'Controls', icon: 'grid-outline', configuration: { rows: 6, columns: 4 } }]`; another global icon remains exact;
  - same-turn Go/touch yields one request; native fields remain editable/busy while guarded against changes; Icon/action disable; rejection or throw retains values and permits retry;
  - acceptance stays latched before a deferred or throwing refresh; no second POST, refresh uses `false`, and a different active device is not refreshed;
  - blur suppresses late navigation/error, refocus after acceptance returns once; no-history replaces `{ pathname: '/device/device', params: { deviceId: 'device-a' } }`; throwing navigation yields Return to device, whose retry never posts;
  - absent/blank/array IDs recover or normalize; route changes remount by ID; new route suppresses legacy toasts and details route retains its existing feedback behavior.
  - the Device route selects its first listed dashboard for empty/stale current IDs and keeps a valid non-first selection.
  Do not run these tests until the minimal implementation exists, because the repository requires stopping on test failure.

- [x] **Step 3: Persist the local direction contract.** Use the Impeccable launcher's `surface-brief read` for `src/app/(app)/device/dashboard/add.tsx`, then `surface-brief write` with the form as related target. Record Operate mode and six contract blocks: THESIS (single task, no preview/footer split), OWN-WORLD (existing canvas/type/fields/amber), STORY (name/icon/grid/create), FIRST VIEWPORT (spec geometry and order), FORM (local extension, code-led, no concept seed; one Go/touch lock is the signature interaction), and verbatim FINISH line from new-work. Read it back once. Preserve DESIGN.md/design.json; no global identity change.

- [x] **Step 4: Implement the form and route.** Use one KeyboardAwareScrollView with FormSection and the exact composition/copy in the spec. Preserve the global IconSelector and its 16 dashboard quick keys from the legacy form; do not introduce the Home/Device icon catalog. Use string dimension drafts and one synchronous ref lock shared by Go/touch. Clear only the changed field's error and stale action feedback. Capture/current-ref the device context to avoid refreshing a different active device. Latch accepted before best-effort matching `refresh(false)`, suppress stale work after blur, return on refocus, and provide navigation-only recovery after a thrown return. Missing ID never mounts a submitting form. Keep legacy DashboardForm and editor unchanged.

- [x] **Step 5: Wire header, feedback, tests and documentation.** Set only dashboard/add's `DefaultHeader` to `titlePrefix="Dashboard" variant="brand"`; preserve Back. Add toast suppression and feedback regression route. Append the handler suite to `test:device-details`; document native form rules/limits and test/runtime checks in the affected guides and one compact AGENTS UI-direction line. Update this plan's checkboxes only after completed work.

- [x] **Step 6: Run bounded verification.** Coordinator runs `pnpm typecheck`, `pnpm lint`, `pnpm test:poc`, `pnpm test:device-details`. All commands must exit 0. On any failure, report exact failing command/output and wait for the human. Do not broaden suites unless shared component changes become necessary.

- [x] **Step 7: Verify Android and finish review.** Coordinator captures into `.impeccable/review/`, opens each image, and tests light/dark, normal/200% text, short/narrow layout, focused field/action above IME, icon selection/cancel, Back, validation, failed-submit draft recovery and one accepted create against isolated local data. Smoke-test dashboard details without editing/deleting a real dashboard. Use one batched inspection and at most one confirmation batch. Native skips the web detector; provide screenshot paths, this spec and surface contract to the Impeccable finish reviewer. Apply only material review fixes, then document the result through the scoped documenter and preserve global DESIGN artifacts. Report TalkBack or hardware checks unverified when not exercised.

- [ ] **Step 8: Commit and prepare the authorized PR.** Coordinator confirms `git diff --check`, required successful checks, no unintended editor/API/dependency edits and updated docs. Commit with a `feat:` title, push a separate remote PR head from the existing local branch and create the requested PR targeting `next-dev`; never merge it. Include exact checks, emulator evidence and remaining limitations.

## Planner self-review

One coherent screen, one implementation task. The spec's composition, validation,
payload, pending/recovery lifecycle and route edge cases have explicit test or
native-check coverage. Existing global icon behavior and imperative editor are
outside the changed surface. No new provider abstraction, dependency, backend
contract, fake product evidence or speculative feature is required.
