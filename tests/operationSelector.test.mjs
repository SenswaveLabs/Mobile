import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const operation = (id, type = "Boolean") => ({ id, name: `Name ${id}`, type });
const success = (items) => ({ isSuccess: true, response: { json: async () => ({ items }) } });
const failure = (statusCode = 500) => ({ isSuccess: false, statusCode });
const tick = () => new Promise((resolve) => setImmediate(resolve));

function makeFocusLifecycle(React) {
    let focused = false;
    const registrations = new Map();
    return {
        useFocusEffect(callback) {
            React.useEffect(() => {
                let active = false;
                let cleanup;
                const registration = {
                    start() {
                        if (!focused || active) return;
                        active = true;
                        cleanup = callback();
                    },
                    stop() {
                        if (!active) return;
                        active = false;
                        const previous = cleanup;
                        cleanup = undefined;
                        previous?.();
                    },
                };
                registrations.set(callback, registration);
                registration.start();
                return () => {
                    registration.stop();
                    if (registrations.get(callback) === registration)
                        registrations.delete(callback);
                };
            }, [callback]);
        },
        focus() {
            if (focused) return;
            focused = true;
            for (const registration of registrations.values()) registration.start();
        },
        blur() {
            if (!focused) return;
            focused = false;
            for (const registration of registrations.values()) registration.stop();
        },
    };
}

function mountSelector({
    props = {},
    responses = [],
    home = { id: "home-1", isOwner: true, canManage: false },
} = {}) {
    const reads = [];
    const pushes = [];
    const selected = [];
    let focusLifecycle;
    let responseIndex = 0;
    const router = {
        push: (route) => pushes.push(route),
    };
    const component = mountNativeComponent(
        "src/components/device/operation/OperationSelector.tsx",
        {
            props: {
                deviceId: "device-1",
                filterTypes: ["Boolean"],
                onSelected: (value) => selected.push(value),
                ...props,
            },
            modules: (React) => {
                focusLifecycle = makeFocusLifecycle(React);
                return {
                    "../common/ImageButton": "ImageButton",
                    "../common/Dropdown": "Dropdown",
                    "../common/ButtonWithTextAndImage": "ButtonWithTextAndImage",
                    "../common/BottomSheetSelect": "BottomSheetSelect",
                    "../common/SectionHeaderAction": "SectionHeaderAction",
                    "../common/Loading": "Loading",
                    "../common/Button": "Button",
                    "@/components/common/ImageButton": "ImageButton",
                    "@/components/common/Dropdown": "Dropdown",
                    "@/components/common/ButtonWithTextAndImage": "ButtonWithTextAndImage",
                    "@/components/common/BottomSheetSelect": "BottomSheetSelect",
                    "@/components/common/SectionHeaderAction": "SectionHeaderAction",
                    "@/components/common/Loading": "Loading",
                    "@/components/common/Button": "Button",
                    "@/contexts/HttpClientProvider": {
                        useHttpClient: () => ({
                            get: async (path) => {
                                reads.push(path);
                                const result = responses[responseIndex++];
                                if (result === undefined) return success([]);
                                if (result instanceof Error) throw result;
                                return typeof result === "function" ? result(path) : result;
                            },
                        }),
                    },
                    "@/contexts/domain/HomeProvider": { useHomes: () => ({ current: home }) },
                    "@/contexts/custom/DeviceListProvider": {},
                    "@/contexts/ToastProvider": { useToast: () => ({ error() {} }) },
                    "expo-router": {
                        useRouter: () => router,
                        useFocusEffect: (callback) => focusLifecycle.useFocusEffect(callback),
                    },
                    "react-native": {
                        View: "View",
                        Text: "Text",
                        StyleSheet: { create: (styles) => styles },
                        Platform: { select: (values) => values.default },
                    },
                    "react-native-reanimated": {
                        default: { View: "Animated.View" },
                        useSharedValue: (value) => ({ value }),
                        useAnimatedStyle: (style) => style(),
                        withTiming: (value) => value,
                    },
                    "lucide-react-native": { Plus: "Plus" },
                };
            },
        },
    );
    component.flushEffects();
    focusLifecycle.focus();

    return {
        component,
        reads,
        pushes,
        selected,
        focus: () => focusLifecycle.focus(),
        blur: () => focusLifecycle.blur(),
        router,
        home,
        render: (nextProps) => component.render(nextProps),
        elements: (...args) => component.elements(...args),
        text: () => component.text(),
    };
}

const getSelector = (mounted) => {
    const selector = mounted.elements().find((node) => node.type === "BottomSheetSelect");
    assert.ok(selector, "Operation selection uses native BottomSheetSelect");
    return selector;
};
const getAdd = (mounted) => {
    const add = mounted.elements().find((node) => node.type === "SectionHeaderAction");
    assert.ok(add, "Add operation uses the section header action");
    return add;
};

