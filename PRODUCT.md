# Senswave Mobile Product

<!-- impeccable:product-schema 1 -->

## Platform

android

Android is the current delivery and design target. iOS is planned for later; its
existing scaffold does not establish release readiness or a delivery date.

## Users

DIY smart-home owners and household members are both core audiences. Configuring
a DIY system and controlling it in daily life have equal product priority.

Owners connect MQTT infrastructure, organize homes and rooms, define device
operations and dashboards, configure automations, and manage sharing. Household
members monitor their shared home and use the controls their permissions allow.

## Product Purpose

Senswave mobile lets people configure and operate DIY MQTT smart-home devices
from a native app. Users can monitor sensor values, control devices, and automate
supported operations through a Senswave backend.

Success means completing setup and everyday control confidently: understanding
the current home and connection state, finding the relevant device, performing a
permitted action, and recovering from failures without losing valid input or
repeating an accepted action.

## Positioning

Devices are configured through MQTT topics, typed operations, payload selectors,
and dashboard widgets. The same app supports building these integrations and
using their resulting controls, with shared-home permissions.

## Operating Context

- Setup involves a Senswave backend, MQTT data sources and topic subscriptions,
  homes, rooms, devices, operations, widgets, and automation conditions/results.
- Daily use involves selecting a home, finding a device, reading live values, and
  using its dashboard controls. SignalR delivers live updates from the backend.
- The native mobile experience supports light and dark themes. Optional home
  location uses a map picker; current-location lookup is optional.

## Capabilities and Constraints

- The app uses React Native, Expo, TypeScript, and Expo Router. Authentication,
  home selection, creation, and settings use local native React Native Reusables
  components. Implementation conventions remain in the repository guides.
- Authentication includes email/password, Google sign-in, registration, email
  confirmation, password recovery, and required legal consents. Remembered
  sessions use the existing secure on-device token storage.
- Homes contain rooms and devices and can be shared. `Display` permits viewing
  and acting; `Manage` additionally permits home configuration. Owner-only
  actions and backend authorization must remain intact.
- Devices expose typed operations and configurable per-device dashboards.
  Automations combine conditions and execute configured operation results.
- Device communication depends on the configured Senswave backend and MQTT data
  source. Live status and recovery must reflect actual connection/request state.
- Preserve API contracts, opaque backend Home/Device icon keys, permission
  behavior, saved configuration, and native authentication flows.
- iOS delivery timing and platform-specific work remain open decisions.

## Brand Commitments

The product name is Senswave. The existing Senswave web product at
`../next-frontend/apps/web` is the binding brand reference. Material Design 3
guides mobile interaction and hierarchy within that identity; the
[mobile UI policy](docs/agent-guide/interface.md) owns the detailed design rules.
Existing product copy is English.

## Evidence on Hand

The repository contains working routes, native UI, domain types, live-update
providers, and focused auth, home, icon, and build checks. The
[README](README.md) describes MQTT use cases; the
[domain guide](docs/agent-guide/api-and-data.md) records supported entities and
permission behavior. Existing app identity assets are in `src/assets`.

These materials establish implemented behavior, not user research, commercial
benchmarks, or testimonials. Future work must not invent such evidence or treat
handler checks as proof of native rendering or accessibility.

## Product Principles

1. Give DIY setup and everyday household control equal care.
2. Make the current home, live state, and next permitted action understandable.
3. Preserve user trust through clear pending, error, empty, and recovery states.
4. Keep configuration and permissions stable while improving mobile usability.
5. Respect native conventions and make essential actions reachable.

## Accessibility & Inclusion

Follow the mobile UI policy: native accessible names, roles and states; logical
screen-reader order; system text scaling; keyboard access where applicable;
WCAG AA contrast; effective touch targets of at least 48 × 48 dp; and reduced
motion. Meaning must not depend on color alone. Required actions must remain
reachable with the keyboard open and on small windows.
