# Mobile UI design policy

Read this before designing or changing any application interface. These are product
rules for Senswave mobile; apply Material Design 3 guidance through our existing
components and brand.

Durable users, goals and platform scope live in [PRODUCT.md](../../PRODUCT.md).
Impeccable's new-screen workflow default lives in
[config.json](../../.impeccable/config.json); explicit task instructions override
that default.

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
- Every mutation gives understandable feedback. Forms keep one submit button with
  progress while pending. Home device controls update optimistically and delay their
  spinner as specified below. Disable relevant pending controls and prevent duplicate
  submission.
- Load locally when only one section is waiting. Preserve usable context and give
  retry/recovery for failures rather than an unexplained blank screen.
- Keep important errors and recovery actions visible. Auth, reset, home selection
  joining, creation and settings use inline feedback; legacy toast overlays are disabled on these routes.
- Dashboard command errors opt into compact `Alert` and `AlertDescription`; keep
  feedback unboxed and wrapping, 12 dp below controls, with a 12 dp horizontal
  inset for Slider. Leave compact props omitted elsewhere to preserve card alerts.

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
- Home deletion/leaving and access removal use the local React Native Reusables
  `AlertDialog` with an explicit Cancel and Delete/Leave/Remove action. Keep its trigger, title, description
  and actions within the same controlled root. A named portal inside a native
  Modal isolates the covered screen for assistive technology and handles hardware
  Back as cancellation. `common/Button` forwards the native ref so the primitive
  can restore focus to its trigger. Its label uses scalable native `Text` so the
  dialog's text context cannot override button label measurement. Scroll long
  confirmation text while keeping actions visible; stack full-width actions at
  every window width. Retain the existing request lock and inline recovery.
- Auth and reset use 448 dp maximum width, 24 dp side padding, 24 dp field gaps and
  32 dp section gaps. Native fields have a 52 dp minimum height, 1 dp border and
  8 dp radius; submit buttons have a 48 dp minimum height and 8 dp radius.
  Their keyboard-aware scroll content includes context, errors and actions.
- Native `Input` connects its visible label to the field, exposes errors to assistive
  technology and shows focus/error borders. `PasswordInput` adds a named 48 dp
  visibility toggle. Auth-field labels sit 8 dp above their fields. Buttons retain
  their label and expose disabled/busy state.
  Async submissions keep inline failure messages and release their synchronous lock.
- Auth-variant native input placeholders use the full `authMuted` role; override the upstream primitive's 50% placeholder opacity so hints retain readable contrast on both canvases.
- Registration requires 10–64 characters, lowercase, uppercase, number, special
  character, matching confirmation and explicit Terms/Privacy agreement. Success
  shows email verification; forgot password continues to `/resetPassword` with email.
- Server selection is Development-only. Validate absolute HTTP(S) addresses in the
  form and adapter; pass null to restore the configured default. The form follows
  the effective URL from `ConfigurationProvider`.