test("zero operations keep explicit None and never auto-select after a read", async () => {
    const mounted = mountSelector({
        props: { initialOperationId: "retired-operation" },
        responses: [success([])],
    });
    await tick();
    mounted.component.render();

    const selector = getSelector(mounted);
    assert.equal(mounted.selected.length, 0);
    assert.equal(selector.props.value, "Unavailable operation");
    assert.ok(selector.props.options.some((option) => option.label === "None"));
    assert.ok(selector.props.options.some((option) => option.label === "Unavailable operation"));
    selector.props.options.find((option) => option.label === "None").onPress();
    assert.deepEqual(mounted.selected, ["None"]);
});

test("one compatible operation remains selectable with its exact ID", async () => {
    const mounted = mountSelector({ responses: [success([operation("operation-101")])] });
    await tick();
    mounted.component.render();

    const selector = getSelector(mounted);
    assert.equal(selector.props.value, "None");
    selector.props.options
        .find((option) => option.label === "Boolean - Name operation-101")
        .onPress();
    assert.deepEqual(mounted.selected, ["operation-101"]);
    assert.match(mounted.reads[0], /size=2147483647/);
});

test("full catalog filters exact operation types and preserves all 101 IDs", async () => {
    const operations = [
        ...Array.from({ length: 101 }, (_, index) => operation(`operation-${index + 1}`, "Number")),
        operation("boolean-only", "Boolean"),
        operation("text-only", "Text"),
    ];
    const mounted = mountSelector({
        props: { filterTypes: ["Number", "Integer"] },
        responses: [success(operations)],
    });
    await tick();
    mounted.component.render();

    const selector = getSelector(mounted);
    const labels = selector.props.options.map((option) => option.label);
    assert.equal(labels.filter((label) => label.startsWith("Number - ")).length, 101);
    assert.ok(labels.includes("Number - Name operation-1"));
    assert.ok(labels.includes("Number - Name operation-101"));
    assert.equal(
        labels.some((label) => label.includes("boolean-only")),
        false,
    );
    assert.equal(
        labels.some((label) => label.includes("text-only")),
        false,
    );
    selector.props.options
        .find((option) => option.label === "Number - Name operation-101")
        .onPress();
    assert.deepEqual(mounted.selected, ["operation-101"]);
    assert.match(mounted.reads[0], /deviceId=device-1&page=1&size=2147483647/);
});

test("failed, thrown and malformed reads show local retry without clearing the stored ID", async () => {
    for (const response of [
        failure(),
        new Error("offline"),
        { isSuccess: true, response: { json: async () => ({ items: "not a list" }) } },
    ]) {
        const mounted = mountSelector({
            props: { initialOperationId: "stored-operation" },
            responses: [response, success([operation("stored-operation", "Text")])],
        });
        await tick();
        mounted.component.render();
        assert.equal(getSelector(mounted).props.value, "Unavailable operation");
        assert.match(mounted.text(), /Failed to load operations/);
        assert.equal(mounted.selected.length, 0);

        const retry = mounted
            .elements()
            .find((node) => node.type === "Button" && node.props.name === "Retry");
        assert.ok(retry);
        retry.props.onPress();
        mounted.component.render();
        assert.equal(mounted.reads.length, 1, "An uncommitted Retry render starts no request.");
        mounted.component.flushEffects();
        await tick();
        mounted.component.render();
        assert.equal(mounted.reads.length, 2);
        assert.equal(getSelector(mounted).props.value, "Unavailable operation");
        assert.equal(mounted.selected.length, 0);
    }
});

test("404 is an empty catalog, not a failed read", async () => {
    const mounted = mountSelector({ responses: [failure(404)] });
    await tick();
    mounted.component.render();
    assert.ok(getSelector(mounted).props.options.some((option) => option.label === "None"));
    assert.doesNotMatch(mounted.text(), /Failed to load operations/);
    assert.equal(
        mounted.elements().some((node) => node.type === "Button" && node.props.name === "Retry"),
        false,
    );
});

test("failed focus refresh keeps same-device choices and local recovery", async () => {
    const mounted = mountSelector({
        props: { initialOperationId: "stored-operation" },
        responses: [success([operation("stored-operation")]), failure()],
    });
    await tick();
    mounted.component.render();
    assert.ok(
        getSelector(mounted).props.options.some(
            (option) => option.label === "Boolean - Name stored-operation",
        ),
    );

    mounted.blur();
    mounted.focus();
    await tick();
    mounted.component.render();
    assert.ok(
        getSelector(mounted).props.options.some(
            (option) => option.label === "Boolean - Name stored-operation",
        ),
    );
    assert.match(mounted.text(), /Failed to load operations/);
    assert.equal(mounted.selected.length, 0);
});

