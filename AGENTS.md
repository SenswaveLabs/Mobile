# AGENTS.md

Guide for AI agents working in this repo. Senswave mobile app: DIY Smart Home platform.
Sections are ordered rules → commands → architecture → conventions → reference.

---

## 1. Rules (MUST / NEVER)

| # | Rule |
|---|------|
| R1 | **MUST** use the `caveman` skill (`.claude/skills/caveman/SKILL.md`) for every chat response. Load at session start, keep active. Code, commit messages, PR descriptions: write normally. |
| R2 | **MUST** keep this file current. Any change to structure, stack, conventions, endpoints, types, env vars, build config, or workflows → update the matching section in the **same commit**. Stale `AGENTS.md` = bug. |
| R3 | **NEVER** call `fetch` directly outside `src/utils/httpClient.tsx`. Use `useHttpClient()`. |
| R4 | **NEVER** merge PRs autonomously. Notify on test failure; wait for human. |
| R5 | **MUST** verify the backend build at `Senswave.sln` level when touching shared API contracts. |
| R6 | **MUST** create `.env` from `.env.template` before first run. |
| R7 | Production updates are **manual only** with strict versioning. No automated production deploys. |
| R8 | Commit / PR titles: `fix:`, `feat:`, or `chore:` prefix + description. |
| R9 | All components typed `FC` / `FC<Props>`; props typed with an interface. |
| R10 | Styling only via `StyleSheet.create()` + theme colors from `useTheme()`. No inline color literals. |

---

## 2. Commands

```bash
npm i                    # install deps
npx expo run:android     # first build (compiles native code) — or: npm run android
npm start                # subsequent runs (dev server)
npm run lint             # ESLint check
npm run fix              # ESLint auto-fix
```

- Run `npm run lint` before committing.
- Dev URL override: `ConfigurationProvider.overrideUrl(url)` — only when `EXPO_PUBLIC_ENVIRONMENT=Development`.
- Prereqs: Node.js + npm, Android Studio + Java 17, Expo CLI.

---

## 3. Architecture

### Domain model

| Entity | Meaning |
|--------|---------|
| DataSource | MQTT broker feeding data in; system parses + stores it. Has Subscriptions (MQTT topics). |
| Device | Hardware unit. Has **Operations** (functions) and **Widgets** (dashboard UI controls). |
| Operation | One device function. Has `topic` (MQTT) + `type`. |
| Widget | Dashboard control bound to one Operation. |
| Home | Aggregates Devices into Rooms. Shareable with RBAC. Has one DataSource. |
| Automation | Fires Operations automatically when Conditions match. |
| Dashboard | Per-device configurable widget UI. |

**Home roles (RBAC):** `Display` = view + act. `Manage` = `Display` + configure Home settings.

### Tech stack

| Layer | Tech |
|-------|------|
| Mobile | React Native 0.81.5 + Expo ~54, React 19 |
| Routing | Expo Router 6 (file-based) |
| Language | TypeScript 5.9 (strict) |
| State | Context API + custom hooks |
| Real-time | SignalR (`@microsoft/signalr` 8.x) |
| Auth storage | `expo-secure-store` |
| UI libs | `react-native-paper`, `reanimated-color-picker`, `@react-native-community/slider`, `react-native-markdown-display` |
| Backend | .NET Minimal API — modular monolith (`Senswave.sln`) |

App version: **1.1.0**. Version source: `remote` (EAS-managed).

### Directory map

```
src/
  app/                      # Expo Router routes (file-based)
    (app)/                  # authenticated routes
      home/                 #   list, add, details, join, share; room/{add,details}
      device/               #   add, details, device.tsx
        dashboard/          #     add, details, list, placeWidget
        operation/          #     add, details, list
        widget/             #     add, details, list
      automation/           #   add, details, list; conditions/; results/
      dataSource/           #   add, details, list; brokers/
      user/                 #   info, profile, privacy, terms
    _layout.tsx
    login / register / confirmEmail / forgotPassword / resetPassword
    start / server / consents / maintenance / privacy / terms
  components/
    common/                 # shared UI (Button, Text, Dropdown, Loading, Divider, ...)
    auth/ automations/ dataSource/ device/ headers/ home/ homeSharing/ room/ user/
  contexts/
    ConfigurationProvider   # API URL, SignalR URL, version check
    SessionProvider         # auth state + all auth flows
    HttpClientProvider      # HTTP client, auto token refresh
    SignalRProvider         # SignalR hub connection
    ThemeProvider MenuProvider ModalProvider ToastProvider
    custom/                 # feature providers: AutomationList, Automation, DeviceList,
                            #   Device, OperationForm, WidgetDetails
    domain/                 # entity providers: Home, User, LiveUpdate, Legal
  hooks/                    # shared custom hooks
  types/
    DeviceTypes.tsx         # OperationType, WidgetType, OperationDto, WidgetDto
    HomeTypes.tsx           # Home, Room, Location, HomeSharingDto, HomeRolesToName
    AutomationsTypes.tsx    # AutomationDto, ConditionType, ConditionConnector
    DataSourcesTypes.tsx    # DataSourceDto, SubscriptionDto, MqttVersion
  utils/
    httpClient.tsx          # executeTimeout, HttpResponse — ONLY place fetch is called
    result.tsx              # Result<T>, SimpleResult
    location.tsx
  styles/                   # shared style helpers
```

