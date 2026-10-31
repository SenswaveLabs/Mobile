import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const icons = [
    "flash-outline",
    "timer-outline",
    "time-outline",
    "calendar-outline",
    "alarm-outline",
    "sync-outline",
    "shuffle-outline",
    "pulse-outline",
    "swap-horizontal-outline",
    "notifications-outline",
    "cog-outline",
    "moon-outline",
    "sunny-outline",
    "thermometer-outline",
];
const theme = {
    current: {
        colors: {
            background: "background",
            authForeground: "foreground",
            authMuted: "muted",
            error: "error",
            primary: "primary",
            authBorder: "border",
            authFocus: "focus",
        },
    },
};
const condition = (
    operationId = "operation-1",
    conditionType = "BooleanCondition",
    conditionConfiguration = { isOn: false },
) => ({
    operationId,
    operationName: "Door sensor",
    conditionType,
    conditionConfiguration,
});
const result = (operationId = "operation-2", valueToSend = "false") => ({
    operationId,
    operationName: "Lamp",
    valueToSend,
});

function makeAutomation({ token = "session-1", automationId, conditions = [], results = [] } = {}) {
    let session = { token, homeId: "home-1", automationId, conditions, results };
    const removals = [];
    const pushes = [];
    const api = {
        value: () => ({
            session,
            isCurrentSession: (candidate) => candidate === session?.token,
            setAutomationResults() {},
            setAutomationConditions() {},
            removeDraftCondition: (candidate, index) => {
                removals.push(["condition", candidate, index]);
                if (candidate !== session?.token || session.automationId !== undefined)
                    return false;
                session = {
                    ...session,
                    conditions: session.conditions.filter((_, i) => i !== index),
                };
                return true;
            },
            removeDraftResult: (candidate, index) => {
                removals.push(["result", candidate, index]);
                if (candidate !== session?.token || session.automationId !== undefined)
                    return false;
                session = { ...session, results: session.results.filter((_, i) => i !== index) };
                return true;
            },
        }),
        get session() {
            return session;
        },
        set session(value) {
            session = value;
        },
        removals,
        pushes,
    };
    return api;
}

function mountForm({
    mode = "create",
    initialValues = {
        name: "",
        icon: "flash-outline",
        conditionConnector: "And",
        isEnabled: true,
    },
    provider = makeAutomation(),
    onSubmit = async () => {},
    themeValue = theme,
    ...props
} = {}) {
    const navigation = [];
    const form = mountNativeComponent("src/components/automations/AutomationForm.tsx", {
        props: {
            mode,
            sessionToken: "session-1",
            initialValues,
            readOnly: false,
            canAddChildren: true,
            pending: false,
            onSubmit,
            ...props,
        },
        modules: {
            "react-native": {
                AccessibilityInfo: { announceForAccessibility: () => {} },
                StyleSheet: { create: (styles) => styles },
                TextInput: "TextInput",
                View: "View",
            },
            "react-native-keyboard-controller": {
                KeyboardAwareScrollView: "KeyboardAwareScrollView",
            },
            "react-native-gesture-handler": { ScrollView: "ScrollView" },
            "expo-router": {
                useRouter: () => ({ push: (route) => navigation.push(route) }),
            },
            "lucide-react-native": { CircleAlert: "CircleAlert", Check: "Check", Info: "Info" },
            "@/contexts/custom/AutomationProvider": { useAutomation: provider.value },
            "@/contexts/domain/HomeProvider": {
                useHomes: () => ({ current: { id: "home-1", name: "Home 1", isOwner: true } }),
            },
            "@/contexts/ThemeProvider": { useTheme: () => themeValue },
            "@/styles/defaultStyles": { keyboardOffset: 48 },
            "@/components/common/Button": "Button",
            "@/components/common/ContentSection": "ContentSection",
            "@/components/common/FormSection": "FormSection",
            "@/components/common/Icon": "Icon",
            "@/components/common/IconSelector": "IconSelector",
            "@/components//common/IconSelector": "IconSelector",
            "@/components/common/Input": "Input",
            "@/components/common/Divider": "Divider",
            "@/components/common/ImageButton": "ImageButton",
            "@/components/automations/AutomationTile": "AutomationTile",
            "@/components/automations/ConditionResultTile": "ConditionResultTile",
            "@/components/automations/LogicalConjuction": "LogicalConjuction",
            "@/styles/shadowStyles": { shadowStyles: { default: {} } },
            "@/components/common/SectionHeaderAction": "SectionHeaderAction",
            "@/components/ui/toggle-group": {
                ToggleGroup: "ToggleGroup",
                ToggleGroupItem: "ToggleGroupItem",
            },
            "@/components/ui/alert": {
                Alert: "Alert",
                AlertDescription: "AlertDescription",
            },
            "@/components/ui/text": { Text: "Text" },
            "@/components/automations/conditions/AutomationConditions": "AutomationConditions",
            "@/components/automations/results/AutomationResults": "AutomationResults",
        },
    });
    form.flushEffects();

    const field = (title) =>
        form.elements().find((node) => node.type === "Input" && node.props.title === title);
    const button = (name) =>
        form.elements().find((node) => node.type === "Button" && node.props.name === name);
    const actions = () => form.elements().filter((node) => node.type === "SectionHeaderAction");
    return {
        ...form,
        navigation,
        provider,
        field,
        button,
        actions,
        change(title, value) {
            assert.ok(field(title), `${title} field exists`);
            field(title).props.setValue(value);
            form.render();
        },
        selectIcon(value) {
            const selector = form.elements().find((node) => node.type === "IconSelector");
            assert.ok(selector, "global icon selector exists");
            selector.props.onIconSelected(value);
            form.render();
        },
        async submit(name) {
            const action = button(name);
            assert.ok(action, `${name} action exists`);
            await action.props.onPress();
            form.render();
        },
    };
}

