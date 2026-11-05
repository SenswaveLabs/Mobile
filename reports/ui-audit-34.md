# UI audit #34: navigation and read hardening

Date: 2026-11-05. Base: `08d4c27` on `next-dev`. Applied `$impeccable harden`
to A04–A06 from [the original audit](ui-audit.md), section 10, scope 3.

## Changes

| Finding | Implementation and regression evidence |
| --- | --- |
| A04 | Home mounts the shared native `ConfirmDialog` around every content state. Hardware Back opens Exit while loading, without a home, after a read failure and with a home. Cancel/Back dismisses it; blur clears it. `homeSharing.test.mjs` covers each branch and Exit. |
| A05 | Invitations require one nonempty routed ID matching the current owned home. Submission and delayed feedback are bound to route/home/permission/focus. Accepted invitations capture home ID/name, email and role; success and clipboard use that snapshot. POST acceptance is latched before reading the code, so missing/malformed JSON cannot repeat the write. `homeSharing.test.mjs` covers rename, stale callbacks/responses, duplicate submission, copy and accepted-code recovery. |
| A06 — devices | Display/live/action responses validate matching identity and consumed fields before changing reported values or cache. The cache updater rejects malformed and previous-home updates; retained `refreshDevice` callbacks still work after initialization. Dashboard/action tests cover invalid bodies, retained cache/value, guarded updates and recovery. |
| A06 — preview | Device forms validate operation identity, supported tile type, configuration, numeric range and option names. An unavailable preview leaves the edit form intact with local Retry. `deviceDetails.test.mjs` covers malformed/incompatible operations and a later valid read without changing the draft or exact option names. |
| A06 — widgets | Widget initialization validates consumed operation configuration and Button/Radio/Slider/Display configuration before exposing forms. Invalid reads remain in local load recovery. `widgetDetails.test.mjs` covers null options, malformed bounds/fields, matching IDs and later valid values. |
| A06 — brokers | Broker details validate exactly one routed ID and all consumed settings fields before mounting panels. Subscription reads validate collection and row shapes, preserve cached current-broker rows beside local Retry and hide previous-broker rows. Pending reads block deletion; accepted deletion invalidates an overlapping older read so removed rows cannot return. `dataSourceDetails.test.mjs` covers malformed reads, identity, GET-only recovery and both read/delete request orders. |

Opaque IDs, icon keys, typed option values and API payload contracts are preserved.
No backend contract, dependency, release workflow or production version changed.
The affected agent guides and `AGENTS.md` document these boundaries.

## Android verification

A fresh x86_64 development APK was built and installed on `emulator-5554`
(Android 17 / API 37), package `com.develite.senswave.nextdev`, versionCode
`20261105`. The final app was reloaded from a clean Metro start with the next-dev
profile after removing every temporary fixture.

The emulator was signed out. Recovery probes therefore used the production native
components with temporary context providers and in-memory HTTP responses, without
backend writes:

- Home: visible exit confirmation in no-home, loading and read-error states;
  Cancel and Android Back dismiss it. Light/Dark checked at 448 dp. At
  320 × 480 dp, Dark, 200% text, Cancel and Exit remain inside the viewport with
  60 dp targets. Exit returns to the Android launcher.
- Invitation: keyboard Go submits; switching to another home before acceptance
  suppresses the obsolete code and shows local identity guidance. A successful
  same-home invitation displays its captured Home A identity and code.
- Display: malformed live data preserves 21 °C and cache with local feedback;
  a later valid read displays 22 °C and clears the error. A malformed Switch
  command response restores Off, preserves cache and shows its local error.
- Widget: malformed Options entries keep the form unmounted with Retry;
  a valid read mounts the native Button/Options fields.
- Device preview: invalid configuration leaves the full edit form available.
  Native scrolling reaches Retry preview, which restores the preview.
- Broker: malformed details show local Retry; a valid read mounts the panels.
  Malformed subscriptions have their own Retry, which restores the topic row.

Display size and text scaling were restored. Temporary routes, context exports,
fixture scripts, screenshots, XML, logs and plans are excluded from this PR.

## Checks and limits

- Node 26.12.1, pnpm 12.8.1; frozen dependency installation.
- `pnpm typecheck`, `pnpm lint`, `pnpm test:poc`: passed.
- `pnpm exec node --test tests/*.test.mjs`: 663 passed.
- Production Android JavaScript export and x86_64 debug build: passed.
- Independent review found one subscription read/delete race; its correction and
  both request-order regressions were reviewed again, with no remaining important
  findings.

Not verified: authenticated backend mutations, real MQTT/hardware delivery,
TalkBack speech/focus, native clipboard completion, physical devices, iOS,
release tasks or other ABIs. Native fixtures prove rendering and recovery for the
injected responses; they do not establish production service behavior. These
changes address scope 3 and do not close the remaining audit scopes.
