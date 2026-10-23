# Add subscription redesign handoff

## Screen and goal

The selected screen is `/dataSource/brokers/addSubscription`, an existing MQTT topic-entry step in the native data-source setup flow. It lets an owner add one topic with a clear action, inline recovery, and protection from repeating an accepted request. The endpoint, payload contract, topic normalization, and backend authorization remain intact.

## Fit with the incumbent system

The screen extends Senswave's existing Android visual system. It uses the shared light/dark `ThemeProvider`, the branded Data Source header, `FormSection`, the auth variants of the shared `Input` and `Button`, and native system typography. The shared section supplies its established 24/32 title, 14/20 helper, and field/action rhythm. The native page uses the planned 16 dp gutters, 24 dp top and 16 dp bottom padding, and 448 dp maximum width; these are local screen composition values, not new global tokens. No new visual world, dependency, or shipping raster asset was added.

## Shipped behavior

- A single Topic field uses the short `home/sensor` hint, accepts 1–256 characters, and keeps case, internal spaces, path segments, and wildcards. Surrounding whitespace is trimmed for the POST. Invalid input is explained under the field and returns focus there.
- Keyboard Go and the full-width amber action share a synchronous submit lock. A pending request keeps the draft and keyboard, while blocking edits through retained callbacks. Request failures appear inline and allow retry without losing the topic.
- An accepted POST is latched, announced once, and returns to source details once. A failed navigation leaves a return-only recovery action. Missing broker IDs get a native recovery route; broker IDs remain unchanged.

## Evidence

- Focused handler and feedback suites pass 14/14. The coordinator reports the post-copy checks pass: typecheck, lint, `test:poc` 43/43, and `test:data-sources` 49/49.
- Android API 37 emulator evidence covers light/dark, a 320 dp window at 200% text, field validation and focus, soft-keyboard Go while a request is held, retry after injected rejection, and keyboard/route Back. The coordinator recaptured and inspected all five required screenshots after the hint was shortened; `home/sensor` is legible in the narrow large-text capture.
- The accepted subscription and exact-case payload were written through the real API to a disposable local Mosquitto fixture; repeated submission produced one backend row. Pending and rejected timing outcomes were synthetic. No external broker was changed.

## Remaining limits and review status

The whole-change review found one material visual issue: the long example clipped at 200% text. The same reviewer's final verdict scored that fix resolved and returned `ship` for the scored fix, with no remaining material finding. Task code review and its whitespace regression fix also passed independent review.

The disposable source and its test subscriptions were deleted, and the local Mosquitto container was stopped. TalkBack, physical MQTT delivery, a fresh APK build, and iOS were not verified.
