import { createRequire } from "node:module";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import ts from "typescript";
import type { Discovery, RouteRecord, Scenario, LayoutRecord } from "./types.ts";

const require = createRequire(import.meta.url);
const walk = (root: string, prefix = ""): string[] =>
    readdirSync(join(root, prefix), { withFileTypes: true }).flatMap((entry) => {
        if (entry.name.startsWith(".")) return [];
        const file = join(prefix, entry.name).replaceAll("\\", "/");
        return entry.isDirectory() ? walk(root, file) : [file];
    });

function analyze(source: string, file: string) {
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const query = new Set<string>();
    const screens: LayoutRecord["screens"] = [];
    let navigator = "Stack";
    const visit = (node: ts.Node) => {
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
            const tag = node.tagName.getText(tree);
            if (["Tabs", "Stack", "Drawer"].includes(tag)) navigator = tag;
            if (/\.(Screen)$/.test(tag)) {
                const name = node.attributes.properties.find(
                    (prop) => ts.isJsxAttribute(prop) && prop.name.getText(tree) === "name",
                );
                if (
                    name &&
                    ts.isJsxAttribute(name) &&
                    name.initializer &&
                    ts.isStringLiteral(name.initializer)
                ) {
                    const options = node.getText(tree).match(/presentation\s*:\s*["']([^"']+)["']/);
                    screens.push({
                        name: name.initializer.text,
                        ...(options ? { presentation: options[1] } : {}),
                    });
                }
            }
        }
        if (
            ts.isCallExpression(node) &&
            /use(Local|Global)SearchParams$/.test(node.expression.getText(tree))
        ) {
            const type = node.typeArguments?.[0];
            if (type && ts.isTypeLiteralNode(type)) {
                for (const member of type.members)
                    if (member.name) query.add(member.name.getText(tree).replaceAll(/["']/g, ""));
            }
            const parent = node.parent;
            if (ts.isVariableDeclaration(parent) && ts.isObjectBindingPattern(parent.name)) {
                for (const element of parent.name.elements)
                    query.add((element.propertyName ?? element.name).getText(tree));
            }
            if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
                const name = parent.name.text;
                const collect = (candidate: ts.Node) => {
                    if (
                        ts.isPropertyAccessExpression(candidate) &&
                        candidate.expression.getText(tree) === name
                    )
                        query.add(candidate.name.text);
                    ts.forEachChild(candidate, collect);
                };
                collect(tree);
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(tree);
    return { query: [...query].sort(), screens, navigator };
}

export function discoverRoutes(repoRoot: string, platform = "android"): Discovery {
    const routeRoot = ["src/app", "app"].find((path) => existsSync(join(repoRoot, path)));
    if (!routeRoot) throw new Error("No Expo Router app/ or src/app/ directory found.");
    const files = walk(join(repoRoot, routeRoot)).filter((file) => /\.[jt]sx?$/.test(file));
    const layouts = files
        .filter((file) => /(?:^|\/)_layout(?:\.[a-z]+)?\.[jt]sx?$/.test(file))
        .map((file) => {
            const info = analyze(readFileSync(join(repoRoot, routeRoot, file), "utf8"), file);
            return {
                source: `${routeRoot}/${file}`,
                navigator: info.navigator,
                screens: info.screens,
            };
        });
    // Use the installed Router's parser, without loading any route modules or providers.
    const { getRoutes } = require("expo-router/build/getRoutes.js");
    const context = Object.assign(() => ({ default: () => null }), {
        keys: () => files.map((file) => `./${file}`),
    });
    const tree = getRoutes(context, {
        platform,
        importMode: "lazy",
        ignoreEntryPoints: true,
        skipGenerated: true,
        ignoreRequireErrors: true,
    });
    const routes: RouteRecord[] = [];
    const visit = (
        node: {
            contextKey: string;
            route: string;
            type: string;
            generated?: boolean;
            children?: (typeof node)[];
        },
        parent = "",
    ) => {
        const route = [parent, node.route].filter(Boolean).join("/");
        if (node.type === "route" && !node.generated && !/\+api\.[jt]s$/.test(node.contextKey)) {
            const source = `${routeRoot}/${node.contextKey.replace(/^\.\//, "")}`;
            const segments = route.split("/").filter(Boolean);
            if (segments.at(-1) === "index") segments.pop();
            const pathname = "/" + segments.filter((part) => !/^\(.+\)$/.test(part)).join("/");
            const parameters = [...pathname.matchAll(/\[(\.\.\.)?([^\]]+)\]/g)].map((match) => ({
                name: match[2],
                catchAll: Boolean(match[1]),
            }));
            const query = analyze(readFileSync(join(repoRoot, source), "utf8"), source).query;
            const ancestors = layouts.filter((layout) => {
                const dir = dirname(layout.source);
                return source.startsWith(`${dir}/`);
            });
            const presentation = ancestors
                .flatMap((layout) =>
                    layout.screens.filter((screen) => {
                        const fromLayout = relative(dirname(layout.source), source).replace(
                            /(?:\.(?:android|ios|native|web))?\.[jt]sx?$/,
                            "",
                        );
                        return screen.name === fromLayout;
                    }),
                )
                .findLast((screen) => screen.presentation)?.presentation;
            routes.push({
                id: "/" + segments.join("/"),
                pathname,
                source,
                parameters,
                queryParameters: query,
                groups: segments.filter((part) => /^\(.+\)$/.test(part)),
                layouts: ancestors.map((layout) => layout.source),
                ...(presentation ? { presentation } : {}),
                ...(pathname.includes("+not-found") ? { internal: true } : {}),
            });
        }
        for (const child of node.children ?? [])
            visit(child, node.type === "layout" ? route : parent);
    };
    if (tree) visit(tree);
    return {
        routeRoot,
        routes: routes.sort((a, b) => a.id.localeCompare(b.id)),
        layouts,
        engine: "expo-router",
        warnings: [],
    };
}

export function resolveScenario(route: RouteRecord, scenario?: Partial<Scenario>) {
    if (!scenario && (route.parameters.length || route.queryParameters.length || route.internal))
        return null;
    const params = { ...scenario?.params };
    if (Object.keys(params).length && scenario?.testData !== true)
        throw new Error("Route parameters require testData: true and validated local fixtures.");
    let href = route.pathname || "/";
    for (const parameter of route.parameters) {
        const value = params[parameter.name];
        if (
            !value ||
            (typeof value === "string" && !value.trim()) ||
            (Array.isArray(value) && (!value.length || value.some((part) => !part.trim())))
        )
            throw new Error(`Missing valid test parameter: ${parameter.name}`);
        if (!parameter.catchAll && Array.isArray(value))
            throw new Error(`Expected one value for ${parameter.name}`);
        const encoded = (Array.isArray(value) ? value : [value])
            .map(encodeURIComponent)
            .join(parameter.catchAll ? "/" : "");
        href = href.replace(`[${parameter.catchAll ? "..." : ""}${parameter.name}]`, encoded);
        delete params[parameter.name];
    }
    const query = new URLSearchParams();
    for (const [name, value] of Object.entries(params)) {
        for (const item of Array.isArray(value) ? value : [value]) query.append(name, item);
    }
    return { href: href + (query.size ? `?${query}` : ""), state: scenario?.state ?? "default" };
}
