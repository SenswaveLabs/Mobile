# Migration: Senswave → NativeWind + React Native Reusables

## Context

Senswave (Expo 54 / RN 0.81 / React 19) styles everything through 31 hand-rolled primitives in `src/components/common/*`, each combining `StyleSheet.create()` with an 11-colour React context (`useTheme().current.colors.*`). 67 files call `useTheme()`. There is no spacing, radius, or typography scale — every padding is a literal (`10`, `13`, `15`), every radius is per-component, and `shadowStyles` stands in for borders.

The result is real inconsistency:

- two animation stacks (reanimated 4 and RN legacy `Animated`)
- two modal systems (`SenswaveModal` full-screen slide, `Dialog` transparent fade)
- three competing colour-union types (`TextColor`, `IconColor`, and the raw 11-key theme union)
- disagreeing prop APIs — `onSelected` vs `onSelect` vs `onValueSlided`; `Switch` takes a boxed `{ value: boolean }`; `error` is required on `Input` but optional on `InputNumber`
- `Text` defaults to `numberOfLines = 3`, silently truncating text app-wide

`react-native-paper` was already removed — it was only ever `PaperProvider` in the root layout, consumed by nothing.

The goal is to move onto NativeWind + React Native Reusables so styling comes from a token system instead of ~4,000 lines of hand-written `StyleSheet`, while keeping the app verifiable at every point. Old and new systems coexist; `src/components/common/*` is deleted only in the final wave.

**Decisions taken (locked):**

| Decision | Choice |
|---|---|
| Component naming | `Senswave*` prefix on every new component, in `src/components/senswave/` |
| UX/UI scope | Systematic polish — layout and flow stay recognisable; spacing/radius/touch-target/state fixes applied uniformly |
| Verification | One commit per step, app run per step, explicit checklist per step |
| Migration axis | **Screen by screen**, each step carrying the feature components that screen owns |

---

## Critical constraints (verified against live sources)

**1. NativeWind v4.2.6 — not v5.** RNR only publishes a `nativewind` (v4 / Tailwind 3) registry. v5 is self-labelled not-for-production and its latest preview predates the current v4 release. Choosing v5 means hand-porting every RNR component.

**2. `tailwindcss` must be pinned to v3.** `react-native-css-interop@0.2.6` declares `tailwindcss: "~3"`. A bare `npm i tailwindcss` pulls v4 and breaks the build. Pin exactly: `"tailwindcss": "3.4.19"`.

