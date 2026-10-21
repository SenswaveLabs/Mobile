# Device Details redesign handoff

## Goal

Bring the native device editor in `/device/details` into the current Senswave mobile UI, following Home Details and the redesigned Data Source Details screen. Make device identity and configuration easier to scan, with a clear save action and a separately confirmed delete action.

This is a handoff for design and implementation, not an approved mockup or implementation plan. Get design approval before changing the screen.

## Screen boundary

- `/device/details` edits a device. It renders `src/components/device/DeviceForm.tsx` in edit mode.
- `/device/device` displays the live device dashboard and operations. Use it as context only; redesigning it is out of scope.
- `DeviceForm` is shared with `/device/add`. Keep the creation flow and payload unchanged unless separately approved.

## Current surface

- `src/app/(app)/device/details.tsx` loads and updates a device, then exposes Save and Reset when changes exist. Delete and the Operations & Widgets route share its floating action button.
- `src/components/device/DeviceForm.tsx` shows a live tile preview above a divider, followed by Name, catalog icon selection, Room, and edit-only Tile and Presence expanders. The expanders can reveal operation selectors and the display unit field.
- Related behavior lives in `ConfirmDialog`, `RoomSelector`, `OperationSelector`, `DeviceTile`, `useIconCatalog`, and the existing device providers.

## Design direction

- Reuse current Home and Data Source Details tokens, native canvas and `ContentSection`/`ListRow` patterns. Inspect their source and current native captures; do not copy generated pixel dimensions over native components.
- Keep the live tile preview and all existing device information. Establish a clear order for identity and room, tile configuration, presence, and actions.
- Keep Save available when edits are pending. Keep Reset semantics explicit and reversible. Keep Delete visually separate and confirmed; preserve Operations & Widgets navigation.
- Preserve icon catalog keys, room and operation selectors, exact request payloads, current validation, async handling, and loading/error behavior.
- Treat adaptive spacing, scrolling, and 48 dp touch targets as requirements. Do not add cards, new copy, or settings without a design reason.

## Callers and safeguards

Review the edit route and its complete `DeviceForm` call graph before changing shared markup. Keep create-only behavior stable: home/room defaults, create submit action, icon selection, preview and create payload. Preserve edit partial updates, device refresh, delete confirmation, pending action locks where they exist, and the dashboard return path. Do not alter API contracts, providers, opaque catalog keys, or live dashboard behavior as part of this visual task.

## Workflow and checks

1. Start a fresh isolated worktree from the latest `origin/next-dev` after this branch's PR has integrated. Use Luna 6 for implementation and Sol 6.1 for review.
2. Capture the current edit screen on a default light emulator with representative tile/presence data. Compare it with current Home and Data Source Details references. Prepare a proposed visual design and get the user's approval before implementation.
3. Inspect existing checks before deciding what tests the change needs. Run `pnpm typecheck`, `pnpm lint`, `pnpm test:poc`, and `pnpm test:icons`; add or update focused checks only if behavior changes.
4. Verify the approved edit flow in the Android emulator at default light settings, including scroll, selector choices, draft changes, Save/Reset, Delete cancellation, and Operations & Widgets navigation. Dark-theme and zoom/font-scale checks are skipped at the user's direction.
5. Keep changes on a feature branch. Never merge the PR or publish a release autonomously.

## Relevant references

- `src/app/(app)/device/details.tsx`
- `src/components/device/DeviceForm.tsx`
- `src/app/(app)/device/add.tsx` (shared-form caller)
- `src/app/(app)/device/device.tsx` (read-only live-screen context)
- `docs/agent-guide/interface.md`
- `docs/agent-guide/validation.md`
- `docs/superpowers/plans/2026-10-19-data-source-details-homes.md`
- `.impeccable/surfaces/src-app-app-datasource-details-tsx.md`
