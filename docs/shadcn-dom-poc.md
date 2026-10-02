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

- `src/components/dom/ui` and `styles/{globals,brand}.css` originate from
  `next-frontend/packages/ui`; their imports point only to this repository.
  The local `control-border` token gives text fields and unchecked checkboxes
  accessible boundaries in both themes without changing decorative border colors.
- `(auth)/_layout.tsx` keeps `auth/AuthFlow.tsx` mounted outside its child `Slot`.
  The five route files return null and retain their original URL paths. Changing
  screens updates a prop instead of creating another WebView and loading its bundle.
- `AuthPanel.tsx` owns HTML, field validation, pending states, and light/dark web styling.
  Mobile touch sizes and the system font fallback live in `styles/auth.css`.
  Its single-column layout follows the web sign-in form's hierarchy and copy,
  with a 52 px field floor and at least 48 px effective touch targets. Fields have
  a base 24 px separation; submit, secondary actions and sign-up/sign-in links form
  separate bottom region. The header stays above a scrolling content region,
  so long forms do not move the action section below the viewport. Content uses
  24/16 px top/bottom padding; actions use 16/32 px. At short windows and large
  text, actions can also scroll while retaining access to the form. Side padding
  stays 24 px when typography scales.
  An 8 px horizontal gutter preserves focus/validation rings outside scroll bounds.
  While the native keyboard is open, screen actions are hidden and editing uses
  the available height; Enter/Go submits, and dismissing restores the actions.
  Back and password visibility remain beside their respective context.
  Pixel floors stay independent of reduced system text size;
  rem typography and auto-height buttons still accommodate larger text.
- The native adapter passes the system font scale to the DOM's rem-based typography
  and wraps the WebView in the existing Keyboard Controller's `KeyboardAvoidingView`.
  Email's Next action focuses password; password's Go action submits the form.
- The root layout matches the five DOM screens and native password reset's
  status/navigation-bar safe areas to the auth surface using
  `ThemeProvider.colors.authBackground` in both light and dark mode.
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
- Native reset shares the brand through native auth theme roles, a constrained
  keyboard-aware form and named controls. Its field surfaces, labels, radii,
  button typography and arrow-only Back match the DOM screens. Fields and the
  bottom action group reuse `common/FormScreen`, shared with native joining.
  The shared native keyboard-visibility hook removes actions during editing and
  restores them after the keyboard closes. The keyboard-aware scroll body and
  measured action section occupy separate
  layout space; the primary action never overlays the fields or errors.
  Registration and reset reuse password
  validation. Reset shows required-field errors, focuses the first invalid field,
  preserves backend failures inline, and locks submit/editing while pending.
  It clears a changed field's stale error and restores controls after failures.
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

The Node checks cover login, registration, reset and server URL validation, the
DOM/native auth surface boundary, and reset submission/error/retry behavior.
The reset test executes the actual form with a small hook/native-host adapter;
it does not verify native rendering, keyboard behavior or screen-reader output.
Exporting Android also builds the DOM bundle and includes the logo
in the native asset manifest. For the embedded DOM HTML and image paths used by
an Android build (also suitable for a local browser preview), run:

```bash
pnpm exec expo export:embed --entry-file node_modules/expo-router/entry.js --platform android --dev false --bundle-output /tmp/senswave-auth-embedded/index.android.bundle --assets-dest /tmp/senswave-auth-embedded/res
```

On a development build, check welcome → login → registration → forgot password
and hardware Back without a blank screen or repeated WebView startup. Also check
invalid credentials, email verification, resend and its 60-second cooldown,
Remember me, Google Sign-In, legal links, server save/reset, production server
restriction, dark mode, smaller/larger text (including 200%), scrolling, autofill,
and the software keyboard. Continue through forgot password → native reset;
check required errors, code failures, retry, password visibility and Back there.
