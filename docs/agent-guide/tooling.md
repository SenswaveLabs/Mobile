# Tooling, builds and releases

## Commands

```bash
pnpm install --frozen-lockfile # install deps
pnpm android                  # first build (compiles native code)
pnpm start --dev-client       # subsequent runs (dev server)
pnpm typecheck                # TypeScript check
pnpm lint                     # Oxlint and Oxfmt checks
pnpm fix                      # Oxlint and Oxfmt fixes
pnpm hooks:install            # enable local pre-commit formatting
pnpm test:poc                 # native auth validation, submissions, route boundaries and reset behavior
pnpm test:data-sources        # broker details, settings and subscription actions
pnpm test:homes               # home selection, joining, creation, settings, maps and recovery
pnpm test:dashboard           # home dashboard filtering, recovery and device-tile controls
pnpm test:build               # separate next-dev identity and Android version-code validation
pnpm test:icons               # Home/Device catalogs, selectors, glyphs and submission keys
```

- Run `pnpm typecheck`, `pnpm lint`, and `pnpm test:poc` before committing.
- Use pnpm only; commit `pnpm-lock.yaml`. Keep all `dependencies` and `devDependencies` versions in `package.json` exact; `saveExact` applies this to future additions. Project pnpm settings live in `pnpm-workspace.yaml`; keep its existing build approvals. The local `expo-dev-launcher@6.0.21` patch is tracked in `patches/` and initializes error-screen services before actions run.
- Dev URL override: `ConfigurationProvider.overrideUrl(url)` — only when `EXPO_PUBLIC_ENVIRONMENT=Development`.
- Prereqs: Node.js **26.10.0** (`.nvmrc`), **pnpm 12.8.1** (`packageManager`), Android Studio + Java 17. Expo CLI comes from project dependencies.

TypeScript checks `src/**/*.ts`, `src/**/*.tsx` and the root environment declarations.
Generated analysis snapshots such as `graphify-out/` stay outside that scope.

Oxlint and Oxfmt ignore the generated `android/**` directory so production
bundles are not re-linted after a native build. Source files remain covered by
`pnpm lint`.
The pre-commit hook runs `pnpm fix` across the whole repository. Run
`pnpm hooks:install` once per clone to enable it.
Launch backgrounds in `app.json` match the shared canvas: light `#F9F7F1`, dark
`#100D08`. Splash/adaptive-icon changes require prebuild and a new native build;
a JavaScript reload updates in-app colors but not an installed splash screen.

The JavaScript entry is `index.js`, not `expo-router/entry`. It registers
`src/App.tsx`, which supplies Expo Router's route context, `Head.Provider` and the
root optimistic-action wrapper. Keep that path in local and production exports;
entry-point changes require restarting Metro and reloading the app. This wrapper
uses existing React/Expo APIs and does not add a native-module build requirement.
See [Repository and conventions](repository.md) for its Suspense placement.

When changing shared mobile/backend contracts, build `Senswave.sln`. If the mobile
development app uses the Docker API, rebuild and recreate that API service after
backend changes; restarting the existing image does not include source changes.
Verify the running service is healthy before checking the mobile flow.

