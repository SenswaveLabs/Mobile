# Dashboard Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace legacy dashboard settings with one recoverable native edit form and deliberate, accepted-once deletion.

**Architecture:** Rewrite DashboardForm as an edit-only FC; creation already has a separate form. The details route owns parameter-bound loading, PATCH/DELETE, confirmation and safe refresh/navigation. Existing FormSection, Input, IconSelector, Button, Alert and native AlertDialog carry the interface.

**Tech Stack:** React Native 0.81.5, React 19.1.0, Expo 54.0.34, TypeScript 5.9.3, Expo Router 6.0.23 and existing native handler tests.

**Spec:** `docs/superpowers/specs/2026-10-24-dashboard-details-design.md`

## Global Constraints

- Stay on the user's current local `next-dev`; no branch switches or worktrees. Final PR targets `next-dev`; no merge or release.
- Planning is Sol 6.1 Max; implementation is Luna 6 Max. Parent coordinates verification, review, commit, push and PR. Do not spawn further implementers.
- No API, backend, provider, creation, grid editing, widget placement, dependency or release change belongs here.
- GET, PATCH and DELETE use exactly `v1/devices/dashboards/${dashboardId}` through useHttpClient; PATCH contains changed `name` and/or `icon` only.
- Name is trimmed at submission and requires 3–64 characters; preserve exact dashboard icon strings and all 16 quick choices/global search.
- Use FC/interface props, StyleSheet.create(), useTheme() colors, English copy, native scaling, 48 dp targets and existing primitives.
- Use pnpm only and Node 26.12.1 from `.nvmrc`; preserve frozen lockfile, exact dependency versions and build approvals.
- Report any test failure and wait for the human; do not deliberately run a red test phase.

## Review Focus

- Routed dashboard differs from provider selection: every GET/PATCH/DELETE must target the route ID (Step 2 identity tests).
- Acceptance followed by refresh/navigation failure: save baseline remains clean and DELETE cannot repeat (Step 2 lifecycle tests).
- Go/touch or Save/Delete callbacks run before React rerenders: one mutation, focused native input retained (Step 2 pending tests).
- Blur, unmount or another dashboard/device: no stale errors/navigation or matching-device refresh against the wrong context (Step 2 isolation tests).
- Missing/array IDs, malformed read and historical icons: local recovery, Retry and exact icon retention (Step 2 boundaries).

---

### Task 1: Deliver native dashboard details

**Files:**
- Modify `src/components/device/dashboards/DashboardForm.tsx` — replace sole-caller imperative/create form with edit-only form, saved baseline and scroll content.
- Modify `src/app/(app)/device/dashboard/details.tsx` — FC route, normalized identity, loading/retry, locked mutations, native confirmation and accepted-deletion return.
- Modify `src/components/device/dashboards/Grid/GridDashboardView.tsx` — add `deviceId` to existing dashboard/details params only.
- Modify `src/app/(app)/_layout.tsx` — dashboard/details brand header only.
- Modify `src/contexts/ToastProvider.tsx` — suppress overlays on dashboard/details, including late callbacks.
- Create `tests/dashboardDetails.test.mjs`; modify `tests/feedback.test.mjs` and append the new suite to `test:device-details` in package.json.
- Modify `AGENTS.md`, `docs/agent-guide/interface.md`, `docs/agent-guide/validation.md` — scoped form/lifecycle rule and checks.
- Preserve the planner's spec, plan and `.impeccable/surfaces/src-app-app-device-dashboard-details-tsx.md` direction contract; mark plan steps after completion.

**Interfaces:**
- Export `interface DashboardFormValues { name?: string; icon?: string; }` from DashboardForm.tsx.
- Default `DashboardForm: FC<DashboardFormProps>` consumes `interface DashboardFormProps { dashboard: DashboardDto; disabled?: boolean; onSubmit: (values: DashboardFormValues) => Promise<void>; children?: ReactNode; }`. Import existing DashboardDto; children place the deletion section inside the same scroll.
- Remove DashboardFormHandle and obsolete create/dirty callbacks after updating their only caller. No other production references exist according to Serena.
- Route default `Details: FC` normalizes IDs and mounts a resource-keyed editor. If a child is useful, keep `DashboardDetails: FC<DashboardDetailsProps>` in that route with `{ dashboardId: string; deviceId?: string; }`.
- Consume existing `useHttpClient`, `useDevice().refresh(false)`, router/focus hooks and Room details' native AlertDialog/Modal/PortalHost pattern; no shared API changes.

- [x] **Step 1: Load required context before UI edits.** Read the spec, interface/validation/tooling guides, Impeccable craft-floor and Android reference. Context already succeeded for this target; do not rerun it. Use Serena for source discovery and systematic-debugging for the ID defect: Grid passes dashboardId, but details reads currentDashboardId for GET/PATCH/DELETE; test that boundary explicitly. Baseline inspected by planner: `/tmp/senswave-dashboard-details-qa/before.png`. No new design questions or approval gates: user delegated choice and local UI policy authorizes routine migration.

