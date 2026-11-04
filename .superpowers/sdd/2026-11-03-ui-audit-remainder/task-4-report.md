# Task 4 implementation report

## Scope completed

- Replaced operation details with a validated, read-only operation form and
  local Retry for failed reads.
- Bound management actions to the current owner/manager role, the routed device's
  current-home membership, and exact membership in that device's full operation
  catalog. Operation-ID-only links remain read-only.
- Added a native confirmed Delete flow with persistent local failures, conflict
  guidance, synchronous duplicate protection, accepted-once refresh/return, and
  recovery across early refocus before DELETE acceptance and while refresh is
  pending.
- Forwarded `deviceId` from `WidgetList` through `OperationTile`, added the
  narrow `OperationForm` children slot inside its existing keyboard-aware
  scroll, replaced the legacy list route with a headerless alias, and removed
  `OperationList.tsx`.
- Updated route suppression, the `test:device-details` script, and the affected
  AGENTS/repository/interface/validation guides.

## Files changed

- `src/app/(app)/device/operation/details.tsx`
- `src/app/(app)/device/operation/list.tsx`
- `src/app/(app)/_layout.tsx`
- `src/components/device/operation/OperationForm.tsx`
- `src/components/device/operation/OperationTile.tsx`
- `src/components/device/operation/OperationList.tsx` (deleted)
- `src/components/device/widgets/WidgetList.tsx`
- `src/contexts/ToastProvider.tsx`
- `tests/operationDetails.test.mjs` (new)
- `tests/operationForm.test.mjs`
- `tests/widgetPicker.test.mjs`
- `tests/widgetConfigPermissions.test.mjs`
- `tests/feedback.test.mjs`
- `package.json`
- `AGENTS.md`
- `docs/agent-guide/repository.md`
- `docs/agent-guide/interface.md`
- `docs/agent-guide/validation.md`

## TDD and verification

RED command:

```sh
pnpm exec node --test tests/operationDetails.test.mjs tests/operationForm.test.mjs tests/widgetPicker.test.mjs
```

The intended pre-implementation result was 31 tests: 20 passed and 11 failed
on the new details/alias behaviors. Existing form and picker checks passed.

Focused GREEN command:

```sh
pnpm exec node --test tests/operationDetails.test.mjs tests/operationForm.test.mjs tests/widgetPicker.test.mjs tests/widgetConfigPermissions.test.mjs tests/feedback.test.mjs
```

Result: 49 tests, 49 passed, 0 failed.

Required final checks on the final source:

| Command | Result |
| --- | --- |
| `pnpm test:device-details` | 233 tests, 233 passed, 0 failed |
| `pnpm typecheck` | Exit 0 (`tsc --noEmit`) |
| `pnpm lint` | Exit 0; Oxlint passed and all 285 matched files passed formatting |
| `pnpm test:poc` | 64 tests, 64 passed, 0 failed |
| `git diff --check` | Clean |
| `rg -n 'OperationList|device/operation/list' src` | No legacy `OperationList` component import; remaining matches are the `OperationListDto` type, the hidden compatibility route registration, its toast suppression entry, and the details catalog validation. |

The standalone focused GREEN run was followed by the broader required checks.
The final device-details and PoC outputs ended with `ℹ pass 233 / ℹ fail 0`
and `ℹ pass 64 / ℹ fail 0`, respectively.

## Failed iterations and fixes

- The first test-harness setup lacked a Reanimated/mock entry. I corrected the
  test fixture before the recorded RED run; the recorded RED failures were
  behavior assertions for the unimplemented details and alias.
- The first typecheck found two refs without explicit initial values and an
  optional operation value used before narrowing. I added explicit `undefined`
  initial values and moved the local value below its guard; final typecheck
  passes.
- The first lint run passed Oxlint but failed formatting on seven files. I ran
  the repository formatter on the changed TS/JS files; final lint passes.
- A bounded Ponytail self-review removed a redundant current-membership alias
  and an operation-ID alias. No behavior or API changes resulted.

## Route size review and limits

The details route remains large because it owns several distinct required
states: validated operation read/retry, full per-device catalog read/retry,
current-home and role checks, confirmation identity, late-handler guards,
synchronous DELETE locking, accepted DELETE latching, one matching-device
refresh, and return-only recovery. Separate focus, refresh, and return latches
cover early refocus both before DELETE acceptance and before the accepted
refresh settles. Removing those guards would reopen duplicate DELETE or stale
context paths. The review removed redundant derived checks; the remaining code
is route-specific and introduces no generic framework, backend field, or new
API contract.

No native runtime check was run by this implementation task; root owns the
remaining native QA and independent review. No other known concerns.

## Review fix round 1/5

### Changes

- The operation read boundary now validates only configuration shapes the
  existing read-only form consumes: optional common booleans and string-array
  JSON names; finite numeric minimum/maximum and string decimal separator;
  Boolean string/number/boolean values; and Options records with string names
  and finite scalar values. Omitted values remain omitted, and the route passes
  the original configuration object without coercion or creation-time range,
  length, uniqueness or path restrictions.
