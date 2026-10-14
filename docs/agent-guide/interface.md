# Mobile UI design policy

Read this before designing or changing any application interface. These are product
rules for Senswave mobile; apply Material Design 3 guidance through our existing
components and brand.

## Responsibilities and decision order

Material Design 3 defines interaction, hierarchy, navigation, adaptive layout,
states, touch ergonomics, feedback, motion and accessibility. Senswave's existing
shadcn-based web product defines visual language: semantic colors, typography,
radii and component appearance. Do not import Material palettes or recreate
Google's component visuals unless explicitly requested.

Resolve decisions in this order:

1. User task and information hierarchy.
2. Accessibility and usability.
3. Android/iOS conventions.
4. Material Design 3 interaction and layout guidance.
5. Established Senswave product patterns.
6. Existing components and primitives.
7. Decoration.

Accessibility and task completion take priority over matching a visual pattern.

## Implementation boundaries

- Auth, home selection, creation and settings use local React Native Reusables components in
  `src/components/ui`. These render native controls. Keep imports local; use
  `next-frontend/apps/web` as a visual reference, without importing its DOM components.
- App components use `FC`/`FC<Props>` and interface props. Copied React Native
  Reusables primitives keep upstream signatures.
- Screen styling uses `StyleSheet.create()` and `useTheme()` colors. Reusables
  primitives use NativeWind; root CSS variables derive from the same `ThemeProvider`.
  Keep the current brand palette, radii, typography and touch targets.
- Authentication, HTTP calls, Google OAuth and SecureStore use the existing native
  providers. Validate beside the fields and at the provider boundary.
- Configure new Reusables primitives through `components.json`; inspect the local
  component before copying another one. Install only the primitives a screen needs.

## Screen hierarchy and actions

- Every screen has one clear purpose. Identify essential information, the primary
  action, secondary actions and navigation before choosing a layout.
- Keep the primary action obvious; give equal emphasis only to equally important
  actions. Place actions next to the object or content they affect.
- Use progressive disclosure for advanced controls. Group related content by
  proximity and consistent spacing before adding cards, borders or separators.
- Space between groups should make their hierarchy clear. Auth, reset and invitation
  screens own their layouts. Keep fields and actions in one keyboard-aware scrolling
  page; use growing content or `marginTop: "auto"` for bottom placement on tall screens.
  Actions stay reachable on short windows and with large text. Do not measure a shared
  footer, nest keyboard-avoiding containers or hide submit actions while editing.
  Back stays beside the header; password visibility stays beside the field.
- Distinguish destructive actions through wording, semantics and styling. Use
  confirmation or undo when needed to prevent irreversible data loss.
- Ambiguous icons need visible labels; every icon-only action needs an accessible
  name. Do not add a floating/fixed action without a frequent, important task.

## Adaptive layout and mobile ergonomics

- Start with the smallest supported window. Use available width, not device names,
  and adapt at breakpoints; do not proportionally shrink desktop UI.
- On wider windows, constrain text/form width and reorganize content or navigation
  when it improves the task. Use multiple panes only when simultaneous context helps.
  Do not stretch a narrow form across a tablet.
- Reuse existing spacing scales and typography. Handle orientation, split screen,
  long translations and larger system text without clipping essential content.
- Respect safe areas, cutouts, gesture regions and system bars. Match their surfaces
  to the screen and keep system-bar icons legible in light and dark mode.
- Touch targets must have at least a 48 × 48 dp effective area. A smaller visible
  icon is fine inside that target; padded or expanded targets must not overlap.
- The keyboard must not cover the focused input or required action. Use the
  existing keyboard-aware container and scrolling, correct input types, autofill,
  and Next/Done/Go actions appropriate to the form.

## Navigation and overlays

- Navigation follows information architecture. Keep frequent destinations easy to
  reach, make the current location clear and distinguish navigation from mutations.
- Preserve Expo Router history, Android hardware/predictive Back behavior supported
  by the app, and iOS back gestures.
