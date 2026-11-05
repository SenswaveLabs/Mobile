# UI audit 32: native UI and feedback migration

Issue: [SenswaveLabs/Mobile#32](https://github.com/SenswaveLabs/Mobile/issues/32). Scope: **A09, A13, A31, A32** from [the pinned audit](ui-audit.md), sections 10–12. Work uses `$impeccable harden` and `$impeccable document` on a local branch based on `2a1653d2156f80ccbff043c37f589f104e422be0`, targeting `next-dev`.

## Changes and evidence by finding

| Finding | Implementation | Verification |
| --- | --- | --- |
| A09 | AGENTS.md, DESIGN.md and the interface, domain, repository and validation guides now require current native rendering on every route. Removed instructions requiring the old browser or default notifications. Data palettes are documented separately from presentation. | Icon and Automation tests expect the bottom sheet and exact keys. The complete source/dependency invariant rejects retired toast infrastructure, including future routes. |
| A13 | Removed ToastProvider and RootSiblingParent from the root, all production emitters and both dependencies from package.json and the lockfile. The old incorrectly themed renderer no longer exists. | Feedback tests exercise HTTP/session and account failures without consuming error bodies or dismissing the keyboard. Native local errors were inspected in Light and Dark. |
| A31 | IconSelector has one compact four-column BottomSheetSelect. Automation keeps all 318 global keys with a virtualized FlatList; Home/Device catalogs and Dashboard16/Radio15 stay separate. ConfirmDialog owns NativeModal, PortalHost and Reusables AlertDialog. Removed Dialog, modal/browser/default-control branches and unused tile previews. Text, Divider, Loading, Markdown and What's New use the current system. | All caller suites pass. Android screenshots cover 320/448/800 dp and 100/200% text. Actual drags scroll the dialog body while actions stay fixed. Cancel, hardware Back, historical-key cancellation and exact Airplane selection were exercised without backend writes. |
| A32 | Home distinguishes a confirmed 404 from failed/malformed reads, retains cached state, exposes local Alert/Retry and rejects late reads. Removed-home recovery preserves a previously selected different home. HTTP/User failures remain HttpResponse/Result values; operation and broker status errors have local owners. Dashboard snackbars and Home tile feedback remain scoped. | Feedback regressions cover no-cache error, confirmed empty, malformed cache retention, retry success, stale failures and removed-home recovery. Native fixtures exercise Retry and distinguish failed, cached and empty presentation. No route allowlist or unknown-route toast fallback remains. |

Shared backend payloads, opaque keys, permissions and accepted-once mutation handling are unchanged. The `silent` context options remain accepted for caller compatibility and never re-enable global feedback. The installed MarkdownDisplay remains; links use an underlined foreground role rather than an insufficient-contrast focus color.

Implementation commit: [4aca036](https://github.com/SenswaveLabs/Mobile/commit/4aca036a872a7a649773f04a1e84431cc54cb8a2). The evidence-only follow-up records that source revision and the capture hashes.

## Automated checks

Final implementation checks:

- `pnpm typecheck` and `pnpm lint`.
- `pnpm test:poc`: 106 passing tests.
- `node --test tests/*.test.mjs`: 646 passing tests, no failures or skips.
- Production Android JavaScript export with `pnpm exec expo export --platform android`.
- `git diff --check`.

The initial PoC run exposed 22 test-adapter failures because consent tests mounted the removed ToastProvider. Work stopped per AGENTS.md; the user authorized continuation. The adapter now exercises the real UserProvider with deferred HTTP and asserts local Result recovery. Final results supersede that failed run; the removed renderer was not restored to satisfy old tests.

An independent review found a regression in recovery after removing home A when home B was already selected. The initializer now retains B before I/O; a regression checks its rooms, source and lack of another `/current` read. The review's conflicting-documentation observations were also corrected.

## Android verification

Device: `emulator-5554`, installed native development client with Metro; no React Native Web. Settings used were 448 dp / 100% Light and Dark, 320 × 480 dp / 200% Light and Dark, and 800 × 900 dp / 200% Light and Dark. This is a targeted matrix, not every Cartesian combination of viewport, theme and text size.

The actual Automation create route was opened and its full palette scrolled through the last `trash-bin-outline` choice. Other destructive/error states use a temporary **Sample data** route importing the real shared controls and Home screen. Its confirmation callbacks change local state only. The What's New visual fixture copies the production JSX and replaces only its version/storage hook with local visibility; it does not change the account's seen-version storage. Home fixtures override context state to render failure, cached failure and confirmed-empty branches. Handler suites separately establish provider behavior and mutation guards.

The native dialog experiment found the decorative animated Pressable intercepted drags inside the body. Replacing it with a passive animated View preserves the native modal barrier and restores scrolling. Temporary measurements showed a 316 dp content body in a 178 dp viewport, followed by actual nonzero scroll offsets above 100 dp. The final screenshot shows the complete trailing warning, with Cancel/Delete still visible. Measurement callbacks, context export and fixture routes were removed before final checks.

Evidence is recorded in [the capture manifest](ui-audit-32/manifest.json). Numbered PNG/XML pairs preserve original captures. The fixture source and gesture measurements are included for reproducibility. Some development captures contain a SignalR LogBox message; LogBox is separate from the retired production RootToast. It was not reclassified as production feedback or hidden in production code.

Selected captures:

| State | Capture |
| --- | --- |
| Compact icon sheet, 448 dp Light | [01](ui-audit-32/01-icon-sheet-448-light.png) |
| Dialog before/after the gesture fix, 320 dp Dark/200% | [05 before](ui-audit-32/05-dialog-before-scroll-fix-320-dark-200.png), [06 scrolled after](ui-audit-32/06-dialog-scrolled-320-dark-200.png) |
| What's New, 320 dp Dark/200% | [07](ui-audit-32/07-whats-new-320-dark-200.png) |
| Home Retry, 320 dp Dark/200% | [08](ui-audit-32/08-home-retry-320-dark-200.png) |
| Dialog and palette, 800 dp/200% | [09 Light](ui-audit-32/09-dialog-800-light-200.png), [10 Dark](ui-audit-32/10-icon-sheet-800-dark-200.png) |
| Native input with IME, 448 dp Light | [13](ui-audit-32/13-native-input-ime-448-light.png) |

Restored emulator configuration: physical 1344 × 2992, density 480, no size/density override, font scale 1.0, night mode No, and Light theme. Keyboard and transient overlays were dismissed. No server-side device, subscription, home, automation or account-preference writes were made during native verification.

## Remaining verification limits

- TalkBack announcements, focus restoration and physical-device performance were not exercised. XML names/targets and handler tests do not establish those behaviors.
- Native destructive acceptance, broker/MQTT delivery, backend failure injection and every Home/Device/Dashboard/Radio caller under every theme/IME combination remain outside these native samples; their existing handler and permission suites passed.
- Native version-storage failure/release-onboarding behavior was not forced against the real account. The production What's New hook and version are unchanged.
- No local APK/ABI or release build was run. CI owns the ARM64 Android compilation; release checks remain manual.
- Other audit scopes, including remaining dialog adaptation, system-bar/theme behavior and role/TalkBack follow-up, remain separate work. This report does not close the entire audit queue.
