---
version: 1
slug: "src-app-app-datasource-details-tsx"
primary_target: "src/app/(app)/dataSource/details.tsx"
related_targets:
    [
        "src/components/dataSource/sections/DataSourceDetailsSection.tsx",
        "src/components/dataSource/brokers/BrokerClient.tsx",
        "src/components/dataSource/subscriptions/BrokerSubscriptions.tsx",
        "src/components/dataSource/DataSourceForm.tsx",
        "src/app/(app)/home/details.tsx",
        "src/components/home/HomeForm.tsx",
        "src/components/homeSharing/HomeSharingList.tsx",
    ]
---

# Data Source details

Mode: Operate. Scope: the native Android Data Source details route and its Overview and Settings panels. Audience: DIY owners monitoring and configuring an MQTT broker. Existing broker contracts, credentials verification, topic subscriptions, linked start/add routes and permission behavior remain authoritative.

## Direction contract

THESIS: Understand broker health and take the next action immediately. Overview groups operation and topics; Settings gives configuration a focused, keyboard-aware page.

OWN-WORLD: Preserve Senswave's warm themed canvas, amber primary actions, native system type, existing status badge and local Reusables controls. Keep related content open on the themed canvas; use headings and spacing instead of filled or rounded containers. Keep subscription and sharing rows flat, with quiet separators and the shared 48 dp touch floor.

STORY: Identify the broker, read its actual connection state, start/stop/restart when permitted, then inspect or change subscriptions. Switch to Settings to edit connection parameters; Save is the sole primary action and Delete remains separate and confirmed. Recover from errors without losing the draft.

FIRST VIEWPORT: Native Back header above the broker name and endpoint; real React Native Reusables underline tabs for Overview and Settings. Overview leads with broker identity and visible labeled client controls, followed by plain subscription rows on the same gutter and a compact Add action beside the heading. Settings shows an open Connection section with Save 16 dp below it in the same scroll content. Delete is a separate confirmed action 24 dp farther down.

FORM: Settings uses standard selected-value fields for TLS and MQTT version. Each opens a bottom-attached sliding selector with a named dismiss action and selected option. TLS stays boolean and MQTT stays its opaque `MqttVersion` through submission. Topics remain selectable and wrap; each remove icon keeps a named 48 dp target. Native pressed states; no decorative motion. Narrow screens and large text wrap controls and data; constrain the content measure on wider screens. Both themes follow app settings.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Verification and boundaries

Use existing native component harness for meaningful save, duplicate-action, retry, client-state, selector and deletion checks. Run typecheck, lint and test:poc; run affected source checks and existing shared form caller checks. Capture native phone light/dark and large text when the installed development client permits it. The Tabs primitive uses exact `@rn-primitives/tabs@1.5.2`; no backend contract changes, invented session metrics or production releases. Existing missing global DESIGN.md is pre-existing documentation drift; this local screen redesign preserves the product's established visual system.

## Delivery evidence

Sol 6.1 Max reviewed the implementation and scored all four reported fixes resolved at code/spec/static scope. Documentation audit confirmed the inherited tokens, primitives and guide claims. Typecheck, lint, all 132 handler/build tests and the production Android JavaScript export passed. No raster assets or global design-system changes were introduced. Native rendering, keyboard, Back, TalkBack and live MQTT behavior remain unverified; this verdict grants no native visual approval.

### Follow-up — 2026-10-16

This bounded polish aligned Overview and Settings gutters, tightened client controls into a wrapping row, clarified subscription hierarchy, retained long topics without truncation, and added native pressed feedback. API, copy, navigation and save/delete behavior stayed unchanged. Callback-styled tabs and radio choices bypass NativeWind CSS interop so their native inline styles render correctly.

