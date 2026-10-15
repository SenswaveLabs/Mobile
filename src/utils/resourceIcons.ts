import type { Ionicons } from "@expo/vector-icons";

export type IconResource = "homes" | "devices";

interface IconPresentation {
    glyph: keyof typeof Ionicons.glyphMap;
    label: string;
}

// Presentation only: the fetched backend catalog determines which keys may be selected.
const presentations: Record<IconResource, Record<string, IconPresentation>> = {
    homes: {
        "home-outline": { glyph: "home-outline", label: "Home" },
        home: { glyph: "home", label: "House" },
        "business-outline": { glyph: "business-outline", label: "Business" },
        building: { glyph: "library-outline", label: "Building" },
        "building-2": { glyph: "business", label: "Apartment building" },
        factory: { glyph: "construct-outline", label: "Factory" },
        warehouse: { glyph: "cube-outline", label: "Warehouse" },
        castle: { glyph: "shield-outline", label: "Castle" },
        hotel: { glyph: "bed-outline", label: "Hotel" },
        "storefront-outline": { glyph: "storefront-outline", label: "Storefront" },
        store: { glyph: "storefront", label: "Store" },
        "location-outline": { glyph: "location-outline", label: "Location" },
        "map-pin": { glyph: "location", label: "Map pin" },
        "pin-outline": { glyph: "pin-outline", label: "Pin" },
        "map-outline": { glyph: "map-outline", label: "Map" },
        "people-outline": { glyph: "people-outline", label: "People" },
        "heart-outline": { glyph: "heart-outline", label: "Heart" },
        "leaf-outline": { glyph: "leaf-outline", label: "Leaf" },
        trees: { glyph: "flower-outline", label: "Trees" },
        "sunny-outline": { glyph: "sunny-outline", label: "Sunny" },
        sun: { glyph: "sunny", label: "Sun" },
        "globe-outline": { glyph: "globe-outline", label: "Globe" },
    },
    devices: {
        "bulb-outline": { glyph: "bulb-outline", label: "Light bulb" },
        "thermometer-outline": { glyph: "thermometer-outline", label: "Thermometer" },
        "lock-closed-outline": { glyph: "lock-closed-outline", label: "Closed lock" },
        "lock-outline": { glyph: "lock-closed", label: "Lock" },
        "key-outline": { glyph: "key-outline", label: "Key" },
        "camera-outline": { glyph: "camera-outline", label: "Camera" },
        shield: { glyph: "shield-outline", label: "Shield" },
        "power-outline": { glyph: "power-outline", label: "Power" },
        "plug-outline": { glyph: "power", label: "Plug" },
        "zap-outline": { glyph: "flash-outline", label: "Electricity" },
        "fan-outline": { glyph: "aperture-outline", label: "Fan" },
        "hardware-chip-outline": { glyph: "hardware-chip-outline", label: "Hardware chip" },
        "cpu-outline": { glyph: "hardware-chip", label: "CPU" },
        "wifi-outline": { glyph: "wifi-outline", label: "Wi-Fi" },
        "radio-outline": { glyph: "radio-outline", label: "Radio" },
        "phone-portrait-outline": { glyph: "phone-portrait-outline", label: "Phone" },
        "laptop-outline": { glyph: "laptop-outline", label: "Laptop computer" },
        laptop: { glyph: "laptop", label: "Laptop" },
        "desktop-outline": { glyph: "desktop-outline", label: "Desktop" },
        "tv-outline": { glyph: "tv-outline", label: "TV" },
        "server-outline": { glyph: "server-outline", label: "Server rack" },
        server: { glyph: "server", label: "Server" },
        cloud: { glyph: "cloud-outline", label: "Cloud" },
        "battery-charging-outline": {
            glyph: "battery-charging-outline",
            label: "Charging battery",
        },
        battery: { glyph: "battery-half-outline", label: "Battery" },
        "alarm-outline": { glyph: "alarm-outline", label: "Alarm" },
        "mic-outline": { glyph: "mic-outline", label: "Microphone" },
        "finger-print-outline": { glyph: "finger-print-outline", label: "Fingerprint" },
        "water-outline": { glyph: "water-outline", label: "Water" },
        "droplet-outline": { glyph: "water", label: "Droplet" },
        "leaf-outline": { glyph: "leaf-outline", label: "Leaf" },
        "snow-outline": { glyph: "snow-outline", label: "Snow" },
        "flame-outline": { glyph: "flame-outline", label: "Flame" },
        gauge: { glyph: "speedometer-outline", label: "Gauge" },
        box: { glyph: "cube-outline", label: "Box" },
        wrench: { glyph: "build-outline", label: "Wrench" },
    },
};

export const getResourceIcon = (key: string, resource: IconResource): IconPresentation =>
    Object.prototype.hasOwnProperty.call(presentations[resource], key)
        ? presentations[resource][key]
        : { glyph: resource === "homes" ? "home-outline" : "bulb-outline", label: key };
