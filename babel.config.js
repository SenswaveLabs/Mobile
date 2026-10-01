module.exports = function (api) {
    api.cache(true);
    return {
        presets: [
            require.resolve("babel-preset-expo", { paths: [require.resolve("expo/package.json")] }),
        ],
        plugins: [
            [
                "module-resolver",
                {
                    root: ["./src"],
                    extensions: [".ios.js", ".android.js", ".js", ".ts", ".tsx", ".json"],
                    alias: {
                        tests: ["./tests/"],
                        "@components": "./src/components",
                    },
                },
            ],
            "react-native-reanimated/plugin",
        ],
    };
};
