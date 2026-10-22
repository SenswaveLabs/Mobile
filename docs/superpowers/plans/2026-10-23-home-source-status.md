# Home Source Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement approved variant 2, “Pod nazwą domu”: quiet connected status below the home name and persistent source notices above Devices when attention is needed.

**Architecture:** Keep the existing `ProfileHeader: FC` and `HomeStateWidget: FC` context consumers. Render the healthy subtitle in the header and derive pending/notices directly from the current home's raw source state in the widget; no new state, shared helper, provider, request or dependency is needed. Preserve the widget's existing slot in the device list header and the existing owner-only routes.

**Tech Stack:** React Native 0.81.5, Expo 54, React 19, TypeScript, local React Native Reusables Alert/Button, `StyleSheet.create()` and `useTheme()`; Node 26.10.0, pnpm 12.8.1.

**Spec:** Approved local [handoff](../../../.impeccable/review/home-source-mockups-2026-10-22/handoff.md), selected [variant 2 mockup](../../../.impeccable/review/home-source-mockups-2026-10-22/wariant-2-naglowek.png), and interactive `index.html` in that directory. These local design artifacts are gitignored; the exact implementation contract is transcribed below so this plan remains self-contained in the PR.

## Global Constraints

- Work in the existing branch `feat/home-source-status`, based on fetched `origin/next-dev` at `5949c08a37d87df127f931914d0394924aa7ecb0`. No worktrees, stash changes, main integration, autonomous merge or release.
- Planning uses Sol 6.1 Max; implementation uses Luna 6 Max with subagents, as explicitly requested. The coordinator owns Android verification and final PR to `next-dev`.
- The user approved the handoff and variant choice. Implement that decision without a new design round or redundant approval request.
- Only `isOwner` permits source actions; `canManage` does not. Display keeps normal device controls.
- Reuse existing `Alert` / `AlertDescription` and separate `common/Button` with `type="brand-outline"`. Only Error uses `variant="destructive"`. No custom alert colors, compact alert variant, dismiss action or button inside an alert.
- No reconnect/restart action, source-refresh promise, invented error cause, uptime, last-seen time or source name on the healthy home screen. Source health never overrides device presence or action permissions.
- No shared API/type/badge changes, native dependency changes, production version changes or new test framework. The existing `DataSourceState` badge remains for settings/details.
- Node/pnpm/hooks are prepared. Existing baseline passes typecheck, lint and `test:dashboard` (43 tests). Unexpected verification failures must be reported and work paused for human direction, per `AGENTS.md`.

## Exact State and Role Contract

Source assignment is `Boolean(home.dataSource?.id)`. No selected home renders no source UI. Assignment absence takes precedence over any stale state value. Compare raw states exactly; never use `getDataSourceStateLabel`, whose fallback would mislabel unknown states as disconnected.

| Assigned source state | Header subtitle | Widget copy | Owner action |
| --- | --- | --- | --- |
| `Working`, `Connected` | Compact check + `Data source connected` | Nothing; return `null` | None here; existing Home settings remains available |
| `Connecting` | None | `Connecting to data source…` as neutral inline text | None |
| `Restarting` | None | `Restarting data source…` as neutral inline text | None |
| `NotStarted`, `Stopped`, `Disconnected` | None | Default alert: `Data source disconnected. Device values may be out of date.` | `Connection details` |
| `Error` | None | Destructive alert: `Data source error. Device values may be out of date.` | `Connection details` |
| Unknown, empty, `null` or missing state | None | Default alert: `Connection status unavailable. Device values may be out of date.` | None |
| No assigned source | None | Default alert: `No data source connected.` followed by role-specific setup text below | `Connect data source` |

For disconnected/error states, append ` Contact the home owner if this continues.` for every non-owner, including Manage. Missing-source setup copy is `Connect a data source to add devices.` for owners and `Ask the home owner to connect a data source.` for non-owners. Manage and Display receive no source action in any state.