Home maps use `@maplibre/maplibre-react-native` 11 and its Expo plugin in `app.json`.
Adding or updating this module requires prebuild and a new development client:
`pnpm exec expo prebuild --platform android --no-install`, then `pnpm android`.
Expo Go cannot render this native map. The picker uses the same OpenStreetMap
raster source as web, with visible contributor attribution and a Senswave User-Agent.
It relies on MapLibre's native HTTP cache and offers no offline download or prefetch
feature. Public tiles follow the [OpenStreetMap tile policy](https://operations.osmfoundation.org/policies/tiles/)
and have no availability guarantee; select a suitable hosted provider before scaling
traffic beyond normal interactive use. Expo web shows a fallback and retains GPS.

## Environment variables

| Variable | Description | Template default |
|----------|-------------|------------------|
| `EXPO_PUBLIC_ENVIRONMENT` | `Development` or production | `Development` |
| `EXPO_PUBLIC_SENSWAVE__API__URL` | Backend base URL | `http://10.0.2.2:8080` (Android emulator) |
| `EXPO_PUBLIC_API_GOOGLE_CLIENT_ID` | Google OAuth client ID | — |
| `EXPO_PUBLIC_MINIMAL_API_VERSION` | Minimum compatible API version | `1.0.0` |
| `EXPO_PUBLIC_CONTACT_EMAIL` | Support email shown in app | `contact@senswave.net` |

## Build, CI, versioning

**EAS profiles**

| Profile | Distribution | Android | Notes |
|---------|--------------|---------|-------|
| development | internal | APK | Dev client enabled |
| localpreview | internal | APK | Extends `preview` |
| preview | internal | — | Auto-increments version |
| production | store | — | Auto-increments version; manual only |

**GitHub workflows**

| Workflow | Trigger |
|----------|---------|
| `build.yaml` | PRs to `next-dev`: lint, types, auth/build tests, production Android JS export and ARM64 debug compilation on GitHub-hosted runners. Pushes or manual runs on `next-dev`: quality checks, then the same Android build to seed cache and an independent infrastructure release PR request. |

New UI changes live on `next-dev`. Verification jobs read Node from `.nvmrc` and pnpm from
`packageManager`; installs use the frozen lockfile. The build job creates `.env`
from `.env.template`, verifies production JavaScript with
`pnpm exec expo export --platform android`, then generates the native project with
`pnpm exec expo prebuild --platform android --no-install`. Java 17 and
`gradle/actions/setup-gradle@v4` prepare Gradle; do not also enable `setup-java`'s
Gradle cache. The native check runs `./gradlew :app:assembleDebug
-PreactNativeArchitectures=arm64-v8a --build-cache --parallel --no-daemon --profile
--console=plain` in `android`. `cache-read-only: false` saves reusable Gradle state.
Pushes and manual runs on `next-dev` run the same `build` job, populating cache on
the base branch so new PRs can restore it on their first run. Wait for that build
to finish before measuring a new PR. Cache written by a PR remains isolated from
sibling PRs; subsequent commits in that PR can reuse it. Gradle validates task
inputs before reusing outputs, so dependency or native configuration changes may
still require compilation. See [GitHub cache access rules](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching#restrictions-for-accessing-a-cache).
The `gradle-profile` artifact contains `android/build/reports/profile/` and is
uploaded even after a failed build when a report exists. This check covers
production JS bundling and ARM64 native compilation; release-only tasks and other
ABIs require validation before releases.
The generated project's debug key signs the PR verification APK. All public
`Mobile` jobs use GitHub-hosted runners; they never build on the VPS. PRs cannot
request a release. `CI=true` disables interactive tooling; superseded PR runs
are cancelled, while release requests finish.

Standard Linux runners are free and unlimited for public Mobile; they do not use
the private-repository minute quota. See [GitHub runner billing](https://docs.github.com/en/actions/reference/runners/github-hosted-runners).

For next-dev, a dedicated GitHub App has only **Actions: write** on private
`SenswaveLabs/Next-Infra`, plus GitHub's automatic metadata access. Configure
`MOBILE_INFRA_APP_ID` as a Mobile variable and `MOBILE_INFRA_APP_PRIVATE_KEY` as
a Mobile secret. Do not grant Contents, Pull requests, Workflows or Administration
write, and do not reuse `NEXT_INFRA_TOKEN`. The token dispatches the private
`propose-next-dev-mobile.yaml` workflow with the actual Mobile CI run ID.
Private infra independently verifies that the run belongs to Mobile/next-dev
and passed its quality job, then creates a version PR on a GitHub-hosted runner.
The PR records the real CI actor, source SHA and CI link. A human reviews and
merges it; only a push to infra/main starts the VPS build and deployment.
There is no cron, automatic merge, or mobile deployment dispatch endpoint.

The source identity is immutable: `MOBILE_VERSION=<source SHA>-<Mobile workflow
run number>`. Infra's trusted Dockerfile builds that exact commit using Node
from `.nvmrc`, pnpm from `packageManager`, the frozen lockfile, Java 17 and the
Android SDK. A fresh signing stage reads a dedicated next-dev key via BuildKit
secrets. The final Nginx image contains the APK, checksum and download page.
It uses the existing registry, Compose, Traefik and Ansible deployment pattern.

`app.config.js` preserves `app.json` for normal development and production.
Only `SENSWAVE_BUILD_PROFILE=next-dev` changes the installed name, scheme and
Android package to `Senswave next-dev` / `com.develite.senswave.nextdev`, and
requires `SENSWAVE_ANDROID_VERSION_CODE`. That value increases with new Mobile
CI runs without changing production or EAS-managed versions. The APK bundles
its JavaScript, connects to `https://next-dev-api.senswave.net`, and runs without
Metro. It supports ARM Android phones; the initial builder requires Linux x64.

Download after a successful infra deployment:
`https://next-dev-mobile.senswave.net/senswave-next-dev.apk`.
Allow installation from the browser when Android prompts, then open the APK.
Install a newer APK over the existing test app to preserve data. This is a manual
update; production can remain installed alongside it.

See `Next-Infra/docs/next-dev-mobile.md` for the GitHub App setup, private workflow
permissions, signing key, OAuth registration, VPS prerequisites and DNS/TLS.
Production store releases remain manual; this flow does not use EAS Build,
upload APKs to GitHub storage, or publish to Google Play.

**Versioning** — `{major}.{minor}.{patch}`:

| Change | Forces app update |
|--------|-------------------|
| major differs | Always |
| minor differs | Always |
| patch: `appPatch > apiPatch` | Yes |

Minimum API version controlled by `EXPO_PUBLIC_MINIMAL_API_VERSION`. Forced update also possible via Play Store.

**PR rules** — notify on test failure, never merge autonomously. Title prefix `fix:` / `feat:` / `chore:`.

NativeWind's Babel preset requires the direct `@babel/plugin-transform-react-jsx` development dependency so Gradle's direct Node invocation can resolve it without pnpm's CLI paths.

React Native Reusables uses NativeWind 4.2.7 and Tailwind CSS 3.4.19; the previous DOM Tailwind v4/PostCSS pipeline is removed. Add native libraries with `pnpm exec expo install <package> --pnpm` so Expo selects SDK-compatible versions, and commit the resulting lockfile. `react-native-svg` and MapLibre require a new development client build; restart Metro with `--clear` after adding native dependencies or changing NativeWind configuration so its resolver includes the new modules.
