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
    ]
---

# Data Source details

Mode: Operate. Scope: the native Android Data Source details route and its Overview and Settings panels. Audience: DIY owners monitoring and configuring an MQTT broker. Existing broker contracts, credentials verification, topic subscriptions, linked start/add routes and permission behavior remain authoritative.

## Direction contract

THESIS: Understand broker health and take the next action immediately. Overview groups operation and topics; Settings gives configuration a focused, keyboard-aware page.

OWN-WORLD: Preserve Senswave's warm themed canvas, amber primary actions, native system type, existing status badge and local Reusables controls. Use flat sections, quiet separators, 8 dp controls and the shared 48 dp touch floor.

STORY: Identify the broker, read its actual connection state, start/stop/restart when permitted, then inspect or change subscriptions. Switch to Settings to edit connection parameters; Save is the sole primary action and Delete remains separate and confirmed. Recover from errors without losing the draft.

FIRST VIEWPORT: Native Back header above the broker name and endpoint; real React Native Reusables underline tabs for Overview and Settings. Overview leads with a compact connection section and visible labeled client controls, followed by plain subscription rows and a compact Add action beside the heading. Settings shows grouped connection fields with Save in the same scroll content. Delete is a separate confirmed action.

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
