# Add Subscription Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Add subscription into the established native Senswave forms and make one topic submission recoverable without losing input or repeating an accepted request.

**Architecture:** Keep the existing route, form and `CreateSubscriptionRequest` contract. Compose the existing `FormSection`, Reusables-backed `Input`/`Button` and inline `Alert`; keep request/focus guards local to the form. `BrokerSubscriptions` already reloads on return focus, so it needs no modification.

**Tech Stack:** Existing React Native 0.81.5, React 19, Expo 54, Expo Router, TypeScript, keyboard controller and Node native-handler harness. No dependency or native build changes.

**Spec:** The scoped design below, `docs/agent-guide/interface.md`, and the Impeccable brief for `src/app/(app)/dataSource/brokers/addSubscription.tsx`. User delegated screen choice and UI/UX design; repository policy puts this routine design in the implementation plan without a separate approval gate.

## Global Constraints

- Work in the current `next-dev` checkout, without worktrees. Coordinator handles commit/push and a separate remote PR head targeting `next-dev`; never merge.
- Use existing English copy, `FC`/interface props, `StyleSheet.create()`/`useTheme()`, shared canvas and at least 48 × 48 dp native action targets.
- Preserve POST `v1/datasources/brokers/${brokerId}/subscriptions` with `{ topic: topic.trim() }`, required non-whitespace topic and the existing 256-character limit. Preserve case, slash segments, internal spaces and wildcard characters; this migration introduces no MQTT grammar restrictions.
- Keep opaque broker IDs unchanged. Normalize array route parameters the same way as broker start, using the first value; missing, empty and whitespace-only IDs never reach HTTP.
- No new MQTT features, provider, shared lifecycle helper, screen navigation model, dependencies, global tokens or backend changes.
- Expected focused RED is part of implementation. Notify coordinator on unexpected test failure and stop; coordinator owns broader suites and emulator checks.

## Scoped Design and Choice

The selected screen is `/dataSource/brokers/addSubscription`. The latest broker-start migration (`83814a0`) and source-details work already establish the adjoining visual system. This form still has legacy 15/10/90 dp padding, an unsectioned field, toast-only request failures, no synchronous duplicate guard and no thrown-request feedback. Its sole task is adding one MQTT subscription, so one small screen can complete this setup path and be exercised against a disposable local broker.

Native baseline and adjoining source details were inspected in `/tmp/senswave-subscription-before.png` and `/tmp/senswave-subscription-source-before.png`. They confirm the legacy raised controls and the newer flat source sections. The visible source is external EMQX; use it only for navigation/layout checks, with mutation checks on a disposable local source.

Alternatives considered: App information is reachable but mostly read-only and offers less task-completion benefit; automation/operation editors have multiple dynamic subforms and require a much wider verification scope. Within Add subscription, retaining its own route is the chosen design: a dialog would add keyboard/Back complexity to source details, while a wizard would add steps to one field. These are designer decisions, not claims of user approval of individual alternatives.

Mode: Operate; local extension of the incumbent system, code-led. Keep DESIGN.md and all brand tokens. No concept tournament or generated assets.

**Composition:** Use the brand `Data Source` app bar, then one keyboard-aware page with 16 dp gutters, 24 dp top padding, 16 dp bottom padding and 448 dp maximum content width. Use the existing `FormSection` rhythm: title 24/32, helper 14/20, 8 dp title/helper gap, 24 dp field/action spacing. Title `Add subscription`; helper `Enter the MQTT topic this broker client should listen to.` One `Topic` field retains placeholder `home/sensor`. Put full-width amber `Add subscription` directly after the field, in the same scroll content. Keep the page open and quiet; no cards, fixed footer or secondary action beyond Back.

**Input and validation:** Use `Input variant="auth"`, `autoCapitalize="none"`, `autoCorrect={false}`, `returnKeyType="go"`, `submitBehavior="submit"` and a native input ref. Trim only the submitted payload; retain draft whitespace and required/length rules; no errors on initial render. Invalid submit shows `Topic is required.` or `Topic must be 256 characters or fewer.` below Topic and focuses it. An edit clears stale field/action feedback.

**Pending and errors:** Button and keyboard Go share one synchronous ref lock. Keep the input natively editable while HTTP is pending to retain the focused IME, expose its busy state and reject draft changes in the guarded change handler. Disable the submit action and retain its label/progress. Failed result or thrown request keeps the topic, releases the lock and shows destructive Reusables `Alert` with `CircleAlert` immediately above the action: `Couldn't add the subscription. Check your connection and try again.` Do not mark a valid topic invalid. Do not dismiss the keyboard or emit a toast.

