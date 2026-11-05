import { spawn, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import http from "node:http";
import { renameSync } from "node:fs";
import { resolveScenario } from "./discovery.ts";
import { startGateway, localApiUrl, type SharingPolicy } from "./gateway.ts";
import { accountCredentials, testApi } from "./testData.ts";
import type { ReviewStore } from "./store.ts";
import type { Scenario, Step } from "./types.ts";

const require = createRequire(import.meta.url);
const adbArgs = (args: string[]) =>
    process.env.EXPO_REVIEW_ADB_PORT ? ["-P", process.env.EXPO_REVIEW_ADB_PORT, ...args] : args;
export function maestroFlow(appId: string, steps: unknown[]) {
    const parameterless = new Set(["hideKeyboard", "back", "scroll", "eraseText"]);
    return `appId: ${JSON.stringify(appId)}\n---\n${steps
        .map((step) => {
            const entries = Object.entries(step as Record<string, unknown>);
            if (entries.length === 1 && entries[0][1] === true && parameterless.has(entries[0][0]))
                return `- ${entries[0][0]}`;
            return `- ${JSON.stringify(step)}`;
        })
        .join("\n")}\n`;
}
export function redact(value: string) {
    for (const [key, secret] of Object.entries(process.env))
        if (
            /PASSWORD|TOKEN|SECRET|AGENT[2-4]?_ACCOUNT_EMAIL|AGENT_MQTT_LOGIN|INVITE_CODE/.test(
                key,
            ) &&
            secret
        )
            value = value.replaceAll(secret, "[redacted]");
    return value;
}

export function run(
    command: string,
    args: string[],
    options: { cwd?: string; env?: NodeJS.ProcessEnv; timeout?: number } = {},
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd: options.cwd,
            env: { ...process.env, ...options.env },
            stdio: ["ignore", "pipe", "pipe"],
        });
        const chunks: Buffer[] = [];
        let size = 0;
        const collect = (chunk: Buffer) => {
            size += chunk.length;
            if (size < 15000000) chunks.push(chunk);
        };
        child.stdout.on("data", collect);
        child.stderr.on("data", collect);
        const timer = setTimeout(() => {
            child.kill("SIGTERM");
            reject(new Error(`${command} timed out.`));
        }, options.timeout ?? 90000);
        child.once("error", (error) => {
            clearTimeout(timer);
            reject(error);
        });
        child.once("close", (code) => {
            clearTimeout(timer);
            const output = Buffer.concat(chunks);
            if (code === 0) resolve(output);
            else
                reject(
                    new Error(
                        redact(`${command} failed (${code}): ${output.toString().slice(-2500)}`),
                    ),
                );
        });
    });
}

export function findMaestro() {
    const candidates = [
        process.env.MAESTRO_BIN,
        join(homedir(), ".maestro/bin/maestro"),
        join(homedir(), ".local/share/expo-visual-review/bin/maestro/bin/maestro"),
    ].filter(Boolean) as string[];
    const local = candidates.find((candidate) => existsSync(candidate));
    if (local) return local;
    try {
        execFileSync("maestro", ["--version"], { stdio: "ignore", timeout: 20000 });
        return "maestro";
    } catch {
        throw new Error(
            "Maestro not found. Install the open-source CLI or set MAESTRO_BIN. Route scan works without it.",
        );
    }
}

export async function selectDevice(platform: string, requested?: string) {
    if (platform === "ios") {
        const data = JSON.parse(
            (await run("xcrun", ["simctl", "list", "devices", "booted", "--json"])).toString(),
        );
        const devices = Object.values(data.devices).flat() as { udid: string }[];
        if (requested && devices.some((device) => device.udid === requested)) return requested;
        if (requested) throw new Error("Requested iOS simulator is not booted.");
        if (devices.length === 1) return devices[0].udid;
        throw new Error("Boot one iOS simulator or select --device <UDID>.");
    }
    const output = (await run("adb", adbArgs(["devices"]))).toString();
    const devices = [...output.matchAll(/^(emulator-\d+)\s+device\s*$/gm)].map((match) => match[1]);
    if (requested && devices.includes(requested)) return requested;
    if (requested)
        throw new Error("Only Android emulators are permitted. Requested emulator is unavailable.");
    if (devices.length === 1) return devices[0];
    throw new Error("Start one Android emulator, or select --device emulator-<port>.");
}

