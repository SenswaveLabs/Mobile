import assert from "node:assert/strict";
import test from "node:test";
import { makeFocusLifecycle, mountNativeComponent } from "./nativeComponentHarness.mjs";

const response = (body) => ({ isSuccess: true, response: { json: async () => body } });
const home = (id = "home-a") => ({ id, name: "Home A", isOwner: true, rooms: [] });
const settle = async (component) => {
    await new Promise((resolve) => setImmediate(resolve));
    component.render();
    component.flushEffects();
    component.render();
};

function mountShare(overrides = {}) {
    let focus;
    let resolvePost;
    const requests = [];
    const copied = [];
    const state = { params: { id: "home-a" }, homes: { current: home() }, ...overrides };
    const component = mountNativeComponent("src/app/(app)/home/share.tsx", {
        modules: (React) => {
            focus = makeFocusLifecycle(React);
            return {
                "expo-router": {
                    useRouter: () => ({ canGoBack: () => true, back() {} }),
                    useLocalSearchParams: () => state.params,
                    useFocusEffect: focus.useFocusEffect,
                },
                "expo-clipboard": { setStringAsync: async (value) => copied.push(value) },
                "@/styles/defaultStyles": { keyboardOffset: 0 },
                "@/contexts/domain/HomeProvider": { useHomes: () => state.homes },
                "@/contexts/HttpClientProvider": {
                    useHttpClient: () => ({
                        post: (...args) => {
                            requests.push(args);
                            return new Promise((resolve) => (resolvePost = resolve));
                        },
                    }),
                },
            };
        },
    });
    component.flushEffects();
    focus.focus();
    component.render();
    const button = (name) =>
        component.elements().find((node) => node.type === "Button" && node.props.name === name);
    const email = (value = "  friend@example.com  ") => {
        component
            .elements()
            .find((node) => node.type === "Input")
            .props.setValue(value);
        component.render();
    };
    return {
        ...component,
        state,
        requests,
        copied,
        focus,
        button,
        email,
        accept: (body = { password: "123456" }) => resolvePost(response(body)),
        resolve: (result) => resolvePost(result),
    };
}

test("invitation keeps the submitted home identity, email and role through rename and copy", async () => {
    const share = mountShare();
    share.email();
    const submit = share.button("Create invitation").props.onPress;
    submit();
    submit();
    assert.deepEqual(JSON.parse(JSON.stringify(share.requests)), [
        [
            "v1/homes/sharings",
            { homeId: "home-a", friendEmail: "friend@example.com", sharingType: "Display" },
        ],
    ]);
    share.state.homes.current = { ...home(), name: "Renamed home" };
    share.render();
    share.accept();
    await settle(share);
    assert.match(share.text(), /Home A/);
    assert.doesNotMatch(share.text(), /Renamed home/);
    share.button("Copy invitation code").props.onPress();
    await settle(share);
    assert.deepEqual(share.copied, ["123456"]);
    submit();
    assert.equal(share.requests.length, 1);
});

test("sharing rejects missing, repeated, mismatched and non-owner home identities", () => {
    for (const overrides of [
        { params: {} },
        { params: { id: "" } },
        { params: { id: ["home-a", "home-a"] } },
        { params: { id: "home-b" } },
        { homes: { current: undefined } },
        { homes: { current: { ...home(), isOwner: false } } },
    ]) {
        const share = mountShare(overrides);
        share.email();
        share.button("Create invitation").props.onPress();
        assert.equal(share.requests.length, 0);
        assert.ok(share.elements().some((node) => node.type === "Alert"));
    }
});

