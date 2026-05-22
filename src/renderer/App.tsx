/**
 * App.tsx — Root component orchestrating the full application flow.
 *
 * Flow:
 *  1. Loading → check first run
 *  2. First run → FirstRunWizard (API key input)
 *  3. Every launch → DirectoryPrompt (working directory selection)
 *  4. Main UI → Sidebar + ChatPanel + PromptOverlay + StatusBar
 */
import React, { useState, useEffect, useCallback } from "react";
import FirstRunWizard from "./components/FirstRunWizard";
import DirectoryPrompt from "./components/DirectoryPrompt";
import Sidebar from "./components/Sidebar";
import ChatPanel from "./components/ChatPanel";
import TerminalPanel from "./components/TerminalPanel";

const api = window.electronAPI;

type Mode = "code" | "chat";
type AppPhase = "loading" | "first-run" | "directory" | "mode-select" | "main";

export default function App() {
  // ── Phase ────────────────────────────────────────────────────
  const [phase, setPhase] = useState<AppPhase>("loading");

  // ── Core state ───────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>("code");
  const [cwd, setCwd] = useState<string>("");
  // ── Initialization ───────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const key = await api.getApiKey();
      if (!key) {
        // No API key — must enter one first
        setPhase("first-run");
      } else {
        setPhase("directory");
      }
    })();
  }, []);

  // ── Handlers ─────────────────────────────────────────────────
  const handleFirstRunComplete = useCallback(() => {
    setPhase("directory");
  }, []);

  const handleDirectorySelect = useCallback(
    async (dir: string | null) => {
      if (dir) {
        setCwd(dir);
        await api.saveLastCwd(dir);
      }
      setPhase("mode-select");
    },
    []
  );

  const handleModeSelect = useCallback(
    (selectedMode: Mode) => {
      setMode(selectedMode);
      if (selectedMode === "code") {
        api.startCode(cwd);
      } else {
        api.startSession("chat", cwd);
      }
      setPhase("main");
    },
    [cwd]
  );

  const handleDirectoryChange = useCallback(async () => {
    const dir = await api.selectDirectory();
    if (dir) {
      setCwd(dir);
      await api.saveLastCwd(dir);
    }
  }, []);

  // ── Render ───────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>正在启动 BEing Reasonix...</p>
      </div>
    );
  }

  if (phase === "first-run") {
    return <FirstRunWizard onComplete={handleFirstRunComplete} />;
  }

  if (phase === "directory") {
    return (
      <DirectoryPrompt
        lastCwd={null}
        onSelect={handleDirectorySelect}
      />
    );
  }

  if (phase === "mode-select") {
    return (
      <div className="wizard-overlay">
        <div className="wizard-card">
          <h1 className="wizard-title">选择模式</h1>
          <p className="wizard-subtitle">Code — 完整文件系统与命令行工具<br />Chat — 对话模式，无文件访问</p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            <button className="wizard-button" onClick={() => handleModeSelect("code")}>
              Code
            </button>
            <button className="wizard-button-secondary" onClick={() => handleModeSelect("chat")}>
              Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main UI
  return (
    <div className="app-layout">
      <Sidebar
        cwd={cwd}
        onDirectoryChange={handleDirectoryChange}
      />
      <div className="main-panel">
        {mode === "code" ? (
          <TerminalPanel />
        ) : (
          <ChatPanel
            mode={mode}
            cwd={cwd}
          />
        )}
      </div>
    </div>
  );
}
