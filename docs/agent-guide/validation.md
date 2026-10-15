# Validation and completion

Start with the narrowest check that covers the change. Do not add a test framework
or rerun an expensive build for an unrelated documentation edit.

## Static and build checks

- Documentation-only changes: check relative links, preserved instructions and
  `git diff --check`.
- Non-trivial source changes: run `pnpm typecheck` and `pnpm lint`.
- Auth validation, route boundaries or submission behavior: run `pnpm test:poc`.
  Auth and reset checks execute their real forms with `tests/nativeComponentHarness.mjs`.
  Feedback checks distinguish field validation from action failures and verify
  legacy toasts cannot overlay redesigned routes, including after late responses.
  Dialog action checks execute the real label styling against both theme palettes,
  requiring at least 4.5:1 text contrast for Delete, Leave and Cancel in idle and pressed states.
  Data-source badge checks cover backend-state labels, updates after state changes,
  accessible status text and at least 4.5:1 contrast in both theme palettes.
- Home selection, joining, creation, settings, loading or recovery behavior: run `pnpm test:homes`.
  It executes real list, row and join form handlers with the same hook/host adapter,
  checking OTP native cell editing, paste/autofill, Backspace and focus progression, focus loads, pending/duplicate
  submissions, failed switches, row errors,
  list retries, invite validation/paste, action errors above Join home and navigation after
  acceptance or leaving the form. The recovery checks also execute the real home
  picker route without a current home and the provider's initializer, verifying
  failure cleanup and caller-owned feedback.
  Home-form checks cover name validation/normalization, synchronous submit locks,
  preserved drafts, initial/saved icons and coordinates, partial edit payloads,
  pending location requests, first-home activation recovery, local source/access errors,
  successful saves completed after blur, accepted-create recovery after refocus,
  name errors preserved while changing icons or locations,
  owner/member actions, unlink refresh failure, destructive confirmation locks
  and controlled AlertDialog cancellation without a deletion request,
  and recovery/invalidation after deletion or leaving, including late completion
  and a different current selection.
  Map checks cover address-only display, draft confirmation/cancellation, zero and
  negative coordinates, native longitude/latitude order, duplicate confirmation,
  late results after cancellation, load retry/timeout, failed native tile requests
  (including a misleading full-render event) and invalid native coordinates.
  These checks do not establish native rendering, keyboard or assistive-technology behavior.
- Before committing: run `pnpm typecheck`, `pnpm lint` and `pnpm test:poc`, plus
  the affected flow checks above.
- Native auth bundling, routing or asset changes: use the Android export checks in
  [native auth UI](../native-auth-ui.md).
- Native modules or Android build configuration: verify prebuild and the affected
  native build; see [Tooling](tooling.md). Use a development build when the changed
  module is unavailable in Expo Go.
- Shared API contracts: verify the backend build at `Senswave.sln` level.

CI verifies lint, types, auth/build tests, production Android JS export and ARM64
debug compilation on PRs. Gradle profiles are uploaded for timing analysis.
Validate release-only tasks and other supported architectures during release
verification. Production and private next-dev build profiles are unchanged.
Pushes and manual runs on `next-dev` also run the Android check to populate cache
for new PRs. After integration, verify a completed `next-dev` build followed by
a fresh PR restoring Gradle state from the base branch; rerunning an existing PR
only proves reuse within that PR.
Next-dev pushes can request an infrastructure version PR; all public jobs stay
on GitHub-hosted runners. A human merge in private infra starts the VPS build.
Production deployment and EAS remote version changes remain manual.
For this pipeline, run `pnpm test:build`, the private infra mobile tests, workflow
syntax checks and a local container/signing/download check when tools are available.
Report GitHub App, VPS and physical installation checks separately; local tests
do not prove that the external credentials, runner access or DNS are configured.

## Runtime checks

For user-facing changes, exercise the affected flow in a native development build
or emulator when available. Check navigation/Back, keyboard/scrolling, safe areas,
light/dark mode, text scaling and applicable loading, empty, success and error
states. Check screen-reader labels, focus order and usable touch targets.
For home location, pan/zoom the native map, confirm its center, cancel without
changing the draft and reopen settings with the saved location. Verify map
loading/retry and visible OpenStreetMap attribution. A JavaScript export cannot replace the native
MapLibre build and device check.

React Native Web previews can help check native component layouts with fixture
providers, but do not verify device safe areas, hardware Back or screen readers.
For auth/reset/join layout changes, check actions and first/last fields remain
reachable in the same scroll content, including with the keyboard open, short/tall
windows, both themes and normal/200% text. Exercise validation, duplicate submit,
pending and recovery. Handler tests do not prove native rendering or touch ordering.

Respect user instructions about tools and devices; do not restart verification
they have stopped. If a backend, device or tool is unavailable, report exactly
what remains unverified instead of claiming a pass.

## Handoff

Confirm the requested behavior, preserved API/application boundaries, relevant
checks and documentation updates. Report failures and any known limitations.
Notify on test failure and wait for human; never merge PRs autonomously. Keep
`next-dev` separate from `main` until integration is explicitly requested.
