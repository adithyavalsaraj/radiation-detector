# 📡 WiFi Locator & Radiation Radar

A high-fidelity, cross-platform WiFi and Bluetooth signal tracker designed to visualize the electromagnetic environment around you. It functions as a real-time radiation detector, identifying nearby access points, Bluetooth peripherals, and network nodes with intelligent device classification.

![Hero Image](frontend/src/assets/hero.png)

## 🚀 Key Features

- **Real-time Radar Tracking**: Visualize WiFi and Bluetooth signals in real-time using high-frequency polling and Socket.io streaming.
- **Intelligent Classification**: Automatically identifies device manufacturers and types, including specialized detection for **IoT modules**, **IP Cameras**, and **Potential Spy Cameras**.
- **Cross-Platform Support**: 
  - **Desktop**: Electron-powered app for macOS, Windows, and Linux.
  - **Mobile**: Capacitor-ready for Android and iOS (via `@capgo/capacitor-wifi` and `@capacitor-community/bluetooth-le`).
- **Deep System Integration**:
  - Uses native system calls (`swift` on macOS, `powershell` on Windows, `nmcli` on Linux) for low-level hardware access.
  - ARP-based network discovery to find connected nodes in your local subnet.
- **Modern Tech Stack**: React 19, Vite, Express, Socket.io, and Electron.

## 🛠 Tech Stack

- **Frontend**: React (Hooks, Vite), CSS Modules.
- **Backend**: Node.js, Express, Socket.io.
- **Native Interop**: Swift (macOS), PowerShell (Windows), Shell Scripting (Linux).
- **Runtime/Packaging**: Electron, Capacitor.

## 📦 Project Structure

```text
├── backend/            # Express server & Native scanning scripts (Swift/PS1)
├── frontend/           # React application (Vite-powered)
├── main.js             # Electron entry point
├── package.json        # Root monorepo configuration
└── vercel.json         # Deployment configuration
```

## 🏁 Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/adithyavalsaraj/radiation-detector.git
   cd wifi-locator
   ```

2. Install dependencies:
   ```bash
   npm run install:all
   ```

### Development

To run the full suite (Backend + Web Frontend + Electron Desktop):
```bash
npm run dev:desktop
```

To run only the web version (Backend + Web):
```bash
npm start
```

### Build & Package

To build the frontend and package the Electron app for your current OS:
```bash
npm run build:app
```

## 🛡 Security & Privacy

This application performs local network and signal scanning. It does not transmit captured signal data to any external servers. All processing happens locally on your machine.

---

Built with ❤️ by [adithyavalsaraj](https://github.com/adithyavalsaraj)
