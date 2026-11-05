import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { chromium, expect } from "@playwright/test";
import { ReviewStore, reviewDirectory } from "../lib/store.ts";
import { run } from "../lib/capture.ts";

const repoRoot = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const source = new ReviewStore(reviewDirectory(repoRoot), repoRoot);
const sourceManifest = source.manifest();
const native = sourceManifest.captures.find((capture) => capture.routeId === "/(auth)/login");
if (!native)
    throw new Error("Capture the native /login screen before running the browser workflow check.");
const route = sourceManifest.routes.find((item) => item.id === native.routeId);
const png = readFileSync(join(source.root, native.file));
const directory = join(source.root, "browser-checks", randomUUID());
source.close();
mkdirSync(directory, { recursive: true, mode: 0o700 });
const store = new ReviewStore(directory, repoRoot);
store.saveRoutes({
    routes: [route],
    layouts: [],
    engine: "expo-router",
    warnings: [],
    routeRoot: "src/app",
});
const before = store.recordCapture({ ...native, runId: "browser-before" }, png);
store.close();
const env = {
    ...process.env,
    EXPO_REVIEW_HOME: directory,
    EXPO_REVIEW_REPO: repoRoot,
    EXPO_REVIEW_NEXT_DIR: ".next-gallery-test",
    NEXT_TELEMETRY_DISABLED: "1",
};
const server = spawn(
    process.execPath,
    [join(repoRoot, "tools/expo-visual-review/cli.mjs"), "open", "--port", "3102"],
    { cwd: repoRoot, env, stdio: ["ignore", "pipe", "pipe"] },
);
let logs = "";
server.stdout.on("data", (chunk) => {
    logs = (logs + chunk).slice(-20000);
});
server.stderr.on("data", (chunk) => {
    logs = (logs + chunk).slice(-20000);
});
const browser = await chromium.launch({
    headless: true,
    executablePath: chromium.executablePath(),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const checkZoom = async (screenshots) => {
    assert.ok((await screenshots.count()) > 0);
    await expect(page.getByLabel("Screenshot version", { exact: true })).toBeVisible();
    const fitsViewport = () =>
        screenshots.evaluateAll((elements) =>
            elements.every((element) => {
                const viewport = element.closest(".canvas-wrap");
                return (
                    viewport &&
                    viewport.scrollWidth <= viewport.clientWidth + 1 &&
                    Math.abs(element.getBoundingClientRect().width - viewport.clientWidth) < 1
                );
            }),
        );
    const fitsHeight = () =>
        screenshots.evaluateAll((elements) =>
            elements.every((element) => {
                const viewport = element.closest(".canvas-wrap");
                const image = element.getBoundingClientRect();
                return (
                    viewport &&
                    viewport.scrollWidth <= viewport.clientWidth + 1 &&
                    viewport.scrollHeight <= viewport.clientHeight + 1 &&
                    image.width <= viewport.clientWidth + 1 &&
                    image.height <= viewport.clientHeight + 1 &&
                    (Math.abs(image.width - viewport.clientWidth) < 1 ||
                        Math.abs(image.height - viewport.clientHeight) < 1)
                );
            }),
        );
    await page.getByRole("button", { name: "Fit to height", exact: true }).click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(fitsHeight).toBe(true);
    const preview = screenshots
        .first()
        .locator("xpath=ancestor::*[contains(@class, 'canvas-wrap')][1]");
    const bounds = await preview.boundingBox();
    assert.ok(
        bounds.y + bounds.height <= (await page.viewportSize()).height + 1,
        "Whole screenshot viewport must fit on screen.",
    );
    // The visible version picker needs an extra toolbar row on phones.
    const toolbarBudget = page.viewportSize().width <= 700 ? 0.35 : 0.3;
    assert.ok(
        bounds.y < (await page.viewportSize()).height * toolbarBudget,
        "Toolbar must leave most height for the screenshot.",
    );
    await page.getByRole("button", { name: "Fit to width", exact: true }).click();
    await expect.poll(fitsViewport).toBe(true);
    await page.getByRole("button", { name: "100% resolution", exact: true }).click();
    await expect
        .poll(() =>
            screenshots.evaluateAll(
                (elements, size) =>
                    elements.every((element) => {
                        const bounds = element.getBoundingClientRect();
                        return (
                            Math.abs(bounds.width - size.width) < 1 &&
                            Math.abs(bounds.height - size.height) < 1
                        );
                    }),
                { width: native.width, height: native.height },
            ),
        )
        .toBe(true);
    await page.getByRole("button", { name: "Fit to height", exact: true }).click();
    await expect.poll(fitsHeight).toBe(true);
};
try {
    const deadline = Date.now() + 60000;
    while (true) {
        try {
            await page.goto("http://127.0.0.1:3102");
            break;
        } catch {
            if (server.exitCode !== null || Date.now() > deadline)
                throw new Error(`Gallery did not start: ${logs}`);
            await new Promise((resolve) => setTimeout(resolve, 300));
        }
    }
    await page.getByRole("heading", { name: "Expo Visual Review", exact: true }).waitFor();
    await page.getByRole("searchbox").fill("login");
    await page.locator("button.shot").click();
    await page.locator("canvas").first().waitFor();
    const canvas = page.locator("canvas").first();
    await checkZoom(canvas);
    const displayed = await canvas.boundingBox();
    await canvas.click({ position: { x: 80, y: 100 } });
    assert.ok(
        Math.abs(
            Number(await page.getByLabel("Annotation x", { exact: true }).inputValue()) -
                Math.round((80 * native.width) / displayed.width),
        ) <= 1,
    );
    assert.ok(
        Math.abs(
            Number(await page.getByLabel("Annotation y", { exact: true }).inputValue()) -
                Math.round((100 * native.height) / displayed.height),
        ) <= 1,
    );
    await page
        .getByLabel("Comment", { exact: true })
        .first()
        .fill("Align this heading with the form fields.");
    await page.getByLabel("Priority", { exact: true }).first().selectOption("high");
    await page.getByRole("button", { name: "Save finding", exact: true }).click();
    await page.getByRole("heading", { name: "Findings (1)", exact: true }).waitFor();
    await page.getByRole("button", { name: "Rectangle", exact: true }).click();
    for (const [name, value] of Object.entries({ x: "30", y: "50", width: "120", height: "80" }))
        await page.getByLabel(`Annotation ${name}`, { exact: true }).fill(value);
    await page
        .getByLabel("Comment", { exact: true })
        .first()
        .fill("Review the spacing inside this rectangle.");
    await page.getByRole("button", { name: "Save finding", exact: true }).click();
    await page.getByRole("heading", { name: "Findings (2)", exact: true }).waitFor();
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: "Export JSON", exact: true }).click();
    const exported = JSON.parse(readFileSync(await (await download).path(), "utf8"));
    assert.equal(exported.tasks.length, 2);
    assert.equal(exported.tasks[0].route, native.routeId);
    assert.equal(exported.tasks[0].coordinateSpace, "screenshot-pixels");
    assert.ok(exported.tasks[0].navigation.length);
    assert.deepEqual(exported.tasks[1].annotation.geometry, {
        type: "rect",
        x: 30,
        y: 50,
        width: 120,
        height: 80,
    });
    await run("pnpm", ["review:fix"], { cwd: repoRoot, env });
    const exports = readdirSync(join(directory, "exports")).sort();
    assert.ok(
        exports.some((name) => {
            try {
                return readFileSync(
                    join(directory, "exports", name, "codex-task.txt"),
                    "utf8",
                ).includes("Do not mark any finding accepted");
            } catch {
                return false;
            }
        }),
    );
    const updated = new ReviewStore(directory, repoRoot);
    const after = updated.recordCapture(
        { ...native, commit: "browser-verification", dirty: true, runId: "browser-after" },
        png,
    );
    assert.ok(updated.annotations().every((annotation) => annotation.status === "open"));
    assert.deepEqual(readFileSync(join(directory, before.file)), png);
    updated.close();
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    const version = page.getByLabel("Screenshot version", { exact: true });
    await expect(version).toBeVisible();
    await version.selectOption(after.id);
    await page.getByRole("heading", { name: "Findings (0)", exact: true }).waitFor();
    await version.selectOption(before.id);
    await page.getByRole("heading", { name: "Findings (2)", exact: true }).waitFor();
    await page.getByRole("button", { name: "Before / after", exact: true }).click();
    await page.getByAltText(`After: ${native.routeId}`, { exact: true }).waitFor();
    await checkZoom(page.locator(".comparison img"));
    for (const viewport of [
        { width: 2560, height: 1440 },
        { width: 3840, height: 2160 },
    ]) {
        await page.setViewportSize(viewport);
        await checkZoom(page.locator(".comparison img"));
        await page.getByRole("button", { name: "Annotate", exact: true }).click();
        await canvas.waitFor();
        await checkZoom(canvas);
        await page.screenshot({ path: join(directory, `wide-${viewport.width}-editor.png`) });
        await page.getByRole("button", { name: "Before / after", exact: true }).click();
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    assert.ok(
        (
            await page.getByAltText(`After: ${native.routeId}`, { exact: true }).getAttribute("src")
        ).includes(after.id),
    );
    await page.screenshot({ path: join(directory, "desktop-comparison.png"), fullPage: true });
    await page.getByRole("button", { name: "Annotate", exact: true }).click();
    await page.screenshot({ path: join(directory, "desktop-editor.png"), fullPage: false });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Point", exact: true }).click();
    await checkZoom(canvas);
    await page.screenshot({ path: join(directory, "mobile-fit-height.png"), fullPage: false });
    await page.getByRole("button", { name: "Fit to width", exact: true }).click();
    const scrollableCanvas = page.locator(".canvas-wrap");
    await scrollableCanvas.scrollIntoViewIfNeeded();
    const bounds = await scrollableCanvas.boundingBox();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true });
    const touchX = bounds.x + bounds.width / 2;
    const touchY = bounds.y + Math.min(bounds.height - 30, 500);
    await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: touchX, y: touchY }],
    });
    for (let offset = 40; offset <= 240; offset += 40) {
        await cdp.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x: touchX, y: touchY - offset }],
        });
        await page.waitForTimeout(25);
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    assert.ok(
        await scrollableCanvas.evaluate((element) => element.scrollTop > 0),
        "Touch must scroll the screenshot in point mode.",
    );
    await page.screenshot({ path: join(directory, "mobile-editor.png"), fullPage: true });
    assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        true,
    );
    await page.getByRole("button", { name: "Before / after", exact: true }).click();
    await checkZoom(page.locator(".comparison img"));
    await page.getByRole("button", { name: "Annotate", exact: true }).click();
    await page.reload();
    await page.locator("button.shot").click();
    await page.getByRole("heading", { name: "Findings (2)", exact: true }).waitFor();
    const deleteFirst = page
        .getByRole("article", { name: "Finding 1", exact: true })
        .getByRole("button", { name: "Delete finding", exact: true });
    page.once("dialog", (dialog) => dialog.dismiss());
    await deleteFirst.click();
    await expect(page.getByRole("heading", { name: "Findings (2)", exact: true })).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await deleteFirst.click();
    await page.getByRole("heading", { name: "Findings (1)", exact: true }).waitFor();
    const remainingDownload = page.waitForEvent("download");
    await page.getByRole("link", { name: "Export JSON", exact: true }).click();
    const remaining = JSON.parse(readFileSync(await (await remainingDownload).path(), "utf8"));
    assert.equal(remaining.tasks.length, 1);
    assert.equal(
        remaining.tasks[0].annotation.comment,
        "Review the spacing inside this rectangle.",
    );
    await page.reload();
    await page.locator("button.shot").click();
    await page.getByRole("heading", { name: "Findings (1)", exact: true }).waitFor();
    await page.getByRole("button", { name: "Back to gallery", exact: true }).click();
    await page.getByRole("button", { name: "Coverage", exact: true }).click();
    assert.ok(
        await page
            .locator("th")
            .first()
            .evaluate((element) => element.getBoundingClientRect().width >= 200),
    );
    await page.screenshot({ path: join(directory, "mobile-coverage.png"), fullPage: true });
    assert.deepEqual(errors, []);
    writeFileSync(
        join(directory, "result.json"),
        JSON.stringify(
            {
                ok: true,
                sourceNativeCapture: native.id,
                checked: [
                    "native image",
                    "point annotation",
                    "rectangle annotation",
                    "SQLite persistence",
                    "JSON download",
                    "Codex handoff",
                    "comparison",
                    "fit/full-resolution zoom in editor and comparison on desktop/mobile",
                    "2K/4K fit fills viewport and 100% preserves image pixels",
                    "whole-image height fit, compact toolbar and directly accessible version selection",
                    "cancelled and confirmed deletion, persistence and export removal",
                    "pending approval",
                    "desktop/mobile layout",
                ],
                note: "Browser comparison mechanics use two copies of the same native PNG; native recapture is verified separately.",
            },
            null,
            2,
        ),
    );
    console.log(`Gallery workflow passed. Evidence: ${directory}`);
} catch (error) {
    await page.screenshot({ path: join(directory, "failure.png"), fullPage: true }).catch(() => {});
    throw error;
} finally {
    await browser.close();
    server.kill("SIGTERM");
}