- Malformed nested responses stay in the route's existing read-error/Retry
  state and never mount `OperationForm`. Valid false, zero and text-zero values
  pass through unchanged. The real `OperationFormInternal` seam is exercised
  with Boolean, numeric, JSON-path, Options and omitted-default fixtures.
- The confirmation footer now uses `flex-col sm:flex-col` to retain stacked
  full-width actions at wide breakpoints. Root owns the actual >=640 dp native
  layout verification.

Files changed this round:

- `src/app/(app)/device/operation/details.tsx`
- `tests/operationDetails.test.mjs`
- `tests/operationForm.test.mjs`
- this report

### TDD and verification

RED command:

```sh
pnpm exec node --test tests/operationDetails.test.mjs tests/operationForm.test.mjs
```

The nested malformed-configuration tests failed as expected because the route
mounted the mocked form. The exact summary was `ℹ tests 31`, `ℹ pass 29`,
`ℹ fail 2`; the valid typed-value and existing form tests passed.

GREEN command:

```sh
pnpm exec node --test tests/operationDetails.test.mjs tests/operationForm.test.mjs
```

The exact summary was `ℹ tests 31`, `ℹ pass 31`, `ℹ fail 0`.

Required final checks after the fix:

| Command | Result |
| --- | --- |
| `pnpm test:device-details` | `ℹ tests 237`; `ℹ pass 237`; `ℹ fail 0` |
| `pnpm typecheck` | Exit 0 (`tsc --noEmit`) |
| `pnpm lint` | Exit 0; Oxlint passed and all 285 matched files passed formatting |
| `pnpm test:poc` | `ℹ tests 64`; `ℹ pass 64`; `ℹ fail 0` |
| `git diff --check` | Clean |

`pnpm test:poc` still prints the previously identified baseline
`MODULE_TYPELESS_PACKAGE_JSON` warning for `src/utils/authValidation.ts`; it is
not part of this fix. Initial formatter check was performed with
`pnpm exec oxfmt 'src/app/(app)/device/operation/details.tsx'
tests/operationDetails.test.mjs tests/operationForm.test.mjs` and completed
successfully.

### Iterations and deferred review items

- The first combined source patch did not apply because its footer hunk did not
  match the current source context; it changed no files. I applied the validator
  and footer correction in separate hunks.
- Typecheck, focused tests, lint and final suites passed after the changes.
- Review M1 (the unrelated 480 dp recovery cap) is deferred to Task 6 per the
  SDD minor-item rule; this round does not change that cap.

## Native container fix round 2/5

### Candidate and native evidence

The candidate is based on `e66c1447d9a56c595d24dbedb9be63e052503e6c` and changes
only the existing root View in `src/app/(app)/device/operation/details.tsx` to
`<View collapsable={false} style={styles.screen}>`. The candidate source SHA-256
recorded by the controller is
`b7f98e3b13efe5e973c8047dd1b04aac8e9dab0a3e3ca1932829273cf6ce4b94`. No
additional source, test, shared primitive, delay, portal or lifecycle change was
made. No prop-mirroring unit test was added.

The controller ran the disposable fixture on `emulator-5554`, Android user 11,
Light theme, 448 x 997 dp viewport at font scale 1.0. The candidate evidence is
recorded in `/tmp/senswave-ui-audit-qa/native-container-candidate-metadata.json`:

- PID 26134: Cancel and Android Back kept the temperature DELETE counter at 3.
  The rejected DELETE advanced 3 to 4 and showed the detach warning with local
  Retry. Retry advanced 4 to 5 once. The process remained alive during these
  selected transitions. Captures: `79-native-container-cancel-back-candidate.xml`,
  `80-native-container-conflict-candidate.png`, and
  `81-native-container-retry-candidate.png`.
- After Metro and the fake API expired during idle, the controller restarted
  them without changing the candidate. Fresh PID 32115 exercised accepted
  deletion of the unused operation from the canonical Widgets list with the
  fixture's 8-second delay. It sent exactly one DELETE, one matching
  `qa-device` display GET, and advanced the widget catalog GET count from 1 to
  2. The same PID remained alive and returned to the Widgets list with three
  groups and no unused operation. The filtered PID log
  `native-container-candidate-32115.txt` had zero fatal/null-child matches.
  Captures: `83-unused-delete-dialog-candidate.png`,
  `84-unused-delete-pending-candidate.png`, and
  `85-unused-delete-return-candidate.png`.

The baseline still includes the original PID 2631 `ScreenContentWrapper contains
null child at index 2` fatal and two later unchanged-code 409 passes on PID 22377.
The selected candidate transitions passed, but the intermittent baseline and
limited observations do not prove the initial crash's cause or establish
statistical absence of recurrence. The first cohort also was not observed
continuously after the services expired during idle.

