# Dashboard creation design

## Intent and authority

Migrate `/device/dashboard/add` to Senswave's established native form language.
Owners and members who may configure a device should name a dashboard, choose its
icon and grid size, and create it confidently without losing a valid draft or
repeating an accepted request. The user delegated the next screen and design;
the coordinator selected this bounded legacy screen. The layout and implementation
choices below are the planner's decisions, not additional user requirements.

This is a local Operate-mode migration inside the existing product, with the
code-led build path from `.impeccable/config.json`. It does not replace Senswave's
visual identity. PRODUCT.md, DESIGN.md and the mobile UI policy remain binding;
the web theme and device-form dialog confirm the semantic field/action language.

## Current behavior and scope

`device/dashboard/add.tsx` currently puts the shared imperative `DashboardForm`
above a separate sticky Create Dashboard action. That form displays an unrelated
RoomTile preview and divider, an initial empty-name state, a global icon chooser,
and Rows/Columns fields. Its validation misses nonfinite/fractional dimensions and
the route has only state-based pending protection and toast feedback.

The planner inspected the coordinator's native baseline at
`/tmp/senswave-dashboard-ui/before.png` (Home Domku → Centrala → Add Dashboard).
It confirms the preview/divider split, `Your home name` placeholder, global icon
quick strip, 6/4 dimensions and disconnected bottom action.

Create a focused `device/dashboards/AddDashboardForm.tsx` and replace only the add
route's form. Leave `DashboardForm.tsx`, its imperative handle and the dashboard
details caller unchanged. Keep the Device page and grid menu routes and `deviceId`
parameters unchanged. When a refreshed nonempty dashboard list has no matching
current ID, the Device selector falls back to the first listed dashboard. No
API/provider changes, new dependencies, assets, dashboard editor work or widget
placement work belong here.

## Approaches

1. **Selected by planner: one keyboard-aware FormSection.** Reuses the recent
   broker setup forms, keeps purpose, values, feedback and action together, and
   avoids changing the legacy details editor.
2. A multi-step name/layout wizard would hide context and add navigation to four
   simple values; reject as unnecessary.
3. Restyling the existing preview/sticky-footer form is a smaller visual edit but
   preserves split scrolling and expands regression risk to dashboard settings;
   reject for this task.

## Composition and behavior

- Brand `Dashboard` app bar with the existing Back affordance; replace the add
  route's legacy `Add Dashboard` header only.
- One KeyboardAwareScrollView, 16 dp horizontal gutters, 24 dp top, 16 dp bottom,
  content width capped at 448 dp and centered. `FormSection` owns its normal
  24/32 dp title, 14/20 dp helper, 24 dp field/action rhythm and 12 dp feedback gap.
- Heading **Create dashboard**; helper **Choose a name, icon and grid size for
  this device's dashboard.** Then Name, Icon, Rows/Columns and the full-width amber
  **Create dashboard** action. No preview, divider, floating menu or sticky footer.
- Use the existing Reusables-backed `Input` auth variant, `common/Button` auth
  variant and default `Alert`/`AlertDescription`. Derive colors from `useTheme()`;
  use `StyleSheet.create()`, native system type and system text scaling.
- Retain the existing dashboard quick icon choices and unrestricted searchable
  global IconSelector. Default key remains `grid-outline`; no Home/Device catalog
  or new local whitelist. Preserve exact selected icon strings.
- Rows and Columns form a wrapping equal-width row with a 16 dp gap, each with a
  160 dp minimum basis; narrow windows stack the fields. Support labels state
  **1–10 rows** and **1–5 columns**. Defaults remain 6 rows and 4 columns.
- Name uses a dashboard-specific placeholder, e.g. **Living room controls**.
  Name/Rows use Next; Columns uses Go. Focus the first invalid field. Keyboard Go
  and touch invoke the same synchronous submit lock.

## Validation, API and recovery

- Validate on first submit, then clear the changed field's stale error. Trim Name
  at submission and require 3–64 characters. Empty/whitespace Name says
  **Name is required.** Other invalid lengths say **Use 3–64 characters.**
- Keep dimension drafts as strings so clearing a field stays empty. Require
  decimal digits after trimming, finite integers in Rows 1–10 and Columns 1–5.
  Reject blanks, decimals, signs, exponents, NaN and Infinity; report
  **Use a whole number from 1 to 10.** / **Use a whole number from 1 to 5.**
- Submit only through `useHttpClient().post("v1/devices/dashboards", body)` where
  `body` is `{ deviceId, name, icon, configuration: { rows, columns } }`; dimensions
  are numbers. Preserve endpoint, fields and server authorization.
- Pending retains the mounted draft and focused native input. Keep text inputs
  natively editable but reject draft changes synchronously while pending; expose
  busy state and disable Icon/submit. No full-screen loading or keyboard dismissal.
- Rejected/thrown POSTs show **Couldn't create the dashboard. Check your connection
  and try again.** in a persistent destructive Alert directly above the action.
  Preserve values and release the lock. Relevant changes/new attempts clear it.
- Latch acceptance before refreshing or navigating. Best-effort
  `useDevice().refresh(false)` only for the matching current device; a failed
  refresh is not a failed create. Never submit again after acceptance. Do not
  expand this task into provider refresh/error redesign.
- Return once using Back history; without history replace
  `/device/device` with `{ deviceId }`. Late completions after blur must not
  navigate or show stale request errors; an accepted retained form returns on
  refocus. If navigation throws, retain informational feedback
  **Dashboard created. Return to the device to view it.** with a navigation-only
  **Return to device** action, never a second POST.
- Normalize array `deviceId` to its first string. A missing/blank ID renders a
  local **Device not found** recovery with **Return to home** (`/`), without a POST.
  Key the create form by the normalized ID so route changes reset local state.
- Suppress legacy toast overlays on this route, including delayed provider calls.
  Successful creation needs only return/optional accessibility announcement.

## Completion and limits

Use the existing native handler adapter for exact payload, validation, duplicate
submission, draft retention, accepted-once lifecycle and route recovery tests.
Run `pnpm typecheck`, `pnpm lint`, `pnpm test:poc` and affected device-detail checks
before committing. The repository requires notifying the user and waiting after
any test failure; do not deliberately run a red test phase.

The coordinator verifies the real Android screen before and after: both themes,
normal and 200% text, keyboard/action reachability, icon selection/cancel, Back,
validation, failed-request recovery and one accepted create on isolated local
data. Native screenshots do not establish TalkBack or physical hardware delivery.
Bound visual inspection to one batched pass and at most one confirmation pass;
follow Impeccable finish review/documentation, preserve global DESIGN artifacts,
and document the scoped screen policy and validation. No release or PR merge.
