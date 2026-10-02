# Tooling, builds and releases

## Commands

```bash
pnpm install --frozen-lockfile # install deps
pnpm android                  # first build (compiles native code)
pnpm start --dev-client       # subsequent runs (dev server)
pnpm typecheck                # TypeScript check
pnpm lint                     # ESLint check
pnpm fix                      # ESLint auto-fix
pnpm test:poc                 # auth validation, route boundaries and native reset behavior
pnpm test:homes               # home selection, joining, loading and recovery behavior
```

- Run `pnpm typecheck`, `pnpm lint`, and `pnpm test:poc` before committing.
- Use pnpm only; commit `pnpm-lock.yaml`. Project pnpm settings live in `pnpm-workspace.yaml`; keep its existing build approvals.
- Dev URL override: `ConfigurationProvider.overrideUrl(url)` — only when `EXPO_PUBLIC_ENVIRONMENT=Development`.
- Prereqs: Node.js **26.10.0** (`.nvmrc`), **pnpm 12.8.1** (`packageManager`), Android Studio + Java 17. Expo CLI comes from project dependencies.

ESLint ignores the generated `android/**` directory so production bundles are
not re-linted after a native build. Source files remain covered by `pnpm lint`.
Launch backgrounds in `app.json` match the shared canvas: light `#F9F7F1`, dark
`#100D08`. Splash/adaptive-icon changes require prebuild and a new native build;
a JavaScript reload updates in-app colors but not an installed splash screen.

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
| `build.yaml` | Pushes to `next-dev`, PRs to `next-dev`, and manual dispatch; pnpm install, lint, typecheck, then a local Android release build |

New UI changes live on `next-dev`. Both jobs read Node from `.nvmrc` and pnpm from
`packageManager`; installs use the frozen lockfile. The build job creates `.env`
from `.env.template`, runs `pnpm exec expo prebuild --platform android --no-install`,
then `./gradlew :app:assembleRelease --no-daemon` in `android` using Java 17.
The generated project's debug key signs this verification APK. CI does not use
EAS credentials, increment remote versions, upload application artifacts, or deploy.
`CI=true` disables interactive tooling. Older runs for the same ref are cancelled.
`pnpm test:poc` remains a local check
required before committing.

**Versioning** — `{major}.{minor}.{patch}`:

| Change | Forces app update |
|--------|-------------------|
| major differs | Always |
| minor differs | Always |
| patch: `appPatch > apiPatch` | Yes |

Minimum API version controlled by `EXPO_PUBLIC_MINIMAL_API_VERSION`. Forced update also possible via Play Store.

**PR rules** — notify on test failure, never merge autonomously. Title prefix `fix:` / `feat:` / `chore:`.
