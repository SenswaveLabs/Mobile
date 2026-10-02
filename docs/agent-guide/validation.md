# Validation and completion

Start with the narrowest check that covers the change. Do not add a test framework
or rerun an expensive build for an unrelated documentation edit.

## Static and build checks

- Documentation-only changes: check relative links, preserved instructions and
  `git diff --check`.
- Non-trivial source changes: run `pnpm typecheck` and `pnpm lint`.
- Auth validation, route boundaries or reset submission behavior: run `pnpm test:poc`.
  The native reset check executes its real form with `tests/nativeComponentHarness.mjs`.
- Home selection, loading or recovery behavior: run `pnpm test:homes`. It executes
  real list and row handlers with the same hook/host adapter, checking focus loads,
  pending/duplicate switches, failed switches, row errors and list retries.
  These checks do not establish native rendering, keyboard or assistive-technology behavior.
- Before committing: run `pnpm typecheck`, `pnpm lint` and `pnpm test:poc`, plus
  the affected flow checks above.
- DOM bundling, routing or asset changes: use the export checks in the
  [auth PoC](../shadcn-dom-poc.md).
- Native modules or Android build configuration: verify prebuild and the affected
  native build; see [Tooling](tooling.md). Use a development build when the changed
  module is unavailable in Expo Go.
- Shared API contracts: verify the backend build at `Senswave.sln` level.

CI only verifies lint, types and the Android release build. Do not add publishing,
production deployment or remote version changes to verification workflows.

## Runtime checks

For user-facing changes, exercise the affected flow in a native development build
or emulator when available. Check navigation/Back, keyboard/scrolling, safe areas,
light/dark mode, text scaling and applicable loading, empty, success and error
states. Check screen-reader labels, focus order and usable touch targets.

For DOM UI, a browser preview can verify DOM semantics and layouts. Mock bridge
callbacks cannot verify native integration or real API responses; report the
boundary of the check. Do not label a browser preview as a phone screenshot.
React Native Web previews can help check native component layouts with fixture
providers, but do not verify device safe areas, hardware Back or screen readers.

Respect user instructions about tools and devices; do not restart verification
they have stopped. If a backend, device or tool is unavailable, report exactly
what remains unverified instead of claiming a pass.

## Handoff

Confirm the requested behavior, preserved API/application boundaries, relevant
checks and documentation updates. Report failures and any known limitations.
Notify on test failure and wait for human; never merge PRs autonomously. Keep
`next-dev` separate from `main` until integration is explicitly requested.
