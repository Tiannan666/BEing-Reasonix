# Reasonix Launcher

A **zero-dependency** desktop app for [DeepSeek-Reasonix](https://github.com/esengine/DeepSeek-Reasonix) — the DeepSeek-native AI coding agent.

No Node.js required. No npm install. Just download, double-click, enter your API key.

**Codex-inspired UI** with one-click switching between **Code** (full filesystem + shell tools) and **Chat** (thinking partner, no disk access). Built with Electron + React + xterm.js.

## Features

- 📦 **Zero dependencies** — portable Node.js 22 and Reasonix CLI bundled inside the app
- 🖥️ **Native desktop** — Windows (.exe) and macOS (.dmg) installers
- 🔑 **First-run wizard** — enter your DeepSeek API key once, never again
- 🔀 **Mode switching** — toggle Code ↔ Chat in the sidebar, session restarts automatically
- 🎨 **Codex-inspired dark theme** — GitHub-dark palette, Geist Mono font
- 📂 **Directory picker** — choose working directory from sidebar
- ⚡ **Full terminal** — xterm.js PTY with 256-color, resize handling

## Download & Install

### Windows

Download `Reasonix-Setup-{version}-win-x64.exe` from [Releases](../../releases).

1. Double-click the installer
2. SmartScreen may warn "Unknown publisher" → **More info** → **Run anyway**
3. Desktop shortcut created automatically
4. Launch → enter API key → **done**

### macOS

Download `Reasonix-{version}-mac-{arch}.dmg` from [Releases](../../releases).

1. Open `.dmg` → drag `Reasonix.app` to `/Applications`
2. First launch: right-click → **Open** → confirm (Gatekeeper workaround)
3. Enter API key → **done**

> No Terminal. No `npm install`. No Node.js. Everything is inside the app.

## First Launch

The first time you open Reasonix, you'll see the API key wizard:

1. Get a key at [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys)
2. Paste it into the input field (starts with `sk-`)
3. Click **Continue**

Your key is saved to `~/.reasonix/config.json` — the same file the CLI Reasonix uses.

## User Experience

```
Download installer
       ↓
   Double-click
       ↓
  Enter API Key    ← one time only
       ↓
   Choose mode:
   ┌──────┬──────┐
   │ Code │ Chat │
   └──────┴──────┘
       ↓
    Start coding
```

## How It Works (Self-Contained)

The app ships with everything it needs:

```
Reasonix.app/
└── Resources/
    ├── vendor/node/          ← portable Node.js 22 binary
    │   ├── win32-x64/node.exe
    │   ├── darwin-x64/node
    │   └── darwin-arm64/node
    └── node_modules/reasonix/ ← full Reasonix CLI
        └── dist/cli/index.js
```

On launch, the app spawns the bundled Node binary directly to run Reasonix — no system Node or npm needed.

## Development

```bash
# Install dev dependencies
npm install

# Download portable Node for bundling
npm run bundle:deps

# Run in dev mode (Vite + Electron hot-reload)
npm run dev

# Package for distribution
npm run pack:win    # Windows .exe
npm run pack:mac    # macOS .dmg
npm run pack:all    # Both
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Shell | Electron 33 |
| UI | React 19 + Vite 5 |
| Terminal | xterm.js 5 + node-pty |
| Icons | Lucide React |
| Build | electron-builder 25 |
| Bundled Runtime | Node.js 22.12.0 portable |
| Theme | Codex-inspired dark (GitHub palette) |

## License

MIT