function mountAddRoute({
    home = { current: { id: "home-1", name: "Home 1", isOwner: true, canManage: false } },
    post = async () => ({ isSuccess: true }),
    refresh = async () => true,
    canGoBack = true,
    back = () => {},
    replace = () => {},
} = {}) {
    const requests = [];
    const refreshCalls = [];
    const navigation = [];
    const cleared = [];
    const begins = [];
    let session;
    let focusEffect;
    let cleanup;
    const provider = {
        value: () => ({
            session,
            beginSession: (homeId) => {
                const token = "visit-1";
                begins.push(homeId);
                session = { token, homeId, conditions: [], results: [] };
                return token;
            },
            clearSession: (token) => {
                cleared.push(token);
                if (session?.token === token) session = undefined;
            },
            isCurrentSession: (token) =>
                session?.token === token && session.homeId === home.current?.id,
        }),
        get session() {
            return session;
        },
        set session(value) {
            session = value;
        },
    };
    const router = {
        canGoBack: () => canGoBack,
        back: () => {
            navigation.push(["back"]);
            return back();
        },
        replace: (destination) => {
            navigation.push(["replace", destination]);
            return replace(destination);
        },
    };
    const list = {
        refresh: (homeId) => {
            refreshCalls.push(homeId);
            return refresh(homeId);
        },
    };
    const route = mountNativeComponent("src/app/(app)/automation/add.tsx", {
        modules: {
            "expo-router": {
                useFocusEffect: (callback) => (focusEffect = callback),
                useRouter: () => router,
            },
            "react-native": { StyleSheet: { create: (styles) => styles }, View: "View" },
            "lucide-react-native": { CircleAlert: "CircleAlert", Info: "Info" },
            "@/contexts/HttpClientProvider": {
                useHttpClient: () => ({
                    post: (path, body) => {
                        requests.push([path, JSON.parse(JSON.stringify(body))]);
                        return post(path, body);
                    },
                }),
            },
            "@/contexts/custom/AutomationListProvider": { useAutomationList: () => list },
            "@/contexts/custom/AutomationProvider": { useAutomation: provider.value },
            "@/contexts/domain/HomeProvider": { useHomes: () => home },
            "@/contexts/ThemeProvider": { useTheme: () => theme },
            "@/contexts/ToastProvider": {
                useToast: () => ({ success() {}, error() {}, info() {} }),
            },
            "@/components/common/Button": "Button",
            "@/components/common/Loading": "Loading",
            "@/components/common/SectionHeaderAction": "SectionHeaderAction",
            "@/components/automations/AutomationForm": "AutomationForm",
            "@/components/ui/alert": { Alert: "Alert", AlertDescription: "AlertDescription" },
        },
    });
    route.flushEffects();
    route.render();
    cleanup = focusEffect?.();
    return {
        ...route,
        home,
        provider,
        requests,
        refreshCalls,
        navigation,
        cleared,
        begins,
        form: () => route.elements().find((node) => node.type === "AutomationForm"),
        focus() {
            cleanup = focusEffect?.();
        },
        blur() {
            cleanup?.();
            cleanup = undefined;
        },
    };
}

test("create form trims names, enforces 3–64 characters, and requires both collections", async () => {
    const submitted = [];
    const provider = makeAutomation();
    const form = mountForm({ provider, onSubmit: async (values) => submitted.push(values) });

    form.change("Name", "  ab ");
    await form.submit("Create automation");
    assert.equal(submitted.length, 0);
    assert.ok(form.field("Name").props.error);

    form.change("Name", "abc");
    await form.submit("Create automation");
    assert.equal(
        submitted.length,
        0,
        "three-character name passes while empty collections still block",
    );
    assert.equal(form.field("Name").props.error, "");

    form.change("Name", `  ${"a".repeat(64)}  `);
    await form.submit("Create automation");
    assert.equal(submitted.length, 0, "empty condition and result lists block create");

    provider.session = {
        ...provider.session,
        conditions: [condition()],
        results: [result()],
    };
    form.render();
    await form.submit("Create automation");
    assert.equal(submitted.length, 1);
    assert.equal(submitted[0].name, "a".repeat(64));
    assert.equal(submitted[0].conditionConnector, "And");
    assert.equal(submitted[0].isEnabled, true);

    form.change("Name", ` ${"a".repeat(65)} `);
    await form.submit("Create automation");
    assert.equal(submitted.length, 1, "65 trimmed characters are rejected");

    provider.session = {
        ...provider.session,
        conditions: Array.from({ length: 7 }, (_, index) => condition(`condition-${index}`)),
        results: Array.from({ length: 7 }, (_, index) => result(`result-${index}`)),
    };
    form.change("Name", "abc");
    await form.submit("Create automation");
    assert.equal(submitted.length, 2, "seven rows in each create collection are accepted");
    provider.session = {
        ...provider.session,
        results: Array.from({ length: 8 }, (_, index) => result(`r-${index}`)),
    };
    form.render();
    await form.submit("Create automation");
    assert.equal(submitted.length, 2, "eight rows are rejected");
});

test("create form keeps latest draft, exact global icon key, and failed-submit draft", async () => {
    const submitted = [];
    const provider = makeAutomation({ conditions: [condition()], results: [result()] });
    let attempts = 0;
    const form = mountForm({
        provider,
        onSubmit: async (values) => {
            attempts++;
            submitted.push(values);
            if (attempts === 1) throw new Error("offline");
        },
    });
    const originalSelector = form.elements().find((node) => node.type === "IconSelector");
    assert.deepEqual(Array.from(originalSelector.props.iconList), icons);
    assert.notEqual(originalSelector.props.variant, "brand");
    assert.equal(originalSelector.props.defaultIcon, "flash-outline");
    const originalAction = form.button("Create automation");
    form.change("Name", "  Night routine  ");
    form.selectIcon("plugin:stored-icon");

    await originalAction.props.onPress();
    form.render();
    assert.equal(submitted[0].name, "Night routine");
    assert.equal(submitted[0].icon, "plugin:stored-icon");
    assert.equal(form.field("Name").props.value, "  Night routine  ");

    const selector = form.elements().find((node) => node.type === "IconSelector");
    assert.deepEqual(Array.from(selector.props.iconList), icons);
    assert.notEqual(selector.props.variant, "brand");
    assert.equal(selector.props.defaultIcon, "plugin:stored-icon");

    await form.submit("Create automation");
    assert.equal(attempts, 2);
    assert.equal(submitted[1].name, "Night routine");
    assert.equal(submitted[1].icon, "plugin:stored-icon");
});

