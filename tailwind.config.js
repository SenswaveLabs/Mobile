/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: "class",
    content: ["./src/**/*.{ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: Object.fromEntries(
                [
                    "background",
                    "foreground",
                    "card",
                    "card-foreground",
                    "primary",
                    "primary-foreground",
                    "secondary",
                    "secondary-foreground",
                    "muted",
                    "muted-foreground",
                    "accent",
                    "accent-foreground",
                    "destructive",
                    "border",
                    "input",
                    "ring",
                ].map((role) => [role, `rgb(var(--${role}) / <alpha-value>)`]),
            ),
            borderRadius: { md: "8px" },
        },
    },
    plugins: [],
};
