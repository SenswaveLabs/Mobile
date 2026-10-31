# Native automations validation

Date: 2026-10-31. Base commit: `425e1aaacf15682e30c63870816e1b1b3be56457`.
The implementation follows the [approved design](../specs/2026-10-30-automations-design.md)
and [implementation plan](../plans/2026-10-30-automations.md).

## Code review and automated checks

Sol 6.1 Max reviewed the complete change. One combined Luna 6 Max fix wave
addressed all three remaining findings: deletion acceptance belongs to the
captured detail visit, invalidated reads expose recovery, and both child forms
distinguish device-catalog loading, failure, retry and successful empty state.
The scoped Sol re-review accepted all three fixes without new findings.
Main refactor snapshot: `904b1ef8eb7f10e4666abf1c29ca86a1564b4ff6`.
Native testing then found an invisible delete confirmation. A focused correction
uses the existing NativeModal/named PortalHost pattern and captures confirmation
identity. A separate focused Sol review accepted that correction without findings;
its source snapshot is `042e8be2b3262e890853945623cdfefbcbec7dac`.

The controller independently ran these checks on Node `26.12.1` and pnpm `12.8.1`:

| Check | Result |
| --- | --- |
| `pnpm test:automations` | 82 passed |
| `pnpm test:poc` | 43 passed |
| `pnpm test:dashboard` | 46 passed |
| `pnpm exec node --test tests/bottomSheetSelect.test.mjs tests/iconSelector.test.mjs` | 24 passed |
| `pnpm typecheck` | Passed |
| `pnpm lint` | Passed; 281 files checked by formatter |
| `git diff --check` | Passed |
| `pnpm exec expo export --platform android --output-dir /tmp/senswave-automation-android-export` | Passed; Android Hermes bundle and metadata exported |

POC still emits the existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning for
unchanged `src/utils/authValidation.ts`. These 195 passing tests execute provider,
form and route behavior; they do not establish native rendering or hardware delivery.
Automation, POC, typecheck and lint were repeated after the native correction.
Dashboard and shared-selector checks cover components unchanged by that two-file fix.
Metro workers emitted the environment's `NO_COLOR`/`FORCE_COLOR` warning during
export; the Android bundle and metadata were produced successfully.

## Android runtime

Native verification uses `emulator-5554`, the installed development client and
disposable Android user 10. The original user 0 data remains untouched.

Cleanup used the supported account-removal API for all three disposable QA
accounts (204 each; all three old logins then returned 401). The disposable
Android user 10 was removed and original user 0 restored without opening its
app. Physical 1344 × 2992, density 480, Light and font 1.0 were restored.
Resource reads with the revoked Owner token returned 403; this is not claimed
as independent 404 verification of every cascaded resource.

| Flow | Actual native result |
| --- | --- |
| Home entry and list | Owner reaches Automations with its source offline. Long home identity and actions fit at 448 dp Light and 320 × 480 dp Dark. |
| Creation failure and retry | One synthetic POST 503 preserves Name, global `bulb-outline`, condition and result. Retry creates one enabled automation and returns to the list; API confirms exact data. |
| Partial save | State PUT accepts Disabled; one synthetic metadata PATCH 503 leaves the old saved Name and preserves the new draft. Retry saves the Name; API confirms both fields. |
| Saved child failure and retry | Numeric condition `-1..0` survives one synthetic PUT 503. Retry adds one condition and returns; API count advances from three to four, including the repeated operation. |
| Role gates | Manage sees parent metadata/state and Save, without saved-child Add or Delete. Display sees readable list/details without create, state controls, Save, child Add or Delete. |
| Local device recovery | Failed initial device GET appears inside Add condition with `Retry devices`, rather than an empty-home message. Retry loads devices; Back preserves the parent Name. |
| Header targets | Captured native XML confirms 48 × 48 dp Back targets on all five screens. |
| Keyboard-open bottom actions | At 448 dp Light and 130% text, Create and Add result remain fully above the open IME after scrolling, with 50.7 dp targets. Create shows local missing-child validation; Add result appends locally and returns to the unsaved draft. Discarding leaves the persisted automation list unchanged. |

The original native delete blocker is resolved. The corrected dialog opens at
448 dp Light, 320 × 480 dp Dark and stable 130% text. Cancel and Android Back
dismiss it without removing the record (Owner-authenticated GET remains 200).
One confirmed deletion returns to the list and GET becomes 404.

Stable 130% text scaling passed on the list and details at 448 dp Light after
a cold restart. An immediate live scale change initially left clipped text
measurements; restarting only the disposable app resolved them without source
changes. This does not establish seamless live font-scale reconfiguration.

After accepted deletion and return, the development runtime logged
`sendAccessibilityEvent() dropping event: Cannot find view with tag #1016`.
The deletion and list return passed; screen-reader focus after that return has
not been verified. This observed warning is recorded separately from the earlier
unrelated location/SignalR development warnings.

Selected fresh evidence from the corresponding reviewed source snapshots is preserved
with its [capture metadata](assets/automations/manifest.json):

| Native state | Screenshot |
| --- | --- |
| Owner list, 320 dp Dark | [List](assets/automations/list-320-dark.png) |
| Failed POST preserves the complete draft, 448 dp Light | [Creation](assets/automations/create-post-failure-448-light.png) |
| State accepted while metadata PATCH fails, 448 dp Light | [Partial save](assets/automations/details-partial-save-448-light.png) |
| Failed initial device catalog has local recovery, 448 dp Light | [Retry devices](assets/automations/condition-device-retry-448-light.png) |
| Corrected confirmation, 320 × 480 dp Dark | [Delete dialog](assets/automations/delete-confirmation-320-dark.png) |
| Creation action above the open IME, 448 dp Light and 130% text | [Keyboard reachability](assets/automations/create-action-ime-448-light.png) |

Production Android JavaScript export passed after emulator interaction stopped.
TalkBack, 200% text scaling and physical MQTT delivery have not been verified.
An accepted Manage-created automation was optional and was not exercised natively.
Earlier Boolean-Off/Text/zero-operation entry observations preceded the temporary
file reset; their original images were lost. Fresh checks cover Boolean/Number
selection, exact stored summaries, and the failure/return paths above.

## Implementation decisions

| Decision | Reason and cost if wrong |
| --- | --- |
| Keep the original local `next-dev`; push its commit to a separate PR head targeting `next-dev`. | Honors the requested checkout and PR workflow. The local branch remains ahead of its upstream until human integration. |
| Treat new regression tests failing before their fixes as intentional TDD RED. | Required by the requested Superpowers workflow. Misclassifying an existing regression would hide a failure; existing tests were checked separately and final suites pass. |
| Commit after integrated checks rather than at temporarily incompatible task boundaries. | Each commit must pass repository checks. The resulting change has one larger commit to review or revert. |
| Request the full operation catalog with the existing `size=2147483647` convention. | The backend otherwise defaults to ten operations. Memory use grows with the catalog size; pagination is outside this refactor. |
| Apply the brand header to all five automation screens. | Matches the approved native design without changing the shared header. Incorrect scope would affect those screens' appearance. |
| Use explicit `selected` state and distinct row keys in the shared selector. | Different operation IDs can share a name. A mistake affects other selector callers; 24 shared selector/icon checks cover this boundary. |
| Document the new `pnpm test:automations` command in the tooling guide. | Keeps the required guide/index current. This has no application runtime effect. |
| Record the dropped accessibility event after accepted navigation as a verification limit. | No functional deletion or navigation failure was observed. If screen-reader focus is affected, the return path needs a follow-up accessibility correction; TalkBack remains explicitly unverified. |
