# Domain and API contracts

## Home tile controls

`PATCH v1/devices/{id}` accepts the existing tile fields with two additional type
strings: `Slider` and `Options`. Both use `operationId`; `displayableOperationId`
remains the Display readout reference. Slider configuration contains `step`
(default 1; 0 permits continuous Number operations) and `unit` (at most 5
characters). Its finite ordered range comes from the Number/Integer operation.
Integer sliders require a positive integral step. Discrete ranges are limited
to 10,000 steps to match the installed native slider's allocation limit.

Display responses add `configuration.range = { min, max }` for Slider and
`configuration.options: string[]` for Options. Options are operation-owned names;
their MQTT payload values stay inside the operation contract. Send a number or
an exact option name through the existing `POST v1/devices/{id}/tile/action`
body `{ value }`. Backend validates type, range/step or option membership and
retains existing device ownership and action permissions. No database migration
or new endpoint is required. Existing Default/Switch/Display payloads remain valid.

## Display summaries with multiple readings

Display keeps `displayableOperationId`, primary `tile.value` and `configuration.unit`.
Its configuration may also include `label` (up to 64 characters) and `readings`
(up to eight additional entries `{ operationId, label, unit }`, units up to five
characters). Each reference must select a different Number, Integer or Boolean
operation on the same device, excluding the primary operation. Configuration
writes omit runtime values and types; the server normalizes them before saving.
Display now accepts a Boolean primary operation for a read-only On/Off summary.
It still rejects actions through the tile action endpoint.

Display responses decorate the primary configuration with `label` and
`operationType`; each additional reading receives `value`, `operationType` and
its operation name when its configured label is empty. Keep native readings;
never invent unit conversions. The existing tile update event covers primary
and additional references. An operation referenced by a tile must be unassigned
before deletion. Existing scalar consumers and V1/V2 configuration envelopes stay
compatible. The implementation is in the sibling backend checkout and must be
integrated before clients rely on the additional metadata. Verify the backend
solution build and Devices test projects when changing this shared contract.

BooleanOperation presence `false` means Inactive, separately from a switch
reporting Off. Inactive summaries keep a disconnected icon beside the room in a neutral status chip, mask cached values
with em dashes and block commands; live subscriptions continue so they can
recover. Missing presence remains Status unavailable and is not inferred as
Inactive. No configured presence means no availability claim.

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
| Display | Text / Number / Integer | Shows current value, read-only |
| Switch | Boolean | Toggle true/false |
| Radio | Options | Pick from the widget's configured operation options |
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
interface Home { id, name, icon, isOwner, canManage?, dataSource: HomeDataSource, location: Location, rooms: Room[] }
// canManage is returned by GET v1/homes/{id} and v2 home lists; v1 list entries omit it.
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

After a successful delete/leave, call the initializer with
`{ silent: true, removedHomeId: id }`. It discards that home before recovery I/O,
including when the initiating screen lost focus. It preserves a different current
selection, including one selected during recovery. A failed initializer sends the
active details screen to the picker; it must not repeat the destructive request.
Ordinary initialization and refresh callers keep their existing behavior.

`DeviceListProvider` owns client-side device-list loading and error recovery. It
requests the complete V1 collection with `size=2147483647` (the API's full-collection
sentinel); omitting size returns only ten devices and gives incomplete room filters.
It derives room filtering from the current home's device collection, preserves a
valid selected room during refresh and resets to All on home changes. Collections
from another home are hidden immediately and late list responses are ignored.
Failed reads retain cached current-home devices and expose an inline error;
`404` represents an empty collection. `refresh()` schedules a reload and returns
`true`; awaiting it does not wait for the request or report its result. Retained
device-update callbacks consult the current-home ref before updating that collection.
These are client context behaviors; backend API contracts are unchanged.

`DeviceProvider` owns the selected device's dashboard collection and display
resource. It reads `GET v1/devices/dashboards/display?deviceId={deviceId}` and
`GET v1/devices/dashboards/{dashboardId}/display`; `loadError` carries dashboard
read recovery to the screen. Binding another device clears the previous device's
list and detail, and a detail response is accepted only for the active device,
dashboard and collection request. The context keeps its existing `refresh` and
`smartRefresh` signatures. This identity and local recovery state do not change
server contracts.

Dashboard placement uses `PUT v1/devices/dashboards/{dashboardId}/widgets` with
`{ widgetId, row, column, rowSpan, columnSpan }`. This endpoint adds a placement;
it rejects a widget ID already on the dashboard and does not update its geometry.
The picker excludes already placed IDs, and gesture editing applies to the unsaved
placement. Removing a dashboard placement
uses `DELETE v1/devices/dashboards/{dashboardId}/widgets/{widgetId}`; it does not
delete the widget definition. Live widget controls keep
`POST v1/devices/widgets/{widgetId}/action` with `{ value }`: Button sends an
empty string, Switch a Boolean, Radio the exact option name, Color the exact hex
string and Slider a number. Preserve values and opaque IDs as received. The
server remains responsible for authorization and validates these writes.

### Home and Device icons

Authenticated `GET v1/homes/icons` and `GET v1/devices/icons` return resource-specific
arrays of `{ key, labelKey }` objects, without a resource ID or an existing Home.
Keys are opaque and case-sensitive; the server owns label keys and the mobile app
maps the currently supported English labels. `useIconCatalog()` loads through
`useHttpClient()`, validates nonempty entries and unique keys, and exposes both the
entries and their derived key list. It shares in-flight/successful requests and scopes
its in-memory cache to the configured server and access token. A token refresh
conservatively reloads the catalog. Server, session or resource changes immediately
hide stale keys and ignore late responses. Failures expose inline feedback and retry,
never a local allowed list. The V1 catalog accepts only object entries; it does not
parse the previous string-array shape.

Home/Device forms pass the matching catalog to `IconSelector`; it constrains both
the quick strip and full search. The full resource browser shows and searches the
English label selected by each entry's `labelKey`; unknown labels fall back to the
opaque key. `resourceIcons.ts` maps resource keys to native Lucide symbols for
presentation only, including safe Home/Device fallbacks. It is not an allowed list.
Unknown or historical selections keep their original stored keys; their display
fallback must never become a submitted replacement. Other selector callers retain
their existing global icon browser.

Create requires a nonempty catalog key, including validation of `home-outline` and
`bulb-outline` defaults. PATCH omits an unchanged icon, so unrelated edits remain
usable when the catalog fails. An omitted, null or empty icon preserves the backend
value; an exact unchanged historical key is accepted even if absent from the
catalog. A changed unsupported or wrong-resource key returns `400`. Existing v1/v2
reads retain their public `icon` field.

Coordinate rollout across a metadata-capable `SenswaveLabs/Next-Backend` V1 that
returns `{ key, labelKey }` entries and the updated web and mobile clients. Older
clients expect string arrays and reject the object catalogs.

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
