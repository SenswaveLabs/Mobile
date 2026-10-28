# PR #29 native UI corrections

**Status:** Approved for implementation; work is in progress on PR #29.
**Branch:** `feat/dashboard-flow-2026-10-24`, PR #29 targeting `next-dev`.
**Baseline:** `33d0862800fcfdcdd7241e555543fa94cd998057`.
**Evidence:** The 36 Android screenshots in `/home/kamil/Pictures/Senswave-PR-29-33d0862`.

## Intent and authority

Bring the dashboard, widget and operation configuration flow into the same native
visual language as Create Home and the home dashboard. This is an Operate surface:
clear actions, calm selection, stable control positions and recoverable failures.
`PRODUCT.md`, `DESIGN.md`, the mobile UI policy and the existing Create Home
implementation are authoritative. The web brand reference is
`../next-frontend/apps/web/DESIGN.md`; use mobile interaction and typography.

The user explicitly selected a swatch/HEX field with a bottom-sheet color editor.
The command-error treatment below is the agent's recommendation after the user
asked for Material Design 3 guidance; it remains part of this proposed design.

## Approaches

1. **Reuse the native components already used by Home — recommended.** Use
   `ContentSection.headerAction`, `SectionHeaderAction`, `FormSection`,
   `IconSelector variant="brand"` and `BottomSheetSelect`. Add only the color
   field and a dashboard-scoped command snackbar that these flows actually need.
2. Rebuild these screens around a new component library. This adds dependencies,
   a native rebuild and a competing visual system without addressing a missing
   capability. It is outside the requested corrections.

For feedback, opening a modal bottom sheet solely to report a command failure
would interrupt everyday control. Use a nonmodal snackbar for dashboard commands;
keep errors inside an editor that the user has already opened.

## Required changes and acceptance

| Screenshot | Result |
| --- | --- |
| `03-wybor-widgetu.png`, `16-lista-widgetow.png` | Add operation is a quiet action on the trailing side of the section heading, following Devices/Add device. It is never a separate full-width row below the helper. |
| `04-tworzenie-widgetu-button.png`, `29-button-kolor-formularz.png` | Create widget grows toward the bottom on tall screens, remains after the fields in the same keyboard-aware scroll on short screens, and stays reachable with the keyboard open. Apply this to every widget type. |
| `09-rozmieszczanie-widgetu.png` | The selected draft uses a quiet themed surface, a 1 dp outline and a small resize affordance. Preserve a 48 dp resize hit area and all movement/resize behavior. |
| `12-szczegoly-dashboardu.png`, `13-wyszukiwanie-ikon.png` | Dashboard details uses the same compact selected-value field and four-column bottom sheet as Create Home/Create dashboard. Offer the historical 16 dashboard icons, with no global search browser. |
| `26-opcje-widgetu-radio.png` | The icon field uses the same bottom-sheet pattern with the historical 15 Radio icons. Add option grows to the bottom of its keyboard-aware form. |
| `28-tworzenie-operacji.png` | The complete creation flow uses the brand header, FormSection, native outlined fields, selection sheets, inline feedback and a bottom-aligned Create operation action. Include all conditional fields and the option subform. |
| `29-button-kolor-formularz.png` | Replace the three permanently exposed RGB bars with a swatch/HEX field opening a themed color editor. |
| `33-widget-color-blad-komendy.png` | Command failures do not change row height, widget bounds or scroll position. Report ordinary widget failures in one dashboard snackbar with widget identity and Retry. An open color editor retains its draft and shows its failure by Confirm. |

### Actions and scrolling

Keep one main scroll owner per screen. Use `ContentSection.headerAction`, not its
`actions` slot, for Add operation on the management list. Put the picker action
beside Choose widget; Position widget retains Change in the same trailing slot.
Long headings wrap without overlapping the 48 dp action target.

Widget creation and the Radio option form keep FormSection for introduction and
field spacing. Put their action group after the section with growing space above
it, following `HomeForm` and `AddDashboardForm`. Keep read-only widget details and
its separate deletion section in their existing document order. Do not change the
shared FormSection defaults just to anchor these creation actions.

### Historical icon choices

The defaults on `main` (`9eb767455dd4e1019b54c4da532a278dc09017bc`) match the
current quick lists: DashboardForm has 16 entries; RadioOptionFormModal has 15.
The global `AllIcons` list itself did not grow in this PR. Restrict these two
flows to their historical quick sets by enabling the existing brand selector.
Creation and details use the same dashboard choices.

Keep submitted icon keys unchanged, including the `-outline` suffix. A saved
historical icon outside the offered set remains visible as the current value;
opening/cancelling the sheet does not replace it and a name-only PATCH omits it.
Radio details likewise renders existing icons without rewriting configuration.
Home/Device backend catalogs and Automation's selector remain outside this change.

### Placement preview

Use `deviceTileSurface` and `deviceTileBorder` at rest, with a 1 dp outline.
Use `authFocus` while actively dragging/resizing or keyboard focused; preserve
`error` plus the existing text explanation for a collision. The resize handle
has a neutral subtle background and a 16 dp foreground diagonal icon inside its
48 × 48 dp target, contained within the draft. Remove the large inverse corner
block. Keep the move icon subdued, the name readable, and the existing 12 dp
corners, snapping, bounds, collision checks, reveal-on-release and accessibility
actions. Selection stays distinguishable from dashed free cells without a thick
permanent focus ring.

### Color field and editor

Add one `common/ColorPickerField` using the installed color-picker library and
the existing sheet shell. Reuse it for Button/HexColor configuration and live
Color widgets. The trigger shows a swatch and HEX; the live tile keeps its name
and adapts the HEX text to available space. All live Color sizes open the same
editor instead of switching to an embedded wheel at 140 dp.

