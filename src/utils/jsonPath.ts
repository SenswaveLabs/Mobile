export const isValidJsonPathSegment = (value: string): boolean => {
    const key = value.trim();
    return (
        key.length > 0 &&
        key.length <= 63 &&
        !key.includes('"') &&
        !key.includes("\\") &&
        !Array.from(key).some((character) => character.charCodeAt(0) <= 0x1f)
    );
};
