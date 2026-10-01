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
| UI | Hand-rolled primitives in `src/components/common/*` (`Pressable` + `StyleSheet` + `useTheme()`). Support libs: `reanimated-color-picker`, `@react-native-community/slider`, `react-native-markdown-display` |
| Auth PoC | Welcome, login, registration, forgot password and development server selection share one persistent Expo DOM WebView (`react-native-webview`), with copied shadcn + Base UI + Tailwind CSS v4. Auth actions stay native. See the [auth PoC](../shadcn-dom-poc.md). |
| Backend | .NET Minimal API — modular monolith (`Senswave.sln`) |

App version: **1.1.0**. Version source: `remote` (EAS-managed).

## Directory map

```
src/
  app/                      # Expo Router routes (file-based)
    (auth)/                 # persistent AuthFlow layout; start, login, register,
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
    dom/                    # local shadcn primitives, web styles, AuthPanel + authTypes bridge
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
  hooks/                    # shared custom hooks, including native useGoogleSignIn
  types/
    DeviceTypes.tsx         # OperationType, WidgetType, OperationDto, WidgetDto
    HomeTypes.tsx           # Home, Room, Location, HomeSharingDto, HomeRolesToName
    AutomationsTypes.tsx    # AutomationDto, ConditionType, ConditionConnector
    DataSourcesTypes.tsx    # DataSourceDto, SubscriptionDto, MqttVersion
  utils/
    httpClient.tsx          # executeTimeout, HttpResponse — ONLY place fetch is called
    result.tsx              # Result<T>, SimpleResult
    authValidation.ts       # shared email/login/register/server validation at the DOM/native boundary
    location.tsx
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
