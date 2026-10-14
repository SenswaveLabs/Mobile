# Repository and conventions

## Tech stack

| Layer | Tech |
|-------|------|
| Mobile | React Native 0.81.5 + Expo ~54, React 19 |
| Routing | Expo Router 6 (file-based) |
| Language | TypeScript 5.9 (strict) |
| State | Context API + custom hooks |
| Real-time | SignalR (`@microsoft/signalr` 8.x) |
| Auth storage | `expo-secure-store` |
| UI | Local React Native Reusables primitives in `src/components/ui`, including AlertDialog with a named `@rn-primitives/portal` host in a native Modal, NativeWind 4 + Tailwind CSS 3. Existing `common` wrappers preserve their native APIs and appearance. Support libs: `reanimated-color-picker`, `@react-native-community/slider`, `react-native-markdown-display` |
| Auth and home UI | Welcome, login, registration, forgot password and development server selection render native `auth/AuthPanel`. Home selection, joining, creation and settings use the same local primitives; `home/HomeForm` owns its fields and save actions. Session actions, Google OAuth and storage use the existing providers. See [native auth and home UI](../native-auth-ui.md). |
| Home location | MapLibre React Native 11 with OpenStreetMap raster tiles; native modal picker and optional Expo Location GPS/address lookup. Expo web keeps a native-control fallback without importing the map SDK. |
| Backend | .NET Minimal API — modular monolith (`Senswave.sln`) |

App version: **1.1.0**. Production version source: `remote` (EAS-managed).
Next-dev APKs use `app.config.js` for a separate package and CI version code;
see [Tooling](tooling.md).

## Directory map

```
src/
  app/                      # Expo Router routes (file-based)
    (auth)/                 # native auth Stack; start, login, register,
                            #   forgotPassword, server (URL paths unchanged)
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
    confirmEmail / resetPassword / consents / maintenance / privacy / terms
  components/
    ui/                     # copied React Native Reusables primitives
    common/                 # shared UI (Button, Input, Text, Dropdown, Loading, ...)
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
  hooks/                    # shared custom hooks, including native useGoogleSignIn
  types/
    DeviceTypes.tsx         # OperationType, WidgetType, OperationDto, WidgetDto
    HomeTypes.tsx           # Home, Room, Location, HomeSharingDto, HomeRolesToName
    AutomationsTypes.tsx    # AutomationDto, ConditionType, ConditionConnector
    DataSourcesTypes.tsx    # DataSourceDto, SubscriptionDto, MqttVersion
  utils/
    httpClient.tsx          # executeTimeout, HttpResponse — ONLY place fetch is called
    result.tsx              # Result<T>, SimpleResult
    authValidation.ts       # shared email/login/register/reset/server validation
    location.tsx
  lib/utils.ts              # class merging for React Native Reusables
  styles/                   # shared style helpers
```

## Naming

| Artifact | Rule | Example |
|----------|------|---------|
| Components | PascalCase | `DeviceForm.tsx` |
| Context providers | PascalCase + `Provider` | `SessionProvider.tsx` |
| Custom hooks | `use` + camelCase | `useSession`, `useDeviceList` |
| Routes / utils / styles | camelCase | `add.tsx`, `httpClient.tsx` |
| Type files | PascalCase | `DeviceTypes.tsx` |
| Props interface | PascalCase + `Props` | `interface DeviceFormProps` |
| Callback props | `onPress`, `onSubmit`, `setValue` | — |

## Path aliases

| Alias | Target | Configured in |
|-------|--------|---------------|
| `@/*` | `./src/*` | `tsconfig.json` |
| `@components` | `./src/components` | `babel.config.js` (module-resolver) |
| `tests` | `./tests/` | `babel.config.js` |

Babel resolver `root` is `./src`, so bare imports resolve from there too.
The Babel preset resolves through the installed `expo` package; do not rely on
hoisted transitive dependencies, since Gradle invokes Node directly.

React Native Reusables sources are copied from the official NativeWind registry, with local import aliases. `components.json` records these aliases; `metro.config.js`, `babel.config.js`, `tailwind.config.js` and `global.css` configure NativeWind. The root layout derives native CSS variables from `ThemeProvider`, keeping one palette. Do not reintroduce Expo DOM, Base UI or a WebView for these screens. React Native Web and React DOM remain only for Expo web support.
