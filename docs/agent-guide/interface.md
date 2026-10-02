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

- This is React Native, not a Next.js app or PWA. Original shadcn/ui components use
  React DOM and belong only inside an Expo DOM component.
- Native screens reuse `src/components/common`, `StyleSheet.create()` and colors
  from `useTheme()`. App components use `FC`/`FC<Props>` and interface props;
  copied shadcn primitives keep their upstream signatures. Do not put color
  literals in native component styles.
- DOM screens reuse `src/components/dom/ui` and its installed Base UI APIs. Do not
  assume Radix props or add another primitive library for an equivalent control.
- Use `next-frontend/apps/web` and its shared UI as the brand reference when
  available. Choose hierarchy, navigation and action placement for the mobile
  task; web and mobile can serve different UX purposes and need not match 1:1.
  Keep mobile imports local; do not import code from the sibling checkout.
  Marketing layouts from `apps/landing` are not the default for the mobile product.
- Match visual intent while keeping native navigation, keyboard and accessibility
  behavior. This policy does not require migrating native screens into WebViews.
- Authentication, API calls and SecureStore remain native. Send serializable UI
  props/results across the DOM bridge and validate input at both boundaries.
- For shadcn work, follow the official shadcn skill when available. Read
  `components.json` when present; this checkout currently uses copied primitives
  without that configuration, so inspect local sources before using a CLI.

## Screen hierarchy and actions

- Every screen has one clear purpose. Identify essential information, the primary
  action, secondary actions and navigation before choosing a layout.
- Keep the primary action obvious; give equal emphasis only to equally important
  actions. Place actions next to the object or content they affect.
- Use progressive disclosure for advanced controls. Group related content by
  proximity and consistent spacing before adding cards, borders or separators.
- Space between groups should make their hierarchy clear. Auth forms keep fields
  and their local controls together, with screen-level actions grouped at the
  bottom when space allows. Use flexible space and scrolling rather than an
  overlay: short windows, the keyboard and large text must keep every action
  reachable. Back stays in the header; password visibility stays in its field.
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
  In the DOM WebView, keep the viewport at device width and use CSS sizing that
  preserves the equivalent touch area rather than desktop component defaults.
- The keyboard must not cover the focused input or required action. Use the
  existing keyboard-aware container and scrolling, correct input types, autofill,
  and Next/Done/Go actions appropriate to the form.

## Navigation and overlays

- Navigation follows information architecture. Keep frequent destinations easy to
  reach, make the current location clear and distinguish navigation from mutations.
- Preserve Expo Router history, Android hardware/predictive Back behavior supported
  by the app, and iOS back gestures. Do not add a second browser/router history in DOM.
- Back closes a transient overlay before leaving its underlying screen. Dismissal,
  outside taps and unsaved-input handling must be predictable.
- Use a dialog for a focused decision, a sheet/drawer for temporary contextual
  content, and a separate screen or inline flow for a complex or multi-step task.
- Avoid stacked modals. Manage focus on open/close and expose a usable dismiss action.
  Use existing native modal/menu providers or appropriate DOM primitives.

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
- Reuse current toast/error/loading mechanisms. Keep important errors or recovery
  actions visible; do not rely on a short-lived toast alone.

## Accessibility and motion

- Native: provide accessible names, roles, states and logical screen-reader order;
  announce relevant changes without interrupting every update. DOM: use semantic
  elements, associated labels and existing accessible primitive behavior.
- Support keyboard navigation and visible focus where applicable, including DOM
  and external keyboards. Overlays must restore focus; no keyboard traps.
- Preserve system text scaling and web zoom. Avoid fixed-height text containers
  that clip content at large font sizes.
- Maintain WCAG AA contrast: at least 4.5:1 for normal text and 3:1 for large text;
  meaningful non-text UI indicators need sufficient contrast too. Verify both themes.
- Do not encode essential meaning using color alone. Text, icons and semantics
  must communicate selected, error and destructive states.
- Motion explains cause/effect, spatial relationships or state changes. Keep it
  efficient; skip purely decorative animation. Respect native reduced-motion
  settings and DOM `prefers-reduced-motion`.