The sheet contains a preview, a labelled HEX input, the installed rectangular
color panel/hue control and Cancel/Confirm. Use app surface, border, type and
button tokens; spectrum colors belong only to the actual color control. HEX
accepts the existing `#RGB` and `#RRGGBB` forms. Preserve an unchanged value's
exact string, including case and short form. Invalid input stays local and blocks
Confirm. Draft changes, opening, Cancel, scrim and Android Back send no command.

In a Button form, Confirm applies only the local configuration draft; Create
widget performs the existing POST later. In a live widget, Confirm sends the
exact selected hex once; rejection keeps the sheet and chosen draft open, and
success updates the swatch and closes once. Block duplicate confirmation and
sheet dismissal during the pending write. Closing after a failure discards the
unsent draft; reopening starts from the latest accepted/reported color. A failed
operation never replaces the displayed accepted value with an unsent color.

### Stable command feedback

`GridDashboardView` currently derives every row's height from the maximum
measured widget-error height. Remove this coupling and WidgetView's error-height
reporting. Keep the existing 96 dp row baseline and saved placement geometry.

Use one local snackbar host in the dashboard root, outside its scroll content,
anchored above the bottom safe area. It shows the failed widget name, a short
failure explanation, Retry and an accessible close target. It remains available
until dismissed, successfully retried, superseded by a newer failure or the
dashboard is left. A newer failure replaces the current message; do not build an
unbounded queue or use ToastProvider. Normal controls remain available.
Use the existing `secondary`/`textOnSecondary` roles for its surface/text and
`authPrimary` for its text action, maintaining contrast in both themes.

Retry is a captured failed command routed through the same pending, identity,
focus and permission guards as the original send. Opening/dismissing feedback
never sends it. A successful command clears only that widget's current failure;
completion from widget A cannot dismiss a newer failure from widget B. Changing
device/dashboard or unlinking the failed widget invalidates the shown retry.
Keep enough bottom scroll clearance to reach the last controls without changing
grid coordinates. Do not truncate error meaning or use color as its only signal.
Configuration role changes alone are not loss of command permission: Display
members retain live controls and Retry. Invalidate on actual access loss or
identity changes, never gate these actions with `canManage`.

Color sends originate inside the open editor, so its error is shown there rather
than duplicated in the dashboard snackbar. This is a dashboard-specific change;
Home tile feedback and persistent source/read/unlink errors retain their rules.

### Complete operation creation

Preserve `POST v1/devices/operations` and every existing payload field: `deviceId`,
`name`, `topic`, `type`, `configuration.isJson`, `saveOnUserAction`, `jsonNames`,
`decimalSeparator`, `min`, `max`, `trueValue`, `falseValue` and `options`.
Keep Boolean, Number, Integer, Text, HexColor and Options, and preserve primitive
option/custom Boolean values: false, 0 and "0" remain distinct.

Modernize the numeric, Boolean, Options and JSON-path subforms too. Replace the
preview tile/divider, old dropdowns and detached KeyboardStickyView action with
the established creation-page composition. Show validation at fields and POST
failures above the action; keep drafts, a synchronous submit lock and accepted-once
return navigation after refresh failure. Suppress legacy toast overlays here.
Read-only operation details must continue rendering saved configuration without
mounting an editable creation action. Its existing delete flow is outside scope.

Use the current validation boundaries, with finite numeric validation on active
numeric branches: Name 3–64 characters after trimming, Topic 3–256 with exact
topic string preserved, options 2–10, option names 1–12 and text payloads 1–127.
JSON paths have at most five ordered segments, each 1–63 characters under the
current code; reject quotes, backslashes and control characters. The guide's
64-character wording conflicts with its existing `length >= 64` rejection:
preserve the existing accepted range in this UI change and document it accurately.
Inactive conditional fields must neither block submission nor enter the payload.

## Boundaries and delivery

- Work in the existing checkout and branch. No worktree, merge or release.
- Use Node from `.nvmrc`, pnpm and the installed dependencies; no lockfile change.
- App components use FC/interface props; use StyleSheet and useTheme tokens.
- Owners/managers configure; Display retains live controls without configuration.
- Preserve IDs, routed identity, accepted-once writes and all backend contracts.
- Record the required policy in affected guides and DESIGN.md now, as the user
  requested after planning; mark implementation as outstanding. Keep those guides
  synchronized with each later implementation commit, especially the superseded
  global icon search and growing dashboard-error rules.
- Verify each requested before/after view on emulator-5554 at normal text,
  320 dp Dark and 448 dp Light, including short windows and the keyboard. Keep
  the prior screenshot pass's exclusions for TalkBack and text enlargement.
- Use disposable local data/test topics; clean up and restore emulator settings.
  Stop and report any test failure under AGENTS.md. Never merge PR #29.

## Evidence behind the feedback recommendation

Material's Android component guidance supports noninterrupting snackbars for
operation feedback, including retry of a failed action, and one snackbar at a
time: [Material Snackbar](https://github.com/material-components/material-components-android/blob/master/docs/components/Snackbar.md).
The Android guide includes an indefinite-duration snackbar with an action:
[Android Developers](https://developer.android.com/develop/ui/compose/components/snackbar).
Field validation belongs to the field's error/supporting text:
[Material text fields](https://github.com/material-components/material-web/blob/main/docs/components/text-field.md).
The placement and Color-specific choices above are this design's application of
those principles, not a claim that Material prescribes a smart-home layout.
