/**
 * App.tsx — Configuration wizard flow.
 *
 * Steps:
 *  1. API Key (enter or skip if already saved)
 *  2. Working directory (folder picker)
 *  3. Mode: Code / Chat
 *  4. Model: auto / flash / pro
 *  5. Launch native PowerShell with Reasonix
 */
import React, { useState, useEffect, useCallback } from "react";

const api = window.electronAPI;

type AppStep = "loading" | "api-key" | "directory" | "mode" | "model" | "launching";
type Mode = "code" | "chat";

export default function App() {
  const [step, setStep] = useState<AppStep>("loading");
  const [apiKey, setApiKey] = useState("");
  const [cwd, setCwd] = useState("");
  const [mode, setMode] = useState<Mode>("code");
  const [model, setModel] = useState("auto");
  const [error, setError] = useState<string | null>(null);

  // Determine first step
  useEffect(() => {
    (async () => {
      const key = await api.getApiKey();
      if (key) {
        setApiKey(key);
        setStep("api-key"); // will show "already configured, change?" dialog
      } else {
        setStep("api-key");
      }
    })();
  }, []);

  // ── Step 1: API Key ──────────────────────────────────
  const handleApiKeyDone = useCallback(async (newKey: string | null) => {
    if (newKey) {
      setApiKey(newKey);
      await api.saveApiKey(newKey);
    }
    setStep("directory");
  }, []);

  // ── Step 2: Directory ────────────────────────────────
  const handleDirDone = useCallback((dir: string) => {
    setCwd(dir);
    api.saveLastCwd(dir);
    setStep("mode");
  }, []);

  const handleDirSkip = useCallback(() => {
    api.getHome().then((h) => { setCwd(h); setStep("mode"); });
  }, []);

  // ── Step 3: Mode ─────────────────────────────────────
  const handleModeDone = useCallback((m: Mode) => {
    setMode(m);
    setStep("model");
  }, []);

  // ── Step 4: Model ────────────────────────────────────
  const handleLaunch = useCallback(async (m: string) => {
    setModel(m);
    setStep("launching");
    setError(null);

    try {
      const ok = await api.launchTerminal(mode, cwd, m);
      if (!ok) {
        setError("启动失败，请检查 Reasonix 是否已安装");
        setStep("model");
      }
    } catch {
      setError("启动失败");
      setStep("model");
    }
  }, [mode, cwd]);

  // ── Render ───────────────────────────────────────────
  if (step === "loading") {
    return (
      <div className="wizard-overlay">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (step === "api-key") {
    return <ApiKeyStep current={apiKey} onDone={handleApiKeyDone} />;
  }

  if (step === "directory") {
    return <DirectoryStep onDone={handleDirDone} onSkip={handleDirSkip} />;
  }

  if (step === "mode") {
    return <ModeStep onDone={handleModeDone} />;
  }

  if (step === "model") {
    return <ModelStep error={error} onLaunch={handleLaunch} />;
  }

  // Launching
  return (
    <div className="wizard-overlay">
      <div className="wizard-card">
        <div className="loading-spinner" />
        <p style={{ fontSize: 13, color: "#333" }}>
          正在启动 Reasonix {mode} 模式...
        </p>
      </div>
    </div>
  );
}

// ── Step components ──────────────────────────────────────────────

function ApiKeyStep({ current, onDone }: { current: string; onDone: (k: string | null) => void }) {
  const [value, setValue] = useState("");
  const [showInput, setShowInput] = useState(!current);

  if (!showInput) {
    return (
      <div className="wizard-overlay">
        <div className="wizard-card">
          <h1 className="wizard-title">API Key</h1>
          <p className="wizard-subtitle" style={{ fontSize: 12, color: "#666", wordBreak: "break-all" }}>
            当前 Key: {current.slice(0, 8)}...
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button className="wizard-btn" onClick={() => onDone(null)}>保持不变</button>
            <button className="wizard-btn-secondary" onClick={() => setShowInput(true)}>更换 Key</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-overlay">
      <div className="wizard-card">
        <h1 className="wizard-title">DeepSeek API Key</h1>
        <p className="wizard-subtitle">从 platform.deepseek.com/api_keys 获取</p>
        <div className="wizard-input-group">
          <input
            className="wizard-input"
            type="password" placeholder="sk-..."
            value={value} onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button className="wizard-btn" onClick={() => onDone(value.trim())}
            disabled={!value.trim() || !value.trim().startsWith("sk-")}>确认</button>
          {current && <button className="wizard-btn-secondary" onClick={() => onDone(null)}>取消</button>}
        </div>
      </div>
    </div>
  );
}

function DirectoryStep({ onDone, onSkip }: { onDone: (d: string) => void; onSkip: () => void }) {
  const [picking, setPicking] = useState(false);

  const handleBrowse = async () => {
    setPicking(true);
    const dir = await api.selectDirectory();
    setPicking(false);
    if (dir) onDone(dir);
  };

  return (
    <div className="wizard-overlay">
      <div className="wizard-card">
        <h1 className="wizard-title">选择工作目录</h1>
        <p className="wizard-subtitle">Reasonix 在此目录下执行操作</p>
        <button className="wizard-btn" onClick={handleBrowse} disabled={picking}>
          {picking ? "选择中..." : "选择文件夹"}
        </button>
        <button className="wizard-btn-secondary" onClick={onSkip}>跳过（使用默认目录）</button>
      </div>
    </div>
  );
}

function ModeStep({ onDone }: { onDone: (m: Mode) => void }) {
  return (
    <div className="wizard-overlay">
      <div className="wizard-card">
        <h1 className="wizard-title">选择模式</h1>
        <p className="wizard-subtitle">Code — 文件系统+命令行工具<br />Chat — 纯对话</p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <button className="wizard-btn" onClick={() => onDone("code")}>Code</button>
          <button className="wizard-btn-secondary" onClick={() => onDone("chat")}>Chat</button>
        </div>
      </div>
    </div>
  );
}

function ModelStep({ error, onLaunch }: { error: string | null; onLaunch: (m: string) => void }) {
  return (
    <div className="wizard-overlay">
      <div className="wizard-card">
        <h1 className="wizard-title">选择模型</h1>
        <p className="wizard-subtitle">选择 Reasonix 预设模型</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {["auto", "flash", "pro"].map((m) => (
            <button key={m} className="wizard-btn" onClick={() => onLaunch(m)}>{m}</button>
          ))}
        </div>
        {error && <p style={{ color: "#cf222e", fontSize: 12, textAlign: "center" }}>{error}</p>}
      </div>
    </div>
  );
}