**3. `className` does not work on animated components.** [reanimated#8329](https://github.com/software-mansion/react-native-reanimated/issues/8329) is open and reproduces on exactly this stack (reanimated 4.1.1 + worklets 0.5.1 + Expo 54). This shapes the whole migration, so it becomes a standing rule:

> **Animated rule** — any `Animated.*` component (reanimated *or* RN legacy) keeps `style={...}`. Wrap it in a static `<View className="...">` that carries layout, spacing, and colour; leave only the animated properties in `style`.

Affects `Dropdown`, `FAB`, `Slider`, `Switch`, `Expander`, both `HorizontalSelector`s, `IconSelector`, `GridDashboardView`, and `reanimated-color-picker`. Downgrading to reanimated 4.1.0 is a fallback, not the plan.

**4. `className` does not work on third-party components** unless registered. `cssInterop` covers only RN core + `SafeAreaView`. Ionicons, `react-native-markdown-display`, `@react-native-community/slider`, and `reanimated-color-picker` each need a wrapper or stay on `style`.

**5. Token name collision — the single biggest source of confusion during coexistence.** Current `primary` is a *surface* colour (`#F5F5F5`); shadcn `primary` is the *brand accent*. Current `complementary` (amber) is the real accent. Every step file restates the mapping table below.

---

## Token mapping

The current 11 colours expand to the full shadcn token set. Derived HSL triplets for `global.css`:

| Current key | shadcn token | Light | Dark |
|---|---|---|---|
| `background` | `--background` | `223 64% 92%` | `0 0% 7%` |
| `textOnBackground` | `--foreground` | `225 11% 22%` | `0 0% 96%` |
| `primary` *(surface)* | `--card`, `--popover` | `0 0% 96%` | `0 0% 12%` |
| `textOnPrimary` | `--card-foreground`, `--popover-foreground` | `225 11% 22%` | `0 0% 96%` |
| `secondary` | `--secondary` | `225 11% 22%` | `0 0% 16%` |
| `textOnSecondary` | `--secondary-foreground` | `0 0% 96%` | `0 0% 88%` |
| `complementary` *(accent)* | `--primary`, `--ring` | `42 84% 45%` | `42 84% 35%` |
| — | `--primary-foreground` | `40 30% 10%` | `40 30% 8%` |
| `error` | `--destructive` | `0 62% 66%` | `0 100% 66%` |
| `success` | `--success` *(custom)* | `123 38% 64%` | `123 38% 64%` |
| `warning` | `--warning` *(custom)* | `36 100% 65%` | `36 100% 65%` |
| `info` | `--info` *(custom)* | `208 79% 51%` | `208 79% 51%` |
| — | `--muted` | `223 20% 90%` | `0 0% 16%` |
| — | `--muted-foreground` | `225 8% 45%` | `0 0% 64%` |
| — | `--border`, `--input` | `223 20% 85%` | `0 0% 20%` |
| — | `--accent` | `223 30% 88%` | `0 0% 18%` |
| — | `--accent-foreground` | `225 11% 22%` | `0 0% 96%` |

`--border`, `--muted`, and `--ring` are new — they are what replace `shadowStyles` as separators and give inputs a real focus state.

**Flagged, not silently changed:** the current dark accent (`#a2750e`) is *darker* than the light accent (`#d69b12`), which inverts the usual convention and lands at ~4.3:1 against either foreground. Step A2 keeps it as-is for fidelity and offers a brightened alternative for a yes/no decision.

---

## Component naming and the CLI workflow

`components.json` sets `aliases.ui` to `@/components/senswave`, so the shadcn CLI writes RNR components straight into the target folder and rewrites cross-imports to that alias. The CLI emits shadcn names (`button.tsx` exporting `Button`), so each added component is renamed in the same step:

```bash
npx @react-native-reusables/cli@latest add button
# -> src/components/senswave/button.tsx          exporting  Button
# rename to
#    src/components/senswave/SenswaveButton.tsx  exporting  SenswaveButton
# then fix the 1-3 rewritten cross-imports inside the file
```

This rename is listed explicitly in every step file that adds a component. `npx expo install --fix` runs after each `add` (the CLI installs with npm and can drift from the SDK 54 matrix).

---

## Plan files

Step plans live in `docs/rnr-migration/` — one file per step plus an index:

```
docs/rnr-migration/
  00-INDEX.md              progress tracker, all 37 steps, status column
  A1-foundation.md
  A2-tokens.md
  ...
  K3-agents-md.md
```

The first execution action is generating that directory and all 37 step files. Later files are refreshed if an earlier step invalidates an assumption; the index records that.

**Step file template:**

```markdown
# <ID> — <title>

## Goal            one sentence
## Prerequisites   which steps must be done
## Files touched   exact paths, marked NEW / EDIT / DELETE
## Components      Senswave* introduced, with the CLI command and rename
## API changes     table: old prop -> new prop, per component
## Polish applied  explicit list of what should look different, and why
## Risks           what could break, and the Animated-rule call-outs
## Verify
  1. npm run lint && npx tsc --noEmit
  2. npm start -> exact navigation path to the screen
  3. [ ] must be identical: ...
  4. [ ] must be better: ...
  5. [ ] dark mode toggle correct
  6. [ ] behaviour unchanged (network calls, validation)
## Rollback        git revert <sha>
```

---

## Steps

### Wave A — Foundation

No component changes; proves the pipeline.

| ID | Scope | Notes |
|---|---|---|
| A1 | NativeWind install + `babel.config.js`, `metro.config.js`, `tailwind.config.js`, `global.css`, `tsconfig.json`, `nativewind-env.d.ts`, `components.json`, `src/lib/utils.ts` | Remove the now-redundant explicit `react-native-reanimated/plugin` — `babel-preset-expo` injects `react-native-worklets/plugin` already. Smoke test + `verifyInstallation()` + RNR `doctor`, both removed before commit |
| A2 | Senswave token palette into `global.css`; bridge `ThemeProvider` → `colorScheme.set()` | Old `StyleSheet` screens and new `className` markup must invert **in the same frame** |
| A3 | `SenswaveText`, `SenswaveIcon` (cssInterop-wrapped Ionicons), `<PortalHost />` | Unavoidable prerequisites — every screen uses both. Fixes `Text`'s `numberOfLines = 3` default |

### Wave B — Pilot screens

Smallest real screens; proves the loop end-to-end.

| ID | Screens | Feature components |
|---|---|---|
| B1 | `(app)/user/privacy`, `(app)/user/terms` | `user/PrivacyPolicy`, `user/TermsAndConditions` → `SenswaveMarkdown`, `SenswaveSpinner` |
| B2 | `privacy.tsx`, `terms.tsx` (public) | `SenswaveImageButton`, `SenswaveScreen` shell |

### Wave C — Auth

Highest visibility; builds most form primitives.

| ID | Screens | Introduces |
|---|---|---|
| C1 | `login.tsx` + `auth/LoginForm` | `SenswaveButton`, `SenswaveInput`, `SenswavePasswordInput`, `SenswaveFormField`, `SenswaveAuthScreen` |
| C2 | `register.tsx` + `auth/RegisterForm` | — |
| C3 | `forgotPassword.tsx`, `resetPassword.tsx` + their 2 forms | — |
| C4 | `start.tsx`, `server.tsx`, `confirmEmail.tsx`, `maintenance.tsx`, `consents.tsx` | `SenswaveCard` (replaces `Tile`) |
| C5 | `auth/GoogleSignInButton`, `auth/JoinWith` | — |

### Wave D — App shell

Used by ~20 screens, so it precedes them.

| ID | Scope | Notes |
|---|---|---|
| D1 | `(app)/_layout.tsx` (322 lines), `headers/DefaultHeader`, `headers/ProfileHeader`, `user/UserProfileImage` | 250 of the 322 lines are repeated `<Stack.Screen>` boilerplate → data-driven config array |
| D2 | `SenswaveFAB`, `SenswaveDialog`, `SenswaveConfirmDialog`, `SenswaveModal` | Animated rule applies hard to `FAB` (reanimated + keyboard worklet). Unifies the two modal systems |

### Wave E — Home & rooms

| ID | Screens | Feature components |
|---|---|---|
| E1 | `(app)/index.tsx` | `home/NoHomeScreen`, `home/widgets/*` — also strips the dead commented imports and `sections` array |
| E2 | `home/list.tsx` | `home/lists/*` (3 files) |
| E3 | `home/add.tsx`, `home/details.tsx` | `home/HomeForm` → `SenswaveExpander`, `SenswaveIconSelector`, `SenswaveLocationPicker` |
| E4 | `home/share.tsx`, `home/join.tsx` | `homeSharing/*` (4 files) → `SenswaveDropdown` |
| E5 | `home/room/add.tsx`, `home/room/details.tsx` | `room/*` (5 files) |
| E6 | `home/dataSource/select.tsx` | `dataSource/DataSourceList`, `dataSource/tile/DataSourceTile` |

### Wave F — Device / operations / widgets

Largest area, 5,815 lines.

| ID | Screens | Feature components |
|---|---|---|
| F1 | `device/add.tsx`, `device/details.tsx` | `device/DeviceForm` (479), `device/DeviceList` → `SenswaveDetailScreen` shell, reused by 6 screens |
| F2 | `device/device.tsx` | `device/tile/*` (4 files) → `SenswaveTabs` replaces **both** `HorizontalSelector` and `EnhancedHorizontalSelector` |
| F3 | `operation/list`, `operation/add`, `operation/details` | `OperationList`, `OperationTile`, `OperationSelector` |
| F4 | — | `OperationForm` (457) + `forms/Boolean`, `forms/Numeric`, `forms/Options` → `SenswaveInputNumber`, `SenswaveJsonPathSelector` |
| F5 | `widget/list`, `widget/add`, `widget/details` | `WidgetList`, `WidgetListTile`, `WidgetForm` |
| F6 | — | `widgets/forms/*` incl. `ButtonForm` (405), `Radio/*`; deletes the two 3-line stub files |
| F7 | — | `widgets/widgets/*` (7 files) → `SenswaveSlider`, `SenswaveSwitch`. `ColorWidget` keeps `StyleSheet` (reanimated colour picker) |

### Wave G — Dashboard

Riskiest.

| ID | Scope | Notes |
|---|---|---|
| G1 | `dashboard/add`, `dashboard/details`, `DashboardForm`, `DashboardView` | — |
| G2 | `dashboard/placeWidget`, `Grid/GridDashboardView` (660) | **Explicit exception:** the drag/resize canvas keeps `StyleSheet` + reanimated. Only its chrome moves to `className`. Documented in AGENTS.md at K3 |

### Wave H — Automations

| ID | Scope |
|---|---|
| H1 | `automation/add`, `automation/details`, `AutomationForm` (329), `AutomationTile`, `AutomationList`, `LogicalConjuction` |
| H2 | `automation/conditions/add` + `conditions/*` (3 files, 501 lines) |
| H3 | `automation/results/add` + `results/*` (3 files, 329 lines) |

### Wave I — DataSource

| ID | Scope |
|---|---|
| I1 | `dataSource/list`, `dataSource/add`, `DataSourceForm` (391) |
| I2 | `dataSource/details`, `sections/*`, `state/*`, `brokers/*` |
| I3 | `brokers/addSubscription`, `brokers/startBrokerClient`, `subscriptions/*` |

### Wave J — User

| ID | Scope |
|---|---|
| J1 | `user/profile` (the only screen mixing all three styling approaches), `user/info`, `RemoveAccountDialog`, `UserWelcome` → `SenswaveListItem`, `SenswaveDivider` |

### Wave K — Cleanup

| ID | Scope |
|---|---|
| K1 | Delete all 31 files in `src/components/common/`, plus `styles/shadowStyles.tsx` and `styles/defaultStyles.tsx`. Grep proves zero references |
| K2 | Reduce `ThemeProvider` to mode-only (colours now live in CSS vars). Fix the bug where a stored `"light"` preference is overridden whenever the OS is dark. Add real tri-state system mode |
| K3 | Update `AGENTS.md`: rule R10, tech stack, conventions, the component reference table, the `GridDashboardView` exception, and the Animated rule |

**37 steps total.**

---

## Per-step workflow

1. Re-read the step file, make the change, run `npm run lint` and `npx tsc --noEmit`.
2. Report files touched and the verification checklist.
3. Run the app and walk the navigation path in the step file.
4. Confirm, or point at what looks wrong — fix before committing.
5. Commit as `refactor(rnr): <ID> <description>` and update `00-INDEX.md`.
6. Next step only on explicit go-ahead.

Baseline: 10 pre-existing `tsc` errors (`OperationType` not exported from `DeviceListProvider`). Not introduced here and not fixed here — the count must stay at 10 or drop, never rise. Worth a separate `fix:` commit before starting.

---

## Verification

**Per step** — lint + typecheck clean, the screen's navigation path walked in a dev-client build, light/dark toggled on that screen, network behaviour unchanged.

**Foundation gates (A1), all eight before any component work:**

1. `npx expo start -c` cold start
2. `verifyInstallation()` passes
3. smoke card renders with tokens
4. `colorScheme.toggle()` inverts it
5. old `StyleSheet` screen and new `className` markup invert together
6. `tsc` clean with `className` on `View`
7. `npm run lint` clean
8. `npx @react-native-reusables/cli@latest doctor` clean

**Wave gates** — after each wave, walk every screen in that wave in both themes, then run the two end-to-end flows that cross wave boundaries:

- register → confirm email → consents → home
- add device → add operation → add widget → place on dashboard → actuate

**Final (K3)** — all 45 screens walked in both themes; `grep -r "components/common" src/` returns nothing; `tsc` error count ≤ 10.

---

## Rollback

One commit per step on a dedicated branch (`refactor/rnr-migration`), so `git revert <sha>` undoes exactly one screen. Wave boundaries are tagged (`rnr-wave-a` …) for coarse rollback. Every step file names its own revert command.