test("details form advances saved baseline without resetting an unsaved name draft", async () => {
    const provider = makeAutomation({ automationId: "automation-1" });
    const submitted = [];
    const form = mountForm({
        mode: "details",
        initialValues: {
            name: "Old name",
            icon: "legacy-icon-key",
            conditionConnector: "And",
            isEnabled: true,
        },
        provider,
        canAddChildren: false,
        onSubmit: async (values) => submitted.push(values),
    });
    const staleSave = form.button("Save changes");
    form.change("Name", "Draft name");
    form.elements()
        .find((node) => node.type === "ToggleGroup")
        .props.onValueChange("Disabled");
    form.render();
    const nextProps = {
        mode: "details",
        sessionToken: "session-1",
        initialValues: {
            name: "Old name",
            icon: "legacy-icon-key",
            conditionConnector: "And",
            isEnabled: false,
        },
        readOnly: false,
        canAddChildren: false,
        pending: false,
        onSubmit: async (values) => submitted.push(values),
    };
    form.render(nextProps);
    form.flushEffects();
    form.render(nextProps);
    assert.equal(form.field("Name").props.value, "Draft name");
    await staleSave.props.onPress();
    assert.equal(submitted.length, 1, "saved handler must read dirty state from latest draft");
    assert.equal(submitted[0].name, "Draft name");
    assert.equal(submitted[0].isEnabled, false);
});

test("automation single-choice controls expose accessible 48 dp options", () => {
    const form = mountForm({
        mode: "details",
        initialValues: {
            name: "Old name",
            icon: "flash-outline",
            conditionConnector: "And",
            isEnabled: true,
        },
        provider: makeAutomation({ automationId: "automation-1" }),
    });
    const groups = form.elements().filter((node) => node.type === "ToggleGroup");
    assert.deepEqual(
        groups.map((node) => node.props.accessibilityLabel),
        ["Automation state", "Condition matching"],
    );
    const options = form.elements().filter((node) => node.type === "ToggleGroupItem");
    assert.equal(options.length, 4);
    assert.ok(options.every((node) => node.props.accessibilityLabel));
    assert.ok(
        options.every((node) =>
            (Array.isArray(node.props.style) ? node.props.style.flat() : [node.props.style]).some(
                (style) => style?.minHeight >= 48,
            ),
        ),
    );
});

test("both automation choices show selected states with theme colors and a check in Light and Dark", () => {
    const themes = [
        {
            name: "Light",
            value: {
                current: {
                    colors: {
                        ...theme.current.colors,
                        authBackground: "#F9F7F1",
                        authForeground: "#1B1610",
                        authBorder: "#8C857A",
                        authPrimary: "#F7B817",
                        authOnPrimary: "#321A03",
                    },
                },
            },
        },
        {
            name: "Dark",
            value: {
                current: {
                    colors: {
                        ...theme.current.colors,
                        authBackground: "#100D08",
                        authForeground: "#EEEBE5",
                        authBorder: "#847C70",
                        authPrimary: "#FBC031",
                        authOnPrimary: "#321A03",
                    },
                },
            },
        },
    ];
    const flattenStyle = (style) =>
        (Array.isArray(style) ? style.flatMap(flattenStyle) : style ? [style] : []).filter(
            (entry) => typeof entry === "object",
        );
    const flattenNodes = (nodes) =>
        (Array.isArray(nodes) ? nodes.flatMap(flattenNodes) : nodes ? [nodes] : []).filter(
            (node) => typeof node === "object",
        );

    for (const { name, value } of themes) {
        const form = mountForm({
            mode: "details",
            themeValue: value,
            initialValues: {
                name: "Old name",
                icon: "legacy-icon-key",
                conditionConnector: "And",
                isEnabled: true,
            },
        });
        const state = form
            .elements()
            .find(
                (node) =>
                    node.type === "ToggleGroup" &&
                    node.props.accessibilityLabel === "Automation state",
            );
        const matching = form
            .elements()
            .find(
                (node) =>
                    node.type === "ToggleGroup" &&
                    node.props.accessibilityLabel === "Condition matching",
            );
        assert.ok(state, `${name} state control exists`);
        assert.ok(matching, `${name} condition matching control exists`);

        state.props.onValueChange("Disabled");
        matching.props.onValueChange("Or");
        form.render();

        for (const [groupLabel, selectedValue] of [
            ["Automation state", "Disabled"],
            ["Condition matching", "Or"],
        ]) {
            const group = form
                .elements()
                .find(
                    (node) =>
                        node.type === "ToggleGroup" && node.props.accessibilityLabel === groupLabel,
                );
            const items = flattenNodes(group.props.children).filter(
                (node) => node.type === "ToggleGroupItem",
            );
            const selected = items.find((item) => item.props.value === selectedValue);
            const unselected = items.find((item) => item.props.value !== selectedValue);
            const selectedStyle = flattenStyle(selected.props.style);
            const selectedText = flattenNodes(selected.props.children).find(
                (node) => node.type === "Text",
            );
            const unselectedStyle = flattenStyle(unselected.props.style);

            assert.ok(
                selectedStyle.some(
                    (style) => style.backgroundColor === value.current.colors.authPrimary,
                ),
                `${name} ${groupLabel} selected option uses the theme's selected surface`,
            );
            assert.ok(
                selectedStyle.some(
                    (style) => style.borderColor === value.current.colors.authOnPrimary,
                ),
                `${name} ${groupLabel} selected option has a contrasting border`,
            );
            assert.ok(
                flattenNodes(selected.props.children).some((node) => node.type === "Check"),
                `${name} ${groupLabel} selected option has a non-color cue`,
            );
            assert.equal(selected.props.accessibilityState.selected, true);
            assert.ok(
                flattenStyle(selectedText.props.style).some(
                    (style) => style.color === value.current.colors.authOnPrimary,
                ),
            );
            assert.ok(
                unselectedStyle.some(
                    (style) => style.backgroundColor === value.current.colors.authBackground,
                ),
            );
            assert.equal(
                selectedStyle.some((style) => style.height !== undefined),
                false,
                "options can grow when labels wrap",
            );
            assert.equal(
                selectedStyle.some((style) => style.minHeight === 48),
                true,
            );
            assert.equal(selected.props.className.includes("h-12"), false);
        }
    }
});

