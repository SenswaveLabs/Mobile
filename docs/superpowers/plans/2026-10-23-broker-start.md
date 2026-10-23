# Broker Client Start Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring broker start into the current native Senswave UI and make credential submission recoverable without losing input or repeating an accepted Start.

**Architecture:** Keep the existing route and form boundary, using the established FormSection and local Reusables-backed controls. The form retains scoped SecureStore and POST work with synchronous guards and focus-aware feedback/navigation; no provider or backend API is introduced.

**Tech Stack:** Existing React Native 0.81.5, React 19, Expo 54, Expo Router, TypeScript, native keyboard controller and SecureStore; existing Node handler harness.

**Spec:** [Broker start design](../specs/2026-10-23-broker-start-design.md). Read the scoped Impeccable surface brief for `src/app/(app)/dataSource/brokers/startBrokerClient.tsx` once before implementation.

## Global Constraints

- Work on the current `next-dev` checkout; no worktree or dependency/runtime configuration/native/backend contract changes. The user subsequently requested a PR: the coordinator commits locally, pushes a separate remote head and opens a PR targeting `next-dev`. Do not merge.
- Existing English copy, palette, `FC`/interface props, `StyleSheet.create()`/`useTheme()`, shared canvas and at least 48 × 48 dp native targets.
- Preserve SecureStore key `brokerClientCredentials-${brokerId}` and exact `{ username, password }`; required, maximum 256 characters for each field, no trimming.
- Preserve POST `v1/datasources/brokers/${brokerId}/clients`; accepted Start cannot be repeated after refresh/navigation failure.
- One keyboard-aware scroll; 16 dp horizontal gutters, 24 dp top, 16 dp bottom, maximum width 448 dp; existing FormSection spacing and brand header.
- Stop and notify the coordinator on unexpected test failure. Focused expected RED is part of this task; coordinator owns full suites/runtime checks. No live external EMQX mutation.

## Review Focus

- Delayed secure reads and invalid JSON must not strand the page or replace another broker's input; pin restoration and cleanup in the handler suite.
- Same-tick button/IME actions and delayed store calls must send one exact POST; pin retained callbacks and storage-before-request ordering.
- Storage or network exceptions must preserve input, show action errors and release the lock; pin retry and unchanged saved data before explicit Start.
- Accepted requests followed by refresh/navigation failure or blur must never send another POST; pin return-only recovery and refocus behavior.
- Missing IDs, long credentials, narrow windows and large text must retain safe recovery and reachable controls; pin route/validation semantics in handlers, native fitting in coordinator QA.

---

### Task 1: Migrate and verify broker client start

**Files:**

- Modify `src/components/dataSource/brokers/StartBrokerClientForm.tsx`: layout, validation, secure-storage lifecycle, mutation locks and return navigation.
- Modify `src/app/(app)/dataSource/brokers/startBrokerClient.tsx`: typed `FC`, normalized/guarded ID, keyed form and themed shell without duplicate padding.
- Modify `src/app/(app)/_layout.tsx`: only this screen's `DefaultHeader` `variant="brand"`.
- Modify `src/contexts/ToastProvider.tsx`: add `/dataSource/brokers/startBrokerClient` to existing `usesInlineFeedback`.
- Create `tests/startBrokerClient.test.mjs`; modify `tests/feedback.test.mjs` and append the file to existing `package.json` `test:data-sources` only.
- Update `AGENTS.md`, `docs/agent-guide/interface.md` and `docs/agent-guide/validation.md` with delivered conventions and focused verification. Keep this plan's completion evidence accurate.
- Reuse, do not rewrite, `common/{Input,PasswordInput,Button,FormSection}`, `ui/{checkbox,alert,text}`, `ThemeProvider`, `HomeProvider` and `BrokerClient`'s source-details focus reload. No exports or fixtures need production changes.

**Interfaces:** Consume `useHttpClient().post(path: string, body: object)`, `useHomes().current` / `.refreshCurrent(): Promise<void>`, Expo SecureStore `getItemAsync`/`setItemAsync`/`deleteItemAsync`, and Expo Router `canGoBack`/`back`/`replace`/`useFocusEffect`. Retain `StartBrokerClientForm: FC<StartBrokerClientFormProps>` with interface `{ brokerId: string }` and its default export. The route passes `key={brokerId}`. Use the existing `FormSection` props `{ title, helper, actions?, children }`; its spacing is already implemented. No new shared helper/interface is required.

