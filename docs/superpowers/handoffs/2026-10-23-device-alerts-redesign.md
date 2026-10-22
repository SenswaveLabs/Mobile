# Device Alerts Redesign Handoff

The three redesigns are integrated on `feat/mobile-creation-alerts`, based on `origin/next-dev` at `9cda69f`. This branch is prepared for one aggregate PR targeting `next-dev`.

## Change

Device action failures can use an opt-in compact presentation in `src/components/ui/alert.tsx`. `SwitchDeviceTile` and `ControlDeviceTile` use it for Switch, Slider and Options errors. The default Alert card remains available to existing callers. Changes are visual only; `useDeviceTileAction`, command handling and API payloads are unchanged.

The compact Alert root no longer forces full width. The default Alert branch is unchanged. Grid and list presentation checks now cover the compact Alert, description layout and 12 dp feedback placement; the UI guide records the compact device-error rule.

Compact descriptions inherit the full semantic destructive color to preserve contrast on dark tiles. Review measured the prior translucent color at 4.4973:1 (`#E94D4C` on `#211D16`); compact mode now uses the full theme color `#FF5252` (5.2562:1). Two regression assertions cover the compact color behavior. The existing noncompact Alert description styling remains unchanged.

## Validation

- **Combined automated checks:** Node 26.10.0 and pnpm 12.8.1. `pnpm typecheck` passed; `pnpm lint` passed (244 files); `pnpm test:dashboard` passed (43/43); `pnpm test:poc` passed (30/30); `pnpm test:device-details` passed (35/35); `pnpm test:data-sources` passed (37/37); `git diff HEAD --check` passed.
- **Independent review:** Sol 6.1 final disposition: Ship. No open code or material findings. Report: `.impeccable/review/device-alerts-2026-10-22/finish-review.md`.
- **Aggregate review:** Sol 6.1 Max reviewed combined creation saves, pending/accepted/focus guards, shared-form compatibility, headers/toast unions and regression coverage. No material findings. Native integration runtime was not rerun as part of this review.
- **Native verification:** Passed. Six PNG captures cover Grid and List in light and dark at font scale 1.0, plus cold font-scale 1.3 Grid-light and List-dark. All three recovery messages are fully visible without clipping, Slider retains its 14% readout, and the large-text grid falls back to one column. The capture manifest validation passed for exactly six images, each with the current `alert.tsx` source SHA-256. Three error states were injected through hook state in memory; each capture reports `sendCalls: 0` and `blockedRequests: 0`.
- **Native setup:** Android emulator `emulator-5554` (`Pixel_9_Pro_XL_Virtual`), Metro on port 8083. The large-text states were captured after a cold process start at system font scale 1.3.
- **Unverified scope:** Native evidence is limited to this Android phone emulator fixture. Physical hardware, TalkBack, direct touch interaction, authenticated dashboard flows and other device classes were not verified.

## Evidence and docs

No raster assets were added to the app. Review captures and their provenance manifest are in `.impeccable/review/device-alerts-2026-10-22/`; the user JPEG there is a pre-existing reference copy. `DESIGN.md` and the local `.impeccable/design.json` sidecar record the incumbent system and compact alert. The sidecar and review evidence remain local and ignored by the existing `.gitignore` policy.

## Handoff

The integrated changes are prepared for one aggregate PR from `feat/mobile-creation-alerts` to `next-dev`. Do not merge autonomously.