`Connection details` pushes `{ pathname: "dataSource/details", params: { id: home.dataSource.id } }`. `Connect data source` pushes `{ pathname: "home/dataSource/select", params: { homeId: home.id } }`. The entire notice is informational and must not become a navigation target.

## File Structure and Reach

- Modify `src/components/headers/ProfileHeader.tsx`: healthy-only subtitle, compact decorative check, wrapping home identity and accessible status; preserve home switching, settings and avatar actions.
- Modify `src/components/home/widgets/HomeStateWidget.tsx`: replace source-name/badge/clickable-row composition with the state/role contract above.
- Modify `tests/homeDashboard.test.mjs`: replace the obsolete “only owners can open or select the home's data source” test and add real-component state/role/transition assertions using `mountNativeComponent`.
- Modify `AGENTS.md`, `docs/agent-guide/interface.md` and `docs/agent-guide/validation.md`: record this home-screen convention, its owner gate and relevant verification.
- Read and preserve `src/app/(app)/index.tsx` (widget before Devices), `src/app/(app)/_layout.tsx` (header consumer), `src/app/(app)/home/details.tsx` (owner source entry), `HomeProvider`, `DeviceTile` and `DataSourceState`. No changes to these files are expected.
- Reuse `src/components/ui/alert.tsx` and `src/components/common/Button.tsx` without changes. No exports, fixtures, scripts, package versions or lockfile need changing.

## Review Focus

- Missing source ID with a stale `Working` state must show setup information rather than a connected claim; pin this in the state matrix test.
- Unknown/null/missing state must remain unavailable, with no misleading disconnected copy or source action; pin this in the state matrix test.
- Source/state/home/role changes must remove stale subtitles, messages and owner actions on rerender; pin this in the transition test.
- Long home names and 200% fonts must leave both subtitle and 48 dp header/actions reachable; cover flexible style/accessibility props in handler tests and actual layout on Android.
- Display must retain device actions while source actions remain absent; retain the existing device-control regression suite and verify the Display fixture on Android.

---

### Task 1: Deliver approved home-source presentation

**Files:** Modify the two components, `tests/homeDashboard.test.mjs`, `AGENTS.md`, and the interface/validation guides listed above. Update this plan with delivered checks and exact native limitations before committing.

**Interfaces:**
- Consumes unchanged `useHomes(): HomesContextProps` with `loading`, `current?: Home`, `home.isOwner`, `home.canManage`, and runtime `home.dataSource?.{id,name,state}`; defensive nullable-state handling does not change the shared TypeScript contract.
- Produces unchanged default component exports `ProfileHeader: FC` and `HomeStateWidget: FC`. Each render reads current context directly. Navigation remains the exact two `router.push` objects above.
- Uses `Alert`'s existing required Lucide `icon` and default/destructive variants; `AlertDescription` contains all notice copy. `Button` receives `name`, `type="brand-outline"`, `loading={false}` and `onPress`.

- [x] **Step 1: Write the failing state and role tests in `tests/homeDashboard.test.mjs`.**

  Replace the old owner-row test. Mount the real header and widget with the same mutable `homes` object, capture router pushes, and stub `../user/UserProfileImage` as a host in header tests. Reuse `home()` and the existing native harness; do not modify the harness or add a shared presentation helper.

  Add `home source presentation covers exact backend states and owner permissions`. Exercise Owner `{isOwner:true, canManage:false}`, Manage `{isOwner:false, canManage:true}` and Display `{isOwner:false, canManage:false}` against every row of the contract, including all three disconnected spellings, unknown string, empty string, `null`, omitted state, absent source, empty source ID with stale `Working`, no current home and header loading. Use the exact strings in the table. Assert these outcomes from the mounted components:

  ```js
  assert.equal(header.text().includes("Data source connected"), !homes.loading && expectedHealthy);
  assert.equal(widget.output() === null, !homes.current || expectedHealthy);
  assert.equal(widget.elements().filter((n) => n.type === "Alert").length, expectedAlertCount);
  assert.equal(widget.elements().some((n) => n.type === "Pressable"), false);
  assert.equal(widget.elements().filter((n) => n.type === "Button").length, expectedAction ? 1 : 0);
  assert.equal(widget.text().includes("Broker"), false);
  ```

  For each alert, assert exact `AlertDescription` text, `variant` (`destructive` only for Error; default/omitted otherwise), `accessibilityRole="alert"`, `accessibilityLiveRegion="polite"` and no Button descendant. Verify no compact prop, dismiss target or raw backend-state label leaks into the presentation. For pending states, assert exact neutral text, no Alert and no Button. Invoke every owner action and deep-compare the navigation object to the contract.

