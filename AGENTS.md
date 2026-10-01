# AGENTS.md

Senswave mobile is a DIY Smart Home app built with React Native, Expo and TypeScript.
The auth PoC uses local shadcn/Base UI components in Expo DOM; the rest of the app is native.

## Rules

- Use the [caveman skill](.claude/skills/caveman/SKILL.md) for every chat response; code, commits and PR descriptions use normal prose.
- New UI work belongs on `next-dev`. Keep it separate from `main` until integration is explicitly requested.
- Never merge PRs autonomously. Notify on test failure and wait for human. Commit/PR titles start with `fix:`, `feat:` or `chore:`.
- Production releases are manual only, with strict versioning. CI only verifies lint, types and Android builds.
- Never call `fetch` outside `src/utils/httpClient.tsx`; use `useHttpClient()`.
- Changes to shared API contracts require a backend build at `Senswave.sln` level.
- Use pnpm only, Node from `.nvmrc`, and the frozen pnpm lockfile. Preserve build approvals in `pnpm-workspace.yaml`.
- Create `.env` from `.env.template` before the first run.
- Keep this index and the affected guide documents current in the same commit as changes to structure, stack, conventions, contracts, configuration or workflows.

## Read only what the task needs

Read the relevant guide before acting; do not load the whole guide for a small, known edit.

| When the task involves… | Read |
| --- | --- |
| Structure, imports, types, components, naming or dependencies | [Repository and conventions](docs/agent-guide/repository.md) |
| UI, MD3, shadcn, navigation, forms, theming or accessibility | [Mobile UI design policy](docs/agent-guide/interface.md) |
| Domain entities, API contracts, authentication, contexts or SignalR | [Domain and API contracts](docs/agent-guide/api-and-data.md) |
| Node, pnpm, environment variables, Android, CI or releases | [Tooling, builds and releases](docs/agent-guide/tooling.md) |
| Tests, runtime checks or completion criteria | [Validation](docs/agent-guide/validation.md) |

## UI direction

Material Design 3 guides UX and interaction; Senswave's shadcn-based product defines the visual language.
Match `next-frontend/apps/web` hierarchy and brand, with native mobile behavior. Use web primitives only inside Expo DOM.
App components use `FC` and interface props; copied shadcn primitives keep upstream signatures.
Native styling uses `StyleSheet.create()` and `useTheme()` colors; DOM styling uses local Tailwind tokens.

## Finish the work

Use the narrowest relevant checks. Before committing, run `pnpm typecheck`, `pnpm lint` and `pnpm test:poc`.
Verify affected user flows on the relevant runtime when available; report failures and unverified behavior precisely.
