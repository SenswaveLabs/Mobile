# Native authentication and home UI

Welcome (`/start`), login, registration, forgot password and development server
selection render native React Native Reusables controls, preserving Senswave's
existing appearance. The home picker uses the same primitives. There is no Expo
DOM component, HTML form or WebView in these flows.

## Run

Use Node **26.10.0** and **pnpm 12.8.1**. Create `.env` from `.env.template`, then:

```bash
pnpm install --frozen-lockfile
pnpm android
pnpm start --dev-client --clear
```

Rebuild the development client when adding native modules, including
`react-native-svg` and `@maplibre/maplibre-react-native`. Expo SDK 54 and the existing
native providers remain in place; the map's Expo plugin is configured in `app.json`.

## Components and layout

- `src/components/ui` contains alert, button, text, input, label, checkbox and icon sources
  copied from the [official React Native Reusables registry](https://reactnativereusables.com/docs/installation).
  Imports point to this checkout; copied primitives retain their upstream APIs.
  Local sizing uses minimum heights instead of fixed responsive heights, and
  labels can shrink and wrap with larger text. The local Alert uses its published
  Reusables layout and icon positioning.
- NativeWind 4 and Tailwind CSS 3 compile classes to native styles. Configuration
  lives in `babel.config.js`, `metro.config.js`, `tailwind.config.js`, `global.css`
  and `components.json`. There is no DOM Tailwind v4/PostCSS pipeline.
- The root layout derives semantic CSS variables from `ThemeProvider`. Screen
  styles continue using `StyleSheet.create()` and the same theme colors. Native
  system font scaling applies automatically; controls have minimum touch sizes
  and can grow with text.
- Existing `common/Button`, `Input` and `PasswordInput` compose the Reusables
  primitives while preserving their existing native APIs and visual variants.
  Reusables use static style arrays and NativeWind active classes. Existing raw
  `Pressable` style callbacks opt out with `cssInterop={false}` because NativeWind
  4's native interop does not preserve these callbacks.
- Each auth, reset or join page owns its keyboard-aware scroll layout. Fields,
  inline errors and actions share the same scroll content. Growing content places
  actions near the bottom on tall screens; short screens can scroll to every
  action. There is no shared measured footer or keyboard-triggered action hiding.
- Auth, reset and home flows leave 16 dp below their scroll content, above the
  safe area already handled by the root. Auth section spacing uses visible-child
  margins so the keyboard scroll view's appended spacer adds no extra section gap.
- Home creation/settings use `HomeForm` with one keyboard-aware scroll page and
  inline Create/Save actions. Back leaves settings without saving. Saving preserves
  drafts, validates a trimmed 3–64-character name, sends only changed fields when
  editing and blocks duplicate mutations. Icon/location controls follow the saved
  draft; location is optional
  and an active location request keeps submission unavailable until it finishes.
  Source/access loading and recovery stay local to their sections. Owners retain
  source/access/delete actions; other members retain editing and leaving.
- Home settings show the shared `DataSourceState` badge beside the source name,
  wrapping on narrow windows or with large text. Its readable connection labels
  and light/dark semantic colors follow web Data Sources; the native palettes
  in `ThemeProvider` use hex counterparts of `apps/web/styles/theme.css`.
- Delete/Leave home uses the local Reusables `AlertDialog` copied from its official
  NativeWind registry, with its native animation helper and a named `PortalHost`
  inside a native Modal. The modal isolates the covered screen from assistive
  technology and treats hardware Back as cancellation. Trigger refs flow through `common/Button`
  for focus restoration; long confirmation text scrolls above explicit Cancel and
  Delete/Leave actions, stacked at every window width. Existing duplicate-request
  locks and inline failures remain. The animation helper's ref types use component
  instances for compatibility with this project's Reanimated version.
- Home location shows an address or “Selected location”; coordinates stay inside
  the form/API data. Choose on map opens a native MapLibre modal with OpenStreetMap
  raster tiles, a centered pin and explicit confirmation. Cancel leaves the draft
  unchanged. The map fills the remaining modal height, with a 220 dp minimum and
  scrolling on short windows or with large text. Confirmation leaves 16 dp above
  the safe area. `SenswaveModal` extends under Android system bars and applies
  its own safe-area padding once. The map has local loading/error/retry feedback
  with a 10-second initial loading bound, visible OpenStreetMap attribution and
  an identifying User-Agent. GPS remains a separate optional
  action. Expo web retains GPS and explains that map selection needs Android/iOS.
  The picker owns the SDK log callback while open: native errors become local
  recovery feedback, because style-load events alone do not report failed tiles.
- Home selection retains one native `FlatList`, pull-to-refresh, loading/empty/error
  states, inline switch recovery and the scrolling Create/Join footer. Joining
  uses eight native Reusables inputs grouped 4+4. Each segment owns its focus,
  selection and active border. Only the outline indicates focus; the caret,
  selection highlight and handles are hidden while character replacement remains
  available. Character entry advances focus; Backspace moves back; complete
  paste/autofill replaces the invitation. No transparent editing overlay or
  coordinate-based selection is used.
- [Form error placement](agent-guide/interface.md#form-error-placement--senswave-design-decision)
  is a Senswave design decision: field validation stays below the input, while
  failed actions appear above their primary button in normal scroll content.
  Action failures use the Reusables `Alert` destructive variant and `AlertDescription`;
  informational auth notices use the default variant.
  Invalid credentials and rejected invitations are action failures. Auth, reset,
  home selection, joining, creation and settings suppress legacy toast overlays, including late
  provider callbacks, and hide any earlier toast when entering these routes.
  Google Sign-In returns failures to the form for inline display.

## Authentication and data boundaries

- `(auth)/_layout.tsx` owns a native `Stack` with instant screen changes. Each of
  the five route files renders `AuthFlow` with its fixed screen and retains its URL.
  Forms stay mounted while covered by another route, preserving entered values on
  Back. The root stack also switches `/resetPassword`, `/terms` and `/privacy`
  without animations, keeping their screen-owned headers.
- `AuthPanel` handles fields, local validation, inline feedback and synchronous
  duplicate-submission prevention. Navigation and Remember me use the same guard
  without dimming the whole form; submissions keep their pending feedback.
  `AuthFlow` validates provider inputs again and
  delegates to `SessionProvider`. Google Sign-In and SecureStore stay in their
  existing native flows. Components do not perform HTTP requests.
- Registration retains password policy, confirmation and explicit legal consent.
  Success clears passwords and shows email verification. Login failures can expose
  resend confirmation; the auth layout shares its 60-second cooldown through
  `ResendCooldownContext`, preserving the limit across auth screens.
- Forgot password continues to `/resetPassword` with the email. Reset preserves
  required errors, first-invalid-field focus, backend errors, pending locks and retry.
  Success dismisses to `/start`, reusing a preceding auth group so subsequent login
  cannot leave old forms beneath the app.
- Server save/reset remains Development-only; validate HTTP(S) URLs in both form
  and adapter. Null restores the configured default and the form follows its URL.
- Home switching and joining keep their provider/API contracts and recovery logic.
  No backend contract changes are part of this UI migration.
- Creation falls back to the picker if its accepted POST cannot initialize the
  first home. Delete/leave invalidate only the removed current home before silent
  recovery and fall back to the picker on failure, without repeating a persisted
  destructive request. A newer current selection survives recovery.

## Checks

```bash
pnpm test:poc
pnpm test:homes
pnpm typecheck
pnpm lint
pnpm exec expo export --platform android --output-dir /tmp/senswave-mobile-export
```

Node checks execute real auth, reset and home handlers through the native-host
adapter. They verify validation, normalized input, pending/duplicate submissions,
errors and recovery; they do not establish device rendering or keyboard behavior.

On a development build, check welcome, login, registration, email verification,
forgot/reset password, resend, Remember me, Google Sign-In, legal links and server
save/reset. Check home loading, selection, retry, refresh, Create/Join and invite
entry. Cover Back, keyboard/autofill/password visibility, safe areas, both themes,
normal/200% text, and short windows. Report unavailable API or device checks precisely.