- [x] **Step 2: Write the failing transition and header composition tests in the same file.**

  Add `home source presentation drops stale state and actions across home and role changes`: rerender both mounts while moving through `Working → Connecting → Error → Working → missing source → unknown`, then replace the current home/source IDs and change Owner → Manage → Display. Assert the prior copy/actions disappear, recovered health removes the content notice, and owner navigation after switching homes uses the new IDs. Rerender unchanged error state to prove the notice persists. Do not introduce timers or dismissed-state bookkeeping.

  Add `home header keeps accessible navigation beside a wrapping connected subtitle`: assert the subtitle is structurally below the home-name row, the check is decorative within one status accessibility group, and the status has text `Data source connected` plus `accessibilityLiveRegion="polite"`. Assert it is not a second button; home switch still pushes `home/list`, Home details still pushes `home/details`, avatar keeps `size={48}`/`enableNavigation`, and name/settings targets retain minimum 48 dp. With a long home name, assert identity/text flex styles permit shrink/wrap, with no fixed height, line count cap or disabled font scaling on the new subtitle. Actual fitting remains an Android check, not a claim from this harness.

- [x] **Step 3: Run the focused tests and observe the expected failures.**

  Run `pnpm exec node --test --test-name-pattern='home source presentation|home header' tests/homeDashboard.test.mjs`. Expected: assertion failures from the old presentation, with no import/harness errors. Capture why they fail before implementation; unexpected failures follow the repository's stop/report rule.

- [x] **Step 4: Implement the two component bodies with their existing signatures.**

  In `ProfileHeader`, require a nonempty source ID and raw `Working`/`Connected` before rendering the subtitle. Use a flexing home identity group and existing name-row action, then a separate compact status row directly below; use native Text at 12/18 dp, themed muted text and a small existing `common/Icon` check (`checkmark-circle-outline`, brand tone). Group the status for accessibility without duplicate glyph narration. Keep the 16 dp header gutters, minimum rather than fixed heights, settings target and avatar. Allow name/status text to wrap and grow.

  In `HomeStateWidget`, return `null` for no home or a healthy assigned source; render pending neutral text with polite accessible status; otherwise render one persistent Alert and optional sibling Button, separated by the existing 12 dp feedback/action rhythm. Use existing `CircleAlert` for Error and neutral `Unplug`/`Info` icons for default notices. Keep the normal Alert card variant. Derive copy/action directly from raw state and assignment, giving absence precedence. Only owner plus known disconnected/error/missing states yields an action. Remove obsolete identity/badge/chevron/Pressable code and unused styles/imports. Do not add recovery requests, timers, source-name display or a shared mapper.

  Leave the current widget slot above Devices in `index.tsx`; returning `null` removes the healthy content row without reserving extra space. Preserve source settings access and all device/room controls.

- [x] **Step 5: Verify the implementation and update durable documentation.**

  Run `pnpm test:dashboard`; expected all assertions pass, including existing Display control/permission tests. Update the UI-direction paragraph in `AGENTS.md` and the data-source convention in `interface.md` to distinguish the home subtitle/notices from settings/details badges. Extend `validation.md`'s dashboard coverage and native checklist with source states, strict owner gates, home/role transitions and large-text header checks. Do not change API-contract docs because the contract is unchanged.

  Run `pnpm typecheck`, `pnpm lint`, `pnpm test:poc`, `pnpm test:dashboard`, `pnpm test:homes` and `git diff --check`. Expected: all pass. The homes suite verifies the unchanged owner settings route remains covered; the PoC suite preserves shared badge behavior. Do not repeat passing suites unless a subsequent edit affects them.

