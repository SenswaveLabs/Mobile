<div align="center">

<h1>Senswave</h1>
<p>Mobile app for managing your DIY smart home devices.</p>

</div>

## Stats

[![Build](https://github.com/SenswaveLabs/Mobile/actions/workflows/build.yaml/badge.svg)](https://github.com/SenswaveLabs/Mobile/actions/workflows/build.yaml)
[![Latest Release](https://img.shields.io/github/v/release/SenswaveLabs/Mobile?label=version)](https://github.com/SenswaveLabs/Mobile/releases)
[![Open Issues](https://img.shields.io/github/issues/SenswaveLabs/Mobile)](https://github.com/SenswaveLabs/Mobile/issues)
[![Stars](https://img.shields.io/github/stars/SenswaveLabs/Mobile?style=flat)](https://github.com/SenswaveLabs/Mobile/stargazers)
[![Commits](https://img.shields.io/github/commit-activity/m/SenswaveLabs/Mobile)](https://github.com/SenswaveLabs/Mobile/commits/main)
[![License](https://img.shields.io/github/license/SenswaveLabs/Mobile)](LICENSE)

## Built With

![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react&logoColor=white&style=flat)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white&style=flat)
![Expo](https://img.shields.io/badge/Expo-54-000020?logo=expo&logoColor=white&style=flat)
![Expo Router](https://img.shields.io/badge/Expo_Router-6-000020?logo=expo&logoColor=white&style=flat)
![React Native Paper](https://img.shields.io/badge/React_Native_Paper-5-6200EE?logo=react&logoColor=white&style=flat)
![SignalR](https://img.shields.io/badge/SignalR-8-5C2D91?logo=dotnet&logoColor=white&style=flat)

## What is Senswave?

Senswave is a smart home platform for DIY MQTT devices. The mobile app connects to a self-hosted or cloud Senswave backend and lets you control devices, monitor sensor data, and configure automations — all in real time.

**Core capabilities:**

- **Device control** — send commands to any MQTT device via configurable operations and dashboard widgets
- **Live dashboards** — real-time widget updates over SignalR; no manual refresh needed
- **Automations** — create rules that trigger device operations when sensor values cross thresholds
- **Home sharing** — join or share homes with role-based access (Display / Manage)
- **Data sources** — connect MQTT brokers and map topic payloads to device operations via JSON path selectors
- **Google Sign-In** — authenticate with Google or email/password; tokens stored securely on-device

## Example Use Cases

### Control a custom LED controller

A Raspberry Pi Pico LED controller supports multiple modes and brightness levels. Through Senswave you switch modes and adjust brightness from a dashboard slider or radio widget — no manual MQTT publish needed.

### Auto-off lights when room is empty

A presence sensor publishes occupancy data. An automation turns off all lights when occupancy drops to zero — saves energy without any manual action.

### Monitor sensor data in real time

Temperature, humidity, or any numeric sensor streams to a Display widget on your dashboard. Values update the moment the broker receives a new message.

## How to Use

### Prerequisites

- Node.js + npm
- Android Studio + Java 17
- Expo CLI

### Setup

1. Copy `.env.template` to `.env` and fill in your backend URL and Google OAuth client IDs.
2. Install dependencies and build:

```bash
npm i
npx expo run:android   # first build — compiles native code
npm start              # subsequent runs
```

See [`AGENTS.md`](AGENTS.md) for full architecture reference, environment variables, and development conventions.

## Contributing

Pull requests are welcome.

- Read [`AGENTS.md`](AGENTS.md) for architecture concepts and development conventions before writing code.
- Report bugs using the **Bug report** issue template.
- Propose features using the **Feature request** issue template.

## License

Distributed under the **Apache License 2.0**. See [`LICENSE`](LICENSE) for details.