- Screen-reader and touch behavior must work across the native/DOM boundary.

## Visual tokens and component selection

- Use the existing light/dark design tokens. In DOM, prefer roles such as
  `background`, `foreground`, `primary`, `secondary`, `muted`, `accent`,
  `destructive`, `border`, `input` and `ring`, with the matching foreground pair.
  Native screens use the equivalent existing `ThemeProvider` roles.
- Do not hardcode arbitrary component colors or replace Senswave's palette with
  Material token values. Introduce a shared semantic role only for a concrete need,
  with light/dark values; keep native and DOM surface colors aligned where they meet.
- Every screen uses the same themed canvas background: light `#F9F7F1`, dark
  `#100D08`. Native `colors.background` and the existing `authBackground` role
  match DOM `--surface`. Match headers, safe areas and launch backgrounds to this
  canvas; do not introduce different page backgrounds for auth, empty or loaded
  states. Fields, cards and overlays may use their appropriate surface roles.
- Before creating a component, inspect the existing project component and the
  applicable local shadcn primitive; compose them when appropriate. Create a new
  component only when needed, without changing the meaning of a reused control.
- Extend the existing visual system rather than introducing an unrelated one-off.

Translate Material's interaction pattern into the component with the correct
semantics. These DOM examples are choices, not a list of dependencies to install;
use equivalent project/native controls outside DOM.

| Interaction | DOM component choice |
| --- | --- |
| Focused decision | `Dialog`; `AlertDialog` for a consequential confirmation |
| Contextual bottom sheet | `Drawer` |
| Navigation drawer | `Sheet` or the existing navigation component |
| Action menu | `DropdownMenu` |
| Snackbar/notification | Existing toast mechanism |
| Text entry | `Input` / `Textarea` |
| Selection / immediate setting | `Checkbox` / `RadioGroup` / `Switch` by semantics |
| Switch content panels | `Tabs` |
| Choose a mode or value | `ToggleGroup` when its selection semantics fit |

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
runtime. A DOM browser preview does not verify native keyboard, safe areas or
hardware Back. Follow [Validation](validation.md) and report unverified behavior.

## Current component and screen conventions

