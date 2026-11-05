import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const flush = () => new Promise(setImmediate);
const deferred = () => {
    let resolve;
    const promise = new Promise((done) => (resolve = done));
    return { promise, resolve };
};

function mountTheme(saved, initialScheme = "light", storage = {}) {
    let scheme = initialScheme;
    let reads = 0;
    const provider = mountNativeComponent("src/contexts/ThemeProvider.tsx", {
        exportName: "ThemeProvider",
        modules: {
            "react-native": { useColorScheme: () => scheme },
            "expo-secure-store": {
                getItemAsync: async () => {
                    reads++;
                    return saved;
                },
                setItemAsync: async () => {},
                deleteItemAsync: async () => {},
                ...storage,
            },
        },
    });
    const value = () => provider.output().props.value;
    const settle = async () => {
        provider.flushEffects();
        await flush();
        provider.render();
    };
    return {
        ...provider,
        value,
        reads: () => reads,
        settle,
        async system(next) {
            scheme = next;
            provider.render();
            await settle();
        },
    };
}

test("explicit Light and Dark survive system appearance changes and remount", async () => {
    for (const saved of ["light", "dark"]) {
        const theme = mountTheme(saved, "dark");
        await theme.settle();
        assert.equal(theme.value().current.type, saved);
        for (const scheme of ["light", "dark", null, "light"]) {
            await theme.system(scheme);
            assert.equal(theme.value().current.type, saved);
        }
        assert.equal(theme.reads(), 1);
    }
});

test("System and unknown stored preferences follow current system appearance", async () => {
    for (const saved of [null, "unsupported"]) {
        const theme = mountTheme(saved);
        await theme.settle();
        for (const [scheme, expected] of [
            ["dark", "dark"],
            ["light", "light"],
            [null, "light"],
        ]) {
            await theme.system(scheme);
            assert.equal(theme.value().current.type, expected);
        }
    }
});

test("a late stored read cannot replace a freshly selected mode", async () => {
    const read = deferred();
    const theme = mountTheme(null, "dark", { getItemAsync: () => read.promise });
    theme.flushEffects();
    await theme.value().lightTheme();
    read.resolve("dark");
    await theme.settle();
    assert.equal(theme.value().current.type, "light");
    await theme.system("light");
    await theme.system("dark");
    assert.equal(theme.value().current.type, "light");
});

test("reset follows the latest system scheme and cannot replace a newer explicit choice", async () => {
    const deletion = deferred();
    const theme = mountTheme("light", "light", { deleteItemAsync: () => deletion.promise });
    await theme.settle();
    const reset = theme.value().resetTheme();
    await theme.system("dark");
    deletion.resolve();
    await reset;
    theme.render();
    assert.equal(theme.value().current.type, "dark");
    await theme.system("light");
    assert.equal(theme.value().current.type, "light");

    const staleDeletion = deferred();
    const another = mountTheme("dark", "dark", { deleteItemAsync: () => staleDeletion.promise });
    await another.settle();
    const staleReset = another.value().resetTheme();
    await another.value().lightTheme();
    staleDeletion.resolve();
    await staleReset;
    another.render();
    assert.equal(another.value().current.type, "light");
});

test("failed preference reads keep system mode without an unhandled rejection", async () => {
    const theme = mountTheme(null, "dark", {
        getItemAsync: async () => {
            throw new Error("SecureStore unavailable");
        },
    });
    await theme.settle();
    assert.equal(theme.value().current.type, "dark");
    await theme.system("light");
    assert.equal(theme.value().current.type, "light");
});

function contrast(foreground, background) {
    const luminance = (hex) =>
        hex
            .slice(1)
            .match(/../g)
            .map((part) => {
                const channel = parseInt(part, 16) / 255;
                return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
            })
            .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
    const levels = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    return (levels[0] + 0.05) / (levels[1] + 0.05);
}

test("operation markers and room creation retain AA text contrast in both themes", async () => {
    const style = (value) => Object.assign({}, ...[value].flat(Infinity));
    for (const mode of ["light", "dark"]) {
        const theme = mountTheme(mode);
        await theme.settle();
        const useTheme = theme.value;
        const colors = useTheme().current.colors;
        for (const [type, letter] of [
            ["Boolean", "B"],
            ["Number", "N"],
            ["Integer", "I"],
            ["Text", "T"],
            ["HexColor", "HC"],
            ["Options", "O"],
            ["Unknown", "?"],
            ["__proto__", "?"],
            ["constructor", "?"],
        ]) {
            const tile = mountNativeComponent("src/components/device/operation/OperationTile.tsx", {
                props: { id: "operation", name: "Operation", type },
                modules: {
                    "expo-router": { useRouter: () => ({ push: () => {} }) },
                    "@/contexts/ThemeProvider": { useTheme },
                    "@/components/common/ListRow": "ListRow",
                },
            });
            const badge = tile.output().props.leading;
            const text = badge.props.children[0];
            assert.equal(text.props.children[0], letter);
            assert.ok(
                contrast(style(text.props.style).color, style(badge.props.style).backgroundColor) >=
                    4.5,
                `${mode} ${type}`,
            );
            const disabledRow = mountNativeComponent("src/components/common/ListRow.tsx", {
                props: { ...tile.output().props, disabled: true },
                modules: { "@/contexts/ThemeProvider": { useTheme } },
            });
            const opacity = style(disabledRow.output().props.style).opacity;
            const composite = (hex) =>
                "#" +
                hex
                    .slice(1)
                    .match(/../g)
                    .map((part, index) =>
                        Math.round(
                            parseInt(part, 16) * opacity +
                                parseInt(
                                    colors.authBackground.slice(1 + index * 2, 3 + index * 2),
                                    16,
                                ) *
                                    (1 - opacity),
                        )
                            .toString(16)
                            .padStart(2, "0"),
                    )
                    .join("");
            assert.ok(
                contrast(
                    composite(style(text.props.style).color),
                    composite(style(badge.props.style).backgroundColor),
                ) >= 4.5,
                `${mode} ${type} disabled`,
            );
        }
        const selector = mountNativeComponent("src/components/room/RoomSelector.tsx", {
            props: { onSelected: () => {} },
            modules: {
                "expo-router": { useRouter: () => ({}), useFocusEffect: () => {} },
                "@/contexts/ThemeProvider": { useTheme },
                "@/contexts/domain/HomeProvider": {
                    useHomes: () => ({ current: { isOwner: true, rooms: [] } }),
                },
                "../common/BottomSheetSelect": "BottomSheetSelect",
            },
        });
        const options = selector.output().props.renderOptions(() => true);
        const action = selector
            .elements(options)
            .find((node) => node.props?.accessibilityLabel === "Create room");
        const text = action.props.children[0];
        assert.ok(
            contrast(style(text.props.style).color, colors.authFieldBackground) >= 4.5,
            `${mode} Create room`,
        );
    }
});
