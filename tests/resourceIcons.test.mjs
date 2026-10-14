import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const iconModule = { exports: {} };
runInNewContext(
    ts.transpileModule(readFileSync("src/utils/resourceIcons.ts", "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    { module: iconModule, exports: iconModule.exports },
);
const { getResourceIcon } = iconModule.exports;

// Backend catalog fixtures from Next-Backend 4979c3c; these are not client allowed lists.
const keys = {
    homes: [
        "home-outline",
        "home",
        "business-outline",
        "building",
        "building-2",
        "factory",
        "warehouse",
        "castle",
        "hotel",
        "storefront-outline",
        "store",
        "location-outline",
        "map-pin",
        "pin-outline",
        "map-outline",
        "people-outline",
        "heart-outline",
        "leaf-outline",
        "trees",
        "sunny-outline",
        "sun",
        "globe-outline",
    ],
    devices: [
        "bulb-outline",
        "thermometer-outline",
        "lock-closed-outline",
        "lock-outline",
        "key-outline",
        "camera-outline",
        "shield",
        "power-outline",
        "plug-outline",
        "zap-outline",
        "fan-outline",
        "hardware-chip-outline",
        "cpu-outline",
        "wifi-outline",
        "radio-outline",
        "phone-portrait-outline",
        "laptop-outline",
        "laptop",
        "desktop-outline",
        "tv-outline",
        "server-outline",
        "server",
        "cloud",
        "battery-charging-outline",
        "battery",
        "alarm-outline",
        "mic-outline",
        "finger-print-outline",
        "water-outline",
        "droplet-outline",
        "leaf-outline",
        "snow-outline",
        "flame-outline",
        "gauge",
        "box",
        "wrench",
    ],
};
const glyphs = JSON.parse(
    readFileSync(
        new URL(
            "../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json",
            import.meta.url,
        ),
        "utf8",
    ),
);

test("every current Home and Device catalog key renders an installed native glyph with a local label", () => {
    const icon = mountNativeComponent("src/components/common/Icon.tsx", {
        props: { icon: "home-outline", resource: "homes", size: 24 },
        modules: { "@expo/vector-icons": { Ionicons: "Ionicons" } },
    });
    for (const resource of ["homes", "devices"]) {
        for (const key of keys[resource]) {
            const presentation = getResourceIcon(key, resource);
            assert.notEqual(
                presentation.label,
                key,
                `${resource}/${key} needs a local presentation`,
            );
            assert.ok(
                Object.hasOwn(glyphs, presentation.glyph),
                `${key} must map to an installed glyph`,
            );
            icon.render({ icon: key, resource, size: 24 });
            assert.equal(icon.output().props.name, presentation.glyph);
        }
    }
    assert.equal(getResourceIcon("building", "homes").glyph, "business-outline");
    assert.equal(getResourceIcon("lock-outline", "devices").glyph, "lock-closed-outline");
    assert.equal(getResourceIcon("gauge", "devices").glyph, "speedometer-outline");
});

test("unknown, historical and prototype-shaped keys render safe resource fallbacks", () => {
    for (const resource of ["homes", "devices"]) {
        for (const key of [
            "retired-key",
            "Future.Key",
            "__proto__",
            "constructor",
            "BUILDING",
            "",
        ]) {
            const presentation = getResourceIcon(key, resource);
            assert.equal(
                presentation.glyph,
                resource === "homes" ? "home-outline" : "bulb-outline",
            );
            assert.equal(presentation.label, key, "The fallback must not rewrite the stored key");
        }
    }
});

test("icons outside Home and Device keep their existing Ionicons normalization", () => {
    const icon = mountNativeComponent("src/components/common/Icon.tsx", {
        props: { icon: "airplane", size: 24 },
        modules: { "@expo/vector-icons": { Ionicons: "Ionicons" } },
    });
    assert.equal(icon.output().props.name, "airplane-outline");
    icon.render({ icon: "logo-github", size: 24 });
    assert.equal(icon.output().props.name, "logo-github");
    icon.render({ icon: "star-sharp", size: 24 });
    assert.equal(icon.output().props.name, "star-outline");
});