### Verification after native gate release

| Command | Result |
| --- | --- |
| `pnpm exec node --test tests/operationDetails.test.mjs tests/operationForm.test.mjs` | `ℹ tests 31`; `ℹ pass 31`; `ℹ fail 0` |
| `pnpm typecheck` | Exit 0 (`tsc --noEmit`) |
| `pnpm lint` | Exit 0; Oxlint passed and all 285 matched files passed formatting |
| `pnpm test:poc` | `ℹ tests 64`; `ℹ pass 64`; `ℹ fail 0` |
| `git diff --check` | Clean |

PoC output retains the known baseline `MODULE_TYPELESS_PACKAGE_JSON` warning for
`src/utils/authValidation.ts`. No wider `pnpm test:device-details` rerun was
requested for this one-prop round; the focused operation suites and required
typecheck, lint, PoC and diff checks above were run fresh after native evidence
arrived. Root performed the native screenshots/XML and PID inspection; this
implementation task did not operate the emulator or services.

## Task 4 fix round 3/5 — per-device refresh result and accepted read Retry

### Confirmed behavior and implementation

The native failure reported in `native-final-notes.md` was an accepted
`unusedText` DELETE followed by a matching device-display GET that returned
HTTP 503. `DeviceListProvider.refreshDevice` resolved `void` for this normal
failure, so the route treated the read as complete and returned to Widgets. The
route now consumes an explicit boolean from the provider. A matching successful
read returns `true` only while the same home and device remain in the provider's
current cached collection; unsuccessful, missing, thrown, malformed, mismatched
and stale reads return `false` without replacing cached data. The shared state
updater also captures the invocation home and rejects queued writes after a
home change. `LiveUpdateProvider` continues to ignore this result.

After accepted DELETE, a false read or defensive exception keeps the accepted
panel open with “Operation deleted. Couldn't refresh this device. Try again.”
and Retry. The refresh latch is set only after `true`; repeated Retry callbacks
share the synchronous recovery lock and never repeat DELETE. After a successful
read, a navigation failure keeps “Return to operations” and subsequent Retry
only repeats navigation. The existing route-reset effect used to clear local
feedback when the deleted operation disappeared from the catalog; it now keeps
the error only while the accepted target still matches the route, and still
clears it after route/home/role changes.

### TDD evidence

RED commands before production changes:

| Command | Result |
| --- | --- |
| `pnpm exec node --test tests/operationDetails.test.mjs tests/operationForm.test.mjs` | `ℹ tests 32`; `ℹ pass 31`; `ℹ fail 1`. The real-provider 503 regression navigated back once (`1 !== 0`) instead of retaining accepted Retry. |
| `pnpm exec node --test tests/homeDashboard.test.mjs` | `ℹ tests 32`; `ℹ pass 30`; `ℹ fail 2`. Both new provider result checks received `undefined` where `false` was required. |

One test harness setup iteration initially returned a single-device response
for the provider's initial collection request. It was corrected to return the
collection DTO there and the single-device DTO only for the per-device read.
The first GREEN operation run also exposed the route reset effect clearing the
new read error after catalog membership changed; the accepted-target guard
above fixes that cause. Initial typecheck caught `updated.id` on narrowed
`object`; the response check now narrows the `id` property before comparison.

### Final verification

| Command | Result |
| --- | --- |
| `pnpm exec node --test tests/operationDetails.test.mjs tests/operationForm.test.mjs` | `ℹ tests 32`; `ℹ pass 32`; `ℹ fail 0` |
| `pnpm exec node --test tests/homeDashboard.test.mjs` | `ℹ tests 33`; `ℹ pass 33`; `ℹ fail 0` |
| `pnpm test:device-details` | `ℹ tests 239`; `ℹ pass 239`; `ℹ fail 0` |
| `pnpm test:dashboard` | `ℹ tests 49`; `ℹ pass 49`; `ℹ fail 0` |
| `pnpm typecheck` | Exit 0 (`tsc --noEmit`) |
| `pnpm lint` | Exit 0; Oxlint passed and all 290 matched files passed formatting |
| `pnpm test:poc` | `ℹ tests 100`; `ℹ pass 100`; `ℹ fail 0` |
| `git diff --check` | Clean |
| `rg -n 'OperationList|device/operation/list' src` | Route registration remains in `src/app/(app)/_layout.tsx`; other `OperationList` matches are DTO/type usages. |

The formatter first reported the three edited TypeScript/test files; running
`pnpm exec oxfmt 'src/app/(app)/device/operation/details.tsx'
tests/homeDashboard.test.mjs tests/operationDetails.test.mjs` resolved it.
The final lint run passed. The first typecheck run reported the response-id
narrowing issue above; the final typecheck passed. Root owns the post-commit
native replay of HTTP 503 → local Retry → successful matching read and
navigation. No native pass for this repair is claimed here; the previously
observed failure is recorded in `native-final-notes.md` and the preceding Task
4 native sections.