test("create actions grow to the scroll bottom while details keep normal action and footer order", () => {
    const childrenOf = (node) => (Array.isArray(node?.props?.children) ? node.props.children : []);
    const contains = (node, predicate) =>
        !!node && (predicate(node) || childrenOf(node).some((child) => contains(child, predicate)));
    const create = mountForm();
    const createRoot = create.output();
    const createSection = create.elements().find((node) => node.type === "FormSection");
    const createLayout = childrenOf(createRoot).find(
        (node) => node?.type === "View" && contains(node, (child) => child.type === "FormSection"),
    );
    const actionLayout = childrenOf(createLayout).find(
        (node) => node?.type === "View" && contains(node, (child) => child.type === "Button"),
    );

    assert.equal(createRoot.type, "KeyboardAwareScrollView");
    assert.equal(
        createSection.props.actions,
        undefined,
        "create actions are outside the fixed section slot",
    );
    assert.equal(createLayout.props.style.flexGrow, 1);
    assert.equal(actionLayout.props.style.marginTop, "auto");
    assert.ok(contains(actionLayout, (node) => node.type === "Button"));

    const footer = { type: "OwnerFooter", props: {} };
    const details = mountForm({
        mode: "details",
        initialValues: {
            name: "Old name",
            icon: "legacy-icon-key",
            conditionConnector: "And",
            isEnabled: true,
        },
        footer,
    });
    const detailsRootChildren = childrenOf(details.output());
    const detailsSection = details.elements().find((node) => node.type === "FormSection");
    assert.ok(detailsSection.props.actions, "details actions remain with their form fields");
    assert.equal(detailsRootChildren.at(-1), footer, "details footer stays after the form");
});

test("global icon browser cancellation preserves an unknown stored key", () => {
    const selected = [];
    const pickerTheme = {
        current: {
            colors: {
                primary: "primary",
                secondary: "secondary",
                textOnPrimary: "on-primary",
                textOnBackground: "on-background",
                authBorder: "border",
                authFocus: "focus",
                background: "background",
                authForeground: "foreground",
                authMuted: "muted",
            },
        },
    };
    const selector = mountNativeComponent("src/components/common/IconSelector.tsx", {
        props: {
            defaultIcon: "legacy-icon-key",
            iconList: icons,
            onIconSelected: (value) => selected.push(value),
        },
        modules: {
            "@/contexts/ThemeProvider": { useTheme: () => pickerTheme },
            "@/styles/shadowStyles": { shadowStyles: { default: {} } },
            "@/utils/iconLabels": { getEnglishIconLabel: (key) => key },
            "./Icon": { __esModule: true, default: "Icon", AllIcons: icons },
            "./Text": "Text",
            "./SenswaveModal": "SenswaveModal",
            "./Button": "Button",
            "./BottomSheetSelect": "BottomSheetSelect",
        },
    });
    const browse = selector
        .elements()
        .find(
            (node) =>
                node.type === "TouchableOpacity" &&
                node.props.accessibilityLabel === "Browse all icons",
        );
    assert.ok(browse);
    browse.props.onPress();
    selector.render();
    const modal = selector.elements().find((node) => node.type === "SenswaveModal");
    assert.equal(modal.props.visible, true);
    modal.props.onClose();
    selector.render();
    assert.deepEqual(selected, []);
});

test("historical condition and result summaries preserve false, zero, and one-sided bounds", () => {
    const falseCondition = mountNativeComponent(
        "src/components/automations/conditions/AutomationConditionItem.tsx",
        {
            props: {
                item: condition("switch", "BooleanCondition", { isOn: false }),
                canRemove: false,
                onRemove() {},
            },
            modules: {
                "react-native": { StyleSheet: { create: (v) => v }, View: "View" },
                "@/contexts/ThemeProvider": { useTheme: () => theme },
                "@/components/common/Icon": "Icon",
                "@/components/common/SectionHeaderAction": "SectionHeaderAction",
                "@/components/common/Text": "Text",
            },
        },
    );
    const oneSided = mountNativeComponent(
        "src/components/automations/conditions/AutomationConditionItem.tsx",
        {
            props: {
                item: condition("sensor", "NumberCondition", { minValue: 0 }),
                canRemove: false,
                onRemove() {},
            },
            modules: {
                "react-native": { StyleSheet: { create: (v) => v }, View: "View" },
                "@/contexts/ThemeProvider": { useTheme: () => theme },
                "@/components/common/Icon": "Icon",
                "@/components/common/SectionHeaderAction": "SectionHeaderAction",
                "@/components/common/Text": "Text",
            },
        },
    );
    const resultRow = mountNativeComponent(
        "src/components/automations/results/AutomationResultItem.tsx",
        {
            props: { item: result("lamp", false), canRemove: false, onRemove() {} },
            modules: {
                "react-native": { StyleSheet: { create: (v) => v }, View: "View" },
                "@/contexts/ThemeProvider": { useTheme: () => theme },
                "@/components/common/Icon": "Icon",
                "@/components/common/SectionHeaderAction": "SectionHeaderAction",
                "@/components/common/Text": "Text",
            },
        },
    );
    assert.ok(falseCondition.text().includes("Is off"));
    assert.ok(oneSided.text().includes("At least 0"));
    const resultTexts = resultRow
        .elements()
        .filter((node) => node.type === "Text")
        .map((node) => node.props.children.flat().join(""));
    assert.ok(resultTexts.includes("Value: false"));
    assert.ok(
        mountNativeComponent("src/components/automations/results/AutomationResultItem.tsx", {
            props: { item: result("lamp", 0), canRemove: false, onRemove() {} },
            modules: {
                "react-native": { StyleSheet: { create: (v) => v }, View: "View" },
                "@/contexts/ThemeProvider": { useTheme: () => theme },
                "@/components/common/Icon": "Icon",
                "@/components/common/SectionHeaderAction": "SectionHeaderAction",
                "@/components/common/Text": "Text",
            },
        })
            .elements()
            .filter((node) => node.type === "Text")
            .map((node) => node.props.children.flat().join(""))
            .includes("Value: 0"),
    );
});

