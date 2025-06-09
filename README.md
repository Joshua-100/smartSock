# 🧦 SmartSock – Sleepwalking Detection System

SmartSock is a wearable IoT system designed to monitor foot pressure patterns and detect potential sleepwalking behavior in children or vulnerable individuals. It uses pressure sensors connected to an ESP32 and a companion React Native mobile app via Bluetooth Low Energy (BLE) to alert caregivers in real-time.

---

## 📱 Features

- 🔄 **BLE communication** between ESP32 and mobile app
- 🧠 **Gait analysis** using heel and toe pressure sensors
- 🔔 **Real-time alerts** for sleepwalking activity
- 🔊 **Buzzer and LED** feedback on the ESP32
- 📱 **React Native mobile interface** with live gait status
- 📦 Modular, clean codebase (separated BLE logic, alarms, and UI)

---

## ⚙️ Hardware Requirements

- ESP32 development board with BLE support
- 2 analog pressure sensors (heel and toe)
- Buzzer (passive)
- LED (for visual feedback)
- Resistors/wires for connections
- Power supply

---

## 📲 Mobile App (React Native + BLE)

### Prerequisites

- Node.js (v16 recommended)
- Expo CLI: `npm install -g expo-cli`
- Android/iOS device with BLE support
- Required packages:
  - `react-native-ble-plx`
  - `expo-av` or `expo-audio`
  - `expo-linear-gradient`
  - `expo-notifications`
  - `base-64`

### Running the App

```bash
git clone https://github.com/your-username/smartsock.git
cd smartsock
npm install
expo start
