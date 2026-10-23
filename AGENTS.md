# AGENTS.md

Senswave mobile is a DIY Smart Home app built with React Native, Expo and TypeScript.
Authentication, home selection, home/room/device creation and settings use local React Native Reusables components; the app renders native React Native UI.

## Rules

- Use the [caveman skill](.claude/skills/caveman/SKILL.md) for every chat response; code, commits and PR descriptions use normal prose.
- New UI work belongs on `next-dev`. Keep it separate from `main` until integration is explicitly requested.
- Never merge PRs autonomously. Notify on test failure and wait for human. Commit/PR titles start with `fix:`, `feat:` or `chore:`.
- Production releases are manual only, with strict versioning. Public CI verifies PRs with an ARM64 Android build and requests a release PR in private `Next-Infra`; a human merges that PR before the VPS builds and hosts the next-dev APK. Never give public `Mobile` a self-hosted runner or infrastructure write token. See [Tooling](docs/agent-guide/tooling.md).
- Build completion notifications call the local reusable `notify-discord.yaml` workflow with the repository `DISCORD_WEBHOOK_URL` Actions secret. See [Tooling](docs/agent-guide/tooling.md).
- Android CI checks compile ARM64 debug, export production JavaScript and upload Gradle profiles. Pushes and manual runs on `next-dev` seed Gradle cache for PRs. Validate release tasks and all supported ABIs before releases.
- Never call `fetch` outside `src/utils/httpClient.tsx`; use `useHttpClient()`.
- Home and Device icon choices come from backend catalogs. Keep opaque keys unchanged; see [Domain and API contracts](docs/agent-guide/api-and-data.md).
- Changes to shared API contracts require a backend build at `Senswave.sln` level.
- Use pnpm only, Node from `.nvmrc`, and the frozen pnpm lockfile. Keep the Node minimum in `package.json` and EAS profile versions aligned with `.nvmrc`. Keep every dependency version in `package.json` exact and preserve build approvals in `pnpm-workspace.yaml`.
- Run `pnpm hooks:install` once per clone to enable whole-repository formatting and lint before commits.
- Create `.env` from `.env.template` before the first run.
- Keep this index and the affected guide documents current in the same commit as changes to structure, stack, conventions, contracts, configuration or workflows.

## Read only what the task needs

Read the relevant guide before acting; do not load the whole guide for a small, known edit.

| When the task involves… | Read |
| --- | --- |
| Product users, goals, priorities or platform scope | [Product context](PRODUCT.md) |
| Structure, imports, types, components, naming or dependencies | [Repository and conventions](docs/agent-guide/repository.md) |
| UI, home dashboard, MD3, React Native Reusables, navigation, forms, theming or accessibility | [Mobile UI design policy](docs/agent-guide/interface.md) |
| Domain entities, API contracts, authentication, contexts or SignalR | [Domain and API contracts](docs/agent-guide/api-and-data.md) |
| Node, pnpm, TypeScript configuration, environment variables, Android, CI or releases | [Tooling, builds and releases](docs/agent-guide/tooling.md) |
| Tests, runtime checks or completion criteria | [Validation](docs/agent-guide/validation.md) |

## UI direction

Material Design 3 guides UX and interaction; Senswave's shadcn-based product defines the visual language.
Use `next-frontend/apps/web` as a brand reference; choose hierarchy and behavior for mobile tasks. Use React Native Reusables primitives for auth, home selection, creation and settings.
App components use `FC` and interface props; copied React Native Reusables primitives keep upstream signatures.
Editable details forms use `common/FormSection` for headings, field spacing and save actions.
On the home dashboard, only an assigned `Working` or `Connected` source gets a subtitle below the home name; Connecting/Restarting use neutral text and other states use persistent notices. Only known disconnected/Error or missing-source states can expose a separate source action, and only for owners. Settings and details retain their data-source state badges.
Native styling uses `StyleSheet.create()` and `useTheme()` colors; all screens share the themed background. React Native Reusables primitives use NativeWind and tokens derived from the same theme.
Data-source creation uses one keyboard-aware page with inline feedback; see the [mobile UI design policy](docs/agent-guide/interface.md) for its validation and navigation behavior.
Broker client start uses one keyboard-aware `FormSection`, local credential restoration, inline feedback and accepted-once return navigation; see the [mobile UI design policy](docs/agent-guide/interface.md).
Broker subscription creation uses one keyboard-aware `FormSection`, topic validation, inline feedback and accepted-once return navigation; see the [mobile UI design policy](docs/agent-guide/interface.md).
Dashboard creation uses one keyboard-aware `FormSection`, preserved icon keys, strict string grid bounds and accepted-once return; see the [mobile UI design policy](docs/agent-guide/interface.md).
Home location uses a native MapLibre picker with OpenStreetMap. See [Tooling](docs/agent-guide/tooling.md) for its development-client rebuild requirement.
Profile settings use one native scroll, immediate Light/Dark/System theme selection, read-only English, inline recovery, and a confirmed native account-deletion dialog; see the [mobile UI design policy](docs/agent-guide/interface.md).

## Finish the work

Use the narrowest relevant checks. Before committing, run `pnpm typecheck`, `pnpm lint` and `pnpm test:poc`.
Verify affected user flows on the relevant runtime when available; report failures and unverified behavior precisely.