test("draft collection controls pass exact session identity and remove one row by index", () => {
    const provider = makeAutomation({
        conditions: [condition("repeated"), condition("repeated")],
        results: [result("same"), result("same", "0")],
    });
    const navigation = [];
    const conditions = mountNativeComponent(
        "src/components/automations/conditions/AutomationConditions.tsx",
        {
            props: {
                conditions: provider.session.conditions,
                sessionToken: "session-1",
                mode: "create",
                canAdd: true,
                disabled: false,
            },
            modules: {
                "react-native": { FlatList: "FlatList", StyleSheet: { create: (v) => v } },
                "expo-router": {
                    useRouter: () => ({
                        push: (route) => navigation.push(JSON.parse(JSON.stringify(route))),
                    }),
                },
                "@/contexts/custom/AutomationProvider": { useAutomation: provider.value },
                "@/contexts/domain/HomeProvider": {
                    useHomes: () => ({
                        current: { id: "home-1", isOwner: true, canManage: false },
                    }),
                },
                "@/contexts/ThemeProvider": { useTheme: () => theme },
                "@/styles/shadowStyles": { shadowStyles: { default: {} } },
                "@/components/common/Button": "Button",
                "@/components/common/Icon": "Icon",
                "@/components/common/SectionHeaderAction": "SectionHeaderAction",
                "@/components/automations/conditions/AutomationConditionItem":
                    "AutomationConditionItem",
            },
        },
    );
    const add = conditions.elements().find((node) => node.type === "SectionHeaderAction");
    assert.ok(add);
    add.props.onPress();
    assert.deepEqual(navigation, [
        {
            pathname: "/automation/conditions/add",
            params: { sessionToken: "session-1" },
        },
    ]);

    const flatList = conditions.elements().find((node) => node.type === "FlatList");
    assert.equal(flatList.props.data.length, 2, "duplicate operation IDs remain separate rows");
    const row = flatList.props.renderItem({ item: provider.session.conditions[1], index: 1 });
    const item = mountNativeComponent(
        "src/components/automations/conditions/AutomationConditionItem.tsx",
        {
            props: row.props,
            modules: {
                "react-native": { StyleSheet: { create: (v) => v }, View: "View" },
                "@/contexts/ThemeProvider": { useTheme: () => theme },
                "@/contexts/custom/AutomationProvider": { useAutomation: provider.value },
                "@/components/common/Icon": "Icon",
                "@/components/common/SectionHeaderAction": "SectionHeaderAction",
                "@/components/common/Text": "Text",
            },
        },
    );
    const remove = item.elements().find((node) => node.type === "SectionHeaderAction");
    assert.ok(remove, "unsaved row exposes removal");
    remove.props.onPress();
    assert.deepEqual(provider.removals, [["condition", "session-1", 1]]);
    assert.equal(provider.session.conditions.length, 1);
});

test("condition and result Remove stays hidden and inert during pending or accepted callbacks", () => {
    const collections = [
        {
            kind: "condition",
            file: "src/components/automations/conditions/AutomationConditions.tsx",
            itemFile: "src/components/automations/conditions/AutomationConditionItem.tsx",
            itemsKey: "conditions",
            itemName: "AutomationConditionItem",
            pathKey: "@/components/automations/conditions/AutomationConditionItem",
        },
        {
            kind: "result",
            file: "src/components/automations/results/AutomationResults.tsx",
            itemFile: "src/components/automations/results/AutomationResultItem.tsx",
            itemsKey: "results",
            itemName: "AutomationResultItem",
            pathKey: "@/components/automations/results/AutomationResultItem",
        },
    ];

    for (const collection of collections) {
        for (const [reason, state] of [
            ["pending", { pending: true }],
            ["accepted", { accepted: true }],
        ]) {
            const provider = makeAutomation({
                conditions: [condition()],
                results: [result()],
            });
            const parent = mountForm({ provider, ...state });
            const parentCollection = parent
                .elements()
                .find(
                    (node) =>
                        node.type ===
                        (collection.kind === "condition"
                            ? "AutomationConditions"
                            : "AutomationResults"),
                );
            const disabled = parentCollection.props.disabled;
            assert.equal(disabled, true, `parent propagates ${reason} to ${collection.kind}s`);
            const props = {
                [collection.itemsKey]: provider.session[collection.itemsKey],
                sessionToken: "session-1",
                mode: "create",
                canAdd: true,
                disabled: false,
            };
            const modules = {
                "react-native": { FlatList: "FlatList", StyleSheet: { create: (v) => v } },
                "expo-router": { useRouter: () => ({ push() {} }) },
                "@/contexts/custom/AutomationProvider": { useAutomation: provider.value },
                "@/contexts/domain/HomeProvider": {
                    useHomes: () => ({
                        current: { id: "home-1", isOwner: true, canManage: false },
                    }),
                },
                "@/contexts/ThemeProvider": { useTheme: () => theme },
                "@/components/common/Icon": "Icon",
                "@/components/common/SectionHeaderAction": "SectionHeaderAction",
                [collection.pathKey]: collection.itemName,
            };
            const component = mountNativeComponent(collection.file, { props, modules });
            const firstRow = component
                .elements()
                .find((node) => node.type === "FlatList")
                .props.renderItem({ item: provider.session[collection.itemsKey][0], index: 0 });
            const retainedRemove = firstRow.props.onRemove;
            component.render({ ...props, disabled });
            retainedRemove();

            assert.deepEqual(
                provider.removals,
                [],
                `${collection.kind} retained callback cannot remove while ${reason}`,
            );
            const disabledRow = component
                .elements()
                .find((node) => node.type === "FlatList")
                .props.renderItem({ item: provider.session[collection.itemsKey][0], index: 0 });
            assert.equal(disabledRow.props.canRemove, false);

            const item = mountNativeComponent(collection.itemFile, {
                props: disabledRow.props,
                modules: {
                    "react-native": { StyleSheet: { create: (v) => v }, View: "View" },
                    "@/contexts/ThemeProvider": { useTheme: () => theme },
                    "@/components/common/Icon": "Icon",
                    "@/components/common/SectionHeaderAction": "SectionHeaderAction",
                    "@/components/common/Text": "Text",
                },
            });
            assert.equal(
                item.elements().some((node) => node.type === "SectionHeaderAction"),
                false,
                `${collection.kind} row hides its Remove control while ${reason}`,
            );
        }
    }
});