- [x] **Step 6: Coordinator verifies Android and records evidence.**

  Use `emulator-5554` and this checkout's Metro on port `8084` through adb reverse; do not use port `8083`, which belongs to another worktree. Verify the current source/home first. For deterministic rare states and Owner/Manage/Display, use temporary local read-only provider fixtures or a local mock API; never mutate a real broker/home/role to manufacture evidence. Do not commit fixture plumbing or expose backend credentials.

  Capture light/dark healthy, disconnected, Error, missing and unavailable screens and inspect neutral Connecting/Restarting. At normal and 200% font scale with a long home name, including a narrow 320 dp window, inspect subtitle/name wrapping, settings/avatar reachability, 48 dp actions, notice wrapping, scrolling and absence of duplicate healthy content. Exercise Owner details/select navigation and Android Back, then confirm Manage/Display show no source action while Display device controls remain present and usable. Confirm healthy owners still reach source details through Home settings. Inspect native accessibility properties/order from XML; report announcement behavior not exercised with TalkBack. Restore emulator preferences and remove temporary fixtures after captures; rerun narrow affected checks if product code changed during verification.

### Delivery evidence — 2026-10-23

The implementer reported focused 3/3, dashboard 45/45, PoC 30/30, homes 82/82, typecheck and lint passing before fixture cleanup. Review regression for empty IDs with stale Error/NotStarted/Stopped/Disconnected and omitted-ID Error passed focused 3/3 and dashboard 45/45. The temporary preview route and `HomesContext` export were removed after native captures. Root then passed final post-cleanup `pnpm typecheck`, `pnpm lint` (244 files), `pnpm test:poc` (30/30), `pnpm test:dashboard` (45/45), `pnpm test:homes` (82/82) and `git diff --check`; logs are in `.superpowers/sdd/2026-10-23-home-source-status/`.

Native evidence consists of 16 original PNG/XML pairs in [the review packet](../../../.impeccable/review/home-source-implementation-2026-10-23/review-packet.md), plus five navigation XML captures. It covers the actual disconnected home and clearly labelled local `Sample data` readouts, light/dark themes, normal/200% text, 448 dp and 320 dp widths, the source-state/role matrix, long names, source details, Home settings and Android Back. XML confirms one non-clickable healthy-status group, 48 dp Home details/profile/source targets and a 96 dp narrow large-text Connect target. It does not establish TalkBack announcements, hardware delivery, tablet behavior, live MQTT recovery or backend-role mutation behavior.

The [finish review](../../../.impeccable/review/home-source-implementation-2026-10-23/finish-review.md) returned **ship**, with no material fixes in scope. Root `DESIGN.md` exists and remains unchanged; `.impeccable/design.json` is absent as pre-existing documentation drift. This approved extension adds no new visual world, tokens, assets, dependencies or API contracts.

- [ ] **Step 7: Coordinator commit and open the requested PR (pending).**

  Post-cleanup checks and independent implementation/native reviews are complete. Coordinator commits only intended files with `feat: refine home data source status`, then opens the PR targeting `next-dev`; describe visible behavior, owner-only actions and verified Android limits in normal prose. Do not merge. Notify and wait if required checks or CI fail.

## Plan Self-Review

- Every handoff state, exact string, owner action and restriction is assigned to Task 1 and its state/transition tests.
- The mockup's owner/non-owner setup and continuation guidance are preserved; unknown remains distinct from disconnected and has no action.
- Existing component signatures, API contracts, routes, state casing, device controls and shared badge behavior remain unchanged.
- The five review-focus conditions have explicit handler/native checks; handler tests are not treated as rendering, TalkBack or hardware-delivery evidence.
- One cohesive task fits the coupled header/widget change. No new helper, dependency, production fixture, unrelated layout redesign or backend build is needed.
