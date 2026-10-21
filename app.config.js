module.exports = ({ config }) => {
    if (process.env.SENSWAVE_BUILD_PROFILE !== "next-dev") return config;

    const versionCode = Number(process.env.SENSWAVE_ANDROID_VERSION_CODE);
    if (!Number.isInteger(versionCode) || versionCode < 1 || versionCode > 2100000000) {
        throw new Error("Invalid next-dev Android version code.");
    }

    return {
        ...config,
        name: "Senswave next-dev",
        scheme: "com.develite.senswave.nextdev",
        android: {
            ...config.android,
            package: "com.develite.senswave.nextdev",
            versionCode,
        },
    };
};
