# BEing Reasonix

基于 DeepSeek 的 AI 编程助手桌面软件。封装 Reasonix 内核为 Windows 桌面应用，用户无需命令行即可使用完整 AI 编程能力。

## 下载 & 安装

### 下载

从 [Releases](../../releases) 页面下载最新安装包 `BEing-Reasonix-Setup-x.x.x-win-x64.exe`。

### 安装

1. 双击安装包，按提示完成安装
2. 安装程序会自动检测 Node.js >= 24，如未安装则自动安装内置版本
3. 安装完成后桌面自动生成快捷方式

### 首次启动

1. 双击桌面 `BEing Reasonix` 图标
2. 输入 DeepSeek API Key（从 [platform.deepseek.com](https://platform.deepseek.com/api_keys) 获取）
3. 选择工作目录（Reasonix 将在此目录下执行操作）
4. 选择模式：**Code**（完整文件系统 + 命令行）或 **Chat**（纯对话）
5. 开始使用

## 核心架构

```
┌──────────────────────────────────────────┐
│              Electron 主进程              │
│  ┌──────────┐  ┌──────────────────────┐  │
│  │ 配置管理  │  │  Reasonix 进程管理    │  │
│  │ setup.ts │  │  reasonix-process.ts │  │
│  └──────────┘  └────────┬─────────────┘  │
│                         │ node-pty (PTY) │
│  ┌──────────────────────┼──────────────┐  │
│  │ DeepSeek API         │ Reasonix CLI │  │
│  │ deepseek-api.ts      ▼              │  │
│  └──────────────────────┴──────────────┘  │
│                 ↕ IPC                     │
├──────────────────────────────────────────┤
│              Electron 渲染进程            │
│  ┌──────────┐  ┌──────────────────────┐  │
│  │  Sidebar │  │   TerminalPanel      │  │
│  │  · 模型  │  │   (xterm.js)         │  │
│  │  · API   │  │   PTY 输出直连       │  │
│  │  · 目录  │  └──────────────────────┘  │
│  └──────────┘                            │
└──────────────────────────────────────────┘
```

**技术栈：** Electron + React + TypeScript + xterm.js + node-pty

**核心设计：** Reasonix 通过 node-pty 以 PTY 子进程运行，xterm.js 终端直接嵌入 UI。用户输入直接转发给 Reasonix，Reasonix 输出直接显示在终端。零解析、零过滤，体验等同于原生终端。

## 功能

### 左侧功能栏

| 功能 | 说明 |
|------|------|
| 模型切换 | auto / flash / pro 三档，点击自动执行 `/preset` |
| API Key | 点击展开输入框，更换 DeepSeek API Key |
| 项目目录 | 显示/更换工作目录 |

### 模式选择（启动时）

| 模式 | 说明 |
|------|------|
| Code | Reasonix code 模式，完整文件系统和命令行工具 |
| Chat | Reasonix chat 模式，纯对话，无文件访问 |

### 其他特性

- **自动环境检测** — 首次启动检测 Node.js >= 24，缺失则自动静默安装
- **API Key 记忆** — 保存到 `~/.reasonix/config.json`，后续启动自动跳过
- **白底终端** — 简洁白色界面，专注编码

## 开发

```bash
# 安装依赖
npm install --ignore-scripts

# 下载 Node.js 运行时
npm run bundle:deps

# 开发模式
npm run dev

# 构建安装包
npm run pack:win
```

## License

MIT