- [x] **Step 2: Write focused real-handler tests before implementation.** Reuse nativeComponentHarness and dashboardCreate/Room handlers; add no framework. Do not run until minimal implementation exists. Give tests these names and exact expectations (helper names may match the adapter):
  - `dashboard details use route identity and retry failed reads`: mismatched provider `dashboard-b` still yields `assert.equal(getCalls[0], 'v1/devices/dashboards/dashboard-a')`; rejected/thrown/malformed reads render Retry and no form; Retry succeeds; absent/blank IDs yield zero requests; array IDs take first entry. New Grid params equal `{ dashboardId: 'dashboard-a', deviceId: 'device-a' }`.
  - `dashboard form validates name and preserves icon and partial payloads`: initial clean Save disabled; whitespace/2/65 trimmed name characters reject, 3/64 pass. Assert `assert.deepEqual(patches[0], ['v1/devices/dashboards/dashboard-a', { name: 'Controls' }])`; icon-only PATCH is `{ icon: 'historical-dashboard-key' }`; no config/device fields. Name error survives Icon changes. Invalid saved dimensions render `Grid size unavailable.` without changing configuration.
  - `dashboard save locks pending drafts and retains accepted baseline`: Done and touch produce `assert.equal(patches.length, 1)` in the same turn; Name stays natively editable/busy but handlers ignore edits; Icon/Save/Delete disable. Reject/throw retains drafts and allows retry. Success updates baseline before deferred/throwing `refresh(false)`; assert no identical re-PATCH and `Dashboard saved.`; further genuine edit can save.
  - `dashboard deletion requires confirmation and shares mutation lock`: Cancel, dismiss and Android Back call no DELETE. Confirm twice gives `assert.deepEqual(deletes, ['v1/devices/dashboards/dashboard-a'])`; simultaneous save/delete allows one mutation. Failure preserves draft and exposes the exact delete error with retry.
  - `accepted dashboard deletion survives refresh and navigation failures`: latch before deferred/failed refresh; provider selecting `dashboard-b` never loads/mutates it. No-history replaces `{ pathname: '/device/device', params: { deviceId: 'device-a' } }`; thrown navigation exposes Return to device; retry changes navigation count only, never DELETE count. Unknown originating device falls back to `/`.
  - `dashboard lifecycles isolate routes and devices`: blur suppresses late save/delete errors and navigation; accepted save updates its own baseline; accepted deletion returns once on refocus. Changed resource/unmount ignores stale GET/feedback. A different active device is never refreshed.
  - Extend feedback coverage to dashboard/details, including stale callbacks. Its existing explicit legacy-toast assertion must move to another legacy route (for example `/device/operation/details`), so the suite continues testing both behaviors. Smoke existing dashboard creation via its unchanged real suite.

- [x] **Step 3: Implement edit form and identity-bound route.** Use spec composition/copy without preview, numeric inputs, FAB or Restore. Form owns saved baseline, changed-only values, field/action feedback and synchronous Done/touch lock. Read grid dimensions defensively and preserve global icon keys. Route trusts normalized dashboardId, handles local loading/Retry and holds a shared mutation lock. Capture originating device once; use latest provider refs only to decide safe best-effort refresh. Keep accepted-save baseline separate from follow-up refresh, remain in editor after save, and permanently latch accepted deletion before refresh/return. Keep stale work local and suppress feedback after blur. Match Room details' dialog semantics, focus restoration and stacked actions.

- [x] **Step 4: Wire caller, header, feedback and guides.** Add originating device param in the Grid callback, preserve its other controls, set dashboard/details DefaultHeader to `titlePrefix="Dashboard" variant="brand"`, add inline-feedback suppression and update its regression. Append the test file to `test:device-details` with no dependency edits. Add one compact AGENTS UI line and corresponding interface/validation guidance. Keep global DESIGN artifacts unchanged.

- [ ] **Step 5: Coordinator runs bounded static/handler verification.** Run `pnpm typecheck`, `pnpm lint`, `pnpm test:poc`, `pnpm test:device-details` and `git diff --check`; all exit 0. Notify and wait on any failure. Broaden only if a shared change introduces a specific new concern.

- [ ] **Step 6: Coordinator verifies Android and finishes design review.** Use disposable local dashboard `01a16ad0-2acd-77c3-b910-55d81cdb8442` on device `01a15dc3-7288-73d9-9297-55f458bf0792`, leaving original dashboards untouched. Test mismatched selected/routed dashboard, load Retry, exact Name/Icon save, clean Save, pending/failure draft retention, icon cancellation, Back, keyboard reachability, both themes, normal/200% text and narrow/short window. Verify confirmation Cancel/system Back and one confirmed fixture deletion, including return/remaining-dashboard state. Use synthetic intercepted failures only against local disposable data. Capture/open every image in `.impeccable/review/`; one batched inspection and at most one confirmation batch. Native skips the web detector. Pass evidence/spec/contract/native references to Impeccable finish reviewer, apply material fixes, then document preservation of global DESIGN through its documenter. State TalkBack/hardware checks unverified if not exercised.

- [ ] **Step 7: Coordinator commits and prepares requested PR.** Confirm required successful checks, docs and intended diff only. Use one `feat:` task commit; do not commit planning separately. Push the review head without switching this local branch and create the authorized PR targeting `next-dev`. Include exact checks, emulator evidence and limits; never merge or release.

## Planner self-review

One screen and one implementer task cover all callers, state, tests and docs.
Creation and backend contracts remain intact. The spec's identity, baseline,
pending, confirmation, recovery and accessibility requirements map to handler
assertions or explicit native scenarios. No new dependency, generic abstraction,
visual world, grid editing or production-data mutation is required.
