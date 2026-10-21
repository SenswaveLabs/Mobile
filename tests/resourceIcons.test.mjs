import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import Module from "node:module";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const require = createRequire(import.meta.url);
const geometry = JSON.parse(
    readFileSync(new URL("./fixtures/resource-icon-geometry.json", import.meta.url), "utf8"),
);

// Load installed Lucide components and their real icon data without evaluating native SVG hosts.
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
    if (request === "react-native-svg") return {};
    return originalLoad.call(this, request, parent, isMain);
};
let lucide;
try {
    lucide = require("lucide-react-native");
} finally {
    Module._load = originalLoad;
}

const transpile = (file, dependencies = {}) => {
    const module = { exports: {} };
    runInNewContext(
        ts.transpileModule(readFileSync(file, "utf8"), {
            compilerOptions: { module: ts.ModuleKind.CommonJS },
        }).outputText,
        { module, exports: module.exports, require: (name) => dependencies[name] },
    );
    return module.exports;
};

const lucideFileBySymbol = {
    Building2: "building-complex",
    Fingerprint: "fingerprint-pattern",
    Waves: "waves-horizontal",
};
const iconModules = {
    "@expo/vector-icons": { Ionicons: "Ionicons" },
    "lucide-react-native": lucide,
};
for (const symbol of Object.keys(geometry.symbols)) {
    if (symbol === "Leaf") continue;
    const file =
        lucideFileBySymbol[symbol] ?? symbol.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
    iconModules[`lucide-react-native/icons/${file}`] = lucide[symbol];
}
const { getResourceIcon } = transpile("src/utils/resourceIcons.ts", iconModules);

const iconNode = (component) => {
    const element = component.render({ size: 24, strokeWidth: 2, color: "#000" }, null);
    return Array.from(element.props.icon.node, ([type, attributes]) => ({
        type,
        attributes: Object.fromEntries(
            Object.entries(attributes).filter(([name]) => name !== "key"),
        ),
    }));
};

test("installed Lucide symbols match the shared SVG geometry fixture", () => {
    assert.equal(geometry.viewBox, "0 0 24 24");
    assert.equal(geometry.strokeWidth, 2);
    assert.equal(Object.keys(geometry.symbols).length, 57);

    for (const [symbol, expected] of Object.entries(geometry.symbols)) {
        assert.ok(lucide[symbol], `${symbol} must be exported by installed lucide-react-native`);
        if (symbol === "Leaf") continue;
        assert.deepEqual(iconNode(lucide[symbol]), expected, `${symbol} SVG primitives changed`);
    }
});

test("all Home and Device keys render their canonical native Lucide symbol geometry", () => {
    const icon = mountNativeComponent("src/components/common/Icon.tsx", {
        props: { icon: "home-outline", resource: "homes", size: 24 },
        modules: iconModules,
    });

    for (const resource of ["homes", "devices"]) {
        for (const item of geometry.resources[resource]) {
            const presentation = getResourceIcon(item.key, resource);
            assert.equal(presentation.symbol, item.symbol, `${resource}/${item.key} symbol`);

            icon.render({ icon: item.key, resource, size: 24, color: "onBackground" });
            const output = icon.output();
            if (item.symbol === "Leaf") {
                assert.equal(output.type.displayName, "Leaf");
                assert.notEqual(
                    output.type,
                    lucide.Leaf,
                    "Leaf must use the pinned resource geometry",
                );
            } else {
                assert.equal(output.type, lucide[item.symbol], `${resource}/${item.key} component`);
            }
            assert.equal(output.props.size, 24);
            assert.equal(output.props.strokeWidth, geometry.strokeWidth);
            assert.deepEqual(iconNode(output.type), geometry.symbols[item.symbol]);
        }
    }
});

test("unknown, historical and prototype-shaped keys use safe resource fallbacks", () => {
    for (const resource of ["homes", "devices"]) {
        for (const key of [
            "retired-key",
            "Future.Key",
            "__proto__",
            "constructor",
            "",
            "BUILDING",
        ]) {
            assert.equal(
                getResourceIcon(key, resource).symbol,
                resource === "homes" ? "HousePlug" : "Lightbulb",
            );
        }
    }
});

test("icons outside Home and Device keep their existing Ionicons normalization", () => {
    const icon = mountNativeComponent("src/components/common/Icon.tsx", {
        props: { icon: "airplane", size: 24 },
        modules: iconModules,
    });
    assert.equal(icon.output().props.name, "airplane-outline");
    icon.render({ icon: "logo-github", size: 24 });
    assert.equal(icon.output().props.name, "logo-github");
    icon.render({ icon: "star-sharp", size: 24 });
    assert.equal(icon.output().props.name, "star-outline");
});