test("accepted invitations never repeat POST after malformed or missing code reads", async () => {
    for (const result of [
        response({}),
        response(null),
        { isSuccess: true, response: null },
        {
            isSuccess: true,
            response: {
                json: async () => {
                    throw new Error("invalid JSON");
                },
            },
        },
    ]) {
        const share = mountShare();
        share.email();
        const submit = share.button("Create invitation").props.onPress;
        submit();
        share.resolve(result);
        await settle(share);
        assert.match(share.text(), /Invitation was created, but its code couldn't be loaded/);
        assert.equal(share.button("Create invitation").props.disabled, true);
        submit();
        share.button("Create invitation").props.onPress();
        assert.equal(share.requests.length, 1);
    }
});

test("retained invitation submit cannot write after home, route, permission or focus changes", () => {
    for (const change of [
        (share) => {
            share.state.homes.current = home("home-b");
        },
        (share) => {
            share.state.params = { id: "home-b" };
        },
        (share) => {
            share.state.homes.current = { ...home(), isOwner: false };
        },
        (share) => share.focus.blur(),
    ]) {
        const share = mountShare();
        share.email();
        const submit = share.button("Create invitation").props.onPress;
        change(share);
        share.render();
        share.flushEffects();
        submit();
        assert.equal(share.requests.length, 0);
    }
});

test("late invitation responses cannot attach to another home or a blurred visit", async () => {
    for (const change of [
        (share) => {
            share.state.homes.current = home("home-b");
        },
        (share) => {
            share.state.params = { id: "home-b" };
        },
        (share) => share.focus.blur(),
        (share) => {
            share.focus.blur();
            share.focus.focus();
        },
    ]) {
        const share = mountShare();
        share.email();
        share.button("Create invitation").props.onPress();
        change(share);
        share.render();
        share.flushEffects();
        share.accept();
        await settle(share);
        assert.doesNotMatch(share.text(), /123456|Invitation created/);
        assert.equal(share.requests.length, 1);
    }
});

test("home Back offers Cancel and Exit while loading, empty, failed or populated", () => {
    for (const homes of [
        { loading: true },
        { loading: false },
        { loading: false, error: "Couldn't load home." },
        { loading: false, current: home() },
    ]) {
        let back;
        let exits = 0;
        let focus;
        const component = mountNativeComponent("src/app/(app)/index.tsx", {
            modules: (React) => {
                focus = makeFocusLifecycle(React);
                return {
                    "expo-router": { useRouter: () => ({}), useFocusEffect: focus.useFocusEffect },
                    "react-native": {
                        View: "View",
                        Text: "Text",
                        StyleSheet: { create: (value) => value },
                        BackHandler: {
                            addEventListener: (_, callback) => {
                                back = callback;
                                return { remove() {} };
                            },
                            exitApp: () => exits++,
                        },
                    },
                    "@/contexts/domain/HomeProvider": { useHomes: () => homes },
                    "@/contexts/custom/DeviceListProvider": {
                        useDeviceList: () => ({ devices: [] }),
                    },
                    "@/hooks/useDeviceLayout": { useDeviceLayout: () => ({ layout: "list" }) },
                    "@/components/common/ConfirmDialog": "ConfirmDialog",
                    "@/components/common/ContentSection": "ContentSection",
                    "@/components/common/SectionHeaderAction": "SectionHeaderAction",
                    "@/components/common/WhatsNewModal": { WhatsNewModal: "WhatsNewModal" },
                    "@/components/device/DeviceList": "DeviceList",
                    "@/components/device/DeviceLayoutToggle": "DeviceLayoutToggle",
                    "@/components/home/NoHomeScreen": "NoHomeScreen",
                    "@/components/home/widgets/HomeStateWidget": "HomeStateWidget",
                    "@/components/room/RoomsView": "RoomsView",
                };
            },
        });
        component.flushEffects();
        focus.focus();
        const dialog = () => component.elements().find((node) => node.type === "ConfirmDialog");
        assert.equal(back(), true);
        component.render();
        assert.equal(dialog().props.visible, true);
        dialog().props.onCancel();
        component.render();
        assert.equal(dialog().props.visible, false);
        assert.equal(exits, 0);
        back();
        component.render();
        dialog().props.onConfirm();
        assert.equal(exits, 1);
        focus.blur();
        component.render();
        assert.equal(dialog().props.visible, false);
    }
});

test("failed first home read offers Retry and Choose home while confirmed empty keeps onboarding", async () => {
    const navigation = [];
    let reads = 0;
    const homes = {
        loading: false,
        error: "Couldn't load home.",
        initializeCurrentHome: async () => reads++,
    };
    const component = mountNativeComponent("src/app/(app)/index.tsx", {
        modules: {
            "expo-router": {
                useFocusEffect() {},
                useRouter: () => ({ push: (path) => navigation.push(path) }),
            },
            "@/contexts/domain/HomeProvider": { useHomes: () => homes },
            "@/contexts/custom/DeviceListProvider": { useDeviceList: () => ({ devices: [] }) },
            "@/hooks/useDeviceLayout": { useDeviceLayout: () => ({ layout: "list" }) },
            "@/components/common/ConfirmDialog": "ConfirmDialog",
            "@/components/common/WhatsNewModal": { WhatsNewModal: "WhatsNewModal" },
            "@/components/home/NoHomeScreen": "NoHomeScreen",
            "@/components/device/DeviceList": "DeviceList",
            "@/components/device/DeviceLayoutToggle": "DeviceLayoutToggle",
            "@/components/common/ContentSection": "ContentSection",
            "@/components/common/SectionHeaderAction": "SectionHeaderAction",
            "@/components/home/widgets/HomeStateWidget": "HomeStateWidget",
            "@/components/room/RoomsView": "RoomsView",
        },
    });
    const button = (name) =>
        component.elements().find((node) => node.type === "Button" && node.props.name === name);
    assert.equal(
        component.elements().some((node) => node.type === "NoHomeScreen"),
        false,
    );
    assert.ok(button("Choose home"));
    button("Choose home").props.onPress();
    assert.deepEqual(navigation, ["home/list"]);
    await button("Retry").props.onPress();
    assert.equal(reads, 1);
    homes.error = "";
    component.render();
    assert.ok(component.elements().some((node) => node.type === "NoHomeScreen"));
    assert.equal(button("Choose home"), undefined);
});