test("Add operation uses the exact device and returning to the field reloads its catalog", async () => {
    const mounted = mountSelector({
        props: { deviceId: "device exact/1" },
        responses: [success([operation("before")]), success([operation("after")])],
    });
    await tick();
    mounted.component.render();
    getAdd(mounted).props.onPress();
    assert.deepEqual(JSON.parse(JSON.stringify(mounted.pushes)), [
        { pathname: "device/operation/add", params: { deviceId: "device exact/1" } },
    ]);

    mounted.blur();
    mounted.focus();
    await tick();
    mounted.component.render();
    assert.equal(mounted.reads.length, 2);
    assert.ok(
        getSelector(mounted).props.options.some(
            (option) => option.label === "Boolean - Name after",
        ),
    );
});

test("stale catalog responses and option callbacks cannot change device or filter choices", async () => {
    let finishOld;
    const mounted = mountSelector({
        responses: [
            () => new Promise((resolve) => (finishOld = resolve)),
            success([operation("number-current", "Number")]),
            success([operation("boolean-next", "Boolean")]),
        ],
    });
    const staleBoolean = getSelector(mounted).props.options.find(
        (option) => option.label === "None",
    );

    const baseProps = {
        deviceId: "device-1",
        filterTypes: ["Boolean"],
        onSelected: (value) => mounted.selected.push(value),
    };
    mounted.render({ ...baseProps, filterTypes: ["Number"] });
    assert.equal(mounted.reads.length, 1, "An uncommitted filter render starts no request.");
    mounted.component.flushEffects();
    assert.equal(mounted.reads.length, 2, "Committed filter callback starts a fresh request.");
    staleBoolean?.onPress();
    await tick();
    mounted.component.render();
    assert.ok(
        getSelector(mounted).props.options.some(
            (option) => option.label === "Number - Name number-current",
        ),
    );

    const staleNumber = getSelector(mounted).props.options.find(
        (option) => option.label === "Number - Name number-current",
    );
    mounted.render({ ...baseProps, deviceId: "device-2" });
    assert.equal(mounted.reads.length, 2, "An uncommitted device render starts no request.");
    mounted.component.flushEffects();
    assert.equal(mounted.reads.length, 3, "Committed device callback starts its own request.");
    staleNumber.onPress();
    finishOld(success([operation("boolean-stale", "Boolean")]));
    await tick();
    mounted.component.render();
    assert.ok(
        getSelector(mounted).props.options.some(
            (option) => option.label === "Boolean - Name boolean-next",
        ),
    );
    assert.equal(
        getSelector(mounted).props.options.some(
            (option) => option.label === "Boolean - Name boolean-stale",
        ),
        false,
    );
    assert.deepEqual(mounted.selected, []);
});

test("retained add and selector actions stay disabled after permission or form lock changes", async () => {
    const mounted = mountSelector({ responses: [success([operation("operation-1")])] });
    await tick();
    mounted.component.render();
    const staleAdd = getAdd(mounted);
    const staleChoice = getSelector(mounted).props.options.find(
        (option) => option.label === "Boolean - Name operation-1",
    );

    mounted.render({
        deviceId: "device-1",
        filterTypes: ["Boolean"],
        disabled: true,
        onSelected: (value) => mounted.selected.push(value),
    });
    assert.equal(getAdd(mounted).props.disabled, true);
    assert.equal(getSelector(mounted).props.disabled, true);
    staleAdd.props.onPress();
    staleChoice.onPress();
    assert.deepEqual(mounted.pushes, []);
    assert.deepEqual(mounted.selected, []);

    mounted.render({
        deviceId: "device-1",
        filterTypes: ["Boolean"],
        disabled: false,
        onSelected: (value) => mounted.selected.push(value),
    });
    mounted.home.isOwner = false;
    mounted.home.canManage = false;
    mounted.render({
        deviceId: "device-1",
        filterTypes: ["Boolean"],
        disabled: false,
        onSelected: (value) => mounted.selected.push(value),
    });
    assert.equal(
        mounted.elements().some((node) => node.type === "SectionHeaderAction"),
        false,
    );
    staleAdd.props.onPress();
    assert.deepEqual(mounted.pushes, []);
});

test("selector title, field error and manager-only Add action keep native labels", async () => {
    const mounted = mountSelector({
        props: {
            title: "Tile operation",
            error: "Select an operation for this tile.",
            disabled: true,
        },
        responses: [success([])],
        home: { id: "home-1", isOwner: false, canManage: true },
    });
    await tick();
    mounted.component.render();
    assert.equal(getSelector(mounted).props.title, "Tile operation");
    assert.equal(getSelector(mounted).props.disabled, true);
    assert.match(mounted.text(), /Select an operation for this tile/);
    assert.equal(getAdd(mounted).props.accessibilityLabel, "Add operation");
    assert.equal(getAdd(mounted).props.disabled, true);
});
