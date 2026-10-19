import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

function mount(current) {
    const navigation = [];
    const selected = [];
    let focus;
    const selector = mountNativeComponent("src/components/room/RoomSelector.tsx", {
        props: { initialRoomId: "room-1", onSelected: (roomId) => selected.push(roomId) },
        modules: {
            "expo-router": {
                useRouter: () => ({ push: (path) => navigation.push(path) }),
                useFocusEffect: (callback) => {
                    focus = callback;
                },
            },
            "../common/BottomSheetSelect": "BottomSheetSelect",
            "@/contexts/domain/HomeProvider": {
                useHomes: () => ({ current, refreshRooms: async () => true }),
            },
            "@/contexts/ThemeProvider": { useTheme: () => ({ current: { colors: {} } }) },
        },
    });
    focus?.();
    return { ...selector, navigation, selected };
}

test("room manager create action waits for sheet dismissal and routes once", () => {
    const selector = mount({
        id: "home-1",
        isOwner: true,
        rooms: [{ id: "room-1", name: "Kitchen" }],
    });
    const sheet = selector.elements().find((node) => node.type === "BottomSheetSelect");
    let closed = false;
    const options = sheet.props.renderOptions(() => {
        closed = true;
        return true;
    });
    const create = options.props.children.at(-1);
    create.props.onPress();
    assert.equal(closed, true);
    assert.equal(selector.navigation.length, 0, "Create route opens after sheet dismissal");
    sheet.props.onClosed();
    sheet.props.onClosed();
    assert.equal(selector.navigation.length, 1);
    assert.equal(selector.navigation[0].pathname, "home/room/add");
});

test("failed create dismissal leaves no delayed room-create navigation intent", () => {
    const selector = mount({
        id: "home-1",
        isOwner: true,
        rooms: [{ id: "room-1", name: "Kitchen" }],
    });
    const sheet = selector.elements().find((node) => node.type === "BottomSheetSelect");
    const options = sheet.props.renderOptions(() => false);
    const create = options.props.children.at(-1);
    create.props.onPress();
    sheet.props.onClosed();
    assert.equal(selector.navigation.length, 0);
});

test("display-only members do not get room creation action", () => {
    const selector = mount({ id: "home-1", isOwner: false, canManage: false, rooms: [] });
    const sheet = selector.elements().find((node) => node.type === "BottomSheetSelect");
    const options = sheet.props.renderOptions(() => true);
    const nodes = Array.isArray(options.props.children)
        ? options.props.children
        : [options.props.children];
    assert.ok(!nodes.some((node) => node?.props?.accessibilityLabel === "Create room"));
});

test("None selection closes sheet before selecting and ignores cancelled close", () => {
    const selector = mount({ id: "home-1", isOwner: true, rooms: [] });
    const sheet = selector.elements().find((node) => node.type === "BottomSheetSelect");
    const options = sheet.props.renderOptions(() => false);
    const none = options.props.children.find((node) => node?.props?.accessibilityLabel === "None");
    none.props.onPress();
    assert.deepEqual(selector.selected, []);

    const acceptedOptions = sheet.props.renderOptions(() => true);
    const acceptedNone = acceptedOptions.props.children.find(
        (node) => node?.props?.accessibilityLabel === "None",
    );
    acceptedNone.props.onPress();
    assert.deepEqual(selector.selected, ["None"]);
});
