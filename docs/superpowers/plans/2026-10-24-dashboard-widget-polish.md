# Dashboard and widget polish implementation plan

**Goal:** Bring the complete dashboard and widget path up to the existing native Senswave form and control standard, then commit and push the changes to PR #29.

**Architecture:** Keep the existing routes, API payloads, dashboard geometry, theme and role rules. Reuse FormSection, native Reusables fields, BottomSheetSelect, ListRow and inline Alert feedback. Configuration and live controls remain separate responsibilities.

**Tech stack:** React Native, Expo Router, TypeScript, installed native primitives; no new dependencies.

**Spec:** User request, AGENTS.md, DESIGN.md and docs/agent-guide/interface.md.

## Constraints

- Work on feat/dashboard-flow-2026-10-24, targeting next-dev; never merge the PR.
- Preserve saved widget configuration and operation command values.
- Owner/Manage configure; Display can view and use live controls.
- Use disposable local data for verification and restore emulator settings.
- Skip text enlargement and TalkBack as requested.
- Avoid unrelated changes and leave existing untracked tooling untouched.

## Tasks

- [x] Dashboard path: inspect device entry, selector, creation/details, placement and unlink; fix evidenced hierarchy, scrolling, theme and recovery defects. Keep existing handlers and geometry where correct. Verify affected dashboard adapter suites and Android rendering.
- [x] Live widget controls: inspect every type; align neutral surfaces, amber controls, readable labels and pending feedback with existing tiles. Preserve endpoints and inline command recovery. Test any changed behavior in widgetActions and verify Android touch behavior.
- [x] Widget configuration: replace legacy fixed previews and floating actions with one keyboard-aware FormSection; use shared field styling and selection sheets for every type. Keep details read-only, expose confirmed deletion in the same scroll, add inline request recovery, permission/identity guards and accepted-once return. Check creation/configuration handlers, numeric boundaries and selection-only picker behavior.
- [x] Finish: update affected guide/index, review the integrated diff, run pnpm typecheck, pnpm lint, pnpm test:poc and affected suites. Check Android light/dark at normal text on representative phone widths. Commit with fix: prefix, push to PR #29 source branch and verify its new head.

## Review focus

- Empty and unsupported operation configurations must not create invalid widgets.
- Switching route/device or losing permission must invalidate retained mutation callbacks.
- Failed requests preserve drafts; accepted writes must never repeat during return recovery.
- Small grid cells and narrow keyboards retain usable targets and reachable actions.
- Widget definition deletion and dashboard placement unlink remain distinct operations.

## Verification record

- `pnpm typecheck` and `pnpm lint` passed.
- `pnpm test:poc`: 43/43; `pnpm test:device-details`: 148/148; `pnpm test:dashboard`: 45/45.
- Production Android JavaScript export passed; no new native dependency or API contract was introduced.
- Android emulator checks covered normal-text 320/448 dp portrait layouts, Light/Dark, keyboard reachability, widget creation/status/details/deletion, dashboard creation/icon save/deletion, placement/selection/unlink and command rejection/rollback/retry. Native component fixtures covered all live control types and small-cell labels; the temporary fixture route was removed.
- Disposable widget and dashboard were deleted, the original dashboard restored, and emulator size and Light mode restored.
- Independent review has no unresolved findings. Font enlargement and TalkBack were excluded by user request; physical hardware delivery and forced native read failures were not verified.