Typecheck and lint passed; `test:poc` passed 30/30 and `test:data-sources` passed 15/15. Sol's scoped source review found no issues. On Pixel 9 Pro XL (Android 17/API 37), light mode at default font scale and dark mode at 1.3 system font scale confirmed the tabs and radio choices render with 48 dp touch targets, and the client row and headings fit. In Settings, an unsaved Name draft displayed its verification fields; Save and Reset stayed reachable with the keyboard open, Reset restored the saved value, and hardware Back dismissed the keyboard while Settings stayed open. System font scale 1.0 and night mode off were restored after the check.

The local API served details and client status, while subscriptions returned 404 with an error and Retry action. A successful subscription list and live MQTT actions remain unverified; no server mutations were made. TalkBack was not checked.

The preceding follow-up records the original polish and its verification as historical evidence. The user-directed revision below replaces its filled tabs, radio choices and Reset action.

### User-directed revision — 2026-10-16

Overview and Settings now use the local React Native Reusables Tabs primitive with transparent 48 dp triggers and a quiet underline; both panels stay mounted across tab changes. TLS and MQTT use selected-value fields with native sliding bottom sheets. Reset was removed; Save is the only primary action and Delete is visually separated below it. Subscriptions use plain hairline-separated rows, with Add beside the heading and wrapped selectable topics. Removal keeps its confirmation, pending state and accessible 48 dp icon target. API values, credential verification, navigation, client lifecycle and mutation handlers remain unchanged.

Fresh checks on Node 26.10.0 passed: `pnpm typecheck`, `pnpm lint`, `pnpm test:poc` (30/30), `pnpm test:data-sources` (24/24: 15 data-source behavior and 9 selector interaction tests), and `git diff --check`. Sol 6.1 accepted the final source and supplied light/default, dark/1.3, and 320 dp/200% native captures with no defects.

On Pixel 9 Pro XL (Android 17), light/default and dark/1.3 checks confirmed 48 dp tab, Add and remove targets, plus 52 dp selector fields. Selector choices worked; hardware Back cancelled without changing values. Switching tabs preserved the mounted draft, Save and Delete stayed reachable with the keyboard open, and cold launch restored saved server values. At 320 dp/200%, tabs and Add fit, subscription rows wrapped, Save/Delete remained reachable by scrolling, and both sheets fit their labels and options. Native XML confirmed 48 dp tab/Close targets, 61+ dp option rows and the current option checked. No server settings, broker lifecycle actions or subscriptions were mutated. TalkBack, tablet/orientation and live MQTT lifecycle remain unverified. Device was restored to 1344x2992, font scale 1.0 and night mode off.

### Follow-up — 2026-10-18

This record describes the preceding implementation and its bounded verification. The user-directed correction below supersedes its spacing, current-home label and list presentation claims; its native checks do not verify the corrected UI.

Home selection uses 16 dp gutters, a 24/32 dp title, 14/20 dp description and a wrapping Create/Join footer. Home details remains a separate 48 dp link aligned with the selected home identity. Home Details and Data Source keep open content on the themed canvas with 16 dp outer gutters and 24 dp between major sections. Source names wrap before connection status; Open remains outlined and Unlink keeps a quieter red label. Sharing and subscription rows use quiet hairline separators, with 48 dp removal targets and wrapping content. Data Source Overview separates broker identity from client controls by 16 dp and Subscriptions by 24 dp. Section headings use 20/28 dp; Connection is 24/32 dp, with Client name and Port sized 2:1 when they fit. Settings fields use 16 dp gaps, Save sits 16 dp after the group and Delete sits separately 24 dp later. The keyboard-aware scroll content has no section gap; spacing lives in its product content so the generated keyboard spacer stays clear. Shared Input and selector labels use 20 dp line height with the existing 8 dp Input label gap. API values, routes, request guards and form state behavior remain unchanged.

Fresh checks on Node 26.10.0 passed: `pnpm typecheck`, `pnpm lint`, `pnpm test:poc` (30/30), `pnpm test:homes` (57/57), `pnpm test:data-sources` (24/24), and `git diff --check`. Sol 6.1 reviewed the source and five light/default native captures from the Android 16/API 36 emulator at 1080×2400. The review found one 8 dp Home details link offset, corrected in source while retaining its 48 dp target; typecheck, lint and diff checks passed after that correction.

