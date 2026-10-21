import { createLucideIcon } from "lucide-react-native";
import type { LucideIcon, LucideIconNode } from "lucide-react-native";
import HousePlug from "lucide-react-native/icons/house-plug";
import House from "lucide-react-native/icons/house";
import Landmark from "lucide-react-native/icons/landmark";
import Building from "lucide-react-native/icons/building";
import Building2 from "lucide-react-native/icons/building-complex";
import Factory from "lucide-react-native/icons/factory";
import Warehouse from "lucide-react-native/icons/warehouse";
import Castle from "lucide-react-native/icons/castle";
import Hotel from "lucide-react-native/icons/hotel";
import ShoppingBag from "lucide-react-native/icons/shopping-bag";
import Store from "lucide-react-native/icons/store";
import LocateFixed from "lucide-react-native/icons/locate-fixed";
import MapPin from "lucide-react-native/icons/map-pin";
import Pin from "lucide-react-native/icons/pin";
import Map from "lucide-react-native/icons/map";
import Users from "lucide-react-native/icons/users";
import Heart from "lucide-react-native/icons/heart";
import Trees from "lucide-react-native/icons/trees";
import SunDim from "lucide-react-native/icons/sun-dim";
import Sun from "lucide-react-native/icons/sun";
import Globe from "lucide-react-native/icons/globe";
import Lightbulb from "lucide-react-native/icons/lightbulb";
import Thermometer from "lucide-react-native/icons/thermometer";
import LockKeyhole from "lucide-react-native/icons/lock-keyhole";
import Lock from "lucide-react-native/icons/lock";
import Key from "lucide-react-native/icons/key";
import Camera from "lucide-react-native/icons/camera";
import Shield from "lucide-react-native/icons/shield";
import Power from "lucide-react-native/icons/power";
import Plug from "lucide-react-native/icons/plug";
import Zap from "lucide-react-native/icons/zap";
import Fan from "lucide-react-native/icons/fan";
import CircuitBoard from "lucide-react-native/icons/circuit-board";
import Cpu from "lucide-react-native/icons/cpu";
import Wifi from "lucide-react-native/icons/wifi";
import Radio from "lucide-react-native/icons/radio";
import Smartphone from "lucide-react-native/icons/smartphone";
import LaptopMinimal from "lucide-react-native/icons/laptop-minimal";
import Laptop from "lucide-react-native/icons/laptop";
import Monitor from "lucide-react-native/icons/monitor";
import Tv from "lucide-react-native/icons/tv";
import ServerCog from "lucide-react-native/icons/server-cog";
import Server from "lucide-react-native/icons/server";
import Cloud from "lucide-react-native/icons/cloud";
import BatteryCharging from "lucide-react-native/icons/battery-charging";
import Battery from "lucide-react-native/icons/battery";
import AlarmClock from "lucide-react-native/icons/alarm-clock";
import Mic from "lucide-react-native/icons/mic";
import Fingerprint from "lucide-react-native/icons/fingerprint-pattern";
import Waves from "lucide-react-native/icons/waves-horizontal";
import Droplet from "lucide-react-native/icons/droplet";
import Snowflake from "lucide-react-native/icons/snowflake";
import Flame from "lucide-react-native/icons/flame";
import Gauge from "lucide-react-native/icons/gauge";
import Box from "lucide-react-native/icons/box";
import Wrench from "lucide-react-native/icons/wrench";

export type IconResource = "homes" | "devices";

// shortcut: pin the web Leaf paths until Lucide's native and web shapes converge.
const Leaf = createLucideIcon({
    name: "leaf",
    size: 24,
    node: [
        [
            "path",
            {
                d: "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z",
                key: "leaf-web-1",
            },
        ],
        ["path", { d: "M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12", key: "leaf-web-2" }],
    ] as LucideIconNode[],
});

const icons = {
    HousePlug,
    House,
    Landmark,
    Building,
    Building2,
    Factory,
    Warehouse,
    Castle,
    Hotel,
    ShoppingBag,
    Store,
    LocateFixed,
    MapPin,
    Pin,
    Map,
    Users,
    Heart,
    Leaf,
    Trees,
    SunDim,
    Sun,
    Globe,
    Lightbulb,
    Thermometer,
    LockKeyhole,
    Lock,
    Key,
    Camera,
    Shield,
    Power,
    Plug,
    Zap,
    Fan,
    CircuitBoard,
    Cpu,
    Wifi,
    Radio,
    Smartphone,
    LaptopMinimal,
    Laptop,
    Monitor,
    Tv,
    ServerCog,
    Server,
    Cloud,
    BatteryCharging,
    Battery,
    AlarmClock,
    Mic,
    Fingerprint,
    Waves,
    Droplet,
    Snowflake,
    Flame,
    Gauge,
    Box,
    Wrench,
};
type IconSymbol = keyof typeof icons;

const resourceSymbols: Record<IconResource, Record<string, IconSymbol>> = {
    homes: {
        "home-outline": "HousePlug",
        home: "House",
        "business-outline": "Landmark",
        building: "Building",
        "building-2": "Building2",
        factory: "Factory",
        warehouse: "Warehouse",
        castle: "Castle",
        hotel: "Hotel",
        "storefront-outline": "ShoppingBag",
        store: "Store",
        "location-outline": "LocateFixed",
        "map-pin": "MapPin",
        "pin-outline": "Pin",
        "map-outline": "Map",
        "people-outline": "Users",
        "heart-outline": "Heart",
        "leaf-outline": "Leaf",
        trees: "Trees",
        "sunny-outline": "SunDim",
        sun: "Sun",
        "globe-outline": "Globe",
    },
    devices: {
        "bulb-outline": "Lightbulb",
        "thermometer-outline": "Thermometer",
        "lock-closed-outline": "LockKeyhole",
        "lock-outline": "Lock",
        "key-outline": "Key",
        "camera-outline": "Camera",
        shield: "Shield",
        "power-outline": "Power",
        "plug-outline": "Plug",
        "zap-outline": "Zap",
        "fan-outline": "Fan",
        "hardware-chip-outline": "CircuitBoard",
        "cpu-outline": "Cpu",
        "wifi-outline": "Wifi",
        "radio-outline": "Radio",
        "phone-portrait-outline": "Smartphone",
        "laptop-outline": "LaptopMinimal",
        laptop: "Laptop",
        "desktop-outline": "Monitor",
        "tv-outline": "Tv",
        "server-outline": "ServerCog",
        server: "Server",
        cloud: "Cloud",
        "battery-charging-outline": "BatteryCharging",
        battery: "Battery",
        "alarm-outline": "AlarmClock",
        "mic-outline": "Mic",
        "finger-print-outline": "Fingerprint",
        "water-outline": "Waves",
        "droplet-outline": "Droplet",
        "leaf-outline": "Leaf",
        "snow-outline": "Snowflake",
        "flame-outline": "Flame",
        gauge: "Gauge",
        box: "Box",
        wrench: "Wrench",
    },
};

const fallbackSymbols: Record<IconResource, IconSymbol> = {
    homes: "HousePlug",
    devices: "Lightbulb",
};

export const getResourceIcon = (
    key: string,
    resource: IconResource,
): { symbol: IconSymbol; component: LucideIcon } => {
    const symbols = resourceSymbols[resource];
    const symbol = Object.prototype.hasOwnProperty.call(symbols, key)
        ? symbols[key]
        : fallbackSymbols[resource];
    return { symbol, component: icons[symbol] };
};
