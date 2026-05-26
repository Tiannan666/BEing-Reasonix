# 🧠 BEing Reasonix

> DeepSeek Reasonix 的 Windows 桌面启动器。配置好 API Key、目录、模式、模型后，一键启动原生 PowerShell 终端运行 Reasonix。

[![Release](https://img.shields.io/github/v/release/Tiannan666/BEing-Reasonix)](https://github.com/Tiannan666/BEing-Reasonix/releases/latest)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20x64-lightgrey)](https://github.com/Tiannan666/BEing-Reasonix/releases)

---

## 📥 下载安装

从 [**Releases**](https://github.com/Tiannan666/BEing-Reasonix/releases/latest) 下载 `BEing-Reasonix-Setup-x.x.x-win-x64.exe`，双击安装。

安装程序自动检测 Node.js ≥ 24，缺失则静默安装内置版本。

## 🚀 使用流程

安装完成后双击桌面图标，按步骤配置：

```
① API Key     → 首次输入 DeepSeek API Key，后续可保持不变或更换
② 工作目录    → 选择 Reasonix 的工作文件夹
③ 选择模式    → Code（文件系统+工具） / Chat（纯对话）
④ 选择模型    → auto / flash / pro

→ 自动打开原生 PowerShell 窗口运行 Reasonix ✓
→ BEing Reasonix 配置器自动退出
```

> 获取 API Key：[platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys)

## 🏗 架构

```
使用流程:

  BEing Reasonix (配置向导)
     │
     ├── API Key → 保存到 ~/.reasonix/config.json
     ├── 目录    → Reasonix 工作目录
     ├── 模式    → code / chat
     ├── 模型    → auto / flash / pro
     │
     ▼
  ┌────────────────────────────────┐
  │  原生 PowerShell 窗口           │
  │  $ node reasonix code --dir X  │
  │  (或 /preset auto/flash/pro)   │
  └────────────────────────────────┘
```

**核心设计：** BEing Reasonix 仅做配置向导，Reasonix 本身在原生 Windows 终端（PowerShell）中运行，保留完整的终端体验。配置完成后配置器自动退出。

## 🛠 开发

```bash
# 依赖
npm install --ignore-scripts

# 下载 Node.js 运行时
npm run bundle:deps

# 开发
npm run dev

# 打包
npm run pack:win
```

## 📄 License

MIT