- Native home selection uses one `FlatList` and the shared `ListRow`. Keep the current home visibly selected with the themed outline, subtle tint and checkmark; its accessible label retains “current home” without a repeated visible status line. Other homes switch on tap; wait for a successful `HomeProvider.setCurrent` result before navigating and prevent duplicate switches. Keep switch errors beside the attempted home without an overlay toast; list errors include a visible Retry action. Load once per focus and support pull-to-refresh. Put Home details in a separate 48 dp target beside the selected row, outside its switch target. Use 16 dp side gutters, a 24/32 dp page title and 20/28 dp section heading; do not repeat the title in a subtitle. Keep empty-state guidance only when there are no homes; after a successful load with one selected home and no alternatives, omit the Other homes heading and empty-state copy. Create/Join are secondary actions in a wrapping footer that grows to the bottom on short lists and follows long lists in scroll content. Use the optional `DefaultHeader` `brand` variant, `Icon` `brand` color and `Button` `brand-outline` type on this screen.
- Native `/home/join` uses the brand header and `HomeCodeInput`: eight native Reusables inputs grouped 4+4 in one row when they fit, with a centered 4+4 wrap on narrow windows or large text. Keep each segment at least 48 dp wide; its group gap distinguishes the two halves. Each segment owns its native focus and selection bounds; its active border uses `authFocus`, like other form fields. Focus is shown by the outline only, without a visible caret, selection highlight or handles; the selected character can still be replaced. Character entry advances focus, Backspace moves back, and complete paste/autofill replaces the invitation. Do not place a transparent editing surface over decorative slots. Trim and uppercase the invite code; validate all eight A–Z/0–9 characters before sending. Keep length/format errors below the field and request failures above Join home, preserve the code after failure and share one synchronous submit lock between button and keyboard. Keep 8 dp between the heading and description and 24 dp between the introduction and code field. The primary action stays in the same keyboard-aware scroll content, with growing space above it. Preserve an existing current home; await first-home initialization with `{ silent: true }` before leaving, so this screen owns feedback. If acceptance succeeds but initialization fails, open `/home/list` rather than resending the invitation. The picker stays available without a current home. Ignore late feedback/navigation after leaving; never log invite codes.
- The dashboard's `NoHomeScreen` is a native empty state with a clear setup heading, a short explanation and a decorative home icon. `Create home` is primary (`Button` `auth` type); `Join home` is secondary (`brand-outline`). Keep both in growing scroll content with a 448 dp maximum width and space above their group, so short windows and large text retain every action. Use brand foreground/muted tokens on the shared canvas background, keeping it aligned with its header and safe areas. Preserve the parent navigation and refresh callbacks.
- The main home dashboard uses `ProfileHeader` for a growing 64 dp minimum app bar with separate named 48 dp home-picker, Home details and profile targets. The shared avatar uses flat `authFieldBackground`/`authForeground` colors, a quiet `authBorder` outline and no shadow. Only an assigned source with raw `Working` or `Connected` state shows one polite `Data source connected` subtitle below the home name; `HomeStateWidget` returns no healthy content row. Other states use neutral inline text for Connecting/Restarting and persistent standard `Alert` feedback for disconnected, Error, unavailable and missing-source states. Only Error is destructive. Missing assignment takes precedence over stale state. Missing-source guidance reflects owner/member role; `isOwner` alone gets a separate Connect data source or Connection details action for missing, known disconnected or Error states. Unknown/unavailable states have no source action; Manage and Display never get one. Source health does not hide or disable device controls. Keep the `DataSourceState` badge for settings/details. `DeviceList` owns the single vertical `FlatList`: source feedback, a shared 20/28 dp `ContentSection` Devices heading, horizontal room filters, device tiles and the original untruncated informational footer. Owners/managers with an assigned data source get a quiet `SectionHeaderAction` Add device action for populated, loading and error states. A loaded empty home with All selected puts one primary Add device action in its empty state.
- Dashboard room filters expose their names and selected state. Each filter has a 32 dp minimum visual chip with 14 sp text inside a separate 48 × 48 dp minimum touch target; both grow with larger text. The shared `RoomTile` keeps this compact appearance in disabled dashboard-form previews. Tap filters immediately; owners/managers can hold a room to open its settings. Show the hold-for-settings hint only when devices exist; mention only devices when no rooms exist. When rooms exist, let filters use the full horizontal scroller and keep room creation in Home details → Rooms. With no rooms, omit the filter row and standalone All chip; show all devices. Owners/managers get a quiet "Organize your devices into rooms" hint and Add room action only in this initial state. Read-only members get no creation prompt. If devices are also empty, Add device remains the primary action when a source is assigned. Pull-to-refresh preserves the selected room. The grid has 16 dp side gutters, 8 dp gaps and a 960 dp maximum width: one column below 360 dp or at `fontScale >= 1.25`, two normally, and three at widths of at least 840 dp when text scale permits. Loading, failed reads with Retry, an empty home and an empty room have distinct feedback; an empty room offers View all devices.
- Home device summaries support List and Grid, selected with the local Reusables `ToggleGroup` in single-choice mode beside Devices. Keep its two named 48 dp targets transparent, without a shared outline. Only the selected choice has a 36 dp rounded square of `deviceTileSubtle` with an 18 dp `authForeground` icon; the other icon uses `authMuted`. No permanent outline appears on either target or indicator. Keyboard focus uses an `authFocus` fill and an `authFieldBackground` icon on that same compact square. Ignore empty/current selections so one layout always remains selected. `useDeviceLayout` persists the choice locally; a late stored read cannot undo a new selection, and writes stay ordered. Default remains Grid. Grid uses growing 112 dp minimum tiles, 12 dp radius/padding and 8 dp gaps. Use the dedicated neutral `deviceTileSurface` and quiet `deviceTileBorder` roles from the approved mockup, 20 dp catalog icon, wrapping 14/20 dp name and 12/18 dp room. List uses open 84 dp minimum rows, 22 dp icons, 15/21 dp names and a quiet boundary between siblings; omit the final boundary. Show readouts/controls beside the identity when they fit and stack them on narrow screens or with large text. Numeric single values use 26/32 dp tabular type; multiple readings use labeled 18/24 dp rows with their own units, growing without truncation. Preserve zero, render Boolean as On/Off and missing readings as an em dash. Boolean Display shows a lock and Read only, including when no reading is available; it has no editable switch. Use neutral device icons and surfaces for both On and Off. Amber belongs only to the editable On switch. Omit redundant Active tags and Open dashboard copy; tapping the summary still opens the dashboard and managers retain long-press settings. Controls remain separate from the navigation target with 48 dp touch areas.
- Home Switch, Slider and Options actions use `useDeviceTileAction` and the root `OptimisticActionProvider`. Apply the selected value immediately, block duplicate commands synchronously and disable only that pending control. Retain the accepted value when the action response still contains the earlier reading; subsequent live reads reconcile it. Ignore reads started before a newer command and late completions after the device/home identity changes. On failure, roll back to the last reported value and show a local destructive Reusables `Alert` with recovery text. A successful refresh clears stale feedback even when its value is unchanged. Preview controls never send or subscribe. This policy covers home tile controls; the existing dashboard `SliderWidget` retains reported-value behavior.
- Home tile pending feedback uses only a spinner, first shown after 300 ms and retained until the action finishes, including actions longer than four seconds. Switch and Slider reserve a fixed 20 × 20 dp slot; Options replaces its chevron within the same 32 dp circle. Do not add a Sending row, a progress bar or any pending-only layout space. Keep the full home list visible throughout an action. `OptimisticActionProvider` must remain above Expo Router's route Suspense boundaries; see [Repository and conventions](repository.md) for the Fabric compatibility constraint.
- `common/Switch` is the app's intentional native design-system exception: no React Native Reusables Switch primitive is installed. Keep this shared Reanimated control for the dashboard and settings, with its 48 dp target and switch accessibility state. Device tiles supply `authPrimary`/`authBorder` tracks and `authOnPrimary`/`authFieldBackground` thumbs; callers without overrides retain the existing success/error tracks and secondary thumb. Revisit adoption only after checking every caller and preserving optimistic feedback, pending locks and inactive behavior.
- Dashboard widgets and full-row Slider home tiles use `common/Slider` backed by installed `@react-native-community/slider` 5.0.1; React Native Reusables has no Slider primitive. Keep its native adjustable control at least 48 dp high, including the actual Android SeekBar rather than only the dependency's wrapper; the local ref/style workaround handles the upstream typing and wrapper behavior. Use `authForeground` for thumb/active track and an opaque `authBorder` rail underlay with `pointerEvents="none"` and transparent native maximum track, because Android otherwise dims the rail. Dragging updates the local readout and only its changed release sends a command. Keyboard and assistive-technology changes commit without waiting for a touch release; both paths share the same finite-value, pending and duplicate guards. Preserve the existing caller/API, value synchronization, pending lock, failure recovery and zero when the minimum is negative. The home tile uses optimistic action state; `SliderWidget` continues to use reported state. Reject non-finite or unordered bounds, invalid steps and discrete ranges above 10,000 steps before creating native controls; continuous `step={0}` remains supported. The cap protects against version 5.0.1 allocating an entry for every step, even without markers; revisit it when that dependency behavior changes. Display tiles may show multiple configured native readings with their own labels and units.
- Slider home tiles occupy a complete grid row and use a 24/32 dp value readout. DeviceList packs rows without reordering devices and keeps ordinary tiles at their usual column width; large text remains one column. Options tiles use `BottomSheetSelect`'s tile variant: a wrapping 17/24 dp current value and 20 dp down chevron on a 32 dp neutral circular `deviceTileSubtle` background within a 48 dp minimum target, followed by the existing native single-choice sheet. The trigger exposes expanded/busy state and its circle gets an `authFocus` outline on focus. Keep both controls outside dashboard navigation. Current selection, Back, Close and scrim dismissal send no command; a changed choice sends once and closes the sheet. Both controls use the optimistic action, delayed spinner and rollback feedback rules above. Device settings select numeric/options operations and configure slider step/unit; previews load the actual operation and send no commands.
- Device details uses the brand header with a named 48 dp Back target and `FormSection` for its title, helper, 24 dp field spacing and save actions. Keep the form, Operations & Widgets and confirmed Delete in the same keyboard-aware scroll, with a 448 dp content cap and 40 dp between major sections. Preserve the draft, partial PATCH behavior, pending locks, Reset and advanced Tile/Presence disclosures. Management and deletion remain unavailable while the draft is dirty.
- Native `/home/add` and `/home/details` use `HomeForm`: one keyboard-aware scroll page, a brand header and 448 dp maximum width. Keep 8 dp between title and description and 24 dp between the introduction and fields. Create uses a 30/36 dp title, 16/24 dp description, 24 dp side padding and growing action placement; Home details uses 16 dp side padding, a 24/32 dp title and a 14/20 dp description. Back leaves settings without saving. Validate the trimmed name at 3–64 characters. Keep field errors below Name and action alerts above Save/Create; changing the icon or location must not clear a name error. Maintain the mounted draft while saving, block duplicate submissions synchronously and release pending state after a request even if the retained screen lost focus. Successful saves update the saved baseline even while the screen is unfocused; subsequent edits send only fields changed since that save. Creation initializes the first home silently and recovers to `/home/list` after an accepted create with failed initialization. Returning to a retained screen after an accepted create also opens the picker; do not repeat POST.
- Home icon selection uses the existing `IconSelector` and `BottomSheetSelect`. Show a compact, full-width selected-value control matching the 52 dp form-field height, with a 32 dp icon, one-line catalog label and chevron; it opens a scrollable four-column icon grid without search. Preserve catalog loading, retry and selected state. Existing icon-selector callers keep the legacy appearance. `LocalizationSelector` shows an address or “Selected location”, never raw coordinates. Choose on map opens `home/LocationMapPicker`: a native MapLibre map with a fixed center pin, pan/zoom and explicit confirmation. Cancellation preserves the draft; opening the map requests no location permission. Current-location lookup remains optional, with an inline permission/timeout error and a 10-second request bound. Zero coordinates are valid; restored coordinates update the display. An open picker or pending location request keeps Create/Save unavailable until it finishes. Keep the form's loading callback stable so its rerenders do not close the picker.
- Home settings group the data source, access list and destructive action after the form. Only owners see source/access/delete actions; other members retain their existing edit permissions enforced by the API and can leave. Use the shared `ContentSection` geometry: group each title and helper with a 2 dp gap, preserve a 48 dp minimum header height for actions and status, use 8 dp between header and body/actions, and keep 40 dp open whitespace between major sections. Do not draw horizontal rules between sections. Use `ListRow` for vertical entity rows, with 72 dp minimum height, 16/24 dp title, 14/20 dp support, wrapping content and a quiet bottom rule between sibling rows. Omit the rule after the final item and on single-item lists. Keep edit fields, data-source details and Sharing open on the shared canvas. Keep source/access loading local and provide Retry on failures. Empty Rooms, Data source and Sharing sections retain their header helper, omit empty-state body copy and show one full-width outlined action in a 72 dp slot; Rooms uses Add room after an empty list loads when management is allowed; populated, loading and recovery states retain compact Add in the header. Keep loading and retry feedback visible instead of showing an empty-state action while the rooms list is unavailable. Delete/Leave uses the same action slot. Retain confirmations for deleting a home, leaving or removing access. `Button` `brand-destructive` uses a destructive outline and label; individual access-removal labels identify the affected email. After persisted deletion/leaving, discard only the removed current home, initialize the next selection silently and recover to the picker if initialization fails. Never retain a removed home or repeat a completed destructive request to retry selection.
- Editable details forms share `common/FormSection`: a 24/32 dp heading, 14/20 dp helper with an 8 dp gap, 24 dp between introduction and fields and between fields, and 24 dp before the full-width save action. Feedback stays above Save with a 12 dp action-group gap. The section owns no scroll container or form state; callers retain their keyboard-aware page, validation, permissions and submission locks. Pass individual fields as children so the shared section owns their spacing. `separated` adds 40 dp before the section.
- Room creation and editing use `room/RoomForm` in one keyboard-aware page, with the current home named in its helper. Creation follows the home-creation heading, 24 dp gutters and growing Create room action; editing uses `FormSection`, 16 dp gutters and Save changes after Name. Keep a 448 dp maximum width and 24 dp top padding. Validate the trimmed room name at 3–64 characters, preserve drafts after failures and share a synchronous lock between keyboard and button submission. Failed detail reads show inline Retry. Delete uses a separate `ContentSection` 40 dp below the form, a full-width outlined destructive action in the same 72 dp slot as Home details and the same native Reusables confirmation. Keep deletion errors in the section body above the action. Cancel/Back sends no request; confirmed deletion leaves devices unassigned. Accepted mutations return to the parent and cannot repeat after a failed list refresh or late completion. Stale room/home completions cannot navigate a different editor. Do not show preview tiles, floating action menus, Restore or legacy toast feedback on these routes.
- Native `/device/add` uses `DeviceForm` create mode in one keyboard-aware scroll page, with a brand header, 448 dp maximum width, 24 dp gutters/top padding, a 30/36 dp title, 16/24 dp helper naming the current home, 8 dp title/helper gap and 24 dp field gaps. Keep Name, catalog icon and Room in that order; use the compact `IconSelector` and `RoomSelector`, preserving opaque backend icon keys. Grow the full-width Create device action from the bottom of the same scroll content. Keyboard Done and the button share a synchronous submit lock. Failed POSTs retain the draft and show an inline action alert without a legacy toast; an accepted POST cannot repeat when refresh fails. Ignore late completion/navigation after leaving the screen; a retained accepted create exits on refocus, using Back history or `/` when no history exists. Do not show a creation preview or success toast.
- Native `/dataSource/add` uses a brand header and one keyboard-aware scroll capped at 448 dp, with 24 dp gutters and field spacing, a 30/36 dp title, a 16/24 dp helper and a growing amber Create data source action. Keep the client/port row wrapping at a 2:1 ratio. Required fields validate on the first submit without showing untouched required errors at initial load; preserve exact MQTT enum keys, TLS boolean and create payload field names. Keep the one-user-per-source privacy note and “Credentials are used only for verification purposes.” visible. Failed creates retain drafts and show inline feedback; keyboard and button submission share one pending lock. Accepted creates cannot repeat after blur/refocus and return to `/dataSource/list` if no Back history exists. Never imply credentials are optional or stored, imply creation starts the broker client, log credentials or show legacy toasts.
- Native `/dataSource/brokers/startBrokerClient` uses one keyboard-aware scroll, a brand header and `FormSection`, with 16 dp gutters, 24 dp top padding and a 448 dp content cap. Validate non-whitespace Username/Password at 1–256 characters; never trim or log credentials. Preserve exact values in SecureStore JSON under `brokerClientCredentials-${brokerId}` and in the POST payload. Restore only saved string pairs; fields are disabled during restore and after accepted success. While storage or HTTP is pending, keep fields natively editable to retain the focused input and keyboard, expose their busy state, and reject changes in the handlers while the synchronous submit lock is held. Remember and Start stay disabled. Make Remember a draft-only choice until Start. One 48 dp row owns the checkbox role and toggle. Keyboard Go and the amber Start action share the lock; keep drafts after inline storage/request failures and suppress legacy toasts. Latch accepted requests before matching-home refresh or navigation, ignore stale feedback after blur, and offer navigation-only recovery after a failed return. A missing broker ID stays local and recovers to `/dataSource/list`.
- Data-source details uses the local React Native Reusables Tabs primitive for mounted Overview and Settings panels. Keep broker identity and underline tabs at the top of each panel's own scroll content; let full names/endpoints wrap and stay selectable. Match Home details with 24 dp of top padding, 8 dp between the broker name and endpoint, and 24 dp before the tabs. Settings passes that shared header into its existing keyboard-aware scroll, without a nested scroller. Tab targets are at least 48 dp and may grow for large text. Use shared section rhythm for client controls and Subscriptions; rows use `ListRow` with selectable, wrapping topics and named 48 dp removal targets. Add subscription stays in the 48 dp section title row. Settings uses `FormSection` for Connection, matching Home details, and retains a wrapping 2:1 Client name/Port row; Save and separately confirmed Delete remain in keyboard-aware scroll content. Verification fields retain the same 24 dp rhythm. The Delete section uses `ContentSection separated` for 40 dp spacing, keeps recovery beside its full-width action, and limits its dialog to 90% height with scrollable text and reachable actions. Keep section gaps off the keyboard-aware scroll content so its automatic spacer does not gain a second gap. TLS and MQTT version use selected-value fields opening the native BottomSheetSelect; choosing updates only the draft, and Close, scrim or system Back cancels. There is no Reset action. Preserve drafts across tab changes and failed saves, update the saved baseline only after a successful PATCH, and never echo or log verification credentials. Show Retry when broker/client/subscription reads fail; an unrecognized client status is unavailable until refreshed, not disconnected. Add subscription and start-client continue through their existing routes.
- Vertical entity lists use `ListRow` for consistent wrapping content, 48 dp targets and hairline boundaries between sibling rows: home selection, DataSourceList, SimpleItemList, AutomationList, OperationList, WidgetList, Sharing and Subscriptions. The list owner enables `separator` only when another item follows in the same list or widget group; standalone rows, group headers and final items have no separator. Keep form previews, control grids and live widget controls in their existing presentation. `ContentSection` owns 40 dp of open whitespace between major sections without a divider; list parents must not add another separator or row gap.
- `BottomSheetSelect` fades a stationary scrim while its panel slides independently:
  280 ms entrance and 180 ms exit, honoring the system reduced-motion setting.
  Keep the modal mounted until exit completes and restore accessibility focus
  after dismissal. Options have 56 dp minimum height with 8 dp gaps; the panel
  has 24 dp horizontal padding and 24 dp below its options plus the bottom safe area.
