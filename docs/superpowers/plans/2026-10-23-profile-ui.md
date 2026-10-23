# Profile UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy `/user/profile` UI with the established native Senswave settings vocabulary while preserving preferences, navigation, sign-out and confirmed account deletion.

**Architecture:** Keep `Profile: FC` as one scrolling settings screen. Compose existing `ContentSection`, `ListRow`, `BottomSheetSelect`, branded `Button`, `Alert` and local `ui/alert-dialog` components; retain the current `UserProvider` and `SessionProvider` API boundaries. Handle asynchronous mutation feedback and synchronous duplicate locks in the route, rather than introducing a new settings provider or form abstraction.

**Tech Stack:** React Native 0.81.5, Expo 54, React 19, TypeScript, React Native Reusables, `StyleSheet.create()` / `useTheme()`; Node 26.12.1 and pnpm 12.8.1.

**Spec:** User's request to select and redesign the next unmigrated screen, [PRODUCT.md](../../../PRODUCT.md), [mobile UI policy](../../agent-guide/interface.md), and the route's Impeccable surface brief. This plan contains the concrete design for this routine migration; project instructions explicitly dispense with a separate design document/approval gate.

## Global Constraints

- Latest user scope: skip further scaling tests. Keep delivered repairs; final runtime/review uses the standard emulator view. System font, display size and theme preference have been restored.

- Work on the current local `next-dev` branch. Do not create worktrees or switch branches. After final review, the coordinator handles the requested commit, push to a separate remote head and PR targeting `next-dev`; do not merge or release autonomously.
- Brainstorming/planning uses Sol 6.1 Max; implementation uses Luna 6 Max, as requested. The coordinator owns native captures and final verification.
- English product copy; inherited amber/native visual system and shared themed canvas. Use local primitives and existing dependencies only.
- Keep exact `ThemeMode.Light = "light"`, `Dark = "dark"`, `Default = "default"`; label `Default` as `System`. English (`en`) remains the only language option. Preserve the existing language endpoint unless backend evidence independently establishes a needed fix.
- Preserve `dataSource/list` and `user/info` navigation, native Back, existing session logout and `DELETE v1/users/account` behavior. No MQTT, home/device, permissions or shared API changes.
- Real account deletion and logout are not needed for visual emulator verification. Use fakes in handler tests; only open/cancel the real destructive dialog unless a disposable account is available and explicitly authorized.
- Follow `AGENTS.md`: report test failures and wait for human direction. Do not run unrelated builds.

## Chosen Approach and Design

The route and `RemoveAccountDialog` still date to the initial legacy commit `a62e0c4`. Current UI has a large avatar, old dropdowns/dividers and competing full-width buttons. Device operation creation was also considered, but its shared six-type form, mapping controls and subordinate forms would expand beyond a single-screen migration.

1. **Chosen: one native settings list with immediate preferences.** Keeps existing save semantics; groups identity, Preferences, navigation and account actions by proximity. Reuses the new details-screen rhythm and existing sheet/dialog controls.
2. **Explicit Save preferences form.** Familiar from Home settings, but adds draft/dirty state and changes immediate theme application for one effective setting.
3. **Preferences/Account tabs.** Reduces initially visible content but hides a short list of tasks behind an extra interaction; unnecessary for this scope.

Use a brand `DefaultHeader` retaining `My Profile`. Put compact existing avatar (56 dp), wrapping email and account identity at the top of the same scroll; do not add an editable name/avatar or repeat the header as a large page title. Constrain content to 448 dp, with 16 dp horizontal gutters, 24 dp top and 16 dp bottom padding. Use `ContentSection separated` for 40 dp between major sections.