---

## 4. Conventions

### Naming

| Artifact | Rule | Example |
|----------|------|---------|
| Components | PascalCase | `DeviceForm.tsx` |
| Context providers | PascalCase + `Provider` | `SessionProvider.tsx` |
| Custom hooks | `use` + camelCase | `useSession`, `useDeviceList` |
| Routes / utils / styles | camelCase | `add.tsx`, `httpClient.tsx` |
| Type files | PascalCase | `DeviceTypes.tsx` |
| Props interface | PascalCase + `Props` | `interface DeviceFormProps` |
| Callback props | `onPress`, `onSubmit`, `setValue` | — |

### Components

- Functional only, typed `FC` / `FC<Props>`. Props via interface.
- Styling: `StyleSheet.create()` + `useTheme()` colors.
- Local UI / form state: `useState`.
- Re-fetch trigger: increment a numeric state counter.

### Path aliases

| Alias | Target | Configured in |
|-------|--------|---------------|
| `@/*` | `./src/*` | `tsconfig.json` |
| `@components` | `./src/components` | `babel.config.js` (module-resolver) |
| `tests` | `./tests/` | `babel.config.js` |

Babel resolver `root` is `./src`, so bare imports resolve from there too.

---

## 5. Reference

### 5.1 Core types

**Operations**
```ts
type OperationType = "Boolean" | "Number" | "Integer" | "Text" | "HexColor" | "Options";
```
Each Operation has `topic` (MQTT) + `type`. `Options` type carries a configurable allowed-string list (edited via `OptionsOperationFormModal`). `HexColor` = hex string. `Number`/`Integer` support decimal-separator config.

**Widgets**
```ts
type WidgetType = "Invalid" | "Empty" | "Button" | "Display" | "Switch" | "Radio" | "Slider" | "Color";
```

| Widget | OperationType | Behaviour |
|--------|---------------|-----------|
| Button | Any | Sends configured value on press |
| Display | Any | Shows current value, read-only |
| Switch | Boolean | Toggle true/false |
| Radio | Options | Pick from option list (modal picker) |
| Slider | Number / Integer | Range slider, configured min/max |
| Color | HexColor | Full color picker (`reanimated-color-picker`) |
| Empty | — | Placeholder grid slot |
| Invalid | — | Misconfigured-widget fallback |

**Automations**
```ts
type ConditionType = "BooleanCondition" | "NumberCondition" | "TextCondition" | "InvalidCondition";
type ConditionConnector = "And" | "Or";  // joins all conditions in one automation

const OperationToConditionMap: Record<OperationType, ConditionType> = {
    Boolean: "BooleanCondition",
    Number:  "NumberCondition",
    Integer: "NumberCondition",
    Text:    "TextCondition",
    HexColor: "TextCondition",
    Options: "TextCondition",
};
```
An Automation has many `conditions` (joined by one `conditionConnector`) and many `results` (which Operations fire, with what value).

**DataSources**
```ts
type MqttVersion = "MqttV5" | "MqttV311" | "MqttV310";
type DataSourceDto = { id, name, url, clientName, port, mqttVersion, tls };
type SubscriptionDto = { id, topic };
type CreateSubscriptionRequest = { topic };
```
Topic payloads parsed via per-Operation JSON path selectors to extract values.

**Home**
```ts
interface Home { id, name, icon, isOwner, dataSource: HomeDataSource, location: Location, rooms: Room[] }
interface HomeDataSource { id, name, state }  // state updated via SignalR
```

**User**
```ts
enum ThemeMode { Light = "light", Dark = "dark", Default = "default" }
interface UserData { language, theme, email, name, image?, hasActiveConsent? }
```
`name` = first char of email uppercased + rest before `@`. `Default` theme = follow system.

**Result pattern**
```ts
SimpleResult.success() / SimpleResult.failure("message")
Result.success<T>(data) / Result.failure<T>("message") / Result.failureWithData<T>("message", data)
```

### 5.2 API layer

- Hook: `useHttpClient()` → `get`, `post`, `patch`, `put`, `delete`.
- Returns `HttpResponse`: `{ isSuccess, statusCode, response }`.
- 15s request timeout.
- **401** → auto token refresh, retry once with new token.
- **403** → logout (`LegalMiddleware`: user has not accepted latest Terms/Privacy).
- Path prefix `/api/v1/...`, built by `ConfigurationProvider.getApiUrl`.

