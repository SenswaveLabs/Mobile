---
version: 1
slug: "src-app-app-datasource-details-tsx"
primary_target: "src/app/(app)/dataSource/details.tsx"
related_targets: ["src/components/dataSource/sections/DataSourceDetailsSection.tsx","src/components/dataSource/brokers/BrokerClient.tsx","src/components/dataSource/subscriptions/BrokerSubscriptions.tsx","src/components/dataSource/DataSourceForm.tsx"]
---

# Data Source details

Mode: Operate. Scope: the native Android Data Source details route and its Overview and Settings panels. Audience: DIY owners monitoring and configuring an MQTT broker. Existing broker contracts, credentials verification, topic subscriptions, linked start/add routes and permission behavior remain authoritative.

## Direction contract

THESIS: Understand broker health and take the next action immediately. Overview groups operation and topics; Settings gives configuration a focused, keyboard-aware page.

OWN-WORLD: Preserve Senswave's warm themed canvas, amber primary actions, native system type, existing status badge and local Reusables controls. Use flat sections, quiet separators, 8 dp controls and the shared 48 dp touch floor.

STORY: Identify the broker, read its actual connection state, start/stop/restart when permitted, then inspect or change subscriptions. Switch to Settings to edit connection parameters; save or reset explicitly and recover from errors without losing the draft.

FIRST VIEWPORT: Native Back header above the broker name and endpoint; an accessible Overview/Settings tab row. Overview leads with a compact connection section and visible labeled client controls, followed by subscriptions and Add subscription. Settings shows grouped connection fields with actions in the same scroll content. Delete is a separate confirmed action.

FORM: Overview plus Settings, grounded candidate 5, seed 586edd5d; selected explicitly by the user. Code-led implementation. Signature interaction: state-aware client controls and stable inline save/pending/error feedback. Native pressed states; no decorative motion. Narrow screens and large text wrap controls and data; constrain the content measure on wider screens. Both themes follow app settings.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Verification and boundaries

Use existing native component harness for meaningful save, duplicate-action, retry, client-state and deletion checks. Run typecheck, lint and test:poc; run affected source checks and existing shared form caller checks. Capture native phone light/dark and large text when the installed development client permits it. No new dependencies, backend contract changes, invented session metrics or production releases. Existing missing global DESIGN.md is pre-existing documentation drift; this local screen redesign preserves the product's established visual system.

## Delivery evidence

Sol 6.1 Max reviewed the implementation and scored all four reported fixes resolved at code/spec/static scope. Documentation audit confirmed the inherited tokens, primitives and guide claims. Typecheck, lint, all 132 handler/build tests and the production Android JavaScript export passed. No raster assets or global design-system changes were introduced. Native rendering, keyboard, Back, TalkBack and live MQTT behavior remain unverified; this verdict grants no native visual approval.