function probe(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const request = http.get(`http://127.0.0.1:${port}/status`, (response) => {
            response.resume();
            resolve(response.statusCode === 200);
        });
        request.on("error", () => resolve(false));
        request.setTimeout(1000, () => {
            request.destroy();
            resolve(false);
        });
    });
}

export async function captureScenarios(
    store: ReviewStore,
    scenarios: Scenario[],
    options: {
        platform: "android" | "ios";
        device?: string;
        appId?: string;
        scheme?: string;
        metroPort?: number;
        commandIds?: string[];
        sharing?: SharingPolicy;
    },
) {
    const device = await selectDevice(options.platform, options.device);
    const maestro = findMaestro();
    const app = JSON.parse(readFileSync(join(store.repoRoot, "app.json"), "utf8")).expo;
    const appId =
        options.appId ??
        process.env.EXPO_REVIEW_APP_ID ??
        (options.platform === "android"
            ? "com.develite.senswave.nextdev"
            : app.ios?.bundleIdentifier);
    const scheme = options.scheme ?? process.env.EXPO_REVIEW_SCHEME ?? appId;
    if (!appId || !scheme || !/^[a-zA-Z0-9._-]+$/.test(appId) || !/^[a-zA-Z0-9.+-]+$/.test(scheme))
        throw new Error("Set a valid review app ID and URL scheme.");
    const account = process.env.EXPO_REVIEW_ACCOUNT ?? "AGENT";
    const invitationsPath = join(store.root, "private-invitations.json");
    const persistInvitations = (records: unknown) => {
        const temporary = `${invitationsPath}.${randomUUID()}.tmp`;
        writeFileSync(temporary, JSON.stringify(records, null, 2), { flag: "wx", mode: 0o600 });
        renameSync(temporary, invitationsPath);
    };
    const invitations = existsSync(invitationsPath)
        ? JSON.parse(readFileSync(invitationsPath, "utf8"))
        : [];
    const gateway = await startGateway(
        localApiUrl(
            process.env.EXPO_REVIEW_API_URL ??
                process.env.EXPO_PUBLIC_SENSWAVE__API__URL ??
                "http://127.0.0.1:8080",
        ),
        options.commandIds,
        {
            ...options.sharing,
            invitations,
            ...(options.sharing ? { onInvitationsChanged: persistInvitations } : {}),
        },
    );
    const port = options.metroPort ?? 8090;
    const runId = randomUUID();
    const directory = join(store.root, "runs", runId);
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const git = (args: string[]) =>
        execFileSync("git", args, { cwd: store.repoRoot, encoding: "utf8" }).trim();
    const commit = git(["rev-parse", "HEAD"]);
    const dirty = Boolean(git(["status", "--porcelain"]));
    let metro: ReturnType<typeof spawn> | undefined;
    const environment = {
        ...process.env,
        CI: "1",
        EXPO_NO_TELEMETRY: "1",
        EXPO_PUBLIC_ENVIRONMENT: "Development",
        EXPO_PUBLIC_SENSWAVE__API__URL: `http://127.0.0.1:${gateway.port}`,
        MAESTRO_CLI_NO_ANALYTICS: "1",
    };
    const deepLink = (href: string) => `${scheme}:///${href.replace(/^\//, "")}`;
    const compileSteps = (steps: Step[]) =>
        steps.map((step) => {
            if (step.openLink)
                return { openLink: { link: deepLink(step.openLink), autoVerify: true } };
            if (step.inputTextEnv) {
                if (step.inputTextEnv.startsWith("EXPO_REVIEW_INVITE_CODE_")) {
                    const target = step.inputTextEnv.replace("EXPO_REVIEW_INVITE_CODE_", "");
                    const invite = gateway.invitations.findLast(
                        (item) =>
                            item.email === accountCredentials(target).email.trim().toLowerCase(),
                    );
                    if (invite) process.env[step.inputTextEnv] = invite.password;
                }
                const value = process.env[step.inputTextEnv];
                if (!value)
                    throw new Error(`Missing local navigation variable: ${step.inputTextEnv}`);
                return { inputText: value };
            }
            return step;
        });
    const flow = async (name: string, steps: unknown[], secret = false) => {
        const path = join(directory, `${name}.yaml`);
        writeFileSync(path, maestroFlow(appId, steps), { mode: 0o600 });
        try {
            const output = await run(
                maestro,
                [
                    "--device",
                    device,
                    "test",
                    "--no-reinstall-driver",
                    "--test-output-dir",
                    join(directory, secret ? "private-login" : "maestro"),
                    path,
                ],
                { env: environment, timeout: 180000 },
            );
            if (!secret)
                writeFileSync(join(directory, `${name}.log`), redact(output.toString()), {
                    mode: 0o600,
                });
        } finally {
            if (secret) rmSync(path, { force: true });
        }
    };
    let loggedIn = false;
    try {
        if (await probe(port))
            throw new Error(
                `Port ${port} is occupied. Choose --metro-port; review must own its isolated Metro environment.`,
            );
        if (options.platform === "android")
            for (const target of [port, gateway.port])
                await run(
                    "adb",
                    adbArgs(["-s", device, "reverse", `tcp:${target}`, `tcp:${target}`]),
                );
        const expo = require.resolve("expo/bin/cli");
        const log = join(directory, "metro.log");
        metro = spawn(
            process.execPath,
            [
                expo,
                "start",
                "--dev-client",
                "--no-dev",
                "--clear",
                "--localhost",
                "--port",
                String(port),
            ],
            { cwd: store.repoRoot, env: environment, stdio: ["ignore", "pipe", "pipe"] },
        );
        let metroLog = "";
        const logMetro = (chunk: Buffer) => {
            metroLog = (metroLog + redact(chunk.toString())).slice(-100000);
            writeFileSync(log, metroLog, { mode: 0o600 });
        };
        metro.stdout?.on("data", logMetro);
        metro.stderr?.on("data", logMetro);
        const deadline = Date.now() + 60000;
        while (!(await probe(port))) {
            if (metro.exitCode !== null || Date.now() > deadline)
                throw new Error(`Metro did not start. ${metroLog.slice(-2000)}`);
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
        writeFileSync(log, metroLog, { mode: 0o600 });
        const developmentLink = `${scheme}://expo-development-client/?url=${encodeURIComponent(`http://127.0.0.1:${port}`)}`;
        await flow("bootstrap", [
            { stopApp: appId },
            { openLink: { link: developmentLink, autoVerify: true } },
            {
                extendedWaitUntil: {
                    visible:
                        "Choose server|Remember me|Homes|Expo Visual Review|Review and accept|Set up your home",
                    timeout: 90000,
                },
            },
        ]);
        for (const [index, scenario] of [...scenarios]
            .sort((a, b) => Number(Boolean(a.authenticated)) - Number(Boolean(b.authenticated)))
            .entries()) {
            const route = store.manifest().routes.find((item) => item.id === scenario.routeId);
            if (!route) continue;
            if (scenario.skip) {
                store.recordAttempt({
                    routeId: route.id,
                    state: scenario.state,
                    status: "blocked",
                    reason: scenario.skip,
                    runId,
                });
                continue;
            }
            let navigated = false;
            let cleanupFailed = false;
            try {
                if (scenario.authenticated && !loggedIn) {
                    const { email, password } = accountCredentials(account);
                    if (!email || !password)
                        throw new Error("Test account credentials are missing.");
                    await flow(
                        "login",
                        [
                            { openLink: { link: deepLink("/login"), autoVerify: true } },
                            { assertVisible: "you@example.com" },
                            { tapOn: "you@example.com" },
                            { inputText: email },
                            { tapOn: "Enter your password" },
                            { inputText: password },
                            { hideKeyboard: true },
                            { tapOn: { text: "Sign in", index: 1 } },
                            {
                                extendedWaitUntil: {
                                    visible:
                                        "Expo Visual Review|Set up your home|Review and accept",
                                    timeout: 30000,
                                },
                            },
                        ],
                        true,
                    );
                    loggedIn = true;
                    if (existsSync(join(store.root, "fixtures.json"))) {
                        const fixtures = JSON.parse(
                            readFileSync(join(store.root, "fixtures.json"), "utf8"),
                        );
                        const api = await testApi(account);
                        const user = (await api.call("v1/users")).body;
                        const accessibleHomes =
                            user?.hasActiveConsent === true
                                ? await api.items("v1/homes?page=1&size=1000")
                                : [];
                        if (
                            fixtures.homeId &&
                            accessibleHomes.some((home) => home.id === fixtures.homeId)
                        )
                            await flow("select-test-home", [
                                { openLink: { link: deepLink("/home/list"), autoVerify: true } },
                                { tapOn: "Expo Visual Review,.*" },
                                { openLink: { link: deepLink("/"), autoVerify: true } },
                                { assertVisible: "Devices" },
                            ]);
                    }
                }
                const resolved = resolveScenario(route, scenario);
                if (!resolved) throw new Error("No concrete test destination available.");
                const steps: Step[] = [
                    ...(scenario.setup ?? [{ openLink: resolved.href }]),
                    ...(scenario.steps ?? []),
                    { assertVisible: scenario.assertVisible },
                ];
                const maestroSteps = compileSteps(steps);
                const screenshotPath = join(directory, `capture-${index}`);
                navigated = true;
                await flow(
                    `screen-${index}`,
                    maestroSteps,
                    steps.some((step) => Boolean(step.inputTextEnv)),
                );
                let png: Buffer;
                if (options.platform === "android")
                    png = await run("adb", adbArgs(["-s", device, "exec-out", "screencap", "-p"]));
                else {
                    await run("xcrun", [
                        "simctl",
                        "io",
                        device,
                        "screenshot",
                        `${screenshotPath}.png`,
                    ]);
                    png = readFileSync(`${screenshotPath}.png`);
                }
                store.recordCapture(
                    {
                        routeId: route.id,
                        state: scenario.state,
                        platform: options.platform,
                        device,
                        commit,
                        dirty,
                        href: resolved.href,
                        steps,
                        runId,
                        account,
                        authenticated: scenario.authenticated === true,
                        ...(scenario.cleanup ? { cleanup: scenario.cleanup } : {}),
                        ...(scenario.verifySteps ? { verifySteps: scenario.verifySteps } : {}),
                        ...(scenario.verifyBlocked
                            ? { verifyBlocked: scenario.verifyBlocked }
                            : {}),
                        ...(scenario.params ? { params: scenario.params } : {}),
                    },
                    png,
                );
                console.log(`Captured ${route.id} [${scenario.state}]`);
            } catch (error) {
                const reason = redact(error instanceof Error ? error.message : String(error));
                store.recordAttempt({
                    routeId: route.id,
                    state: scenario.state,
                    status: "failed",
                    reason,
                    runId,
                });
                console.log(`Failed ${route.id} [${scenario.state}]`);
            } finally {
                if (navigated && scenario.cleanup?.length) {
                    try {
                        await flow(
                            `cleanup-${index}`,
                            compileSteps(scenario.cleanup),
                            scenario.cleanup.some((step) => Boolean(step.inputTextEnv)),
                        );
                    } catch (error) {
                        store.recordAttempt({
                            routeId: route.id,
                            state: scenario.state,
                            status: "failed",
                            reason: `Cleanup failed: ${redact(error instanceof Error ? error.message : String(error))}`,
                            runId,
                        });
                        cleanupFailed = true;
                    }
                }
            }
            if (cleanupFailed)
                throw new Error("Navigation cleanup failed; remaining journeys were stopped.");
        }
    } catch (error) {
        for (const scenario of scenarios)
            if (
                !store
                    .manifest()
                    .attempts.some(
                        (attempt) =>
                            attempt.runId === runId &&
                            attempt.routeId === scenario.routeId &&
                            attempt.state === scenario.state,
                    )
            )
                store.recordAttempt({
                    routeId: scenario.routeId,
                    state: scenario.state,
                    status: "failed",
                    reason: redact(error instanceof Error ? error.message : String(error)),
                    runId,
                });
        throw error;
    } finally {
        metro?.kill("SIGTERM");
        gateway.close();
        if (options.platform === "android")
            for (const target of [port, gateway.port])
                await run(
                    "adb",
                    adbArgs(["-s", device, "reverse", "--remove", `tcp:${target}`]),
                ).catch(() => {});
        writeFileSync(
            join(directory, "blocked-writes.json"),
            JSON.stringify(gateway.blocked, null, 2),
            { mode: 0o600 },
        );
        writeFileSync(
            join(directory, "api-requests.json"),
            JSON.stringify(gateway.requests, null, 2),
            { mode: 0o600 },
        );
        if (options.sharing) persistInvitations(gateway.invitations);
    }
    const attempts = store.manifest().attempts.filter((attempt) => attempt.runId === runId);
    const summary = {
        runId,
        captured: attempts.filter((attempt) => attempt.status === "captured").length,
        failed: attempts.filter((attempt) => attempt.status === "failed").length,
        blocked: attempts.filter((attempt) => attempt.status === "blocked").length,
    };
    console.log(
        `Run: ${summary.captured} captured, ${summary.failed} failed, ${summary.blocked} blocked.`,
    );
    return summary;
}