- Keep home-settings headings and descriptions together. Location and linked-source
  actions share wrapping rows; current-location lookup uses `brand-ghost`, and
  Delete/Leave spans the available width. Data-source loading has a visible label
  and busy semantics. The Home icon selector uses the same label type and foreground
  as other form fields, with a compact 52 dp outlined selected-value control.
- Sharing keeps its heading and description with a compact Invite action beside
  the heading when the list has entries. When the list is empty, retain the heading
  description, omit empty-state copy and show a full-width outlined Invite action.
  Plain rows group wrapping email/role text with a named 48 dp remove target,
  pressed feedback and the existing confirmation. Loading has a visible label and
  accessible busy state; errors stay beside the affected action and recovery keeps
  Retry available.
- Rooms keep a compact Add action in the section header in empty and populated
  states. Owners and managers use `ListRow` with named 48 dp Edit and Remove actions;
  confirm removal and explain that devices become unassigned.
- Local UI / form state: `useState`.
- Data-source states share the native `DataSourceState` badge. Home settings place
  it beside the source name in a wrapping row. Match web labels and semantic tones:
  Working/Connected → Connected (positive), Restarting/Connecting → warning,
  Error → critical, and NotStarted/Stopped → Disconnected (neutral). Reuse
  `getDataSourceStateLabel` for the badge and source-summary accessibility name;
  retain raw status values. The
  `dataSourceStatus` theme palettes mirror the web's light/dark status colors;
  keep readable text, a decorative indicator and no pulse animation. Broker client
  details validate the server status before rendering the badge; unknown values
  stay unavailable and offer Retry rather than being presented as disconnected.
