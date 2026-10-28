# Direct dashboard placement

The dashboard is an Operate surface and retains Senswave's existing native visual
system. The grid must be visible without a setup click. A free-cell tap opens
widget choice immediately; selection opens a focused canvas with drag-to-move,
tap-to-move and corner-to-resize. One Add widget action commits the valid draft.

The old inline Height/Width controls and placement mode are removed. Owners and
managers configure placements; every role retains viewing and live controls.
Device and Dashboard settings become compact standard section actions so the
mobile header leaves more room for the canvas.
The existing PUT endpoint adds a placement and rejects already placed widget IDs;
this change excludes those IDs and edits only the unsaved draft. It introduces no
backend or dependency changes. Existing unlink confirmation remains separate.

Implementation reaches GridDashboardView, the placement route, the shared widget
picker, a native WidgetPlacementCanvas and validated gesture geometry helpers.
Guards retain routed identity, management permission, pending locks, inline errors
and accepted-once return recovery.

Validation: required types/lint/auth checks, focused geometry/route/picker checks,
and Android visual/touch checks at 320 dp dark and 448 dp light. Text enlargement
and TalkBack are excluded at the user's request. Do not send physical device
commands while checking this editor.

## Completed verification

- Typecheck, lint and production Android/Hermes export passed.
- `pnpm test:poc`: 43/43; `pnpm test:device-details`: 154/154.
- Android emulator: visible grid, immediate picker, native move and resize to 2×2,
  handle visibility, accepted placement, cancellation and confirmed unlink.
- Current editor inspected at 320 dp Dark, dashboard at 448 dp Light. Temporary
  Display widget and placement removed; System theme and physical viewport restored.
- Text enlargement and TalkBack excluded. No physical device commands sent.
- The previously reported optional `test:icons` import failure in Device details
  (`expo-secure-store/build/ExpoSecureStore`) is outside this placement change.
