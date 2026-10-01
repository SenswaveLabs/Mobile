# shadcn auth PoC

Welcome (`/start`), login, registration, forgot password and development server
selection render a local copy of the frontend's shadcn primitives and Tailwind v4
styles using [Expo DOM](https://docs.expo.dev/guides/dom-components/).
On iOS and Android these five routes share one WebView. The surrounding
application stays React Native.

## Run

Use Node **26.10.0** (see `.nvmrc`) and **pnpm 12.8.1** (see `packageManager`).
Configure `.env` from `.env.template`, then:

```bash
pnpm install --frozen-lockfile
pnpm android
pnpm start --dev-client
```

Open the login screen from the start screen. A new development build is needed
for `react-native-webview`; an older installed development client will not contain
the new native module.

## Boundaries

- `src/components/dom/ui` and `styles/{globals,brand}.css` are copies from
  `next-frontend/packages/ui`; their imports point only to this repository.
- `(auth)/_layout.tsx` keeps `auth/AuthFlow.tsx` mounted outside its child `Slot`.
  The five route files return null and retain their original URL paths. Changing
  screens updates a prop instead of creating another WebView and loading its bundle.
- `AuthPanel.tsx` owns HTML, field validation, pending states, and light/dark web styling.
  Mobile touch sizes and the system font fallback live in `styles/auth.css`.
  Its compact single-column layout follows the web sign-in form's hierarchy and copy,
  with 52 dp fields, at least 48 dp touch targets, and sign-up next to the form.
- The native adapter passes the system font scale to the DOM's rem-based typography
  and wraps the WebView in the existing Keyboard Controller's `KeyboardAvoidingView`.
  Email's Next action focuses password; password's Go action submits the form.
- The root layout matches all five screens' status/navigation-bar safe areas to the DOM
  surface using `ThemeProvider.colors.authBackground` in both light and dark mode.
  These sRGB colors must stay aligned with `--surface` in `styles/brand.css`.
- `auth/AuthFlow.tsx` validates inputs again and delegates to `SessionProvider`.
  Only serializable UI results cross the asynchronous DOM bridge. Tokens stay native
  and use the existing SecureStore flow; the panel performs no API requests.
- Theme and font scale apply before DOM paint. Native loading/error UI covers the
  first WebView startup until the DOM reports ready. A cold launch still initializes
  a WebView once; transitions within the auth group do not reload it. Leaving the
  group for a native route (legal documents, reset, consents) ends that instance.
- Inner form state resets on navigation, including passwords and field errors.
- Registration keeps the existing strong password policy and legal agreement;
  success shows a verification-email view. Forgot password sends the code using the
  existing API and proceeds to the native `/resetPassword` route with email.
- Google OAuth continues to use the native SDK through `useGoogleSignIn`.
- Server overrides stay native and Development-only. Both sides validate the URL;
  resetting clears the override, and the form follows the effective native URL.
- Existing reset/consent routes and API contracts remain in place.

These copies make the PoC independent of the frontend checkout. They do **not**
automatically synchronize future web changes. A shared versioned UI package can
replace the copies after the DOM approach has been evaluated on-device.

## Check

```bash
pnpm test:poc
pnpm typecheck
pnpm lint
pnpm exec expo export --platform android --output-dir /tmp/senswave-mobile-export
```

The Node check covers login, registration, server URL validation, and the shared
route boundary. Exporting Android also builds the DOM bundle and includes the logo
in the native asset manifest. For the embedded DOM HTML and image paths used by
an Android build (also suitable for a local browser preview), run:

```bash
pnpm exec expo export:embed --entry-file node_modules/expo-router/entry.js --platform android --dev false --bundle-output /tmp/senswave-auth-embedded/index.android.bundle --assets-dest /tmp/senswave-auth-embedded/res
```

On a development build, check welcome → login → registration → forgot password
and hardware Back without a blank screen or repeated WebView startup. Also check
invalid credentials, email verification, resend and its 60-second cooldown,
Remember me, Google Sign-In, legal links, server save/reset, production server
restriction, dark mode, larger text, scrolling, autofill, and the software keyboard.
