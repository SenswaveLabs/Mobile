import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import process from "node:process";
import { URL } from "node:url";
import test from "node:test";

const require = createRequire(import.meta.url);
const configure = existsSync(new URL("../app.config.js", import.meta.url))
    ? require("../app.config.js")
    : ({ config }) => config;
const base = JSON.parse(readFileSync(new URL("../app.json", import.meta.url))).expo;

test("next-dev APK has a separate identity and an installable update number", (t) => {
    const previous = { ...process.env };
    t.after(() => {
        process.env = previous;
    });
    process.env.SENSWAVE_BUILD_PROFILE = "next-dev";
    process.env.SENSWAVE_ANDROID_VERSION_CODE = "42";
    const result = configure({ config: base });
    assert.equal(result.name, "Senswave next-dev");
    assert.equal(result.android.package, "com.develite.senswave.nextdev");
    assert.equal(result.scheme, "com.develite.senswave.nextdev");
    assert.equal(result.android.versionCode, 42);
    assert.deepEqual(result.plugins, base.plugins);
    assert.deepEqual(result.android.adaptiveIcon, base.android.adaptiveIcon);
    assert.equal(result.version, base.version);
    assert.equal(base.android.package, "com.develite.senswave");
    for (const invalid of ["", "0", "-1", "1.5", "NaN", "2100000001"]) {
        process.env.SENSWAVE_ANDROID_VERSION_CODE = invalid;
        assert.throws(() => configure({ config: base }), /version code/i);
    }
});

test("local and production builds retain the static Expo configuration", (t) => {
    const previous = process.env.SENSWAVE_BUILD_PROFILE;
    t.after(() => {
        if (previous === undefined) delete process.env.SENSWAVE_BUILD_PROFILE;
        else process.env.SENSWAVE_BUILD_PROFILE = previous;
    });
    for (const profile of ["", "production", "development"]) {
        process.env.SENSWAVE_BUILD_PROFILE = profile;
        assert.deepEqual(configure({ config: base }), base);
    }
});