- Quiet creation actions reuse `SectionHeaderAction`, including dashboard Add
  device, Add room and broker Subscriptions Add. Preserve each caller's permissions,
  loading states and navigation.
- Re-fetch trigger: increment a numeric state counter.
- Home/Device `IconSelector` receives the fetched resource catalog for both its quick
  strip and searchable browser, with local glyphs/labels, named 48 dp targets and
  selected/disabled accessibility states. Loading and failure stay local to the
  icon field, with a visible Retry icons action. Preserve the current historical key
  and let unrelated existing-resource edits proceed without a catalog; new or
  changed choices require a loaded matching key. Defaults are validated rather than
  replaced automatically. Dashboard, Radio and Automation retain the global browser.

## Profile and account settings

- `/user/profile` uses one native scroll with the brand `My Profile` header. Keep the identity compact (56 dp avatar, wrapping email, 448 dp maximum width and 16 dp gutters). The avatar initial is decorative and capped to fit its circle; the avatar itself keeps the accessible name. `Preferences` saves `Light`, `Dark` or `System` immediately through `BottomSheetSelect`; English stays read-only while it is the only supported language. `Manage` uses `ListRow` for Data sources and App information, with a separator only between those siblings. Sign out uses `brand-outline`; Delete account has its own separated section, helper copy and `brand-destructive` action. Confirm deletion with a native Modal, named `PortalHost` and local Reusables `AlertDialog`; keep copy scrollable, actions stacked and reachable, and Android Back as cancel. Use `AlertDialogCancel`/`Action` with the shared `common/Button` to retain dialog touch and focus behavior. Dialog action labels scale with system text inside targets at least 48 dp high. Keep theme/delete/retry errors inline, retain the saved theme after failure and block duplicate mutations synchronously. If identity is unavailable, show Retry and block theme/delete. Ignore route feedback from requests that finish after blur; keep provider-owned preference updates and logout. Suppress legacy toast overlays on `/user/profile`.