- **Preferences:** `Theme` selected-value field opens the existing native sheet with `Light`, `Dark`, `System`. `Language` is a read-only `English` information row with no chevron or tap action; one supported language does not need a selector. Do not invent translations or call `updateLanguage`. Keep 24 dp between these items.
- **Manage:** `Data sources` and `App information` are navigational `ListRow`s with quiet trailing chevrons. Apply `separator` only between these sibling rows.
- **Account:** `Sign out` is a full-width `brand-outline` action. A separate `Delete account` section uses helper `Permanently delete your account and all associated data.` and the existing outlined destructive action style. No competing amber primary buttons; this is a settings destination, not a creation form.
- **Confirmation:** `Delete account?`; description `This action is permanent. All your data will be deleted and cannot be recovered.`; buttons `Cancel` then `Delete account`. Reuse the Home/Room details native `Modal` + named `PortalHost` + local `ui/alert-dialog` pattern, with scrollable text, stacked reachable actions, 90% maximum height and focus restoration. `common/ConfirmDialog` still wraps legacy `common/Dialog`; do not use or globally rewrite it.
- **Feedback:** use `SimpleResult.isSuccess` / `errorMessage`. Failed preferences keep the saved selection and show a persistent local destructive Alert beside the affected setting; deletion failure stays above Delete account. No success toast or global loading replacement. The active control exposes busy/disabled state while its synchronous ref lock prevents duplicate requests; allow Back and clear locks in `finally`. Suppress late route feedback after blur while allowing the provider to persist accepted global settings or logout after an accepted deletion.
- **Unavailable identity:** do not render a blank email as a loaded account. Keep a local Retry account details action using existing `getUserData({ silent?: boolean }): Promise<Result<UserData>>` if email is unavailable; Profile uses `{ silent: true }` so its route owns delayed failure feedback, while startup and consent callers retain the default global toast. The getter returns `Failed to load account details.` on read failure. Show local loading/error feedback and prevent mutations until identity is usable. Do not create a new initial network fetch when valid provider data already exists.

## File Structure and Reach

- Modify `src/app/(app)/user/profile.tsx`: composition, immediate-setting handlers, result feedback, pending/duplicate guards and local missing-identity recovery; use `FC` and `StyleSheet.create()`.
- Modify `src/app/(app)/_layout.tsx`: only the profile header's `variant="brand"`.
- Modify `src/components/user/RemoveAccountDialog.tsx`: replace its legacy dialog composition with local Reusables confirmation. Its only caller is Profile; retain its `visible`, `onConfirm`, `onCancel` interface and add only a trigger ref if focus restoration requires it.
- Modify `src/contexts/ToastProvider.tsx`: add `/user/profile` to existing `usesInlineFeedback`; do not change other route behavior.
- Modify `src/contexts/domain/UserProvider.tsx`: preserve the default getter toast for provider startup and consent callers, and accept an optional `{ silent?: boolean }` feedback control for Profile's retry only. Return the account-details-specific failure copy for the getter. No endpoint or backend contract changes.
- Create `tests/profile.test.mjs` using `tests/nativeComponentHarness.mjs`. Modify `tests/feedback.test.mjs` for the suppressed route and `package.json` only to include the profile test in existing `test:poc`; no new test framework/script.
- Update `AGENTS.md` UI direction plus `docs/agent-guide/interface.md` and `validation.md` for the delivered profile conventions/checks. Do not rewrite `DESIGN.md` or product scope; this is an extension of their existing system.
- Read and reuse `ContentSection`, `ListRow`, `BottomSheetSelect`, `UserProfileImage`, `ui/alert-dialog`, the Home/Room deletion pattern and theme tokens without broad component refactors. No fixtures, exports, lockfile, dependencies or native build config changes are expected.

## Review Focus

- Same-tick setting/deletion actions must make one request; test delayed promises and repeated retained handlers.
- Failed/throwing settings requests must retain the last saved value, show inline feedback and release the lock; test both result failures and exceptions.
- Dialog Cancel, scrim/system Back and repeated confirmation must never delete accidentally; test cancellation and duplicate confirm using fake deletion.
- Late completion after leaving Profile must not show route feedback/navigation or leave pending stuck after refocus; test blur/refocus with delayed mutations.
- Large text, long email and small windows must keep navigation, sheet choices and Delete/Cancel reachable; verify wrapping semantics in handler tests and rendering/touch/Back on the emulator.

---

### Task 1: Deliver and verify the profile migration

**Files:** The route, header, dialog, feedback/provider files and tests listed above.

