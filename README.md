# 🧠 BEing Reasonix

> 基于 DeepSeek Reasonix 内核的 Windows 桌面 AI 编程助手。封装命令行工具为开箱即用的桌面软件，无需任何技术背景。

[![Release](https://img.shields.io/github/v/release/Tiannan666/BEing-Reasonix)](https://github.com/Tiannan666/BEing-Reasonix/releases/latest)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20x64-lightgrey)](https://github.com/Tiannan666/BEing-Reasonix/releases)

---

## 📥 下载安装

### 一键安装

从 [**Releases**](https://github.com/Tiannan666/BEing-Reasonix/releases/latest) 下载 `BEing-Reasonix-Setup-x.x.x-win-x64.exe`，双击运行：

1. 安装程序自动检测 Node.js ≥ 24，缺失则静默安装内置版本
2. 安装完成后桌面生成快捷方式
3. 双击图标启动

### 首次使用

```
启动 → 输入 DeepSeek API Key → 选择工作目录 → 选择 Code/Chat 模式 → 开始
```

> 获取 API Key：[platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys)

---

## 🎯 功能

| 功能 | 说明 |
|------|------|
| **Code 模式** | Reasonix Code，完整文件系统 + 命令行工具，自由编程 |
| **Chat 模式** | Reasonix Chat，纯对话模式，安全无文件访问 |
| **模型切换** | auto / flash / pro 三档，一键切换 `/preset` |
| **API Key 热换** | 左侧栏点击即换，无需重启软件 |
| **自动环境检测** | 启动检测 Node.js ≥ 24，缺失自动安装 |

---

## 🏗 核心架构

```
┌─────────────────────────────────────────────┐
│               Electron Main Process          │
│  ┌─────────────┐  ┌────────────────────────┐ │
│  │ setup.ts    │  │ reasonix-process.ts    │ │
│  │ 配置/密钥    │  │ PTY 进程生命周期管理    │ │
│  └─────────────┘  └───────────┬────────────┘ │
│                               │ node-pty      │
│  ┌─────────────┐  ┌───────────┴────────────┐ │
│  │ deepseek    │  │   Reasonix CLI         │ │
│  │ api.ts      │  │   (子进程)              │ │
│  └─────────────┘  └────────────────────────┘ │
│                       ↕ IPC                   │
├─────────────────────────────────────────────┤
│            Electron Renderer Process         │
│  ┌──────────┐  ┌───────────────────────────┐ │
│  │ Sidebar  │  │  TerminalPanel (xterm.js) │ │
│  │ · 模型   │  │  PTY 输入输出直连          │ │
│  │ · APIKey │  │  零解析 · 零延迟           │ │
│  │ · 目录   │  └───────────────────────────┘ │
│  └──────────┘                                │
└─────────────────────────────────────────────┘
```

**技术栈：** `Electron 33` + `React 19` + `TypeScript` + `xterm.js` + `node-pty`

**设计原则：** Reasonix 以 PTY 子进程运行，xterm.js 终端直接嵌入 UI。用户输入 → PTY write，PTY output → xterm write。零中间层解析，体验等同于原生终端。

---

## 🛠 开发

```bash
# 环境要求
Node.js >= 24（开发机）或系统已安装

# 安装
npm install --ignore-scripts
npm run bundle:deps          # 下载 Node.js 运行时 + MSI 安装包

# 开发
npm run dev                  # 启动 Electron + Vite 热更新

# 构建
npm run build                # TypeScript + Vite 编译
npm run pack:win             # 打包 Windows 安装包
```

---

## 📁 项目结构

```
src/
├── main/                    # Electron 主进程
│   ├── index.ts             # 窗口创建、启动流程
│   ├── setup.ts             # API Key 读写、配置管理
│   ├── reasonix-process.ts  # Reasonix PTY 管理
│   ├── deepseek-api.ts      # DeepSeek API 流式调用
│   ├── history-store.ts     # 对话历史存储
│   └── ipc-handlers.ts      # IPC 通道注册
├── preload/index.ts         # contextBridge 安全桥接
└── renderer/                # React 前端
    ├── App.tsx              # 根组件，流程编排
    ├── components/
    │   ├── Sidebar.tsx      # 左侧功能栏
    │   ├── TerminalPanel.tsx # xterm 终端面板
    │   ├── ChatPanel.tsx    # Chat 模式对话面板
    │   ├── FirstRunWizard.tsx    # 首次 API Key 输入
    │   └── DirectoryPrompt.tsx   # 目录选择
    └── styles/global.css    # 全局样式
```

---

## 📄 License

MIT © BEing Reasonix