- Back closes a transient overlay before leaving its underlying screen. Dismissal,
  outside taps and unsaved-input handling must be predictable.
- Use a dialog for a focused decision, a sheet/drawer for temporary contextual
  content, and a separate screen or inline flow for a complex or multi-step task.
- Avoid stacked modals. Manage focus on open/close and expose a usable dismiss action.
  Use existing native modal/menu providers or appropriate native primitives.

## Forms, feedback and state

- Ask only for data needed by the task. Use explicit labels, useful hints, suitable
  controls, and errors next to the affected field that explain how to recover.
- Preserve valid input after errors. Never communicate validation only through color.
- Cover applicable idle, focus, pressed, selected, disabled, loading, empty, success
  and error states. Hover is additional feedback for pointer input, never a
  requirement to discover essential content or actions.
- Every mutation gives understandable feedback. While pending, keep one submit
  button with progress, disable relevant controls and prevent duplicate submission.
- Load locally when only one section is waiting. Preserve usable context and give
  retry/recovery for failures rather than an unexplained blank screen.
- Keep important errors and recovery actions visible. Auth, reset, home selection
  joining, creation and settings use inline feedback; legacy toast overlays are disabled on these routes.

### Form error placement — Senswave design decision

Classify errors by what failed, not by whether validation ran locally or a backend
response arrived after submission. A form may contain multiple fields.

- **Field error:** a specific value is missing or invalid, such as an empty password,
  malformed email, incomplete invitation code or mismatched password confirmation.
  Show supporting/error text directly below the affected input and mark that field
  invalid. A backend error may also belong to a field when it identifies that field.
- **Action error:** the submission as a whole failed, such as invalid login credentials,
  an expired/rejected invitation, a connection failure or an unavailable service.
  Show one persistent inline message immediately above the primary action, within
  the same keyboard-aware scroll content. Do not mark otherwise valid fields invalid
  or move focus to an arbitrary field.