test("saved child link includes session token and automation ID", () => {
    const provider = makeAutomation({
        automationId: "automation-8",
        conditions: [condition()],
    });
    const navigation = [];
    const component = mountNativeComponent(
        "src/components/automations/conditions/AutomationConditions.tsx",
        {
            props: {
                conditions: provider.session.conditions,
                sessionToken: "session-1",
                automationId: "automation-8",
                mode: "details",
                canAdd: true,
                disabled: false,
            },
            modules: {
                "react-native": { FlatList: "FlatList", StyleSheet: { create: (v) => v } },
                "expo-router": {
                    useRouter: () => ({
                        push: (route) => navigation.push(JSON.parse(JSON.stringify(route))),
                    }),
                },
                "@/contexts/custom/AutomationProvider": { useAutomation: provider.value },
                "@/contexts/domain/HomeProvider": {
                    useHomes: () => ({
                        current: { id: "home-1", isOwner: true, canManage: false },
                    }),
                },
                "@/contexts/ThemeProvider": { useTheme: () => theme },
                "@/styles/shadowStyles": { shadowStyles: { default: {} } },
                "@/components/common/Button": "Button",
                "@/components/common/Icon": "Icon",
                "@/components/common/SectionHeaderAction": "SectionHeaderAction",
                "@/components/automations/conditions/AutomationConditionItem":
                    "AutomationConditionItem",
            },
        },
    );
    component
        .elements()
        .find((node) => node.type === "SectionHeaderAction")
        .props.onPress();
    assert.deepEqual(navigation[0], {
        pathname: "/automation/conditions/add",
        params: { sessionToken: "session-1", automationId: "automation-8" },
    });
});

test("saved result link includes session token and automation ID", () => {
    const provider = makeAutomation({ automationId: "automation-8", results: [result()] });
    const navigation = [];
    const component = mountNativeComponent(
        "src/components/automations/results/AutomationResults.tsx",
        {
            props: {
                results: provider.session.results,
                sessionToken: "session-1",
                automationId: "automation-8",
                mode: "details",
                canAdd: true,
                disabled: false,
            },
            modules: {
                "react-native": { FlatList: "FlatList", StyleSheet: { create: (v) => v } },
                "expo-router": {
                    useRouter: () => ({
                        push: (route) => navigation.push(JSON.parse(JSON.stringify(route))),
                    }),
                },
                "@/contexts/custom/AutomationProvider": { useAutomation: provider.value },
                "@/contexts/domain/HomeProvider": {
                    useHomes: () => ({ current: { id: "home-1", isOwner: true } }),
                },
                "@/contexts/ThemeProvider": { useTheme: () => theme },
                "@/components/common/Icon": "Icon",
                "@/components/common/SectionHeaderAction": "SectionHeaderAction",
                "@/components/automations/results/AutomationResultItem": "AutomationResultItem",
            },
        },
    );
    component
        .elements()
        .find((node) => node.type === "SectionHeaderAction")
        .props.onPress();
    assert.deepEqual(navigation, [
        {
            pathname: "/automation/results/add",
            params: { sessionToken: "session-1", automationId: "automation-8" },
        },
    ]);
});

