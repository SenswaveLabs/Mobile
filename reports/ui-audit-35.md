# UI audit #35: contrast, read-only configuration and themes

Date: 2026-11-05. Base: `8e9d294` on `next-dev`. Applied
`$impeccable colorize` to A03/A10–A12 from [the original audit](ui-audit.md),
section 10, scope 4.

## Changes and evidence

| Finding | Implementation | Verification |
| --- | --- | --- |
| A03 | `RoomSelector` uses `authForeground` for Create room on the sheet surface. Existing permission, dismissal and navigation behavior is preserved. | Real Android pixels: `#1B1610` on `#F9F7F1`, **16.77:1** Light; `#EEEBE5` on `#211D16`, **14.10:1** Dark. Room-selector handler tests pass. |
| A10 | `OperationTile` retains B/N/I/T/HC/O and full type names, using `authForeground` on `authFieldBackground` instead of unrelated fixed backgrounds. Unknown and inherited-property names safely show `?`. | Real Number/HexColor rows use the same **16.77:1 / 14.10:1** pairs. The contrast regression exercises all six types and unknown/`__proto__`/`constructor` against both palettes, including the real ListRow disabled opacity: **4.59:1** Light and **5.77:1** Dark. Genuine disabled controls keep their treatment. |
| A11 | `OperationForm` details show label/value summaries using full foreground and native selectable text, following Widget details. Ordered JSON segments, Boolean mappings, numeric range/separator and option names/values are retained. Creation handlers, read validation, permissions, deletion/recovery children and their scroll ownership remain intact. | Native Number details show the exact topic, zero minimum and 100 maximum. Value pixels measure **16.77:1** Light and **16.30:1** Dark, replacing the audited dark 2.12:1 rendering. No editable input/selectors mount in details. Form regressions cover all six types, false, numeric/text zero, JSON order, omitted defaults, unlimited bounds, no writes and the footer. |
| A12 | `ThemeProvider` keeps an explicit override separate from System. Saved preference loads once; late reads and resets cannot replace newer choices. System derives from the current appearance, including after an awaited reset. Storage-read rejection is handled. | On the authenticated profile, System follows Android Dark; Light survives Light→Dark and Dark survives system Light. Original System preference was restored. Tests cover saved choices on mount, system transitions, unknown/null preferences, delayed initialization/reset and rejected reads. |

No backend contract, opaque key, dependency, production version or release workflow
changed. `AGENTS.md`, the UI/validation guides and `DESIGN.md` record the updated
presentation and theme rules. The theme regressions run in `pnpm test:poc`.

## Android verification

Built and installed a fresh x86_64 debug development APK on `emulator-5554`,
Android 17 / API 37, package `com.develite.senswave.nextdev`, versionCode
`20261105`. A stalled emulator/ADB connection required an AVD restart without
wiping its data. The final source was loaded after a clean Metro restart and
native app restart; login used the supplied test account and existing backend data.

Inspected Light/Dark native captures at 448 dp, measured full glyph/background
pixels, scrolled the room sheet to Create room and checked operation rows/details.
At 320 × 480 dp, Dark, 200% text, Number details wrap and scroll through their
configuration to the 60 dp Delete operation action inside the safe viewport.
No deletion was submitted. Resizing recreated the activity, so details were
reopened before taking the small-window evidence. Restored 1344 × 2992 px,
480 dpi, font scale 1.0 and system Light; account preference remains System.

No homes, devices, operations or widgets were created, modified or deleted, and no
MQTT commands were sent. Theme settings were changed reversibly for verification.
Screenshots, XML, logs, scripts, plans and exports remain under `/tmp`; none are
included in the PR. No temporary app route or context export was introduced.

## Checks and limits

- Node 26.12.1 / pnpm 12.8.1; frozen dependency installation and repository hooks.
- `pnpm typecheck`, `pnpm lint`, `pnpm test:poc`: passed; **112** POC tests.
- `pnpm test:device-details`: **248** passed.
- Final full suite, `pnpm exec node --test tests/*.test.mjs`: **669** passed.
- Production Android JavaScript export and x86_64 debug assembly/install: passed.
- Independent review found an inherited-property fallback defect; it was corrected
  with the compatible own-property check and explicit regressions. Disabled-row
  contrast was also checked before choosing the final surface role.

Native evidence covers the owner account, Number details and Number/HexColor list
markers; other typed summary branches and role gates are covered by handler tests.
Android's copy menu did not appear in the ADB long-press probes, so clipboard copy
is not established despite the native selectable-text prop. TalkBack speech/focus,
physical devices, iOS, native storage-failure timing, release tasks and other local
ABIs were not verified. This report resolves scope 4; it does not close the later
harden/layout/audit/polish scopes or certify the entire application.
