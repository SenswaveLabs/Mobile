# Expo Visual Review

Local native-screen review for Senswave. The mobile bundle and production application code are unchanged. The gallery uses Next.js, Tailwind and react-konva; annotations use Node's built-in SQLite. No hosted service is required.

## Start

Use Node from `.nvmrc`, then install the workspace with the frozen lockfile:

```sh
pnpm install --frozen-lockfile
pnpm review:scan
pnpm review:open
```

Open <http://127.0.0.1:3100>. The server binds to loopback only. `review:open --port 3101` selects another port. It prints the artifact directory; the default is `$XDG_DATA_HOME/expo-visual-review/<repository-hash>/visual-review` (or `~/.local/share/...`). Its `manifest.json`, `screenshots/`, `reviews.sqlite`, replay files, exports and diagnostics stay outside Git. `EXPO_REVIEW_HOME=/absolute/path` explicitly selects another directory. Use a separate directory for a different local API or repository.

## Native capture

Install the free [Maestro CLI](https://docs.maestro.dev/get-started/quickstart), or set `MAESTRO_BIN` to its executable. The tool also recognizes `~/.maestro/bin/maestro`. Start an Android emulator and install the existing Senswave development client; Expo Go does not support this app's native modules. For an initial build, follow the [mobile tooling guide](../../docs/agent-guide/tooling.md).

```sh
pnpm review:scan --capture --seed --exercise-mqtt --exercise-controls
```

The first run creates named test resources on the **local** API: an `Expo Visual Review` broker, three homes, nine devices, rooms, a dashboard, fourteen operations, six main widgets plus per-device widgets, and a sample automation. The main home has Switch, Slider, Display and Options tiles with MQTT readings. Loft and Garden intentionally cover homes without a data source: the API permits one home per broker and one broker per server/port. Later runs discover and reuse those resources. There is no cleanup/delete command. The automation references only review operations. Test MQTT messages are non-retained and use only `expo-visual-review/<repository-hash>/...`; no existing device topic is used. `--exercise-mqtt` checks publish/subscribe and records evidence locally. `--exercise-controls` additionally probes the named review widgets and permits only those widget action endpoints during the live-controls journey. Setup is optional: omit `--seed` to use existing review fixtures without creating resources.

The local `.env` supplies:

```dotenv
EXPO_PUBLIC_SENSWAVE__API__URL=http://10.0.2.2:7070
AGENT_ACCOUNT_EMAIL=your-local-test-account
AGENT_ACCOUNT_PASSWORD=your-local-test-password
AGENT_MQTT_SERVER=your-test-broker-host
AGENT_MQTT_PORT=8883
AGENT_MQTT_VERSION=5.0.0
AGENT_MQTT_LOGIN=your-test-mqtt-login
AGENT_MQTT_PASSWORD=your-test-mqtt-password
```

Protocol versions also accept `5`, `3.1.1`, `3.1` and the API enum names. TLS is inferred from `mqtts://`, `ssl://` or port 8883; `AGENT_MQTT_TLS=true` enables it on another port. Certificate verification remains enabled. Passwords, session tokens and raw invitation codes never enter the screenshot manifest, exported task metadata or saved replay steps. Screenshots can show invitation codes or account details; Maestro's private login diagnostics may also contain sensitive information. Keep these local artifacts private.

The CLI starts an isolated Metro server (default port 8090) and a local API gateway. Metro uses `--no-dev` to exclude developer LogBox overlays and `--clear` so a previous gateway URL cannot survive environment inlining. Android uses `adb reverse` for both. The gateway blocks application mutations except login/token refresh and explicitly enabled review-widget commands, while forwarding the existing read-only SignalR connection. Test-fixture setup and explicitly requested MQTT probes run separately from exploration. Screens open through deep links and whitelisted UI navigation, with a visible destination assertion before capture. Maestro controls navigation; `adb screencap` or `simctl screenshot` collects PNGs. No app data is cleared and no production endpoint is permitted.

```sh
pnpm review:scan --capture --route /device/device
pnpm review:scan --capture --device emulator-5554 --metro-port 8091
```

The default Android development identity is `com.develite.senswave.nextdev`. Use `--app-id` and `--scheme` (or `EXPO_REVIEW_APP_ID`/`EXPO_REVIEW_SCHEME`) for another installed development client. `EXPO_REVIEW_API_URL` overrides only the tooling's local upstream. `EXPO_REVIEW_ADB_PORT=5038` selects a separate ADB server, useful when a Windows ADB server cannot reverse-connect to WSL. It does not modify the app's `.env`.

For iOS on macOS, boot a simulator and pass `--platform ios --device <UDID> --app-id <bundle-id> --scheme <scheme>`. iOS support is implemented through Maestro/simctl; it has not been validated on this Linux workspace.

## Routes and UI states

### Invitations and additional test accounts

With `AGENT2_ACCOUNT_EMAIL/PASSWORD`, `AGENT3_ACCOUNT_EMAIL/PASSWORD` and
`AGENT4_ACCOUNT_EMAIL/PASSWORD` in the ignored `.env`, run:

```sh
pnpm review:scan --capture --sharing --account AGENT
pnpm review:scan --capture --sharing --account AGENT2
pnpm review:scan --capture --sharing --account AGENT3
pnpm review:scan --capture --sharing --account AGENT4
```

The owner creates invitations for AGENT2 (Manage) and AGENT3 (Display). Each
recipient flow captures its consent gate, accepts consent in this local test
environment if required, fills the actual invitation code, joins once, and captures
the home and dashboard with that role. AGENT4 remains unjoined and unconsented to
keep the gate available for review. No account, home, device or access is deleted.
An existing membership skips invitation creation/join; accepted codes cannot be
submitted again through the gateway.

`--sharing` enables only the named home, configured test recipients, captured local
codes and test-account consent endpoint. It does not broadly enable app writes.
Private codes stay in `private-invitations.json` outside Git; navigation metadata
contains environment-variable references instead of raw codes or credentials.
Captures and comparisons include the account profile. A created invitation is a
one-time state: verification explicitly blocks repeating its POST. Joined-home
verification uses a read-only return journey. Consent acceptance is separate from
review finding acceptance; findings still require your approval.

`review:scan` uses the installed Expo Router parser, the same file-route semantics that underpin its sitemap. It never imports application screens. It discovers layouts, route groups, dynamic parameters, catch-all routes and query parameters consumed directly by routes. It excludes API/native-intent modules. TypeScript syntax analysis records Stack/Tabs/Drawer and explicitly declared presentations.

Expo MCP is not configured in this workspace; the local parser and Maestro are the offline fallback. If Expo MCP is connected later, its runtime sitemap can be used to check the discovered list; this CLI does not require or modify MCP connections.

The manifest keeps routes separately from captures and attempts. Each capture records route, concrete URL, UI state, platform, device, original PNG resolution, SHA-256, timestamp, commit SHA, dirty-working-tree flag and replay steps. UUID filenames prevent overwriting. Failures and unconfigured states are visible in Coverage. A failed later run never removes old evidence or closes findings. Capture failures produce a nonzero exit status.

Default journeys target this repository. Routes needing IDs use resources read from the test API, never fabricated IDs. Unknown routes require an explicit local scenario. Add scenarios to `<artifact-directory>/scenarios.json`, or pass `--config /path/to/scenarios.json`:

```json
[
    {
        "routeId": "/(app)/device/device",
        "state": "dashboard",
        "params": { "deviceId": "a-real-id-read-from-your-local-test-api" },
        "testData": true,
        "authenticated": true,
        "assertVisible": "Review Switch",
        "steps": []
    }
]
```

`routeId` is the exact discovered ID, including groups; the concrete URL omits groups. Dynamic path parameters and optional query values belong in `params`. Catch-all values can be string arrays. `setup` can replace the initial deep link with a replayable parent journey, useful for token-bound child forms. `cleanup` runs after both successful and failed navigation, restoring the home or closing an overlay; a cleanup failure stops remaining journeys. Supported steps are `openLink`, `tapOn`, `assertVisible`, `assertNotVisible`, `scroll`, `back`, `hideKeyboard`, `inputText` and `eraseText`. Only configure safe steps on the designated test account. The gateway continues to block writes even when a button is accidentally reached.

## Review and Codex

Click a screenshot, select Point or Rectangle and add a comment and priority. Point mode allows touch scrolling; Rectangle mode reserves dragging for selection. Geometry is stored in original screenshot pixels, independently of the displayed scale. Numeric fields provide a keyboard alternative. Comments, priorities and Open/In progress/Fixed statuses can be edited; **Accept after review** requires a separate user confirmation. Screenshot capture, export and verification never accept findings.

The focused preview uses a compact toolbar and defaults to **Fit height**, showing the entire screenshot in the space below it. **Fit width** fills the preview width, including upscaling on 2K/4K monitors; **100%** displays original image pixels with scrolling. All three modes work in the annotation editor and comparison. Desktop findings scroll beside the image; on phones they remain below it. The version picker stays directly on the preview toolbar; full capture metadata remains in Replay and capture context. Each finding has a Delete finding action with explicit confirmation. Deletion removes that finding from SQLite and future exports, while keeping screenshots and earlier exports.

```sh
pnpm review:export
pnpm review:fix
```

Both export pending findings as versioned `tasks.json` and `tasks.md`. Each finding includes the source route, screenshot path, dimensions, geometry, comment, priority, status, navigation and commit context. `review:fix` additionally writes `codex-task.txt`, ready to give Codex. `pnpm review:fix --run` explicitly starts the installed Codex CLI with that handoff, repository write access and access to this local artifact directory. This optional step uses your existing Codex account/provider; it is not a free hosted service supplied by the tool. It does not commit, push or merge.

After applying a correction:

```sh
pnpm review:verify
pnpm review:verify --capture <capture-id>
pnpm review:verify --all
```

Verification replays affected screenshots, not every discovered route. `--capture` selects exactly one existing capture. It preserves the original evidence and leaves findings pending. The gallery's Before / after view pairs the same route, concrete destination, UI state, account, device, platform and resolution; it never compares unrelated resources. Mixed account/platform/device targets must be verified separately. A changed resolution or failed replay cannot count as a valid After image. Refresh the gallery to load new runs. A failed verification remains a failed attempt, without inventing an After image.

## Checks

```sh
pnpm test:visual-review
pnpm test:visual-review:gallery
pnpm --filter @senswave/expo-visual-review typecheck
pnpm --filter @senswave/expo-visual-review build
pnpm typecheck
pnpm lint
pnpm test:poc
```

Native runs need the emulator, Maestro, local API and test credentials. Static scan/storage tests do not. For browser checks install Chromium with `pnpm --filter @senswave/expo-visual-review exec playwright install chromium`; the browser suite uses a separate artifact directory and does not accept real findings.

If a capture process was terminated externally, check the PID in `capture.lock` and remove the lock only after that process has stopped. Run one native capture/verification at a time. Port 8090 must be free: the tool refuses to reuse an arbitrary Metro environment. Stop the gallery before building it because `next dev` and `next build` share `.next/`.

Actual Android/browser results and remaining limits are in the [validation report](../../docs/superpowers/validation/2026-11-05-expo-visual-review.md).

## Tooling branch

The implementation is maintained on `feat/expo-visual-review`, based on `next-dev`,
without merging tooling into the application branch. To update its application
base after committing or stashing your work:

```sh
git switch feat/expo-visual-review
git rebase next-dev
pnpm install --frozen-lockfile
pnpm review:scan
```

Update the local `next-dev` ref before rebasing when using remote application
changes. Existing local artifacts survive the rebase; captures retain their
original commit SHA. `review:fix` works on the current branch and does not switch,
commit or merge branches. This MVP runs the checked-out app and its installed
development client. A separate private repository that checks out arbitrary app
heads and builds clients is outside this implementation.