- [x] **Step 1: Add focused executable handler tests.** Mount the real form/route with fake HTTP, SecureStore, homes and router using `mountNativeComponent`; fake native hosts only. Name/check the following groups:
  - `broker start validates required and backend length boundaries`: initially quiet errors; empty/whitespace-only invalid; lengths 1 and 256 accepted, 257 rejected for each field; first invalid field focused; no storage/POST on invalid values; assert transmitted values containing surrounding spaces remain exact.
  - `broker start restores credentials without changing storage`: exact read key, valid JSON autofill/checked state, no record, invalid JSON/wrong value types/read rejection; controls unlock for manual entry, no write/delete on load or checkbox change; a delayed read after cleanup does not update another form.
  - `broker start retains exact credential storage and request order`: checked writes exact JSON, unchecked deletes same key, one POST only after that storage operation fulfills; assert `requests` deep-equals `[["v1/datasources/brokers/broker-a/clients", { username: " u ", password: " p " }]]`.
  - `broker start shares a synchronous lock and retains input on failures`: retain old button, Password Go and both field change callbacks, invoke button/Go before render; assert one mutation while pending, disabled Start/Remember, and both fields still `editable=true` with `accessibilityState.busy=true` throughout delayed storage and HTTP. Invoke retained change callbacks while locked and assert draft, stored JSON and POST values stay exact. Initial restore and accepted success still use `editable=false`. Assert no POST after rejected set/delete, draft/error retention after failed result and thrown POST, and successful retry after lock release. After failure, both field change handlers must work and clear their stale field/action errors. These prop/state checks complement the coordinator's real soft-Go keyboard check.
  - `broker start completes accepted requests only once`: normal Back, empty-history `replace({ pathname: "/dataSource/details", params: { id: "broker-a" } })`, matching-current-source-only best-effort refresh, thrown refresh still returns; navigation failure exposes return-only action and old submit handlers cannot POST again.
  - `broker start ignores stale completion and recovers on refocus`: delayed accepted POST after blur sends no stale navigation/toast, later focus returns without POST; delayed failed POST clears pending without destination feedback; broker route key changes isolate old requests/reads.
  - `broker start handles missing route IDs and checkbox semantics`: missing/empty/array parameter handling, no HTTP/SecureStore for missing ID, recovery to `/dataSource/list`, one checkbox focus target with checked/disabled state and at least 48 dp target; checkbox and text activation toggle once.
  Extend the existing feedback route list to assert retained legacy callbacks neither toast nor dismiss the keyboard on this route. Test actual handlers/state, not source strings.

- [x] **Step 2: Run focused RED.** Run `pnpm exec node --test tests/startBrokerClient.test.mjs tests/feedback.test.mjs`. Expected failures must identify missing behavior, not imports/harness errors. Report expected RED to the coordinator; unexpected failures stop work.

- [x] **Step 3: Implement the spec's composition and lifecycle.** Read Impeccable `reference/craft-floor.md` before UI edits. Use existing control variants and exact copy from the spec. Keep initial restoration separate from submission pending, never log credential values, and release locks in `finally`. Freeze pending draft changes using synchronous change-handler guards; do not disable the focused native input during storage/HTTP, because Android `editable=false` disables the underlying view and closes the IME. Keep both inputs' `submitBehavior="submit"` and pending busy state; initial restore and accepted success remain natively disabled. Latch accepted state before best-effort refresh or navigation; gate route feedback/navigation by focus and current broker instance. Missing IDs never reach storage/HTTP. Use a single accessible row with the local Checkbox visual to avoid a second focus/toggle target. Keep Back and manual recovery available as specified.

- [x] **Step 4: Verify focused GREEN.** Run `pnpm exec node --test tests/startBrokerClient.test.mjs tests/feedback.test.mjs` then `pnpm typecheck`. Expect all focused tests and typecheck to pass; notify the coordinator immediately on unexpected failures. Append the test to existing `test:data-sources`; no new test framework or script.

- [x] **Step 5: Update documentation and hand off evidence.** Update the affected index/interface/validation guidance with actual behavior and test command. Run `git diff --check`, report changed files, test outcomes and unresolved limits. Do not run full suites or commit; the coordinator runs `pnpm lint`, `pnpm test:poc`, `pnpm test:data-sources` and final required checks.

- [x] **Step 6: Coordinator native verification and finish.** Verified light/dark phone UI, 320 dp/200% text wrapping, keyboard/action reachability, Back, Next/Go, visibility, validation, retained input, one native checkbox target, secure credential restore/removal and accepted Start returning Connected through a disposable local Mosquitto source. Offline soft Go retains the IME after the pending-field correction. The temporary source/container were removed; original home and emulator settings restored. Independent spec/code/visual review returned `ship` with zero material findings; documentation comparison confirmed the incumbent system is preserved. Native HTML/CSS detection does not apply. TalkBack, a fresh APK build and physical hardware delivery were not exercised.

**Publishing handoff:** The user requested a commit and PR after implementation. The coordinator runs the required pre-commit checks, commits on the current local `next-dev` branch and pushes a separate remote head for a PR targeting `next-dev`. The PR records publishing and CI status; merging remains manual.

## Final verification evidence

Focused broker/feedback tests passed 18/18. Typecheck and lint passed. The coordinator's auth flow suite passed 43/43; data-source tests passed 45/45 after the final pending-field change. All six required native captures were opened and independently reviewed. The existing ignored design sidecar is absent; no global design token change or drift repair was needed.
