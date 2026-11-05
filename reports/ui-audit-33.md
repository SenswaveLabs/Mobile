# UI audit #33: Android overlay adaptation

Date: 2026-11-05. Base: `bbdb13a` on `next-dev`. Applied the native
`$impeccable adapt` workflow to A01, A02, A07, A08 and A28 from
[the original audit](ui-audit.md).

## Changes and verification

| Finding | Implementation and evidence |
| --- | --- |
| A01 | `src/components/ui/alert-dialog.tsx` keeps native footer actions vertical at every width; responsive horizontal actions are web-only. The account confirmation at 800 × 1000 dp has fully visible Cancel and Delete account targets, both 48 dp high. All shared dialog callers were inspected. |
| A02 | The shared overlay applies all four safe-area insets and bounds its content. `ConfirmDialog` delegates geometry to it, removing duplicate inset/height calculations. At 320 × 480 dp, Dark, 200% text, account/device/subscription confirmations retain both actions within the safe viewport, with scrollable descriptions. Action bounds meet the 48 dp minimum. |
| A07 | The preceding migration (`bbdb13a`) removed the small legacy Close/Clear controls. Native option modals and the icon sheet retain named 48 dp Close targets. The retired search/Clear control was not reintroduced. |
| A08 | The preceding migration already replaced module-time geometry with `useWindowDimensions`. Resizing the open virtualized palette from 320 to 448 dp at 130% text preserved four columns; cell widths changed from 62 to 94 dp and stayed within the sheet. Closing preserved `home-outline`. Existing tests cover the complete 318-key palette and exact/historical selections. |
| A28 | `src/components/common/SenswaveModal.tsx` no longer wraps the forms in a second keyboard-avoiding container. Each existing `KeyboardAwareScrollView` owns IME handling. At 320 × 480 dp, Dark, 130%, both operation-option and Radio-option inputs were fully visible above the keyboard. Native accessibility scroll/reveal exposed the complete Add option target above IME; native click accepted each in-memory option and returned once. |

Dialog handlers, permissions, opaque keys and accepted-mutation recovery were not
changed. The shared full-screen shell also accounts for lateral safe-area insets.
`AGENTS.md` and the interface guide record the shared ownership rules.
The account confirmation and its Cancel action were also checked at 448 dp,
Light, 100% text after a clean client start.

## Build and checks

- Node 26.12.1; frozen dependency versions and lockfile unchanged.
- Android prebuild and fresh x86_64 debug APK compilation succeeded. Installed
  `com.develite.senswave.nextdev`, versionCode `20261105`, on `emulator-5554`
  (Android 17 / API 37, target SDK 36).
- `pnpm typecheck`, `pnpm lint`, `pnpm test:poc`: passed.
- Complete existing suite, `pnpm exec node --test tests/*.test.mjs`: 646 passed.
- Independent review of the shipping component/documentation changes: no findings.

Native overlay probes used the production components with temporary, in-memory
fixtures and no backend writes. Fixtures, diagnostic code, screenshots, XML and
the native probe helper are excluded from the change. Emulator display changes
sometimes left stale measurements; stable probes required restarting the client
or emulator. Text scaling and display settings were restored after verification.

Not verified: TalkBack speech/focus restoration, reliable finger scrolling after
emulator display overrides, three-button navigation, physical devices/foldables,
iOS, release builds/other ABIs, backend mutations or hardware command delivery.
Native accessibility actions and handler tests do not establish those behaviors.
