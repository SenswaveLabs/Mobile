# Domain and API contracts

## Domain model

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

## Core types

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

## API layer

- Hook: `useHttpClient()` → `get`, `post`, `patch`, `put`, `delete`.
- Returns `HttpResponse`: `{ isSuccess, statusCode, response }`.
- 15s request timeout.
- **401** → auto token refresh, retry once with new token.
- **403** → logout (`LegalMiddleware`: user has not accepted latest Terms/Privacy).
- Path prefix `/api/v1/...`, built by `ConfigurationProvider.getApiUrl`.

`HomeProvider.initializeCurrentHome()` returns success/failure and always releases
its loading state, including location, request and response-parsing failures.
Use `{ silent: true }` when the caller owns recovery and feedback, as joining does;
other callers retain the existing notifications. This is a client context option,
with no change to backend contracts. Home selection remains available before a
current home has been established.

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

## Authentication flow

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

## Real-time (SignalR)

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