- App components are functional, typed `FC` / `FC<Props>`, with interface props; copied shadcn primitives retain upstream signatures.
- Native styling: `StyleSheet.create()` + `useTheme()` colors. DOM styling: local Tailwind tokens and copied shadcn primitives; no imports from the frontend checkout.
- The `(auth)` layout owns one `auth/AuthFlow` WebView outside its child `Slot`; route files return null. Navigate with Expo Router and pass the active screen as a prop. Do not mount a separate DOM component per auth route. Only form state resets between screens.
- The root layout fills both system-bar safe areas with `colors.background` on every route. Its light/dark sRGB values and the existing `authBackground` role match `--surface` in `components/dom/styles/brand.css`. Status-bar icons follow the app theme. Background selection must not depend on the route or whether a home exists; `getAuthScreen` still selects only the five DOM screens.
- Native reset password uses the shared keyboard-aware scroll container, a 448 dp maximum form width and native Back. Its `authForeground`, `authMuted`, `authFieldBackground`, `authBorder`, `authFocus`, `authPrimary` and `authOnPrimary` theme roles match the DOM brand. Use the native `Input`/`PasswordInput` `auth` variant and `Button` `auth` type on this flow. Native `/home/list` reuses these existing brand colors; unrefactored screens retain their visual variants.
- Auth forms use base spacing of 24 dp between fields and at least 32 dp before their screen-level action group; DOM rem spacing adapts to the system text size. The DOM group uses flexible remaining space; native reset uses the same layout in its growing scroll content. Native auth fields have a 52 dp minimum height, 1 dp border and 8 dp radius; submit buttons have a 48 dp minimum height and 8 dp radius. Labels, surfaces and arrow-only Back match the DOM visual language while retaining native accessibility and text scaling.
- Native `Input` connects its visible label to the text field, exposes field errors to assistive technology and shows focus/error borders. `PasswordInput` composes it with a named 48 dp visibility toggle. Native buttons keep their action label while loading and expose disabled/busy state. Async reset submissions return `Promise<SimpleResult>`, keep failure messages inline and always release the synchronous submission lock.
- Auth DOM typography scales with native `useWindowDimensions().fontScale`. Touch targets retain a 48 CSS px floor independent of rem scaling; buttons grow with wrapped text. The local `control-border` semantic token identifies fields and unchecked checkboxes with sufficient contrast, while `border` remains decorative. Its native adapter uses the existing Keyboard Controller's `KeyboardAvoidingView`; keep the WebView scrollable. Native loading/error UI covers the initial WebView startup until the themed DOM reports ready.
- Registration requires 10–64 characters, lowercase, uppercase, number, special character, matching confirmation, and explicit Terms/Privacy agreement. Validate again at the native bridge. Show email verification after registration; forgot password continues to `/resetPassword` with email.
- Server selection is visible and writable only in Development. Validate absolute HTTP(S) addresses at both boundaries; use null in the bridge to restore the configured default, then update the form from the native URL prop.
- Native home selection uses one `FlatList`, with the current home identified by text, a checkmark and selected state. Other homes switch immediately on tap; wait for a successful `HomeProvider.setCurrent` result before navigating and prevent duplicate switches. Keep switch errors beside the attempted home, with the existing toast as immediate feedback; list errors include a visible Retry action. Load once per focus and support pull-to-refresh. Expose Home details without a long press. Create/Join are secondary actions in the scrolling footer, using remaining space on short lists and scrolling with long lists or large text. Use the optional `DefaultHeader` `brand` variant, `Icon` `brand` color and `Button` `brand-outline` type on this screen.
- The dashboard's `NoHomeScreen` is a native empty state with a clear setup heading, a short explanation and a decorative home icon. `Create home` is primary (`Button` `auth` type); `Join home` is secondary (`brand-outline`). Keep both in growing scroll content with a 448 dp maximum width and space above their group, so short windows and large text retain every action. Use brand foreground/muted tokens on the shared canvas background, keeping it aligned with its header and safe areas. Preserve the parent navigation and refresh callbacks.
- Local UI / form state: `useState`.
- Re-fetch trigger: increment a numeric state counter.

## Existing native components

| Component | Purpose |
|-----------|---------|
| `JsonPathSelector` | Define JSON field path list for parsing MQTT messages. Validates: no `"` or `\`, no control chars, max 64 chars/key |
| `Icon` | Wrapper over `@expo/vector-icons`, curated set |
| `Modal` | Generic modal via `ModalProvider` |
| `PasswordInput` | Native secure input + show/hide toggle |
| `SafetyNote` | Info/warning callout in forms |
| `Expander` | Collapsible section (Home details: sharing list, rooms) |
| `Dropdown` | Selection (profile theme, language) |
| `HorizontalSelector` | Tab-style horizontal option picker |
| `LocalizationSelector` | Language picker |
| `SimpleItemList` | Generic key-value list |
| `UserProfileImage` | Avatar from email initial |

## Official references

- [Material Design 3 foundations](https://m3.material.io/foundations/) — interaction, layout and accessibility guidance.
- [Android layout structure](https://developer.android.com/design/ui/mobile/guides/layout-and-content/content-structure) and [action placement](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns) — spacing, hierarchy and contextual controls.
- [shadcn/ui](https://ui.shadcn.com/docs), [theming](https://ui.shadcn.com/docs/theming) and [agent skills](https://ui.shadcn.com/docs/skills) — components, semantic roles and composition.
- [Expo DOM](https://docs.expo.dev/guides/dom-components/) — the native/web boundary.
- [React Native accessibility](https://reactnative.dev/docs/accessibility) — native roles, states and assistive technology.
- [Android accessibility](https://developer.android.com/guide/topics/ui/accessibility/views/apps-views) — effective touch targets.
- [WCAG contrast](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum) — text contrast requirements.