test("results keep 0 and false as strings and remove a single draft row", () => {
    const provider = makeAutomation({
        conditions: [condition()],
        results: [result("same", "false"), result("same", "0")],
    });
    const component = mountNativeComponent(
        "src/components/automations/results/AutomationResults.tsx",
        {
            props: {
                results: provider.session.results,
                sessionToken: "session-1",
                mode: "create",
                canAdd: true,
                disabled: false,
            },
            modules: {
                "react-native": { FlatList: "FlatList", StyleSheet: { create: (v) => v } },
                "expo-router": { useRouter: () => ({ push() {} }) },
                "@/contexts/custom/AutomationProvider": { useAutomation: provider.value },
                "@/contexts/domain/HomeProvider": {
                    useHomes: () => ({
                        current: { id: "home-1", isOwner: true, canManage: false },
                    }),
                },
                "@/contexts/ThemeProvider": { useTheme: () => theme },
                "@/styles/shadowStyles": { shadowStyles: { default: {} } },
                "@/components/common/Button": "Button",
                "@/components/common/Icon": "Icon",
                "@/components/common/SectionHeaderAction": "SectionHeaderAction",
                "@/components/automations/results/AutomationResultItem": "AutomationResultItem",
            },
        },
    );
    const flatList = component.elements().find((node) => node.type === "FlatList");
    assert.deepEqual(
        flatList.props.data.map((item) => item.valueToSend),
        ["false", "0"],
    );
    assert.notEqual(
        flatList.props.keyExtractor(flatList.props.data[0], 0),
        flatList.props.keyExtractor(flatList.props.data[1], 1),
    );
    const row = flatList.props.renderItem({ item: provider.session.results[1], index: 1 });
    const item = mountNativeComponent(
        "src/components/automations/results/AutomationResultItem.tsx",
        {
            props: row.props,
            modules: {
                "react-native": { StyleSheet: { create: (v) => v }, View: "View" },
                "@/contexts/ThemeProvider": { useTheme: () => theme },
                "@/components/common/Icon": "Icon",
                "@/components/common/SectionHeaderAction": "SectionHeaderAction",
                "@/components/common/Text": "Text",
            },
        },
    );
    item.elements()
        .find((node) => node.type === "SectionHeaderAction")
        .props.onPress();
    assert.deepEqual(provider.removals, [["result", "session-1", 1]]);
    assert.equal(provider.session.results.length, 1);
});

test("create result limit disables Add while saved lists remain uncapped", () => {
    for (const [mode, count, disabled] of [
        ["create", 7, true],
        ["details", 8, false],
    ]) {
        const provider = makeAutomation({
            results: Array.from({ length: count }, (_, i) => result(`op-${i}`)),
        });
        const component = mountNativeComponent(
            "src/components/automations/results/AutomationResults.tsx",
            {
                props: {
                    results: provider.session.results,
                    sessionToken: "session-1",
                    automationId: mode === "details" ? "automation-1" : undefined,
                    mode,
                    canAdd: true,
                    disabled: false,
                },
                modules: {
                    "react-native": { FlatList: "FlatList", StyleSheet: { create: (v) => v } },
                    "expo-router": { useRouter: () => ({ push() {} }) },
                    "@/contexts/custom/AutomationProvider": { useAutomation: provider.value },
                    "@/contexts/domain/HomeProvider": {
                        useHomes: () => ({
                            current: { id: "home-1", isOwner: true, canManage: false },
                        }),
                    },
                    "@/contexts/ThemeProvider": { useTheme: () => theme },
                    "@/components/common/Icon": "Icon",
                    "@/components/common/SectionHeaderAction": "SectionHeaderAction",
                    "@/components/automations/results/AutomationResultItem": "AutomationResultItem",
                },
            },
        );
        const action = component.elements().find((node) => node.type === "SectionHeaderAction");
        assert.equal(action.props.disabled, disabled);
        assert.equal(
            component.elements().find((node) => node.type === "FlatList").props.data.length,
            count,
        );
    }
});

test("condition Add caps drafts at seven and keeps larger saved collections readable", () => {
    for (const [mode, count, disabled] of [
        ["create", 7, true],
        ["details", 8, false],
    ]) {
        const provider = makeAutomation({
            automationId: mode === "details" ? "automation-1" : undefined,
            conditions: Array.from({ length: count }, (_, i) => condition(`op-${i}`)),
        });
        const component = mountNativeComponent(
            "src/components/automations/conditions/AutomationConditions.tsx",
            {
                props: {
                    conditions: provider.session.conditions,
                    sessionToken: "session-1",
                    automationId: mode === "details" ? "automation-1" : undefined,
                    mode,
                    canAdd: true,
                    disabled: false,
                },
                modules: {
                    "react-native": { FlatList: "FlatList", StyleSheet: { create: (v) => v } },
                    "expo-router": { useRouter: () => ({ push() {} }) },
                    "@/contexts/custom/AutomationProvider": { useAutomation: provider.value },
                    "@/contexts/domain/HomeProvider": {
                        useHomes: () => ({ current: { id: "home-1", isOwner: true } }),
                    },
                    "@/contexts/ThemeProvider": { useTheme: () => theme },
                    "@/components/common/Icon": "Icon",
                    "@/components/common/SectionHeaderAction": "SectionHeaderAction",
                    "@/components/automations/conditions/AutomationConditionItem":
                        "AutomationConditionItem",
                },
            },
        );
        const action = component.elements().find((node) => node.type === "SectionHeaderAction");
        assert.equal(action.props.disabled, disabled);
        assert.equal(
            component.elements().find((node) => node.type === "FlatList").props.data.length,
            count,
        );
    }
});

test("create route sends exact session children without isEnabled", async () => {
    const route = mountAddRoute();
    route.render();
    route.render();
    assert.deepEqual(route.begins, ["home-1"]);
    route.provider.session = {
        ...route.provider.session,
        conditions: [
            {
                operationId: "op-condition",
                operationName: "Door",
                conditionType: "BooleanCondition",
                conditionConfiguration: { isOn: false },
            },
        ],
        results: [{ operationId: "op", operationName: "Lamp", valueToSend: "false" }],
    };
    route.render();
    await route.form().props.onSubmit({
        name: "New name",
        icon: "plugin:stored-icon",
        conditionConnector: "Or",
        isEnabled: true,
    });
    assert.deepEqual(route.requests, [
        [
            "v1/automations/",
            {
                homeId: "home-1",
                name: "New name",
                icon: "plugin:stored-icon",
                conditionConnector: "Or",
                conditions: [
                    {
                        operationId: "op-condition",
                        conditionType: "BooleanCondition",
                        conditionConfiguration: { isOn: false },
                    },
                ],
                results: [{ operationId: "op", valueToSend: "false" }],
            },
        ],
    ]);
    assert.equal("isEnabled" in route.requests[0][1], false);
    assert.deepEqual(route.refreshCalls, ["home-1"]);
});