**Accepted requests and navigation:** Latch success before navigation and announce `Subscription added.` once. Normally use Back; without Back history replace with `/dataSource/details` and `{ id: brokerId }`. If return navigation throws, keep input disabled and show informational feedback `Subscription added. Return to the data source to view it.` with `Return to data source` as the only action; it retries navigation, never POST. Ignore route feedback/navigation after blur. If acceptance completes while covered, return once on refocus without another POST; failed completion merely unlocks the draft. Key the form by broker ID so another broker never receives old feedback. Missing-ID recovery uses `Broker not found`, `Return to your data sources and choose a broker.` and `Return to data sources` to `/dataSource/list`.

**Accessibility/adaptation:** Native label/focus/error semantics come from the existing Input; Alert exposes relevant feedback. Keep normal system text scaling, wrapping helper/error/labels, natural vertical scrolling, shared safe areas and existing motion. No custom animation. At 320 dp and 200% font scale, field and action remain reachable with the keyboard open.

## Review Focus

- Same-tick Go/button and retained callbacks must send one request and preserve the submitted draft; handler test 2 covers this.
- Failed and thrown requests must keep a valid topic and allow retry without dismissing the keyboard; handler test 2 plus native offline Go covers this.
- Accepted POST followed by navigation failure or blur/refocus must never add twice; handler test 3 covers this.
- Empty/array/changing broker IDs must never send malformed requests or apply old feedback to another form; handler test 4 covers this.
- Long topics, dark theme, large text and the IME must retain readable errors and reachable actions; handler test 1 pins validation, and Step 6 pins native fitting.

---

### Task 1: Migrate and verify Add subscription

**Files:**

- Modify `src/components/dataSource/subscriptions/AddSubscriptionForm.tsx`: composition, validation, request lock, local feedback and accepted-once return.
- Modify `src/app/(app)/dataSource/brokers/addSubscription.tsx`: typed `FC`, normalized/guarded broker ID, keyed form and themed recovery shell.
- Modify `src/app/(app)/_layout.tsx`: only this screen's header to `DefaultHeader titlePrefix="Data" titleSuffix="Source" variant="brand"`.
- Modify `src/contexts/ToastProvider.tsx`: add `/dataSource/brokers/addSubscription` to the existing inline-feedback routes.
- Create `tests/addSubscription.test.mjs`; extend `tests/feedback.test.mjs` and append the new test file to the existing `package.json` `test:data-sources` command.
- Update `AGENTS.md`, `docs/agent-guide/interface.md` and `docs/agent-guide/validation.md` with the delivered convention and focused checks. Keep completion evidence in this plan accurate.
- Reuse `common/{FormSection,Input,Button}`, `ui/{alert,text}`, `ThemeProvider`, `keyboardOffset` and `tests/nativeComponentHarness.mjs`. Read `StartBrokerClientForm` and its tests for existing lifecycle/IME patterns; copy only what this one-field task requires. Do not modify `BrokerSubscriptions`, API types, exports, fixtures or shared components.

**Interfaces:** Retain `AddSubscriptionForm: FC<AddSubscriptionFormProps>`, interface `{ brokerId: string }` and default export. Convert route `AddSubscription` to `FC`; pass `key={brokerId}`. Consume `useHttpClient().post(path, body)`, Expo Router `canGoBack`/`back`/`replace`/`useFocusEffect` and `FormSection` `{ title, helper, actions?, children }`. No new public interface or helper.

- [x] **Step 1: Add focused real-handler tests.** Mount the real form/route with fake HTTP/router and native hosts using the current harness. Use these four test groups, keeping setup local to the test file:
  1. `subscription topic validation preserves the existing payload`: initially no errors; empty/whitespace and 257 characters reject; one and 256 characters submit; invalid field gets focus; surrounding whitespace is trimmed and case/internal spaces/wildcards are preserved. Include `assert.deepEqual(requests, [["v1/datasources/brokers/broker-a/subscriptions", { topic: "House/+/room sensor/#" }]])` for input `" House/+/room sensor/# "`.
  2. `subscription Go and button share a lock and recover after failure`: defer POST, retain pre-render button/Go/change callbacks, invoke them together and assert one request. Assert input stays `editable=true` and busy while pending, old change callbacks cannot alter draft/payload, and action is pending/disabled. Both rejected results and thrown POSTs preserve topic, show inline action feedback, unlock and permit a successful retry; editing clears stale errors; no toast occurs.
  3. `accepted subscription returns once across navigation failure and refocus`: ordinary Back, no-history exact details replacement, thrown navigation yields return-only recovery, all retained submit callbacks send no additional POST, delayed success after blur does not navigate until refocus, delayed failure does not affect the destination, and acceptance is announced once.
  4. `subscription route guards and isolates broker IDs`: missing/empty/whitespace parameter renders recovery and no form; array uses first string unchanged; valid form key equals broker ID; recovery replaces `/dataSource/list`. Unmount broker A's pending form and mount B, then resolve A and assert no B feedback or navigation.
  Extend the existing feedback route coverage to require no legacy overlay and no `Keyboard.dismiss()` on this screen, including retained provider callbacks.