- Render form action failures with the local [React Native Reusables Alert](https://reactnativereusables.com/docs/components/alert):
  `Alert` with `variant="destructive"`, a `CircleAlert` icon and `AlertDescription`.
  Use the default variant for informational notices. Keep these alerts in normal
  layout flow above the action; field supporting text remains attached to its input.
- Preserve entered values, release the pending lock and keep retry available. Clear
  stale action feedback when the relevant input changes or a new attempt starts.
  Expose errors to assistive technology. The message takes its own layout space;
  it must not float over the button, dismiss the keyboard or trigger a duplicate toast.
- Apply the same placement when an action uses two or more fields: an empty password
  belongs below Password; "Invalid email or password" belongs above Sign in.
  For joining, code length/format errors belong below the code; rejection returned
  by the join request belongs above Join home.

Material Design 3's [text-field documentation](https://github.com/material-components/material-web/blob/main/docs/components/text-field.md)
supports field-associated error text. Placing action errors above the primary
button is Senswave's explicit design decision, not a prescribed MD3 position.
Expo's native UI guidance requires reachable actions and preserved drafts during
failed saves; it does not prescribe this exact placement. Keep this policy in the
repository guide rather than modifying installed Expo skills.

## Accessibility and motion

- Provide native accessible names, roles, states and logical screen-reader order;
  announce relevant changes without interrupting every update. Associate labels with fields.
- Support keyboard navigation and visible focus where applicable, including external keyboards. Overlays must restore focus; no keyboard traps.
- Preserve system text scaling and web zoom. Avoid fixed-height text containers
  that clip content at large font sizes.
- Maintain WCAG AA contrast: at least 4.5:1 for normal text and 3:1 for large text;
  meaningful non-text UI indicators need sufficient contrast too. Verify both themes.
- Do not encode essential meaning using color alone. Text, icons and semantics
  must communicate selected, error and destructive states.
- Motion explains cause/effect, spatial relationships or state changes. Keep it
  efficient; skip purely decorative animation. Respect native reduced-motion
  settings.
- Verify screen-reader and touch behavior on native screens.

## Visual tokens and component selection

- Use the existing light/dark `ThemeProvider` roles. React Native Reusables semantic
  tokens (`background`, `foreground`, `card`, `primary`, `muted`, `border`, `input`, `ring`
  and their foreground pairs) derive from those colors in the root layout.
- Do not replace Senswave's palette with Material token values. Introduce a semantic
  role only for a concrete need, with light/dark values.
- Every screen uses the same themed canvas background: light `#F9F7F1`, dark
  `#100D08`. Native `colors.background` and `authBackground` match. Match headers, safe areas and launch backgrounds to this
  canvas; do not introduce different page backgrounds for auth, empty or loaded
  states. Fields, cards and overlays may use their appropriate surface roles.
- Before creating a component, inspect the existing project component and the
  applicable local React Native Reusables primitive; compose them when appropriate. Create a new
  component only when needed, without changing the meaning of a reused control.
- Extend the existing visual system rather than introducing an unrelated one-off.

Translate Material's interaction patterns using the existing native modal/menu
providers and appropriate React Native Reusables primitives. Install additional
primitives only for a concrete screen need.

Do not use tabs for an unrelated value selector or a switch for an action that
requires an explicit submission.

## Anti-patterns

Avoid competing primary buttons, nested cards, excessive borders, arbitrary
spacing, decorative gradients/shadows, ambiguous icon actions, hover-only content,
complex modal flows, desktop controls compressed into a phone, and native screens
wrapped in new WebViews solely to reuse a web component. Reuse the simplest
standard control that explains the task.

## Before implementation and handoff

Briefly determine the goal, essential information, primary/secondary/navigation
actions, applicable states, narrow/wide behavior, accessibility needs and existing
component choices. Do this in the implementation plan; do not require a separate
approval or design document for a routine change.

Implement the simplest interface that meets those needs. Verify the changed flow,
Back, keyboard, touch targets, light/dark mode and text scaling in the relevant
runtime. A browser preview does not verify native keyboard, safe areas or
hardware Back. Follow [Validation](validation.md) and report unverified behavior.

## Current component and screen conventions

- App components are functional, typed `FC` / `FC<Props>`, with interface props; copied React Native Reusables primitives retain upstream signatures.
- Native screen styling uses `StyleSheet.create()` and `useTheme()` colors. Local
  React Native Reusables primitives use NativeWind; there are no Expo DOM screens.
- `(auth)` uses a native `Stack` with instant screen changes. Each route renders
  `AuthFlow` with its own fixed screen, preserving its form while another route
  covers it and restoring it on Back. The auth layout shares the resend cooldown
  through `ResendCooldownContext`. Password reset and the public legal pages also
  switch without animations in the root stack; headers remain inside their screens.
  Navigation and Remember me keep fields and buttons visually enabled while their
  synchronous guard prevents repeated actions. Form submissions retain pending feedback.
- The root layout fills both system-bar safe areas with `colors.background` on every
  route: light `#F9F7F1`, dark `#100D08`. Status-bar icons follow the app theme.
- Auth, reset, home selection, empty state, joining and home forms use 16 dp of
  bottom content padding above the root-managed gesture/system-bar safe area.
  Keep section spacing off the auth scroll content container: the keyboard-aware
  scroll view appends its own spacer, which must not receive another section gap.
- `SenswaveModal` extends beneath the Android system bars; its container applies
  safe-area padding once. The location picker grows its map into the available
  height between the introduction and attribution/actions, with 16 dp below the
  confirm button. A 220 dp minimum map height keeps short windows and large text
  scrollable without shrinking the map away.
- Home deletion/leaving uses the local React Native Reusables `AlertDialog` with
  an explicit Cancel and Delete/Leave action. Keep its trigger, title, description
  and actions within the same controlled root. A named portal inside a native
  Modal isolates the covered screen for assistive technology and handles hardware
  Back as cancellation. `common/Button` forwards the native ref so the primitive
  can restore focus to its trigger. Scroll long confirmation text while keeping
  actions visible; stack full-width actions at every window width. Retain the
  existing request lock and inline recovery.
- Auth and reset use 448 dp maximum width, 24 dp side padding, 24 dp field gaps and
  32 dp section gaps. Native fields have a 52 dp minimum height, 1 dp border and
  8 dp radius; submit buttons have a 48 dp minimum height and 8 dp radius.
  Their keyboard-aware scroll content includes context, errors and actions.
- Native `Input` connects its visible label to the field, exposes errors to assistive
  technology and shows focus/error borders. `PasswordInput` adds a named 48 dp
  visibility toggle. Buttons retain their label and expose disabled/busy state.
  Async submissions keep inline failure messages and release their synchronous lock.
- Registration requires 10–64 characters, lowercase, uppercase, number, special
  character, matching confirmation and explicit Terms/Privacy agreement. Success
  shows email verification; forgot password continues to `/resetPassword` with email.
- Server selection is Development-only. Validate absolute HTTP(S) addresses in the
  form and adapter; pass null to restore the configured default. The form follows
  the effective URL from `ConfigurationProvider`.
- Native home selection uses one `FlatList`, with the current home identified by text, a checkmark and selected state. Other homes switch immediately on tap; wait for a successful `HomeProvider.setCurrent` result before navigating and prevent duplicate switches. Keep switch errors beside the attempted home without an overlay toast; list errors include a visible Retry action. Load once per focus and support pull-to-refresh. Expose Home details without a long press. Create/Join are secondary actions in the scrolling footer, using remaining space on short lists and scrolling with long lists or large text. Use the optional `DefaultHeader` `brand` variant, `Icon` `brand` color and `Button` `brand-outline` type on this screen.
- Native `/home/join` uses the brand header and `HomeCodeInput`: eight native Reusables inputs grouped 4+4. Groups wrap with large text or narrow width. Each segment owns its native focus and selection bounds; its active border uses `authFocus`, like other form fields. Focus is shown by the outline only, without a visible caret, selection highlight or handles; the selected character can still be replaced. Character entry advances focus, Backspace moves back, and complete paste/autofill replaces the invitation. Do not place a transparent editing surface over decorative slots. Trim and uppercase the invite code; validate all eight A–Z/0–9 characters before sending. Keep length/format errors below the field and request failures above Join home, preserve the code after failure and share one synchronous submit lock between button and keyboard. The primary action stays in the same keyboard-aware scroll content, with growing space above it. Preserve an existing current home; await first-home initialization with `{ silent: true }` before leaving, so this screen owns feedback. If acceptance succeeds but initialization fails, open `/home/list` rather than resending the invitation. The picker stays available without a current home. Ignore late feedback/navigation after leaving; never log invite codes.
- The dashboard's `NoHomeScreen` is a native empty state with a clear setup heading, a short explanation and a decorative home icon. `Create home` is primary (`Button` `auth` type); `Join home` is secondary (`brand-outline`). Keep both in growing scroll content with a 448 dp maximum width and space above their group, so short windows and large text retain every action. Use brand foreground/muted tokens on the shared canvas background, keeping it aligned with its header and safe areas. Preserve the parent navigation and refresh callbacks.
- Native `/home/add` and `/home/details` use `HomeForm`: one keyboard-aware scroll page, a brand header, 448 dp maximum width, 24 dp side padding and named Create/Save actions. Back leaves settings without saving. Validate the trimmed name at 3–64 characters. Keep field errors below Name and action alerts above Save/Create; changing the icon or location must not clear a name error. Maintain the mounted draft while saving, block duplicate submissions synchronously and release pending state after a request even if the retained screen lost focus. Successful saves update the saved baseline even while the screen is unfocused; subsequent edits send only fields changed since that save. Creation initializes the first home silently and recovers to `/home/list` after an accepted create with failed initialization. Returning to a retained screen after an accepted create also opens the picker; do not repeat POST.
- Home icon selection opts into the existing `IconSelector` and `SenswaveModal` brand variants. Expose labeled 48 dp targets and selected state; size the brand grid from the available modal width. Both icon lists keep taps actionable while the keyboard is open. Existing icon-selector callers keep the legacy appearance. `LocalizationSelector` shows an address or “Selected location”, never raw coordinates. Choose on map opens `home/LocationMapPicker`: a native MapLibre map with a fixed center pin, pan/zoom and explicit confirmation. Cancellation preserves the draft; opening the map requests no location permission. Current-location lookup remains optional, with an inline permission/timeout error and a 10-second request bound. Zero coordinates are valid; restored coordinates update the display. An open picker or pending location request keeps Create/Save unavailable until it finishes. Keep the form's loading callback stable so its rerenders do not close the picker.
- Home settings group the data source, access list and destructive action after the form. Only owners see source/access/delete actions; other members retain their existing edit permissions enforced by the API and can leave. Keep source/access loading local, provide Retry and empty states, and retain confirmations for deleting a home, leaving or removing access. `Button` `brand-destructive` uses a destructive outline and label; individual access-removal labels identify the affected email. After persisted deletion/leaving, discard only the removed current home, initialize the next selection silently and recover to the picker if initialization fails. Never retain a removed home or repeat a completed destructive request to retry selection.
- Local UI / form state: `useState`.
- Data-source states share the native `DataSourceState` badge. Home settings place
  it beside the source name in a wrapping row. Match web labels and semantic tones:
  Working/Connected → Connected (positive), Restarting/Connecting → warning,
  Error → critical, and NotStarted/Stopped or unknown states → Disconnected
  (neutral). The `dataSourceStatus` theme palettes mirror the web's light/dark
  status colors; keep readable text, a decorative indicator and no pulse animation.
- Re-fetch trigger: increment a numeric state counter.
- Home/Device `IconSelector` receives the fetched resource catalog for both its quick
  strip and searchable browser, with local glyphs/labels, named 48 dp targets and
  selected/disabled accessibility states. Loading and failure stay local to the
  icon field, with a visible Retry icons action. Preserve the current historical key
  and let unrelated existing-resource edits proceed without a catalog; new or
  changed choices require a loaded matching key. Defaults are validated rather than
  replaced automatically. Dashboard, Radio and Automation retain the global browser.

## Existing native components

| Component              | Purpose                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `JsonPathSelector`     | Define JSON field path list for parsing MQTT messages. Validates: no `"` or `\`, no control chars, max 64 chars/key |
| `Icon`                 | Wrapper over `@expo/vector-icons`, curated set                                                                      |
| `Modal`                | Generic modal via `ModalProvider`                                                                                   |
| `PasswordInput`        | Native secure input + show/hide toggle                                                                              |
| `SafetyNote`           | Info/warning callout in forms                                                                                       |
| `Expander`             | Collapsible section (Home details: sharing list, rooms)                                                             |
| `Dropdown`             | Selection (profile theme, language)                                                                                 |
| `HorizontalSelector`   | Tab-style horizontal option picker                                                                                  |
| `LocalizationSelector` | Optional home location, native map selection and GPS; address/selected-place display |
| `SimpleItemList`       | Generic key-value list                                                                                              |
| `UserProfileImage`     | Avatar from email initial                                                                                           |

## Official references

- [Material Design 3 foundations](https://m3.material.io/foundations/) — interaction, layout and accessibility guidance.
- [Android layout structure](https://developer.android.com/design/ui/mobile/guides/layout-and-content/content-structure) and [action placement](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns) — spacing, hierarchy and contextual controls.
- [shadcn/ui](https://ui.shadcn.com/docs), [theming](https://ui.shadcn.com/docs/theming) and [agent skills](https://ui.shadcn.com/docs/skills) — components, semantic roles and composition.
- [React Native Reusables](https://reactnativereusables.com/docs/installation) — native primitives and NativeWind setup.
- [React Native accessibility](https://reactnative.dev/docs/accessibility) — native roles, states and assistive technology.
- [Android accessibility](https://developer.android.com/guide/topics/ui/accessibility/views/apps-views) — effective touch targets.
- [WCAG contrast](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum) — text contrast requirements.
