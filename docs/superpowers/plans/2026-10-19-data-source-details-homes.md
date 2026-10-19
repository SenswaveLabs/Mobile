# Data Source Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign native Data Source Details to match the latest Homes Details, List, Create and Join screens.

**Architecture:** Extend the established native UI using the existing Reusables Tabs, `ContentSection`, `ListRow` and broker form. Keep the broker identity and tab navigation together inside each mounted panel's existing scroll so long names and large text cannot exhaust a fixed header. Preserve all network requests, validation, saved drafts and destructive confirmations.

**Tech Stack:** React Native, Expo, TypeScript, local React Native Reusables; Node 26.10.0 and pnpm 12.8.1.

**Spec:** User request and latest [surface brief](../../../.impeccable/surfaces/src-app-app-datasource-details-tsx.md). Use current Homes source and design tokens as authority for geometry and behavior.

## Global Constraints

- Base: fetched `origin/next-dev`, `d45709cac3ec1448da19095f3e23250077260bdd` (`fix: refine home setup and sharing flows (#14)`). Worktree branch: `feat/data-source-details-homes`. Fetch again before implementation and compare the reference SHA.
- Implementation: Luna 6. Review: Sol 6.1. Keep work separate from `main`; no autonomous merge or release.
- Inherit latest Homes details/list geometry: 16 dp side gutters, 24/32 dp page title, 14/20 dp supporting text, `ContentSection` 20/28 dp headings and 40 dp major-section spacing. Create/Join retain their established 24 dp form gutters; do not import the obsolete 30/36 page-title scale into Data Source Details.
- Reuse `ListRow` topic rows, including sibling separators, final-row omission, selectable wrapping text and named 48 dp removal targets. Do not return to the obsolete separator-free rows.
- Keep current Settings field arrangement: Name, Server, wrapping Client name/Port row (2:1 growth), then TLS/MQTT selected-value fields. Preserve the 16 dp field gaps and 8 dp label-to-field gap.
- Keep Overview/Settings mounted, preserve drafts and exact TLS/MQTT values, and retain Start/Add routes. Save stays the primary action; deletion stays full-width, separately confirmed and grouped like Home details.
- Use existing colors, `StyleSheet.create()` and `useTheme()`. No dependencies, API contracts, production version changes, fabricated metrics or rasterized UI controls.
- Stop and notify the user on test failure, per AGENTS.md.

## Review Focus

- Review adaptive source behavior for long broker identity and endpoint: content scrolls and tab/form targets may grow. Native zoom/font-scale verification was cancelled by the user and must not resume.
- Tab changes retain unsaved fields; hidden panels expose no interactive accessibility descendants.
- Keyboard, system Back and bottom-sheet cancellation keep valid drafts and existing selector semantics.
- Client/subscription loading, empty, error and Retry states stay local. Review theme-token usage in source; native dark-theme verification was cancelled by the user and must not resume.
- Create Data Source remains unchanged despite sharing `DataSourceForm` with Settings.

## Task 1: Align design with current Homes

- [x] Fetch `origin/next-dev`; preserve obsolete implementation separately and update the worktree to `d45709c`.
- [x] Install using the frozen lockfile and run the clean baseline: typecheck, lint, `test:poc` (30/30), `test:data-sources` (24/24).
- [x] Align the proposed screen hierarchy to the fetched Homes implementation. User approved the updated design direction before implementation.

## Task 2: Implement the bounded screen change

**Modify:** `src/app/(app)/dataSource/details.tsx`, `src/components/dataSource/sections/DataSourceDetailsSection.tsx`, `src/components/dataSource/DataSourceForm.tsx`, the surface brief and `docs/agent-guide/interface.md`.

**Reuse without redesign:** `ContentSection.tsx`, `ListRow.tsx`, `BrokerClient.tsx`, `BrokerSubscriptions.tsx`, `BottomSheetSelect.tsx` and theme tokens.

**Interfaces:** If scroll composition requires it, add one optional `header?: ReactNode` prop passed from the details section into the existing form scroll. No request, payload, state-machine or shared-control interface changes.

- [x] Luna 6 reads the new reference and current Home implementations, then changes only the required screen composition. Do not reapply the obsolete stash over the new base.
- [x] Put broker identity before tabs in both panels' scroll content. Retain the shared Tabs context and mounted state; avoid nested keyboard-aware scroll containers and fixed-height identity truncation.
- [x] Let tab triggers grow beyond their 48 dp minimum rather than fixing their height. Match Home's delete dialog with a 90% height limit, scrollable body and reachable footer at 320 dp/200% text; preserve its existing handlers.
- [x] Match Connection and Delete sections to current Home details. Place deletion feedback beside its action inside scroll content, retaining confirmation and request locks. Let `ContentSection separated` own the 40 dp separation; remove the old 24 dp child-wrapper margin rather than adding both.
- [x] Run `pnpm typecheck`, `pnpm lint`, `pnpm test:poc`, `pnpm test:data-sources` and `git diff --check`. Presentation-only changes use existing behavior tests and native evidence; any new non-trivial behavior requires its meaningful regression test first.
- [x] Review the approved UI against current Home patterns. Dark-theme and zoom/font-scale checks were explicitly cancelled and must not be resumed.
- [x] Sol 6.1 reviews the complete code diff, callers and tests. Final verdict: no material findings. No code fixes requested.
- [x] Record checks and implementation limits. Leave work on the feature worktree; do not merge or publish.

## Preflight review

Sol 6.1 checked the plan against `d45709c`: geometry matches current Homes, and a shared Tabs root supports navigation inside both retained panels. The flexible tab height and bounded delete-dialog requirements above address the two adaptive risks found. This is plan review only, not approval of an implementation or native result.

## Delivery — 2026-10-19

Luna 6 implemented the approved v2 on `d45709c`. Sol 6.1 reviewed the complete change and connected callers/components/tests: no introduced must-fix or should-fix defects. It accepted the bounded source and available light/default visual scope; no rebuild or further capture was required. Work remains on `feat/data-source-details-homes` in the isolated worktree; no merge or publication.

Checks passed: `pnpm typecheck`, `pnpm lint`, `pnpm test:poc` (30/30), `pnpm test:data-sources` (24/24) and `git diff --check`. The final flexible-height/dead-style cleanup was rechecked with typecheck and lint; behavior tests were not repeated for those presentation-only edits.

No backend contract or live MQTT behavior changed. Dark and zoom/font-scale checks were skipped at the user's direction.
