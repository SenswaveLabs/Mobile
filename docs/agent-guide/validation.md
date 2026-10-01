# Validation and completion

Start with the narrowest check that covers the change. Do not add a test framework
or rerun an expensive build for an unrelated documentation edit.

## Static and build checks

- Documentation-only changes: check relative links, preserved instructions and
  `git diff --check`.
- Non-trivial source changes: run `pnpm typecheck` and `pnpm lint`.
- Auth validation or route boundaries: run `pnpm test:poc`.
- Before committing: run all three commands above, as required by the repository.
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

Respect user instructions about tools and devices; do not restart verification
they have stopped. If a backend, device or tool is unavailable, report exactly
what remains unverified instead of claiming a pass.

## Handoff

Confirm the requested behavior, preserved API/application boundaries, relevant
checks and documentation updates. Report failures and any known limitations.
Notify on test failure and wait for human; never merge PRs autonomously. Keep
`next-dev` separate from `main` until integration is explicitly requested.