**Interfaces:** Consume existing `useUser()` data and `updateTheme(theme: ThemeMode)`, `removeUserAccount()` returning `Promise<SimpleResult>`; `getUserData(options?: { silent?: boolean })` returns `Promise<Result<UserData>>`. Profile uses silent feedback only for its retry; provider startup and both consent callers use the unchanged default. Leave `updateLanguage(language: string)` untouched and unused by the read-only English row. Retain existing `useSession().logout()`, `useRouter()` navigation and default Profile/RemoveAccountDialog exports. `BottomSheetSelect` consumes `{ title, value, options: { label, selected, onPress }[], disabled?, busy? }`; `ListRow` exposes `loading`, not `busy`.

- [x] **Step 1: Add focused behavior checks using the real route/dialog with fake hooks.** Add tests named `profile preference saves preserve exact values and ignore unchanged selections`, `profile mutations share a synchronous pending lock`, `profile failures stay inline and retain saved settings`, `profile deletion requires confirmation and cancellation sends no request`, `profile late completions release pending without stale feedback`, `profile navigation preserves data source and information routes`, and `profile missing identity can retry without exposing account mutations`. Assert exact theme keys, a read-only English row with no language request, request count 1 during pending, no logout on failed deletion, one logout via the existing provider on successful fake deletion, and retained values after failure. Cover dialog Cancel/close and back cancellation. Use assertions such as `assert.deepEqual(themeRequests, ["dark"])`, `assert.equal(deleteCalls, 0)` after cancellation and `assert.match(screen.text(), /Failed to update theme/)` for failure. A delayed-failure test composes real UserProvider + ToastProvider: Profile's silent getter must not toast or dismiss the destination keyboard after navigation; the no-option getter must retain its legacy toast.

- [x] **Step 2: Run the focused red checks.** Run `pnpm exec node --test tests/profile.test.mjs tests/feedback.test.mjs`. Expected failures must concern the legacy behavior, not a harness/import setup error. Notify the coordinator of the expected red result; unexpected failures stop work per repository instructions.

- [x] **Step 3: Implement the composition and handlers above.** Keep all readable content in the same scroll, invoke existing provider methods, release synchronous refs in `finally`, and ignore inactive route feedback. Preserve exact endpoint/payload keys. A successful deletion remains provider-owned logout; never duplicate it in the route. Close the confirmation on acceptance and show pending on the underlying destructive action, with retry after failure. Keep changing-theme feedback local and avoid reading a newly selected label as already saved before a successful result.

- [x] **Step 4: Verify the focused implementation.** Run `pnpm exec node --test tests/profile.test.mjs tests/feedback.test.mjs tests/bottomSheetSelect.test.mjs`. Passed 33/33 after adding the delayed real UserProvider + ToastProvider retry regression, including shared Button and existing UserProvider checks. Added shared Button text, profile and feedback coverage to `test:poc`.

- [x] **Step 5: Update the relevant guide entries and run required checks.** Update `AGENTS.md`, interface/validation guides and this plan. Run `pnpm typecheck`, `pnpm lint`, `pnpm test:poc`, `pnpm test:homes`, the focused sheet check and `git diff --check`. Final result after the getter feedback fix: typecheck/lint/diff checks passed; `pnpm test:poc` passed 43/43; the focused Profile, feedback and sheet run passed 33/33. `pnpm test:homes` passed 82/82 during the preceding shared Button batch and was not rerun for this getter-only fix.
- [x] **Step 6: Verify the Android emulator flow.** Confirmed Profile entry, Light/Dark/System saves and persistence, Data sources/App information navigation and Back, reachable lower actions, and Delete confirmation cancellation by touch and system Back. The final normal-phone captures in both themes were opened and validated. Original display size, font scale 1.0, night mode and System preference were restored. Further scaling checks stopped at the user's request; earlier repair evidence remains in the local runtime report. Real deletion/sign-out, native pending/failure presentation, TalkBack announcements/focus restoration and a synthetic long email were not exercised; handler/provider tests cover request failures and late completions.
- [x] **Step 7: Complete the Impeccable handoff.** Independent standard-phone visual and code review completed. Its single P2 finding, stale identity-retry feedback after blur, was fixed and scored ADDRESSED in the scoped verdict; disposition is ship. The documenter confirmed the existing visual system is preserved. No web detector ran on React Native. The coordinator will commit and push a separate remote head for the requested PR to next-dev; no autonomous merge or release.