- [x] **Step 2: Run focused RED.** Run `pnpm exec node --test tests/addSubscription.test.mjs tests/feedback.test.mjs`. Expected failures identify the unimplemented behaviors above, not harness/import errors. Report expected RED; stop on unexpected failures.

- [x] **Step 3: Implement the scoped design.** Read Impeccable `reference/craft-floor.md` immediately before UI edits. Use the brief and composition above. Keep validation and synchronous guards local; no generalized form framework. Release pending state in `finally`, preserve accepted state through navigation failure and use the established focus cleanup pattern. Retain HTTP and backend authorization boundaries.

- [x] **Step 4: Verify focused GREEN.** Run `pnpm exec node --test tests/addSubscription.test.mjs tests/feedback.test.mjs`, then `pnpm typecheck`. Expect all focused tests and typecheck to pass. Add the file to existing `test:data-sources`; no new script/framework. Notify coordinator immediately on unexpected failure.

- [x] **Step 5: Document and hand off.** Update affected guide/index rules, record actual test outcomes and run `git diff --check`. Report changed files and unresolved limits. Implementer does not commit; coordinator runs `pnpm typecheck`, `pnpm lint`, `pnpm test:poc` and `pnpm test:data-sources` before committing.

- [x] **Step 6: Coordinator native acceptance and PR preparation.** Capture baseline and source-details reference first. Open Data Source details → Overview → Subscriptions → Add on the current Android emulator. Verify light/dark and a narrow 320 dp/200% font-scale pass: wrapping title/helper/errors, native Topic focus and unchanged case, keyboard Go, field/action reachability, pending indicator without IME dismissal, blank/too-long validation, offline failure/input retention/retry, keyboard Back then route Back. Add a unique disposable QA topic on a disposable local source, confirm one new row after return, then remove it and restore emulator state. Do not mutate an external broker. Handler tests cover timing/failure branches that runtime cannot force; report that distinction. Inspect screenshots in one batch, fix material issues in one batch and confirm at most once. Coordinator obtains independent code/native visual review, compares final composition to the incumbent system, records final evidence and prepares a PR targeting `next-dev`; no merge.

**Acceptance:** Existing source-to-form navigation works; one clear native task matches broker start/source details; every validation/request failure is local and recoverable; one accepted action cannot repeat through retained callbacks or failed return; no malformed broker request, toast overlay or pending keyboard regression. Required checks pass and native evidence reports its actual scope.

**Known verification limits:** Screenshots/handler tests do not establish TalkBack, physical broker delivery or a fresh APK build. Record which of those the coordinator actually exercises. No tests were run during planning.

## Completion evidence

- Implemented and reviewed the one-field native form, route recovery, pending lock, inline feedback and accepted-once return. The real shared-Input regression preserves typed internal spaces.
- Final checks: typecheck and lint pass; test:poc 43/43 and test:data-sources 49/49. The existing authValidation.ts MODULE_TYPELESS_PACKAGE_JSON warning remains unrelated.
- Android API 37 emulator: light/dark, Topic validation/focus, soft Go, IME retention while pending, 320 dp/200% scrolling, keyboard/route Back, injected request failure and real local API retry/acceptance. Synthetic timing/rejection checks are distinct from successful backend writes.
- Independent task code review passed after the whitespace fix. Whole-change review found the clipped example; its final verdict scored home/sensor resolved and returned ship for the scored fix, with no remaining material finding.
- Disposable source and subscriptions deleted; Mosquitto fixture stopped. Emulator size, font scale, theme, keyboard setting and selected home restored.
- DESIGN.md and PRODUCT.md preserved. No new native/dependency/API contract change. TalkBack, physical MQTT delivery, fresh APK and iOS remain unverified.
- PR publication follows the verified commit; integration remains manual.
