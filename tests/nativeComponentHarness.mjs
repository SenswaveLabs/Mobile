import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { setTimeout, clearTimeout } from "node:timers";
import ts from "typescript";

const require = createRequire(import.meta.url);

// Execute real component handlers in Node; native hosts and external providers
// are replaced because Node cannot mount React Native. This is not a render test.
export function mountNativeComponent(
    file,
    {
        props = {},
        modules = {},
        exportName = "default",
        timers = { setTimeout, clearTimeout },
    } = {},
) {
    const slots = [];
    const effects = [];
    const focused = [];
    let cursor = 0;
    let currentAction;
    let pendingActions = 0;
    const optimisticSlots = new Set();
    const sameDeps = (a, b) =>
        a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
    const memo = (factory, deps) => {
        const index = cursor++;
        if (!sameDeps(slots[index]?.deps, deps)) slots[index] = { deps, value: factory() };
        return slots[index].value;
    };
    const react = {
        startTransition: (action) => {
            const previous = currentAction;
            currentAction = true;
            pendingActions++;
            let result;
            try {
                result = action();
            } finally {
                currentAction = previous;
            }
            const finish = () => {
                if (--pendingActions === 0)
                    for (const index of optimisticSlots) slots[index].optimistic = false;
            };
            Promise.resolve(result).then(finish, finish);
        },
        useOptimistic: (base, reducer = (_current, value) => value) => {
            const index = cursor++;
            const slot = (slots[index] ??= {});
            slot.base = base;
            return [
                slot.optimistic ? slot.value : base,
                (value) => {
                    if (!currentAction) throw new Error("Optimistic update outside Action");
                    slot.value = reducer(slot.optimistic ? slot.value : slot.base, value);
                    slot.optimistic = true;
                    optimisticSlots.add(index);
                },
            ];
        },
        useTransition: () => {
            const index = cursor++;
            const slot = (slots[index] ??= { pending: 0 });
            return [
                slot.pending > 0,
                (action) => {
                    slot.pending++;
                    react.startTransition(() => {
                        const result = action();
                        Promise.resolve(result).then(
                            () => slot.pending--,
                            () => slot.pending--,
                        );
                        return result;
                    });
                },
            ];
        },
        createContext: (value) => ({ Provider: "ContextProvider", value }),
        useContext: (context) => context.value,
        createElement: (type, props, ...children) => {
            const inputType = typeof type === "string" ? type : type?.name;
            if (["Input", "PasswordInput", "HomeCodeInput"].includes(inputType) && props.inputRef) {
                props.inputRef.current = {
                    focus: () => focused.push(props.title || "Invite code"),
                };
            }
            if (type === "TextInput" && props.ref && typeof props.ref === "object") {
                props.ref.current = { focus: () => focused.push(props.accessibilityLabel) };
            }
            return {
                type,
                props: { ...props, children: children.length ? children : (props?.children ?? []) },
            };
        },
        useState: (initial) => {
            const index = cursor++;
            if (!(index in slots))
                slots[index] = typeof initial === "function" ? initial() : initial;
            return [
                slots[index],
                (value) => {
                    slots[index] = typeof value === "function" ? value(slots[index]) : value;
                },
            ];
        },
        useRef: (initial) => {
            const index = cursor++;
            return (slots[index] ??= { current: initial });
        },
        forwardRef: (component) => (props) => component(props, props.ref),
        useImperativeHandle: (ref, create) => {
            if (ref) ref.current = create();
        },
        useMemo: memo,
        useId: () => memo(() => `native-test-${cursor}`, []),
        useCallback: (fn, deps) => memo(() => fn, deps),
        useEffect: (fn, deps) => {
            const index = cursor++;
            if (!sameDeps(slots[index]?.deps, deps)) {
                effects.push(() => {
                    slots[index]?.cleanup?.();
                    slots[index] = { deps, cleanup: fn() };
                });
            }
        },
    };
    const native = {
        ...Object.fromEntries(
            [
                "View",
                "Text",
                "TextInput",
                "Pressable",
                "TouchableOpacity",
                "FlatList",
                "RefreshControl",
                "ActivityIndicator",
                "Image",
                "ScrollView",
                "Modal",
            ].map((name) => [name, name]),
        ),
        StyleSheet: { create: (value) => value },
        Dimensions: { get: () => ({ width: 390, height: 844 }) },
        Animated: {
            View: "Animated.View",
            Value: class {
                constructor(value) {
                    this.value = value;
                }
            },
            spring: () => ({}),
            sequence: () => ({ start: () => {} }),
        },
        Platform: { select: (values) => values.default },
        useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
        AccessibilityInfo: { announceForAccessibility: () => {} },
    };
    const cache = new Map();
    function load(filePath) {
        const path = [filePath, filePath + ".ts", filePath + ".tsx"].find(existsSync);
        if (!path) throw new Error(`Test module not found: ${filePath}`);
        if (cache.has(path)) return cache.get(path);
        const code = ts.transpileModule(readFileSync(path, "utf8"), {
            compilerOptions: {
                module: ts.ModuleKind.CommonJS,
                jsx: ts.JsxEmit.React,
                esModuleInterop: true,
            },
        }).outputText;
        const module = { exports: {} };
        const localRequire = (name) => {
            if (name in modules) return modules[name];
            if (name === "react") return react;
            if (name === "react-native") return native;
            if (name === "lucide-react-native")
                return Object.fromEntries(
                    [
                        "CircleAlert",
                        "Info",
                        "CircleHelp",
                        "Clock3",
                        "Unplug",
                        "LockKeyhole",
                        "LayoutGrid",
                        "List",
                    ].map((name) => [name, name]),
                );
            if (name === "react-native-keyboard-controller")
                return {
                    KeyboardAwareScrollView: "KeyboardAwareScrollView",
                    KeyboardAvoidingView: "KeyboardAvoidingView",
                };
            if (name.includes("ThemeProvider"))
                return { useTheme: () => ({ current: { colors: {} } }) };
            if (name.includes("ToastProvider"))
                return { useToast: () => ({ error: () => {}, info: () => {} }) };
            if (name.endsWith("/ui/alert"))
                return {
                    Alert: "Alert",
                    AlertDescription: "AlertDescription",
                    AlertTitle: "AlertTitle",
                };
            const ui = name.match(/\/ui\/(button|input|text|checkbox|label)$/);
            if (ui) {
                const names = {
                    button: ["Button", "Pressable"],
                    input: ["Input", "TextInput"],
                    text: ["Text", "Text"],
                    checkbox: ["Checkbox", "Checkbox"],
                    label: ["Label", "Label"],
                };
                const [exported, host] = names[ui[1]];
                return { [exported]: host };
            }
            const common = name.match(/\/common\/(Input|PasswordInput|Button|Text|Loading|Icon)$/);
            if (common) return common[1];
            if (name.startsWith("@/")) return load(resolve("src", name.slice(2)));
            if (name.startsWith(".")) return load(resolve(dirname(path), name));
            return require(name);
        };
        runInNewContext(code, {
            module,
            exports: module.exports,
            require: localRequire,
            React: react,
            Error,
            requestAnimationFrame: (callback) => callback(),
            ...timers,
        });
        cache.set(path, module.exports);
        return module.exports;
    }
    const Component = load(resolve(file))[exportName];
    let tree;
    const render = (nextProps = props) => {
        props = nextProps;
        cursor = 0;
        tree = Component(props);
    };
    const elements = (node) =>
        Array.isArray(node)
            ? node.flatMap(elements)
            : node && typeof node === "object"
              ? [
                    node,
                    ...[
                        "children",
                        "actions",
                        "header",
                        "heading",
                        "headerAction",
                        "intro",
                        "leading",
                        "trailing",
                    ].flatMap((slot) => elements(node.props?.[slot])),
                ]
              : [];
    render();
    return {
        render,
        elements: (node = tree) => elements(node),
        focused,
        output: () => tree,
        unmount: () => slots.forEach((slot) => slot?.cleanup?.()),
        flushEffects: () => {
            effects.splice(0).forEach((effect) => effect());
        },
        text: () => JSON.stringify(tree),
    };
}