test("create route refuses an invalid condition instead of emitting unsupported input", async () => {
    const route = mountAddRoute();
    route.provider.session = {
        ...route.provider.session,
        conditions: [
            {
                operationId: "bad-condition",
                operationName: "Broken sensor",
                conditionType: "InvalidCondition",
                conditionConfiguration: {},
            },
        ],
        results: [result()],
    };
    route.render();
    await route.form().props.onSubmit({
        name: "New name",
        icon: "flash-outline",
        conditionConnector: "And",
        isEnabled: true,
    });
    route.render();
    assert.deepEqual(route.requests, []);
    assert.ok(route.form().props.actionError);
});

test("accepted create recovers after blur or router failure without a second POST", async () => {
    let postCount = 0;
    let release;
    const pending = new Promise((resolve) => (release = resolve));
    let backCount = 0;
    const route = mountAddRoute({
        post: () => {
            postCount++;
            return pending;
        },
        back: () => {
            if (++backCount === 1) throw new Error("router unavailable");
        },
    });
    route.provider.session = {
        ...route.provider.session,
        conditions: [condition()],
        results: [result()],
    };
    route.render();
    const submit = route.form().props.onSubmit;
    const first = submit({
        name: "New name",
        icon: "flash-outline",
        conditionConnector: "And",
        isEnabled: true,
    });
    const duplicate = submit({
        name: "New name",
        icon: "flash-outline",
        conditionConnector: "And",
        isEnabled: true,
    });
    route.blur();
    assert.equal(postCount, 1);
    release({ isSuccess: true });
    await Promise.all([first, duplicate]);
    assert.equal(route.refreshCalls.length, 1);
    assert.equal(route.navigation.length, 0, "blurred accepted route waits for focus");

    route.focus();
    route.render();
    assert.equal(postCount, 1);
    assert.equal(route.navigation.length, 1, "first return attempt may fail after acceptance");
    await route.form().props.onSubmit({
        name: "New name",
        icon: "flash-outline",
        conditionConnector: "And",
        isEnabled: true,
    });
    assert.equal(postCount, 1, "return retry never repeats accepted POST");
    assert.equal(route.navigation.length, 2);
});

test("create failure or thrown request keeps current session draft for retry", async () => {
    let attempt = 0;
    const route = mountAddRoute({
        post: async () => {
            if (++attempt === 1) return { isSuccess: false, statusCode: 409 };
            throw new Error("offline");
        },
    });
    route.provider.session = {
        ...route.provider.session,
        conditions: [condition()],
        results: [result("op", "0")],
    };
    route.render();
    const submit = route.form().props.onSubmit;
    const values = {
        name: "New name",
        icon: "flash-outline",
        conditionConnector: "And",
        isEnabled: true,
    };
    await submit(values);
    assert.equal(route.provider.session.conditions.length, 1);
    assert.equal(route.provider.session.results[0].valueToSend, "0");
    await route.form().props.onSubmit(values);
    assert.equal(attempt, 2);
    assert.equal(route.provider.session.results[0].valueToSend, "0");
    assert.deepEqual(route.refreshCalls, []);
});

test("accepted create uses list fallback when history is empty and refresh fails", async () => {
    const route = mountAddRoute({
        canGoBack: false,
        refresh: async () => {
            throw new Error("offline");
        },
    });
    route.provider.session = {
        ...route.provider.session,
        conditions: [condition()],
        results: [result()],
    };
    route.render();
    await route.form().props.onSubmit({
        name: "New name",
        icon: "flash-outline",
        conditionConnector: "And",
        isEnabled: true,
    });
    route.render();
    assert.deepEqual(route.navigation, [["replace", "/automation/list"]]);
    assert.equal(route.requests.length, 1);
    await route.form().props.onSubmit({
        name: "New name",
        icon: "flash-outline",
        conditionConnector: "And",
        isEnabled: true,
    });
    assert.equal(route.requests.length, 1);
});

test("create draft stays bound to original home and cleanup cannot clear newer session", async () => {
    const home = { current: { id: "home-1", isOwner: true, canManage: false } };
    const route = mountAddRoute({ home });
    const submit = route.form().props.onSubmit;
    route.provider.session = {
        ...route.provider.session,
        conditions: [condition()],
        results: [result()],
    };
    home.current = { id: "home-2", isOwner: true, canManage: false };
    route.render();
    assert.equal(route.form(), undefined);
    await submit({
        name: "Old home draft",
        icon: "flash-outline",
        conditionConnector: "And",
        isEnabled: true,
    });
    assert.equal(route.requests.length, 0);

    route.provider.session = {
        ...route.provider.session,
        token: "newer-session",
        homeId: "home-2",
    };
    route.unmount();
    assert.deepEqual(route.cleared, ["visit-1"]);
    assert.equal(route.provider.session.token, "newer-session");
});

test("accepted create offers explicit return after permission loss without repeating POST", async () => {
    let release;
    const pending = new Promise((resolve) => (release = resolve));
    let postCount = 0;
    const route = mountAddRoute({
        canGoBack: false,
        post: () => {
            postCount++;
            return pending;
        },
    });
    route.provider.session = {
        ...route.provider.session,
        conditions: [condition()],
        results: [result()],
    };
    route.render();
    const submit = route.form().props.onSubmit({
        name: "New name",
        icon: "flash-outline",
        conditionConnector: "And",
        isEnabled: true,
    });

    route.home.current = { id: "home-1", name: "Home 1", isOwner: false, canManage: false };
    route.provider.session = undefined;
    route.render();
    release({ isSuccess: true });
    await submit;
    route.render();

    const returnButton = route
        .elements()
        .find((node) => node.type === "Button" && node.props.name === "Return to automations");
    assert.ok(returnButton, "invalidated accepted create keeps an explicit recovery action");
    await returnButton.props.onPress();
    assert.deepEqual(route.navigation, [["replace", "/automation/list"]]);
    assert.equal(postCount, 1, "explicit return never repeats the accepted POST");
});