**Auth endpoints**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `v1/auth/login` | POST | Email/password login |
| `v1/auth/login/google` | POST | Google OAuth login (always forces `rememberMe`) |
| `v1/auth/register` | POST | Register |
| `v1/auth/refresh` | POST | Refresh access token |
| `v1/auth/confirmEmail` | POST | Confirm email (userId + code) |
| `v1/auth/resendConfirmationEmail` | POST | Resend confirmation |
| `v1/auth/forgotPassword` | POST | Send reset email |
| `v1/auth/resetPassword` | POST | Reset password (code) |

**Feature endpoints**

| Feature | Endpoint | Method |
|---------|----------|--------|
| User data | `v1/users` | GET |
| User settings | `v1/users/settings` | PATCH |
| Delete account | `v1/users/account` | DELETE |
| Make consents | `v1/users/consents` | POST |
| Terms | `v1/legal/terms` | GET |
| Privacy | `v1/legal/privacy` | GET |
| API version | `v1/version` | GET |

**Login status codes**

| Code | Meaning |
|------|---------|
| 401 `NotAllowed` | Email not confirmed — show resend button |
| 401 other | Invalid credentials |
| 500 | Server unavailable |

### 5.3 Authentication flow

- Email/password, Google OAuth, register + email confirmation, forgot/reset password.
- Token type: Bearer JWT. Access + refresh tokens stored in `expo-secure-store` when `rememberMe` is on.
- App start: check API compatibility → auto-login via stored refresh token.
- After any successful login → redirect to `/consents` (consent gate).

**Consent flow**
1. Login → redirect `/consents`.
2. Fetch `v1/users` → check `hasActiveConsent`.
3. False → show Terms + Privacy → `POST v1/users/consents`.
4. Any 403 → logout (consent expired/revoked).
5. Legal docs served versioned from API (summary + full markdown).

### 5.4 Real-time (SignalR)

Hub: `signalr/liveupdates/live`. Connects when authenticated. Auth via `accessTokenFactory` returning current `accessToken`. On failure: refresh token, retry after 15s. Context: `useSignalR()` → `{ data: { connection? } }`.

**Client → server**

| Method | Args | When |
|--------|------|------|
| `Initialize` | `homeId: string` | On active-home change — subscribe to that home |

**Server → client** — `"Update"` event, signature `(updateType: string, data: any)`:

| `updateType` | `data` | Effect |
|--------------|--------|--------|
| `deviceTileActionUpdate` | `{ deviceId }` | Per-device registered callback (tile refresh) |
| `widgetsActionUpdate` | `{ deviceId }` | `device.smartRefresh(deviceId)` |
| `dataSourceStateUpdate` | `{ dataSourceId, state }` | Update DataSource state in active home |

Also `"AccessNotGrantedToHome"` `(homeId, message)` — logged only, no redirect.
Context: `useLiveUpdate()` → `addDeviceTileCallback(deviceId, cb)`, `addHomeDataSourceCallback(cb)`.

### 5.5 Notable common components

| Component | Purpose |
|-----------|---------|
| `JsonPathSelector` | Define JSON field path list for parsing MQTT messages. Validates: no `"` or `\`, no control chars, max 64 chars/key |
| `Icon` | Wrapper over `@expo/vector-icons`, curated set |
| `Modal` | Generic modal via `ModalProvider` |
| `PasswordInput` | Secure input + show/hide toggle, all auth forms |
| `SafetyNote` | Info/warning callout in forms |
| `Expander` | Collapsible section (Home details: sharing list, rooms) |
| `Dropdown` | Selection (profile theme, language) |
| `HorizontalSelector` | Tab-style horizontal option picker |
| `LocalizationSelector` | Language picker |
| `SimpleItemList` | Generic key-value list |
| `UserProfileImage` | Avatar from email initial |

### 5.6 Environment variables

| Variable | Description | Template default |
|----------|-------------|------------------|
| `EXPO_PUBLIC_ENVIRONMENT` | `Development` or production | `Development` |
| `EXPO_PUBLIC_SENSWAVE__API__URL` | Backend base URL | `http://10.0.2.2:8080` (Android emulator) |
| `EXPO_PUBLIC_API_GOOGLE_CLIENT_ID` | Google OAuth client ID | — |
| `EXPO_PUBLIC_MINIMAL_API_VERSION` | Minimum compatible API version | `1.0.0` |
| `EXPO_PUBLIC_CONTACT_EMAIL` | Support email shown in app | `contact@senswave.net` |

### 5.7 Build, CI, versioning

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
| `build.yaml` | Every pull request |
| `build-expo-preview.yaml` | Preview build |
| `build-expo-production.yaml` | Production build (manual) |

**Versioning** — `{major}.{minor}.{patch}`:

| Change | Forces app update |
|--------|-------------------|
| major differs | Always |
| minor differs | Always |
| patch: `appPatch > apiPatch` | Yes |

Minimum API version controlled by `EXPO_PUBLIC_MINIMAL_API_VERSION`. Forced update also possible via Play Store.

**PR rules** — notify on test failure, never merge autonomously. Title prefix `fix:` / `feat:` / `chore:`.