Applying Android theme/font settings reset the development client's temporary login before variant or interaction checks completed. The welcome-screen capture is excluded from visual evidence. Original display size, font scale 1.0 and light mode were restored. Final native confirmation of the link alignment, keyboard reachability, selector cancellation and draft retention await sign-in. Responsive checks remain stopped following the user's earlier direction. TalkBack and live mutations were not checked; no broker, subscription, home or access settings were changed.

### User-directed correction — 2026-10-18

All vertical entity lists now share the native `ListRow` geometry: flexible 16/24 dp titles, 14/20 dp supporting text, minimum 72 dp rows and quiet hairline boundaries between sibling rows. Selected Home has an amber outline and checkmark; its “current home” identification stays accessible, while Details is a separate 48 dp sibling action. Create/Join stays in scroll content and grows to the bottom for short lists. Home settings, Sharing, Broker client, Subscriptions and Connection use `ContentSection` with a 48 dp title row, 2 dp title-to-helper spacing, 8 dp header-to-content/action spacing and 40 dp of open major-section whitespace. Existing status, errors, dialogs, guards, permissions, routes and API values remain with their original handlers. Form previews, grids and live controls keep their existing presentation.

Fresh checks on Node 26.10.0 passed: `pnpm typecheck`, `pnpm lint`, `pnpm test:poc` (30/30), `pnpm test:homes` (58/58), `pnpm test:data-sources` (24/24), and `git diff --check`. Sol 6.1 reviewed the shared components and the final core native captures and accepted the correction with no remaining material findings. The native review used the Android 16/API 36 emulator at its existing 1080×2400 resolution, density 420, font scale 1.0 and light theme. The updated client was reconnected to Metro in the existing worktree, and the user signed in again before the final captures.

### User-directed section treatment — 2026-10-18

Major sections keep 40 dp of open whitespace between them and have no horizontal divider. Hairline rules remain part of the list styling; the last Sharing row and the single Home data-source row omit the bottom rule before the next section. This refines the section treatment above while keeping the shared title-row and content spacing. Typecheck, lint and the diff check passed again after this presentation-only adjustment.

Final native captures confirmed the Home selection frame and checkmark without a visible Current home label, its separate Details action, the bottom-aligned Create/Join footer, and the Home Details and Data Source sections without divider lines. Native XML confirmed selected-home semantics and 48 dp action targets. Data Sources and App Info also rendered the shared list rows. The Widgets route opened, but the selected device had no operations, so populated widget and operation rows were not visually exercised. AutomationList remains unreachable through the existing, commented-out route and was reviewed in source only.

Current evidence is saved outside the repository in `/tmp/senswave-polish-20261018/final-*.png` and matching XML captures. Responsive checks remain stopped at the user's direction; no display or theme settings were changed during this correction. Keyboard, selector cancellation, draft retention, TalkBack and live mutations were not rechecked for this correction. No broker, subscription, home or access settings were changed.

### User-directed list boundaries — 2026-10-18

The shared row previously drew a bottom separator by default, including after the final Other homes item. `ListRow` and its tile wrappers now default to no separator. Each owning list enables the rule only when another sibling follows; widget lists calculate this within each group. Single-item lists and operation group headers have no rule. The selected Home's amber outline remains independent of list separators.

Sol 6.1 reviewed every shared-row owner and found no boundary misses. Fresh `pnpm typecheck`, `pnpm lint` and `git diff --check` passed on Node 26.10.0. The unchanged Android emulator confirmed one line between the two Other homes rows and none after the final row, with the selected Home outline retained. Current evidence is `separator-homes-confirmed.png` and matching XML in `/tmp/senswave-polish-20261018`; earlier Homes captures retain the superseded closing rule. Other lists received source review only, and test suites were not rerun for this presentation-only adjustment. No display settings or server data changed.