## Existing native components

| Component              | Purpose                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `JsonPathSelector`     | Define JSON field path list for parsing MQTT messages. Validates: no `"` or `\`, no control chars, max 64 chars/key |
| `Icon`                 | Wrapper over `@expo/vector-icons`, curated set                                                                      |
| `Modal`                | Generic modal via `ModalProvider`                                                                                   |
| `PasswordInput`        | Native secure input + show/hide toggle                                                                              |
| `SafetyNote`           | Info/warning callout in forms                                                                                       |
| `Expander`             | Collapsible section (Home details: sharing list, rooms)                                                             |
| `BottomSheetSelect`    | Selected-value field with a native modal bottom sheet, cancellation and restored accessibility focus                |
| `Tabs`                 | Local React Native Reusables tabs primitive for related content panels                                              |
| `HorizontalSelector`   | Tab-style horizontal option picker                                                                                  |
| `LocalizationSelector` | Optional home location, native map selection and GPS; address/selected-place display                                |
| `SimpleItemList`       | Generic key-value list                                                                                              |
| `UserProfileImage`     | Flat brand avatar from the user's name initial                                                                       |

## Official references

- [Material Design 3 foundations](https://m3.material.io/foundations/) — interaction, layout and accessibility guidance.
- [Android layout structure](https://developer.android.com/design/ui/mobile/guides/layout-and-content/content-structure) and [action placement](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns) — spacing, hierarchy and contextual controls.
- [shadcn/ui](https://ui.shadcn.com/docs), [theming](https://ui.shadcn.com/docs/theming) and [agent skills](https://ui.shadcn.com/docs/skills) — components, semantic roles and composition.
- [React Native Reusables](https://reactnativereusables.com/docs/installation) — native primitives and NativeWind setup.
- [React Native accessibility](https://reactnative.dev/docs/accessibility) — native roles, states and assistive technology.
- [Android accessibility](https://developer.android.com/guide/topics/ui/accessibility/views/apps-views) — effective touch targets.
- [WCAG contrast](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum) — text contrast requirements.

Device presence is independent of On/Off. Explicit BooleanOperation presence false shows a neutral Inactive chip with a disconnected icon beside the room, masks cached readings and removes interactive controls. A missing set of readings uses a No data chip with a clock icon in that same metadata row. Chips wrap beneath long room names only when necessary; never place these status labels beneath values. Keep the catalog icon. Unknown presence shows a question icon and Status unavailable. Continue subscriptions while inactive. Device settings retain primary label/unit and up to eight additional labeled operation readings, with inline validation, removal, Reset and read-only previews. Separate operations supply additional units; do not fabricate conversions.

Align device values to the trailing edge. Same-measurement unit pairs group at the right with a 24/30 dp primary and 18/26 dp secondary value; unit labels use 12 dp regular muted text. Distinct metrics retain labels at the left and values at the right. Options in horizontal list rows receive 56% of the row (up to 60%), allowing device names to wrap first; the selected value aligns right beside its fixed 32 dp icon. Grid Options keeps the full tile width. Switch status sits next to the switch with its fixed pending slot before the value. Slider values align to the bottom of their heading beside the room metadata, followed immediately by the 48 dp track, without an extra content gap. `deviceTileSubtle` supplies quiet status chips, the selected layout fill and the Options icon background; the rest of the tile selector stays transparent.
